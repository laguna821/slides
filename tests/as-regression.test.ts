import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVtt } from '../src/lib/captions';
import {
  clipHref,
  usageHref,
  slideHref,
  embedCode,
} from '../src/lib/media-links';
import {
  makeSearchEntries,
  runSearch,
  defaultFilters,
} from '../src/lib/search';
import {
  workSchema,
  type PublicWork,
  type Media,
  type Usage,
} from '../src/lib/schema';
const owner: PublicWork = {
  ...workSchema.parse({
    id: 'film',
    slug: 'film',
    title: '설명 영상',
    summary: '제작 실험',
    date: '2026-10-08',
    kind: 'motion',
    topics: ['교육'],
    visibility: 'listed',
    seo: 'noindex',
    status: 'study',
    poster: '/a.webp',
    posterAlt: '장면',
  }),
  href: '/motion/film/',
  reader: undefined,
  segments: [],
  readingHtml: '',
  videoCount: 1,
};
test('VTT cue 시간·다중행 보존, NOTE와 잘못된 구간 제외', () => {
  const cues = parseVtt(
    'WEBVTT\n\nNOTE ignore\n00:00:00.000 --> 00:00:01.000\n숨김\n\na\n00:01.250 --> 00:03.500 align:start\n<b>교정</b> &amp;\n조판\n\n00:04.000 --> 00:02.000\n잘못됨',
  );
  assert.deepEqual(cues, [
    { id: 'cue-2', start: 1.25, end: 3.5, text: '교정 & 조판' },
  ]);
});
test('자막 검색 결과는 영상의 고정 버전과 해당 구간으로 이동', () => {
  const href = clipHref('film', 'old-v1', 12.5, 16);
  const work = {
    ...owner,
    segments: [
      {
        id: 'cue',
        title: '12.5–16초',
        text: '인쇄기의 조판 과정',
        href,
        kind: 'caption' as const,
      },
    ],
  };
  const hits = runSearch(makeSearchEntries([work]), {
    ...defaultFilters,
    q: '조판',
  });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].href, href);
  assert.equal(hits[0].entry.segmentKind, 'caption');
  assert.equal(
    runSearch(makeSearchEntries([{ ...work, visibility: 'unlisted' }]), {
      ...defaultFilters,
      q: '조판',
    }).length,
    0,
  );
});
test('사용 관계는 최신 버전 대신 당시 버전/구간을 유지하고 슬라이드로 돌아간다', () => {
  const media: Media = {
    id: 'm',
    workId: 'film',
    title: '영상',
    currentVersion: 'new',
    versions: [
      { id: 'old', url: 'https://example.com/old.mp4', label: 'old' },
      { id: 'new', url: 'https://example.com/new.mp4', label: 'new' },
    ],
    poster: '/a.webp',
    credits: '출처',
    external: false,
  };
  const usage: Usage = {
    workId: 'talk',
    mediaId: 'm',
    version: 'old',
    start: 3,
    end: 9,
    role: 'reference',
    label: '설명',
  };
  assert.equal(
    usageHref(usage, media, owner),
    '/motion/film/?v=old&start=3&end=9#watch',
  );
  assert.equal(
    usageHref(usage, { ...media, external: true }, owner),
    'https://example.com/old.mp4',
  );
  assert.equal(
    slideHref(
      {
        ...owner,
        href: '/talks/talk/',
        segments: [{ id: 's03', title: '제목', text: '내용', href: '' }],
      },
      's03',
    ),
    '/talks/talk/read/#s03',
  );
  assert.equal(slideHref(owner, 'missing'), owner.href);
});
test('삽입 코드는 고정 540px 없이 비율을 유지하고 속성을 이스케이프', () => {
  const code = embedCode('https://example.com/?v=1&start=3', '작품 "A" <B>');
  assert(code.includes('aspect-ratio:16/9'));
  assert(code.includes('height:100%'));
  assert(!code.includes('height="540"'));
  assert(code.includes('&amp;start'));
  assert(code.includes('&quot;A&quot; &lt;B&gt;'));
});

test('서로 다른 자막 구간의 AND 검색은 작품으로 연결한다', () => {
  const work = {
    ...owner,
    body: '고무 블랭킷 책등',
    segments: [
      {
        id: 'one',
        title: '1–3초',
        text: '고무 블랭킷',
        href: clipHref('film', 'v1', 1, 3),
        kind: 'caption' as const,
      },
      {
        id: 'two',
        title: '4–6초',
        text: '책등',
        href: clipHref('film', 'v1', 4, 6),
        kind: 'caption' as const,
      },
    ],
  };
  const hits = runSearch(makeSearchEntries([work]), {
    ...defaultFilters,
    q: '고무 책등',
  });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].href, owner.href);
  const cue = runSearch(makeSearchEntries([work]), {
    ...defaultFilters,
    q: '블랭킷',
  });
  assert.equal(cue[0].href, clipHref('film', 'v1', 1, 3));
});
