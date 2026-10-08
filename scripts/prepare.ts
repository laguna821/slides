import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  workSchema,
  mediaSchema,
  usageSchema,
  validateRelations,
  workHref,
  isPublished,
  type PublicWork,
} from '../src/lib/schema';
import { extractHtml, renderMarkdown, vttText } from '../src/lib/extract';
import { makeSearchEntries } from '../src/lib/search';
const root = process.cwd();
const read = async (p: string) =>
  JSON.parse(await fs.readFile(path.join(root, p), 'utf8'));
const works = workSchema.array().parse(await read('content/works.json'));
const media = mediaSchema.array().parse(await read('content/media.json'));
const usages = usageSchema.array().parse(await read('content/usages.json'));
validateRelations(works, media, usages);
const baseline = await read('content/legacy.json');
await fs.mkdir('public', { recursive: true });
for (const item of baseline) {
  const data = await fs.readFile(item.source);
  if (createHash('sha256').update(data).digest('hex') !== item.sha256)
    throw Error('Legacy source changed: ' + item.source);
  await fs.writeFile(path.join('public', item.url.replace(/^\//, '')), data);
}
const output: PublicWork[] = [];
const mediaCandidates = [];
for (const w of works.filter(isPublished)) {
  const { htmlSource, markdownSource, provenance, ...pub } = w;
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
  const related = media.filter(
    (m: any) =>
      m.workId === w.id ||
      w.mediaIds.includes(m.id) ||
      usages.some((u: any) => u.workId === w.id && u.mediaId === m.id),
  );
  for (const m of related) {
    for (const v of m.versions) {
      if (v.captions?.startsWith('/')) {
        body +=
          ' ' +
          vttText(
            await fs.readFile(path.join(root, 'public', v.captions), 'utf8'),
          );
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
    videoCount: new Set(related.map((m: any) => m.id)).size,
  });
}
const publishedIds = new Set(output.map((w) => w.id));
const publicMedia = media.filter((m: any) => publishedIds.has(m.workId));
const publicUsages = usages.filter(
  (u: any) =>
    publishedIds.has(u.workId) &&
    publicMedia.some((m: any) => m.id === u.mediaId),
);
const list = output.filter((w) => w.visibility === 'listed');
await fs.mkdir('src/generated', { recursive: true });
await fs.writeFile(
  'src/generated/content.json',
  JSON.stringify({ works: output, media: publicMedia, usages: publicUsages }),
);
await fs.writeFile(
  'public/catalogue.json',
  JSON.stringify({
    version: 1,
    works: list.map(({ body, segments, readingHtml, ...w }) => w),
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
