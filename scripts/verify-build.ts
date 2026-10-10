import {verifyExperiments} from './experiments';
import {verifyReaders} from './verify-readers';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { localAssetPath, rejectDraftResource } from './resource-files';
const raw = JSON.parse(await fs.readFile('content/works.json', 'utf8'));
const resources = JSON.parse(await fs.readFile('content/resources.json','utf8'));
for(const r of resources.filter((r:any)=>raw.find((w:any)=>w.id===r.workId)?.visibility==='draft')){
  await rejectDraftResource('dist',r);
}
const baseline = JSON.parse(await fs.readFile('content/legacy.json', 'utf8'));
const sitemap = await fs.readFile('dist/sitemap.xml', 'utf8');
const search = await fs.readFile('dist/search-index.json', 'utf8');
const catalogue = await fs.readFile('dist/catalogue.json', 'utf8');
for (const item of baseline) {
  const bytes = await fs.readFile('dist' + item.url);
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    item.sha256,
    'Legacy byte preservation',
  );
}
for (const w of raw) {
  const href = (w.kind === 'motion' ? '/motion/' : '/talks/') + w.slug + '/';
  if (w.visibility === 'draft') {
    await assert.rejects(fs.access('dist' + href + 'index.html'));
    for (const a of w.artifacts)
      if (a.url.startsWith('/'))
        await assert.rejects(
          fs.access(localAssetPath('dist',a.url)!),
          'Draft asset must not be shipped',
        );
  }
  if (w.visibility !== 'listed') {
    assert(
      !JSON.parse(search).entries.some((x: any) => x.workId === w.id),
      'Hidden search entry',
    );
    assert(
      !JSON.parse(catalogue).works.some((x: any) => x.id === w.id),
      'Hidden catalogue entry',
    );
    assert(!sitemap.includes(href), 'Hidden sitemap');
  }
  if (w.visibility !== 'draft') {
    const html = await fs.readFile('dist' + href + 'index.html', 'utf8');
    const $ = load(html);
    assert.equal(
      $('meta[name=robots]').attr('content'),
      w.seo === 'noindex' || w.visibility !== 'listed'
        ? 'noindex,follow'
        : 'index,follow',
    );
    if (w.seo === 'noindex')
      assert(!sitemap.includes(href), 'noindex in sitemap');
  }
}
const files = await fs.readdir('dist', { recursive: true });
let htmlCount = 0;
for (const file of files.filter((f) => f.endsWith('.html'))) {
  if (baseline.some((b: any) => b.url === '/' + file.replaceAll('\\', '/')))
    continue;
  htmlCount++;
  const text = await fs.readFile(path.join('dist', file), 'utf8');
  const $ = load(text);
  for (const el of $(
    'a[href],img[src],script[src],link[href],source[src],track[src]',
  ).toArray()) {
    const url = $(el).attr('href') || $(el).attr('src') || '';
    if (!url.startsWith('/') || url.startsWith('//')) continue;
    let clean = decodeURIComponent(url.split(/[?#]/)[0]);
    if (clean.endsWith('/')) clean += 'index.html';
    await fs.access(path.join('dist', clean)).catch(() => {
      throw Error('Broken local asset ' + url + ' in ' + file);
    });
  }
  assert(
    !text.includes('C:\\Users\\') && !text.includes('htmlSource'),
    'Local metadata leak',
  );
}
assert(
  !/speaker.?notes|presenter.?notes|encryptedNotes|password/i.test(search),
  'Notes field in public search index',
);
console.log(
  'Build verified: ' +
    htmlCount +
    ' HTML pages; legacy SHA256, local links, indexing policy, public data.',
);

await verifyExperiments(process.cwd(),'dist');
await verifyReaders();
