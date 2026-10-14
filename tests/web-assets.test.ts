import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assetKey,
  cleanJson,
  replaceData,
  transformText,
  webUrl,
  type Manifest,
} from '../scripts/web-assets';
const png = Buffer.from('fixture');
const m: Manifest = {
  version: 1,
  assets: {
    [assetKey('image/png', png)]: {
      sourceHash: 'fixture',
      sha256: 'fixture',
      bytes: 7,
      mime: 'image/png',
      kind: 'image',
      url: 'https://cdn.example/a.png',
      verifiedAt: 'fixture',
    },
  },
  paths: { '/images/a.png': 'https://cdn.example/a.png' },
};
test('unregistered embedded assets block publication instead of falling back', () => {
  assert.throws(
    () => replaceData('<img src="data:image/png;base64,bmV3">', m),
    /Unregistered/,
  );
  assert.equal(
    replaceData('data:image/png;base64,' + png.toString('base64'), m),
    'https://cdn.example/a.png',
  );
});
test('relative assets and Markdown become portable without rewriting other origins', () => {
  assert.equal(
    webUrl('../images/a.png', 'decks/index.html', m),
    'https://cdn.example/a.png',
  );
  assert.equal(
    webUrl('https://other.example/images/a.png', 'index.html', m),
    'https://other.example/images/a.png',
  );
  const result = transformText(
    '<img src="../images/a.png"><a href="slides.pdf?v=1">PDF</a><script>const n=1;</script>',
    'decks/index.html',
    m,
  );
  assert(result.includes('https://cdn.example/a.png'));
  assert(!result.includes('slides.pdf'));
  assert(result.includes('const n=1;'));
  assert.equal(
    transformText(
      '![figure](https://achmage-slides.vercel.app/images/a.png)',
      'read.md',
      m,
    ),
    '![figure](https://cdn.example/a.png)',
  );
});
test('PDF metadata and archived downloads do not leak into public catalogues', () => {
  const result = cleanJson({
    readingPdf: { url: '/read.pdf' },
    artifacts: [
      { type: 'pdf', url: '/a.pdf' },
      { type: 'html', url: '/a.html' },
    ],
    files: { '/a.zip': 'hash', '/a.html': 'hash' },
  });
  assert.deepEqual(result, {
    artifacts: [{ type: 'html', url: '/a.html' }],
    files: { '/a.html': 'hash' },
  });
});
test('unrelated JSON text and arrays remain intact', () => {
  const data = {
    body: 'Read appendix.pdf',
    answer: 'example.zip',
    items: ['one.pdf', 'two.zip'],
    pdf: { explanation: 'Keep this domain object' },
    nested: { caption: 'figure.pdf' },
  };
  assert.deepEqual(cleanJson(data), data);
});
