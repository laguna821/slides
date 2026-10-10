import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateReview } from '../scripts/release-gate';
import { policy } from '../src/lib/policy';
test('reader gate rejects a missing or incomplete per-page receipt', () => {
  const route = '/talks/test/read/';
  const r = JSON.parse(
    fs.readFileSync('validation/release-review.json', 'utf8'),
  );
  r.policyVersion = policy.version;
  r.digest = 'fixture';
  r.status = 'passed';
  r.views = [375, 768, 1440].flatMap((width) =>
    ['light', 'dark'].map((theme) => ({
      route,
      width,
      actualWidth: width,
      theme,
      overflow: false,
      brokenImages: [],
    })),
  );
  r.readers = [
    {
      route,
      version: policy.readerVersion,
      toc: true,
      copyText: true,
      copyMarkdown: true,
      download: true,
      imageZoom: true,
      graph: true,
      anchors: true,
      print: true,
    },
  ];
  validateReview(r, 'fixture', [route]);
  for (const key of [
    'toc',
    'copyText',
    'copyMarkdown',
    'download',
    'imageZoom',
    'graph',
    'anchors',
    'print',
  ])
    assert.throws(() =>
      validateReview(
        { ...r, readers: [{ ...r.readers[0], [key]: false }] },
        'fixture',
        [route],
      ),
    );
  assert.throws(() =>
    validateReview({ ...r, readers: [] }, 'fixture', [route]),
  );
});
