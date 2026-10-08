import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { extractHtml } from '../src/lib/extract';
const { values } = parseArgs({
  options: {
    file: { type: 'string' },
    id: { type: 'string' },
    title: { type: 'string' },
    date: { type: 'string' },
    help: { type: 'boolean' },
  },
});
if (values.help || !values.file || !values.id) {
  console.log(
    'npm run content:import -- --file <HTML> --id <slug> [--title <제목>] [--date YYYY-MM-DD]\n검토용 후보를 .local/imports에만 만듭니다. 공개 등록은 content/works.json에서 명시적으로 수행합니다.',
  );
  process.exit(values.help ? 0 : 1);
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.id))
  throw Error('id는 영문 소문자·숫자·하이픈이어야 합니다.');
const bytes = await fs.readFile(values.file);
const source = bytes.toString('utf8');
const x = extractHtml(source, '/decks/' + values.id + '/');
const target = path.join('.local/imports', values.id);
await fs.mkdir(target, { recursive: true });
const draft = {
  id: values.id,
  slug: values.id,
  title: values.title || x.segments[0]?.title || values.id,
  summary: '공개용 설명을 작성하세요.',
  date: values.date || new Date().toISOString().slice(0, 10),
  kind: 'talk',
  topics: ['미분류'],
  visibility: 'draft',
  seo: 'noindex',
  status: 'study',
  poster: '/images/studio-paper.webp',
  posterAlt: '',
  body: '',
  artifacts: [],
  mediaIds: [],
  sourceSha256: createHash('sha256').update(bytes).digest('hex'),
  extractedVideos: x.videos,
  review: {
    speakerNotes: '직접 검토 필요',
    publication: '초안 · 공개하지 않음',
  },
};
await fs.writeFile(
  path.join(target, 'candidate.json'),
  JSON.stringify(draft, null, 2),
  { flag: 'wx' },
);
await fs.writeFile(path.join(target, 'reading-preview.html'), x.readingHtml, {
  flag: 'wx',
});
console.log(
  '검토 후보: ' + target + ' (공개 파일과 색인은 변경하지 않았습니다.)',
);
