import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import {
  renderReader,
  readerRelations,
  validateReaderCoverage,
} from '../src/lib/reader';
test('reader preserves media, callout, heading depth, task state and footnote round trip', () => {
  const r = renderReader(
    '## 한글\n\n> [!NOTE]\n> 본문\n\n#### 세부\n\n![원본](/img.png)\n\n- [x] 완료\n- [ ] 대기\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n문장[^a]\n\n[^a]: 출처\n',
  );
  const $ = load(r.html);
  assert.deepEqual(r.images, ['/img.png']);
  assert.equal($('.reader-callout').length, 1);
  assert(!r.text.includes('[!NOTE]'));
  assert(r.headings.some((h) => h.depth === 4));
  assert.equal($('input[checked]').length, 1);
  assert.equal($('table').length, 1);
  assert.equal($('section.footnotes').length, 1);
});
test('stable headings and old alias retain section links; duplicate identifiers rejected', () => {
  const r = renderReader('## 제목\n\n본문');
  const h = r.headings[0];
  assert.equal(
    renderReader('## 앞의 제목\n\n## 제목\n\n본문').headings[1].id,
    h.id,
  );
  assert(
    renderReader('## 제목\n\n본문', { [h.id]: ['section-1'] }).html.includes(
      'id="section-1"',
    ),
  );
  assert.throws(() => renderReader('<h2 id="same">A</h2><h2 id="same">B</h2>'));
  assert.throws(() => renderReader('[깨짐](#missing)'));
  assert.equal(
    new Set(renderReader('## 중복\n\n## 중복').headings.map((h) => h.id)).size,
    2,
  );
});
test('private/executable content cannot survive into downloadable Markdown', () => {
  for (const md of [
    '<script>alert(1)</script>',
    '<div data-private>secret</div>',
    '<iframe src="https://a.test"></iframe>',
    '<img src="/image.png" alt="x" onerror="alert(1)">',
    '<aside data-notes>private note</aside>',
    '[x](javascript:alert)',
    '![x](data:image/png;base64,abc)',
    '[[미게시 노트]]',
  ])
    assert.throws(() => renderReader(md));
  const r = renderReader(
    '본문 `[[코드 문법]]`\n\n[[공개 노트]]',
    {},
    { '공개 노트': '/talks/public/' },
  );
  assert(r.links.includes('/talks/public/'));
});

test('Markdown export resolves images while preserving code examples', () => {
  const r = renderReader(
    '![원본](/image.png)\n\n`[문법](/path)`\n\n```md\n![예시](/example.png)\n```',
  );
  assert(
    r.markdown.includes('![원본](https://achmage-slides.vercel.app/image.png)'),
  );
  assert(r.markdown.includes('`[문법](/path)`'));
  assert(r.markdown.includes('![예시](/example.png)'));
});
test('original coverage catches omitted text independently of manifest counts', () => {
  const src =
    '<section><h2>제목</h2><p>반드시 남을 원문</p><aside class="speaker-notes">비공개</aside></section>';
  assert.throws(() =>
    validateReaderCoverage(src, 'html', renderReader('## 제목')),
  );
  assert.equal(
    validateReaderCoverage(
      src,
      'html',
      renderReader('## 제목\n\n반드시 남을 원문'),
    ),
    2,
  );
});
test('graph distinguishes actual citation and shared topic and excludes hidden titles', () => {
  const work = (id: string, visibility = 'listed') => ({
    id,
    slug: id,
    title: id,
    kind: 'talk' as const,
    visibility: visibility as 'listed',
    topics: ['교육'],
    artifacts: [],
  });
  const a = { ...work('a'), reader: renderReader('[인용](/talks/b/)') };
  const r = readerRelations(a, [
    a,
    work('b'),
    work('c'),
    work('secret', 'unlisted'),
    work('draft', 'draft'),
  ]);
  assert.deepEqual(
    r.map((x) => x.id),
    ['b', 'c'],
  );
  assert.deepEqual(r[0].kinds, ['citation', 'topic']);
  assert.deepEqual(r[1].kinds, ['topic']);
  const absolute = {
    ...a,
    reader: renderReader(
      '[인용](https://achmage-slides.vercel.app/talks/b/read/#section)',
    ),
  };
  assert.deepEqual(readerRelations(absolute, [absolute, work('b')])[0].kinds, [
    'citation',
    'topic',
  ]);
  assert.deepEqual(
    readerRelations({ ...a, visibility: 'unlisted' }, [a, work('b')]),
    [],
  );
});
