import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateReview } from '../scripts/release-gate';
import { policy } from '../src/lib/policy';
import printManifest from '../content/print-manifest.json';
test('reader gate rejects a missing or incomplete per-page receipt', () => {
  const route = '/talks/test/read/';
  const r = JSON.parse(
    fs.readFileSync('validation/release-review.json', 'utf8'),
  );
  r.policyVersion = policy.version;
  r.digest = 'fixture';
  r.status = 'passed';
  r.prints = Object.entries(printManifest.works).map(([workId, p]) => ({
    workId,
    ...p,
    reviewedPages: Array.from({ length: p.pages }, (_, i) => i + 1),
    firstPageBody: true,
    sourceText: true,
    imagesLegible: true,
    pdfOpen: true,
    pdfDownload: true,
  }));
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
  assert.throws(
    () => validateReview({ ...r, prints: [] }, 'fixture', [route]),
    /PDF 검토/,
  );
  assert.throws(
    () =>
      validateReview(
        { ...r, prints: r.prints.map((p: any) => ({ ...p, sha256: 'stale' })) },
        'fixture',
        [route],
      ),
    /PDF 검토/,
  );
  const blocked = r.prints.map((p: any) => ({
    ...p,
    pdfOpen: 'browser-blocked',
    pdfResponse200: true,
    pdfBytesVerified: true,
    browserLimitation:
      'Edge extension UI blocks browser automation after opening a PDF tab.',
  }));
  validateReview({ ...r, prints: blocked }, 'fixture', [route]);
  for (const key of ['pdfResponse200', 'pdfBytesVerified', 'pdfDownload'])
    assert.throws(
      () =>
        validateReview(
          { ...r, prints: blocked.map((p: any) => ({ ...p, [key]: false })) },
          'fixture',
          [route],
        ),
      /PDF 검토/,
    );
  assert.throws(
    () =>
      validateReview(
        {
          ...r,
          prints: blocked.map((p: any) => ({ ...p, browserLimitation: '' })),
        },
        'fixture',
        [route],
      ),
    /PDF 검토/,
  );
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
