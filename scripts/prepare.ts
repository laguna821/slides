import {verifyExperiments} from './experiments';
import { loadEditorial } from './editorial';
import { verifyPrintArtifact } from './print-contract';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { localAssetPath, rejectDraftResource } from './resource-files';
import {
  workSchema,
  mediaSchema,
  usageSchema,
  validateRelations,
  workHref,
  isPublished,
  type PublicWork,
} from '../src/lib/schema';
import { validatePolicy } from '../src/lib/policy';
import { resourceSchema, validateResources } from '../src/lib/schema';
import { extractHtml, renderMarkdown } from '../src/lib/extract';
import { parseVtt } from '../src/lib/captions';
import { clipHref } from '../src/lib/media-links';
import { makeSearchEntries } from '../src/lib/search';
import { renderReader, readerRelations, sha, validateReaderCoverage, validateReaderSvgFont } from '../src/lib/reader';
const root = process.cwd();
const read = async (p: string) =>
  JSON.parse(await fs.readFile(path.join(root, p), 'utf8'));
const works = workSchema.array().parse(await read('content/works.json'));
const media = mediaSchema.array().parse(await read('content/media.json'));
const usages = usageSchema.array().parse(await read('content/usages.json'));
const resources = resourceSchema.array().parse(await read('content/resources.json'));
validateRelations(works, media, usages);
validateResources(works, resources);
validatePolicy(works, media, resources);
const checkOnly=process.argv.includes('--check');
for(const w of works.filter(w=>w.visibility==='draft'&&w.reader)) {
  if(await fs.stat(path.join(root,'public/reading/pdf',w.slug)).then(()=>true,()=>false))throw Error('Draft reading PDF must not ship: '+w.id);
}
const baseline = await read('content/legacy.json');
if(!checkOnly) await fs.mkdir('public', { recursive: true });
for (const item of baseline) {
  const data = await fs.readFile(item.source);
  if (createHash('sha256').update(data).digest('hex') !== item.sha256)
    throw Error('Legacy source changed: ' + item.source);
  if(!checkOnly) await fs.writeFile(path.join('public', item.url.replace(/^\//, '')), data);
}
const output: PublicWork[] = [];
const mediaCandidates = [];
for (const w of works.filter(isPublished)) {
  const { htmlSource, markdownSource, provenance, reader: readerSpec, ...pub } = w;
  let reader: ReturnType<typeof renderReader> | undefined;
  let body = w.body,
    segments: any[] = [],
    readingHtml = renderMarkdown(w.body);
  if (htmlSource) {
    const resolved = path.resolve(htmlSource);
    if (!resolved.startsWith(root + path.sep))
      throw Error('Source outside repository');
    const extracted = extractHtml(
      await fs.readFile(resolved, 'utf8'),
      w.artifacts.find((a) => a.type === 'html')?.url || workHref(w),
    );
    body += ' ' + extracted.text;
    segments = extracted.segments;
    readingHtml = extracted.readingHtml;
    mediaCandidates.push({ workId: w.id, videos: extracted.videos });
  }
  if (markdownSource) {
    const resolved = path.resolve(markdownSource);
    if (!resolved.startsWith(root + path.sep))
      throw Error('Source outside repository');
    const md = await fs.readFile(resolved, 'utf8');
    const extracted = extractHtml(renderMarkdown(md), workHref(w) + 'read/');
    body += ' ' + extracted.text;
    readingHtml = extracted.readingHtml;
    segments = extracted.segments;
    mediaCandidates.push({ workId: w.id, videos: extracted.videos });
  }
  if(readerSpec){
    const safeFile=(p:string)=>{const x=path.resolve(root,p);if(!x.startsWith(root+path.sep))throw Error('Reader source outside repository');return x;};
    const manifest=JSON.parse(await fs.readFile(safeFile(readerSpec.manifest),'utf8')).works[w.id];
    if(!manifest)throw Error('Reader preservation manifest missing: '+w.id);
    const original=await fs.readFile(safeFile(manifest.source));
    if(sha(original)!==manifest.sourceSha256)throw Error('Reader source version changed: '+w.id);
    const md=await fs.readFile(safeFile(readerSpec.source),'utf8');
    reader=renderReader(md,manifest.aliases,manifest.wiki||{},Object.fromEntries(manifest.images.map((i:any)=>[i.url,{width:i.width,height:i.height}])));
    validateReaderCoverage(original.toString('utf8'),manifest.source.endsWith('.md')?'markdown':'html',reader);
    if(reader.sourceHash!==manifest.markdownSha256||manifest.missing!==0||!manifest.leafCount)throw Error('Reader needs renewed source coverage: '+w.id);
    if(reader.images.length!==manifest.images.length)throw Error('Reader image coverage mismatch: '+w.id);
    for(const img of manifest.images){if(!reader.images.includes(img.url))throw Error('Reader image missing');if(img.url.startsWith('/')){const bytes=await fs.readFile(safeFile('public'+img.url));if(sha(bytes)!==img.sha256)throw Error('Reader image bytes changed');if(img.url.endsWith('.svg'))validateReaderSvgFont(bytes.toString('utf8'),img.fontSubsetOf?await fs.readFile(safeFile('public'+img.fontSubsetOf),'utf8'):undefined);}}
    reader=await loadEditorial(w);
    readingHtml=reader.html;
    body=w.body+' '+reader.text;
    const $= (await import('cheerio')).load(reader.html);
    segments=reader.headings.map(h=>({id:h.id,title:h.title,text:h.title+' '+$('#'+h.id).nextUntil('h1,h2,h3,h4,h5,h6').text(),href:workHref(w)+'read/#'+h.id}));
  }
  const posters=resources.filter(r=>r.workId===w.id || w.resourceIds.includes(r.id));
  for(const r of posters){
    body+=' '+r.title+' '+r.summary+' '+r.body;
    segments.push({id:'poster-'+r.id,title:r.title,text:r.body,href:workHref(w)+'#poster-'+r.id,kind:'poster'});
  }
  const related = media.filter(
    (m: any) =>
      m.workId === w.id ||
      w.mediaIds.includes(m.id) ||
      usages.some((u: any) => u.workId === w.id && u.mediaId === m.id),
  );
  for (const m of related.filter((m) => m.workId === w.id && !m.external)) {
    for (const v of m.versions) {
      if (v.captions?.startsWith('/')) {
        const cues = parseVtt(
          await fs.readFile(path.join(root, 'public', v.captions), 'utf8'),
        );
        body += ' ' + cues.map((c) => c.text).join(' ');
        for (const cue of cues) {
          if (v.duration && cue.end > v.duration)
            throw Error('Caption exceeds video duration: ' + m.id);
          segments.push({
            id: m.id + ':' + v.id + ':' + cue.id,
            title: cue.start + '–' + cue.end + '초',
            text: cue.text,
            href: clipHref(w.slug, v.id, cue.start, cue.end),
            kind: 'caption',
          });
        }
      }
    }
  }
  await fs.access(path.join(root, 'public', w.poster));
  output.push({
    ...pub,
    body,
    href: workHref(w),
    segments,
    readingHtml,
    ...(reader?{reader,readingPdf:await verifyPrintArtifact(w)}:{}),
    videoCount: new Set(related.map((m: any) => m.id)).size,
  });
}
for(const w of output)w.relations=readerRelations(w,output);
const publishedIds = new Set(output.map((w) => w.id));
const publicMedia = media.filter((m: any) => publishedIds.has(m.workId));
const publicUsages = usages.filter(
  (u: any) =>
    publishedIds.has(u.workId) &&
    publicMedia.some((m: any) => m.id === u.mediaId),
);
for(const r of resources){
  if(works.find(w=>w.id===r.workId)!.visibility==='draft'){
    await rejectDraftResource(path.join(root,'public'),r);
    continue;
  }
  await fs.access(localAssetPath(path.join(root,'public'),r.preview)!);
  for(const v of r.versions) for(const [url,sha] of Object.entries(v.files)){
    const file=localAssetPath(path.join(root,'public'),url);
    if(file) { const bytes=await fs.readFile(file); if(createHash('sha256').update(bytes).digest('hex')!==sha) throw Error('Resource bytes changed: '+url); }
  }
}
const publicResources=resources.filter(r=>publishedIds.has(r.workId));
if(checkOnly){console.log('Read-only content validation passed');process.exit(0);}
const list = output.filter((w) => w.visibility === 'listed');
await fs.mkdir('src/generated', { recursive: true });
await fs.writeFile(
  'src/generated/content.json',
  JSON.stringify({ works: output, media: publicMedia, usages: publicUsages, resources: publicResources }),
);
await fs.writeFile(
  'public/catalogue.json',
  JSON.stringify({
    version: 2,
    resources: publicResources.filter(r=>list.some(w=>w.id===r.workId)),
    works: list.map(({ body, segments, readingHtml, reader, relations, ...w }) => w),
    media: publicMedia.filter((m: any) => list.some((w) => w.id === m.workId)),
  }),
);
await fs.writeFile(
  'public/search-index.json',
  JSON.stringify({ version: 1, entries: makeSearchEntries(list) }),
);
await fs.mkdir('.local', { recursive: true });
await fs.writeFile(
  '.local/media-candidates.json',
  JSON.stringify(mediaCandidates, null, 2),
);
console.log(
  'Content verified: ' +
    output.length +
    ' published works, ' +
    publicMedia.length +
    ' videos. Legacy bytes preserved.',
);

await verifyExperiments();
