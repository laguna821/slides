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
  r.readerNavigation = [375, 768, 1440].flatMap((width) =>
    ['light', 'dark'].map((theme) => ({
      route,
      width,
      actualWidth: width,
      theme,
      themeSwitch: true,
      themeSync: true,
      themePersisted: true,
      tocReachable: true,
      keyboard: true,
      scrollShift: 0,
      positions: ['start', 'middle', 'end'].map((position) => ({
        position,
        controlsVisible: true,
        sameRow: true,
        noOverlap: true,
        minTarget: 44,
        toolbarTop: 0,
      })),
    })),
  );
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
      copySection: true,
      download: true,
      imageZoom: true,
      graph: true,
      anchors: true,
      print: true,
    },
  ];
  r.editorialViews=[320,1920].flatMap(width=>['light','dark'].map(theme=>({route,width,actualWidth:width,theme,overflow:false,columnWidth:width===1920?720:284})));
  validateReview(r, 'fixture', [route]);
  assert.throws(()=>validateReview({...r,editorialViews:r.editorialViews.map((x:any)=>({...x,columnWidth:250}))},'fixture',[route]),/본문 폭/);
  assert.throws(()=>validateReview({...r,readers:r.readers.map((x:any)=>({...x,copySection:false}))},'fixture',[route]),/문단 링크/);
  validateReview({ ...r, prints: [], englishPrints: [] }, 'fixture', [route]);
  for (const key of [
    'toc',
    'copyText',
    'copyMarkdown',
    'download',
    'imageZoom',
    'graph',
    'anchors',
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
