import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import type { PublicWork } from '../src/lib/schema';
export async function verifyReaders(root = 'dist') {
  const data = JSON.parse(
    await fs.readFile('src/generated/content.json', 'utf8'),
  );
  for (const w of (data.works as PublicWork[]).filter((w) => w.reader)) {
    const r = w.reader!,
      html = await fs.readFile(root + w.href + 'read/index.html', 'utf8'),
      $ = load(html);
    assert.equal($('.reader-layout').attr('data-reader-version'), r.version);
    assert(w.readingPdf,'Reading PDF required');
    assert.equal($('[data-reader-print]').attr('href'),w.readingPdf.url);
    assert.equal($('[data-download-pdf]').attr('href'),w.readingPdf.url);
    assert((await fs.readFile(root+w.readingPdf.url)).subarray(0,5).equals(Buffer.from('%PDF-')));
    assert.equal(
      $('#reader-body img').length,
      r.images.length,
      'Image coverage',
    );
    for (const h of r.headings) {
      assert.equal($('#' + h.id).length, 1);
      assert.equal($(`.reader-toc a[href="#${h.id}"]`).length, 1);
    }
    assert.equal(
      await fs.readFile(root + w.href + 'read.md', 'utf8'),
      r.markdown,
      'Markdown export parity',
    );
    assert.equal(
      await fs.readFile(root + w.href + 'read.txt', 'utf8'),
      r.text,
      'Copy parity',
    );
    const ids = new Set(
      $('[id]')
        .map((_, e) => $(e).attr('id')!)
        .get(),
    );
    for (const a of $('a[href^="#"]').toArray())
      assert(
        ids.has(decodeURIComponent($(a).attr('href')!.slice(1))),
        'Missing reader anchor',
      );
    assert.equal(
      $('.reader-source-links a').first().attr('href'),
      w.artifacts.find((a) => a.type === 'html')?.url,
    );
    for (const relation of w.relations || [])
      assert(
        data.works.some(
          (x: PublicWork) => x.id === relation.id && x.visibility === 'listed',
        ),
        'Hidden relation',
      );
    for (const f of [html, r.text, r.markdown])
      assert(
        !/C:\\Users\\|\b(?:htmlSource|markdownSource)\b|data-speaker-notes/.test(
          f,
        ),
        'Reader metadata leak',
      );
  }
  console.log(
    'Reader output verified: text, media, TOC, export, public relations and anchors',
  );
}
