import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractHtml,
  normalizeVideoUrl,
  renderMarkdown,
  vttText,
} from '../src/lib/extract';
import { validateClip } from '../src/lib/clip';
import {
  runSearch,
  readFilters,
  writeFilters,
  makeSearchEntries,
  defaultFilters,
} from '../src/lib/search';
import {
  validateRelations,
  workSchema,
  isPublished,
  isListed,
} from '../src/lib/schema';
const base = {
  id: 'one',
  slug: 'one',
  title: 'AI 읽기 수업',
  summary: '질문과 검증',
  date: '2026-10-08',
  kind: 'talk',
  topics: ['AI 교육', '읽기'],
  visibility: 'listed',
  seo: 'index',
  status: 'selected',
  poster: '/images/studio-paper.webp',
  posterAlt: '책',
  body: '교양교육에서 근거를 검토한다.',
  artifacts: [],
  mediaIds: [],
} as const;
const publicWork = {
  ...workSchema.parse(base),
  reader: undefined,
  body: base.body + ' 성찰과 평가 루브릭을 사용한다.',
  href: '/talks/one/',
  segments: [
    {
      id: 'slide-2',
      title: '학습자 판단',
      text: '성찰과 평가 루브릭을 사용한다.',
      href: '/old.html#slide-2',
    },
  ],
  readingHtml: '',
  videoCount: 0,
};
test('본문과 슬라이드 검색은 위치를 보존하고 자료 단위로 묶인다', () => {
  const entries = makeSearchEntries([publicWork]);
  const result = runSearch(entries, { ...defaultFilters, q: '루브릭' });
  assert.equal(result.length, 1);
  assert.equal(result[0].href, '/talks/one/read/#slide-2');
  assert.equal(runSearch(entries, defaultFilters).length, 1);
});
test('한글 태그, AND OR, 복합 필터, 빈 결과', () => {
  const entries = makeSearchEntries([publicWork]);
  assert.equal(
    runSearch(entries, { ...defaultFilters, q: 'AI AND 검증' }).length,
    1,
  );
  assert.equal(
    runSearch(entries, { ...defaultFilters, q: '없는말 OR 루브릭' }).length,
    1,
  );
  assert.equal(runSearch(entries, { ...defaultFilters, q: '#읽기' }).length, 1);
  assert.equal(
    runSearch(entries, { ...defaultFilters, q: '루브릭', kind: 'motion' })
      .length,
    0,
  );
  assert.equal(
    runSearch(entries, { ...defaultFilters, year: '2025' }).length,
    0,
  );
});
test('URL로 필터와 보기 상태를 손실 없이 복원한다', () => {
  const state = {
    ...defaultFilters,
    q: '한글 #읽기',
    topic: 'AI 교육',
    view: 'list',
    sort: 'oldest',
  };
  assert.deepEqual(
    readFilters(new URLSearchParams(writeFilters(state))),
    state,
  );
});
test('검색용 HTML에서 스크립트와 발표자 노트를 제거한다', () => {
  const html =
    '<main><section class="slide" id="s1"><h2>공개 제목</h2><p>공개 본문</p><aside class="speaker-notes">비밀메모</aside><div hidden>비밀암호</div><script>alert("secret")</script><video src="https://a.test/a.mp4"></video></section></main>';
  const out = extractHtml(html, '/deck.html');
  assert(out.text.includes('공개 본문'));
  assert(!/비밀|secret|script/.test(out.readingHtml));
  assert.equal(out.segments[0].id, 's1');
  assert.equal(out.videos.length, 1);
});
test('동영상 URL 중복을 정규화하고 위험한 링크를 거부한다', () => {
  assert.equal(
    normalizeVideoUrl('https://youtu.be/tKrVYOUvrtA?si=123')?.key,
    normalizeVideoUrl('https://www.youtube.com/embed/tKrVYOUvrtA')?.key,
  );
  assert.equal(normalizeVideoUrl('javascript:alert(1)'), null);
  assert.equal(normalizeVideoUrl('https://example.com/article'), null);
});
test('Markdown 읽기 화면은 스크립트·이벤트·위험 URL을 제거한다', () => {
  const html = renderMarkdown(
    '<img src=x onerror=alert(1)><script>secret()</script> [bad](javascript:alert)',
  );
  assert(!/onerror|<script|javascript:/i.test(html));
});
test('Markdown 노트 평문을 제거하고 제목 위치와 본문을 연결한다', () => {
  const html = renderMarkdown(
    '## 첫 문단\n\n공개 설명\n\n<aside class="speaker-notes">비밀 메모</aside>',
  );
  const x = extractHtml(html, '/read/');
  assert(!html.includes('비밀'));
  assert(x.segments[0].text.includes('공개 설명'));
  assert(html.includes('id="section-1"'));
});
test('초안과 링크 전용 자료는 목록 색인에서 제외한다', () => {
  assert(!isPublished({ ...publicWork, visibility: 'draft' }));
  assert(!isListed({ ...publicWork, visibility: 'unlisted' }));
  assert.equal(
    makeSearchEntries([
      { ...publicWork, visibility: 'draft' },
      { ...publicWork, visibility: 'unlisted' },
    ]).length,
    0,
  );
});
test('영상 구간은 음수·역전·범위 초과·NaN을 거부한다', () => {
  assert.deepEqual(validateClip(2, 15, 180), { start: 2, end: 15 });
  for (const [a, b] of [
    [-1, 4],
    [10, 10],
    [5, 4],
    [1, 181],
    [NaN, 4],
    [1, Infinity],
  ])
    assert.throws(() => validateClip(a, b, 180));
});
test('잘못된 사용 관계와 중복 ID는 발행 전 검출한다', () => {
  const w = workSchema.parse(base);
  assert.throws(() => validateRelations([w, w], [], []));
  assert.throws(() =>
    validateRelations(
      [w],
      [],
      [
        {
          workId: 'one',
          mediaId: 'missing',
          version: 'v1',
          start: 0,
          end: 5,
          role: 'reference',
          label: 'test',
        },
      ],
    ),
  );
});
test('공개 자료가 링크 전용 작품의 영상과 자막을 노출하지 못한다', () => {
  const owner = workSchema.parse({
    ...base,
    id: 'hidden',
    slug: 'hidden',
    visibility: 'unlisted',
  });
  const work = workSchema.parse({ ...base, mediaIds: ['film'] });
  const media = {
    id: 'film',
    workId: 'hidden',
    title: 'hidden',
    currentVersion: 'v1',
    versions: [
      {
        id: 'v1',
        label: 'v1',
        url: 'https://example.com/film.mp4',
        duration: 12,
      },
    ],
    poster: base.poster,
    credits: 'author',
    external: false,
  };
  assert.throws(() => validateRelations([work, owner], [media], []), /exposes/);
});
test('서로 다른 학기와 동일 경로의 자료가 덮어써지지 않는다', () => {
  const w = workSchema.parse(base);
  assert.throws(
    () =>
      validateRelations(
        [w, workSchema.parse({ ...base, id: 'two', kind: 'lecture' })],
        [],
        [],
      ),
    /Duplicate/,
  );
  const course = { id: 'design-2026-1', title: '디자인', term: '2026-1' };
  assert.throws(
    () =>
      validateRelations(
        [
          { ...w, course },
          {
            ...w,
            id: 'two',
            slug: 'two',
            course: { ...course, term: '2026-2' },
          },
        ],
        [],
        [],
      ),
    /Course/,
  );
});
test('자막의 타임코드·태그를 검색 문장과 분리한다', () => {
  assert.equal(
    vttText('WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.000\n<b>한글 문장</b>'),
    '한글 문장',
  );
});
