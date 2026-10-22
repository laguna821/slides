import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Resvg } from '@resvg/resvg-js';
import {readCollection,verifyCollectionSources} from './pele-collection';
import {
  assetKey,
  dataPattern,
  svgDataPattern,
  isBrandAsset,
  isMedia,
  isText,
  manifestPath,
  readManifest,
  regularFiles,
  sha,
  type Asset,
} from './web-assets';
const local = await fs
  .readFile('.local/asset-config.json', 'utf8')
  .then(JSON.parse, () => ({}));
const configPath = process.env.CMDS_EAGLE_CONFIG || local.cmdsEagleConfig;
if (!configPath)
  throw Error(
    'Set CMDS_EAGLE_CONFIG to the existing local CMDS Eagle data.json. Never copy its secrets into this repository.',
  );
const config = JSON.parse(await fs.readFile(configPath, 'utf8')).cloudProviders
  ?.r2;
if (
  !config?.enabled ||
  !config.workerUrl ||
  !config.apiKey ||
  !config.publicUrl
)
  throw Error('Existing CMDS R2 configuration is incomplete');
const publicBase = new URL(config.publicUrl);
if (publicBase.protocol !== 'https:')
  throw Error('HTTPS public origin required');
const manifest = await readManifest();
const canonicalFont = '/fonts/AchmageSameTone-1.000.woff2';
const canonicalFontHash = sha(await fs.readFile('public' + canonicalFont));
let added = 0,
  reused = 0;
