import fs from 'node:fs/promises';
import path from 'node:path';
import {
  isBrandAsset,
  isMedia,
  isRemoved,
  isText,
  readManifest,
  regularFiles,
  sha,
  transformText,
  siteOrigin,
} from './web-assets';
import { verifyWebOutput } from './verify-web-output';
import {shareCodeTokens} from './share-code-tokens';
import {shareWebRuntime} from './share-web-runtime';
import {dedupeWebHtml} from './dedupe-web-html';
import {validateSourceOnly} from './source-only';
import {readCollection,verifyCollectionSources,collectionRewrites} from './pele-collection';
const collection=await readCollection();
await verifyCollectionSources(collection);
const collectionAssets=new Set(collection.files.filter(f=>f.delivery==='proxy').map(f=>f.path.slice(1)));
const manifest = await readManifest();
if (!Object.keys(manifest.assets).length)
  throw Error('Run assets:sync before the first web build');
const output = path.resolve('web-dist');
if (output !== path.join(process.cwd(), 'web-dist'))
  throw Error('Unexpected output directory');
// Only generated output is cleared. Original public/ sources are never modified.
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
const inputs = await regularFiles('dist');
const redirects: Record<string, string> = {};
const works = JSON.parse(await fs.readFile('content/works.json', 'utf8'));
const resources = JSON.parse(
  await fs.readFile('content/resources.json', 'utf8'),
);
const sourceOnlyConfig=JSON.parse(await fs.readFile('content/web-source-only.json','utf8'));
const sourceOnly=validateSourceOnly(sourceOnlyConfig.files,JSON.parse(await fs.readFile('content/presenter-notes.json','utf8')),works,resources);
let sourceOnlyBytes=0;
for (const w of works)
  for (const a of w.artifacts)
    if (isRemoved(a.url))
      redirects[a.url] = '/talks/' + w.slug + (w.reader ? '/read/' : '/');
for (const r of resources)
  for (const v of r.versions)
    for (const url of Object.keys(v.files))
      if (isRemoved(url)) redirects[url] = v.html;
for (const f of inputs.filter(isRemoved)) {
  const url = '/' + f;
  if (redirects[url]) continue;
  const work = works.find((w: any) => f.includes(w.slug));
  redirects[url] = work
    ? (f.startsWith('reading/en/') ? '/en' : '') +
      '/talks/' +
      work.slug +
      (work.reader ? '/read/' : '/')
    : '/' + path.posix.dirname(f) + '/';
}
let before = 0;
const proofs: Record<string, { sourceHash: string; outputHash: string; outputAlias?:string }> = {};
for (const file of inputs) {
  const bytes = await fs.readFile('dist/' + file);
  before += bytes.length;
  if(collectionAssets.has(file))continue;
  if(sourceOnly.has(file)){sourceOnlyBytes+=bytes.length;continue;}
  if (isRemoved(file)) continue;
  if (
    file.startsWith('fonts/shared/') &&
    !Object.values(manifest.assets).some((a) => a.url === '/' + file)
  )
    continue;
  if (
    (isMedia(file) && !isBrandAsset(file)) ||
    (/\.(?:woff2?|ttf|otf)$/.test(file) &&
      file !== 'fonts/AchmageSameTone-1.000.woff2' &&
      !file.startsWith('fonts/shared/'))
  ) {
    const asset = Object.values(manifest.assets).find(
      (a) =>
        a.sourceHash === sha(bytes) && a.url === manifest.paths['/' + file],
    );
    if (!asset)
      throw Error(
        'New or changed media is not registered: ' + file + '; run assets:sync',
      );
    continue;
  }
  let content = bytes;
  if (isText(file)) {
    let text = transformText(bytes.toString(), file, manifest);
    if (file.endsWith('.md'))
      for (const [source, target] of Object.entries(redirects))
        text = text
          .split(siteOrigin + source)
          .join(siteOrigin + target)
          .split('](' + source + ')')
          .join('](' + target + ')');
    content = Buffer.from(text);
  }
  const target = path.join(output, file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content);
  proofs[file] = { sourceHash: sha(bytes), outputHash: sha(content) };
}
for (const asset of Object.values(manifest.assets))
  if (asset.kind === 'font') {
    const bytes = await fs.readFile('public' + asset.url);
    if (sha(bytes) !== asset.sha256) throw Error('Shared font mismatch');
    const target = path.join(output, asset.url);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
  }
const codeTokenSharing=await shareCodeTokens(output);
const runtimeSharing=await shareWebRuntime(output);
for(const file of Object.keys(proofs))proofs[file].outputHash=sha(await fs.readFile(path.join(output,file)));
const htmlSharing=await dedupeWebHtml(output);
Object.assign(redirects,htmlSharing.aliases);
for(const [source,target] of Object.entries(htmlSharing.aliases))proofs[source.slice(1)].outputAlias=target;
// A checked-in Vercel configuration must match the deterministic redirect plan.
const expected = Object.entries({ ...manifest.paths, ...redirects })
  .map(([source, destination]) => ({ source, destination, permanent: false }))
  .sort((a, b) => a.source.localeCompare(b.source));
for (const r of expected) {
  if (r.source === r.destination) throw Error('Self redirect: ' + r.source);
  if (!r.destination.startsWith('/')) continue;
  if (expected.some((next) => next.source === r.destination))
    throw Error('Chained redirect: ' + r.source);
  const target = path.resolve(
    output,
    '.' + r.destination + (r.destination.endsWith('/') ? 'index.html' : ''),
  );
  if (!target.startsWith(output + path.sep))
    throw Error('Redirect escapes output: ' + r.source);
  await fs.access(target).catch(() => {
    throw Error(
      'Missing redirect target: ' + r.source + ' -> ' + r.destination,
    );
  });
}
const vercel = JSON.parse(await fs.readFile('vercel.json', 'utf8'));
const expectedRewrites=collectionRewrites(collection);
if (process.argv.includes('--write-redirects')) {
  vercel.redirects = expected;
  vercel.rewrites=expectedRewrites;
  await fs.writeFile('vercel.json', JSON.stringify(vercel, null, 2) + '\n');
} else if (JSON.stringify(vercel.redirects) !== JSON.stringify(expected))
  throw Error(
    'Redirect manifest changed: run web:prepare and review vercel.json',
  );
if(JSON.stringify(vercel.rewrites)!==JSON.stringify(expectedRewrites))throw Error('Collection proxy manifest changed: run web:prepare');
await fs.mkdir('.local', { recursive: true });
await fs.writeFile('.local/web-proof.json', JSON.stringify(proofs));
const report = await verifyWebOutput();
await fs.writeFile(
  'validation/storage-report.json',
  JSON.stringify(
    {
      ...report,
      sourceBuildBytes: before,
      savedBytes: before - report.bytes,
      redirects: expected.length,
      assetManifestHash: sha(await fs.readFile('content/web-assets.json')),
      runtimeSharing,
      codeTokenSharing,
      htmlSharing,
      archivalOnly:{files:[...sourceOnly],sourceBytes:sourceOnlyBytes},
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Deployment diet: ' +
    (before / 1048576).toFixed(2) +
    ' -> ' +
    (report.bytes / 1048576).toFixed(2) +
    ' MiB',
);