const svgConversion = 'resvg-2.6.2-exact-family-weight-2x-v4';
const mimeByExt: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};
const extByMime: Record<string, string> = Object.fromEntries(
  Object.entries(mimeByExt).map(([k, v]) => [v, k]),
);
await fs.mkdir('.local/asset-fonts', { recursive: true });
await fs.mkdir('public/fonts/shared', { recursive: true });
async function save() {
  for (const [k, v] of Object.entries(manifest.paths))
    if (k === v) delete manifest.paths[k];
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}
async function verify(asset: Asset) {
  const u = new URL(asset.url);
  if (u.origin !== publicBase.origin)
    throw Error('Unexpected R2 public origin');
  const r = await fetch(u, { signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw Error('R2 public verification HTTP ' + r.status);
  const bytes = Buffer.from(await r.arrayBuffer());
  if (sha(bytes) !== asset.sha256) throw Error('R2 public hash mismatch');
  if (bytes.length !== asset.bytes) throw Error('R2 public byte size mismatch');
  if ((r.headers.get('content-type') || '').split(';')[0] !== asset.mime)
    throw Error('R2 content type mismatch');
}
async function register(bytes: Buffer, mime: string): Promise<Asset> {
  const key = assetKey(mime, bytes);
  const prior = manifest.assets[key];
  if (prior?.kind === 'font' && prior.sha256 === canonicalFontHash)
    prior.url = canonicalFont;
  const rasterSvg =
    mime === 'image/svg+xml' &&
    /data:(?:font|application)\//.test(bytes.toString());
  const specimen =
    sha(bytes) ===
    '97a39d48cc53cdd6117a0d082f822524866ab3764e8a5ea77e8fdd78be91f6f0';
  const conversion =
    svgConversion + (specimen ? '-source-symbol-fallback' : '');
  if (prior && (!rasterSvg || prior.conversion === conversion)) {
    reused++;
    return prior;
  }
  const sourceHash = sha(bytes);
  let output = bytes,
    outMime = mime;
  if (rasterSvg) {
    // Image-mode SVG cannot fetch external fonts. Rasterize at 2x with its exact
    // embedded fonts, rather than silently replacing the typeface.
    let svg = bytes.toString();
    const fontFiles: string[] = [];
    const weights = [
      ...new Set([
        400,
        ...[...svg.matchAll(/font-weight\s*(?::|=)\s*["']?(\d{3})/g)].map((m) =>
          Number(m[1]),
        ),
      ]),
    ];
    const aliases = new Map<string, string>();
    let weightAliases: Record<string, string> = {};
    for (const m of svg.matchAll(dataPattern()))
      if (/^(font\/|application\/(?:x-font|font))/.test(m[1])) {
        const b = Buffer.from(m[2], 'base64');
        const base = path.resolve('.local/asset-fonts', sha(b));
        const input = base + '.woff2';
        await fs.writeFile(input, b);
        const py = process.env.ASSET_PYTHON || local.python || 'python';
        const converted = spawnSync(
          py,
          [
            '-X',
            'utf8',
            'scripts/svg-fonts.py',
            input,
            base,
            JSON.stringify(weights),
          ],
          { encoding: 'utf8' },
        );
        if (converted.status !== 0)
          throw Error(
            'Font conversion failed; install fontTools with WOFF2 support in ASSET_PYTHON',
          );
        const decoded = JSON.parse(converted.stdout);
        weightAliases = { ...weightAliases, ...decoded.weightAliases };
        fontFiles.push(...decoded.files);
        for (const face of svg.matchAll(/@font-face\s*\{([^}]+)\}/g))
          if (face[1].includes(m[2])) {
            const alias = face[1]
              .match(/font-family\s*:\s*([^;]+)/)?.[1]
              .trim()
              .replace(/^['"]|['"]$/g, '');
            if (alias) aliases.set(alias, decoded.family);
          }
      }
    for (const [alias, family] of aliases) svg = svg.split(alias).join(family);
    let stripped = svg.replace(/@font-face\s*\{[^}]+\}/g, '');
    if (specimen) {
      // SameTone itself has no U+2014. Preserve the original SVG's browser
      // serif fallback for that single symbol; never replace its typeface.
      const symbolFont =
        local.symbolFont ||
        path.join(process.env.WINDIR || 'C:/Windows', 'Fonts', 'times.ttf');
      await fs.access(symbolFont);
      fontFiles.push(symbolFont);
      stripped = stripped.replace(
        '100 — 900',
        '100 <tspan font-family="Times New Roman">—</tspan> 900',
      );
    }
    for (const [weight, family] of Object.entries(weightAliases)) {
      stripped = stripped.replace(/<[^>]+>/g, (tag) => {
        const expression = new RegExp('font-weight=(["\'])' + weight + '\\1');
        if (!expression.test(tag)) return tag;
        let exactTag = tag
          .replace(/\sfont-family=(["'])[^"']*\1/, '')
          .replace(
            expression,
            'font-weight="400" font-family="' + family + '"',
          );
        // Translated figures declare text font-family with !important. An
        // attribute alone loses that cascade and silently restores regular.
        const exactStyle = "font-family:'" + family + "'!important;";
        if (/\sstyle=(["'])/.test(exactTag))
          exactTag = exactTag.replace(
            /\sstyle=(["'])(.*?)\1/,
            (_, quote, style) =>
              ' style=' + quote + style + ';' + exactStyle + quote,
          );
        else
          exactTag = exactTag.replace(
            /\s*\/?>(?=$)/,
            (end) => ' style="' + exactStyle + '"' + end,
          );
        return exactTag;
      });
      stripped = stripped.replace(
        new RegExp('font-weight\\s*:\\s*' + weight + '(?=\\s*[;}])', 'g'),
        "font-weight:400;font-family:'" + family + "'",
      );
    }
    const glyphInput = path.resolve('.local/asset-fonts', sourceHash + '.svg');
    await fs.writeFile(glyphInput, stripped);
    const glyphCheck = spawnSync(
      process.env.ASSET_PYTHON || local.python || 'python',
      [
        '-X',
        'utf8',
        'scripts/check-svg-glyphs.py',
        glyphInput,
        JSON.stringify(fontFiles),
      ],
      { encoding: 'utf8' },
    );
    if (glyphCheck.status !== 0)
      throw Error(
        'SVG glyph coverage failed; publication blocked: ' + sourceHash,
      );
    output = Buffer.from(
      new Resvg(stripped, {
        fitTo: { mode: 'zoom', value: 2 },
        font: { fontFiles, loadSystemFonts: false },
      })
        .render()
        .asPng(),
    );
    outMime = 'image/png';
  }
  const digest = sha(output);
  const isFont = /^(font\/|application\/(?:x-font|font))/.test(mime);
  let url: string;
  if (isFont) {
    const ext =
      extByMime[mime] ||
      (bytes.subarray(0, 4).toString() === 'wOF2' ? '.woff2' : '.woff');
    url =
      digest === canonicalFontHash
        ? canonicalFont
        : '/fonts/shared/' + digest + ext;
    if (url !== canonicalFont) await fs.writeFile('public' + url, bytes);
  } else {
    const existing = Object.values(manifest.assets).find(
      (a) => a.sha256 === digest && a.kind === 'image',
    );
    if (existing) url = existing.url;
    else {
      const name = 'slides-' + digest + (extByMime[outMime] || '.bin');
      const form = new FormData();
      form.append(
        'file',
        new Blob([new Uint8Array(output)], { type: outMime }),
        name,
      );
      form.append('filename', name);
      form.append('content_type', outMime);
      const response = await fetch(
        config.workerUrl.replace(/\/$/, '') + '/upload',
        {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + config.apiKey },
          body: form,
          signal: AbortSignal.timeout(120000),
        },
      );
      if (!response.ok)
        throw Error(
          'CMDS R2 upload HTTP ' +
            response.status +
            ' (no secret response body logged)',
        );
      const data = (await response.json()) as { key: string };
      if (!data.key || data.key.includes('..'))
        throw Error('Invalid upload object key');
      url = config.publicUrl.replace(/\/$/, '') + '/' + data.key;
    }
  }
  const asset: Asset = {
    sourceHash,
    sha256: digest,
    url,
    bytes: output.length,
    mime: outMime,
    kind: isFont ? 'font' : 'image',
    verifiedAt: new Date().toISOString(),
  };
  if (rasterSvg) asset.conversion = conversion;
  if (!isFont) await verify(asset);
  manifest.assets[key] = asset;
  added++;
  await save();
  console.log(
    'Verified asset ' + added + ': ' + outMime + ' ' + output.length + ' bytes',
  );
  return asset;
}
const existingRemoteUrls = new Set<string>();
const collection=await readCollection();await verifyCollectionSources(collection);
const collectionAssets=new Set(collection.files.filter(f=>f.delivery==='proxy').map(f=>f.path.slice(1)));
for (const file of await regularFiles('dist')) {
  if(collectionAssets.has(file))continue;
  const bytes = await fs.readFile(path.join('dist', file));
  if (
    (isMedia(file) && !isBrandAsset(file)) ||
    (/\.(?:woff2?|ttf|otf)$/.test(file) &&
      file !== 'fonts/AchmageSameTone-1.000.woff2' &&
      !file.startsWith('fonts/shared/'))
  ) {
    const asset = await register(
      bytes,
      mimeByExt[path.extname(file).toLowerCase()],
    );
    manifest.paths['/' + file] = asset.url;
    await save();
  } else if (isText(file)) {
    for (const match of bytes.toString().matchAll(/https?:[^\s"'<>\\)]+/g)) {
      if (!match[0].startsWith(publicBase.origin + '/')) continue;
      const url = new URL(match[0]);
      url.search = '';
      url.hash = '';
      if (isMedia(url.pathname)) existingRemoteUrls.add(url.href);
    }
    for (const m of bytes.toString().matchAll(dataPattern())) {
      if (m[1] === 'application/pdf') continue;
      await register(Buffer.from(m[2], 'base64'), m[1]);
    }
    for (const m of bytes.toString().matchAll(svgDataPattern()))
      await register(Buffer.from(decodeURIComponent(m[2])), 'image/svg+xml');
  }
}
for (const url of existingRemoteUrls) {
  if (Object.values(manifest.assets).some((a) => a.url === url)) continue;
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok)
    throw Error('Existing public image HTTP ' + response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  const mime = (response.headers.get('content-type') || '').split(';')[0];
  if (!mime.startsWith('image/'))
    throw Error('Existing public image MIME mismatch');
  const digest = sha(bytes);
  manifest.assets[assetKey(mime, bytes) + ':existing:' + sha(url)] = {
    sourceHash: digest,
    sha256: digest,
    url,
    bytes: bytes.length,
    mime,
    kind: 'image',
    verifiedAt: new Date().toISOString(),
  };
  await save();
}
const verified = new Set<string>();
for (const asset of Object.values(manifest.assets)) {
  if (verified.has(asset.url)) continue;
  if (asset.kind === 'image') await verify(asset);
  else if (sha(await fs.readFile('public' + asset.url)) !== asset.sha256)
    throw Error('Shared font hash mismatch: ' + asset.url);
  verified.add(asset.url);
}
await fs.mkdir('validation', { recursive: true });
await fs.writeFile(
  'validation/asset-verification.json',
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      urls: [...verified],
      added,
      reused,
    },
    null,
    2,
  ) + '\n',
);
await save();
console.log(
  JSON.stringify({
    added,
    reused,
    unique: Object.keys(manifest.assets).length,
    paths: Object.keys(manifest.paths).length,
  }),
);
