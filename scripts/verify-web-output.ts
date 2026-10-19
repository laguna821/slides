import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import {policy} from '../src/lib/policy';
import {
  isBrandAsset,
  isMedia,
  isRemoved,
  isText,
  readManifest,
  replaceData,
  regularFiles,
  siteOrigin,
} from './web-assets';
export async function verifyWebOutput(root = 'web-dist', sourceRoot = 'dist') {
  const manifest = await readManifest();
  const redirects=JSON.parse(await fs.readFile('vercel.json','utf8')).redirects||[];
  const list = await regularFiles(root);
  let bytes = 0,
    maxHtmlBytes = 0,
    htmlCount = 0;
  const imageUrls = new Set(
    Object.values(manifest.assets)
      .filter((a) => a.kind === 'image')
      .map((a) => a.url),
  );
  const allowedExternalImages = new Set([
    'https://labs.cmdspace.work/assets/cmds-logo-round.png',
  ]);
  const checkMedia = (value: string, file: string) => {
    const url = new URL(value, new URL('/' + file, siteOrigin));
    if (url.protocol !== 'https:' && url.origin !== siteOrigin)
      throw Error('Unsupported media protocol: ' + file);
    if (url.origin === siteOrigin) {
      assert(
        isBrandAsset(decodeURIComponent(url.pathname).slice(1)),
        'Unregistered local image: ' + value + ' in ' + file,
      );
      return;
    }
    url.hash = '';
    url.search = '';
    assert(
      imageUrls.has(url.href) || allowedExternalImages.has(url.href),
      'Unregistered remote image: ' + value + ' in ' + file,
    );
  };
  for (const file of list) {
    assert(!isRemoved(file), 'PDF/ZIP in deployment: ' + file);
    assert(
      !isMedia(file) || isBrandAsset(file),
      'Local content media in deployment: ' + file,
    );
    const b = await fs.readFile(path.join(root, file));
    bytes += b.length;
    if (!isText(file)) continue;
    const text = b.toString();
    assert(
      !/data:(?:image|font|application\/(?:font|x-font|pdf))/i.test(text),
      'Embedded asset in ' + file,
    );
    for (const m of text.matchAll(/https?:[^\s"'<>\\)]+/g))
      if (/\.(?:png|jpe?g|webp|gif|avif|svg)(?:[?#]|$)/i.test(m[0]))
        checkMedia(m[0], file);
    for (const m of text.matchAll(/url\(\s*["']?([^)'"\s]+)/g))
      if (isMedia(m[1].split(/[?#]/)[0])) checkMedia(m[1], file);
    if (!file.endsWith('.html')) continue;
    htmlCount++;
    maxHtmlBytes = Math.max(maxHtmlBytes, b.length);
    assert(b.length <= policy.storage.maxHtmlBytes, 'HTML exceeds '+(policy.storage.maxHtmlBytes/1048576)+' MiB: ' + file);
    const $ = load(text);
    const source = await fs.readFile(path.join(sourceRoot, file), 'utf8');
    // Embedded binary image/font payloads are not DOM text or anchors. Resolve
    // them through the verified manifest before parsing the archival source.
    // Raw source hashes remain independently preserved by build-web proofs.
    const original = load(replaceData(source, manifest));
    if (original('#lesson-data').length)
      assert.deepEqual(
        JSON.parse($('#lesson-data').text()),
        JSON.parse(original('#lesson-data').text()),
        'Interactive lesson data changed: ' + file,
      );
    if ($('#reader-exports').length) {
      const payload = JSON.parse($('#reader-exports').text());
      for (const kind of ['text', 'markdown']) {
        const url = $('[data-copy-reader="' + kind + '"]').attr('data-url');
        assert(url?.startsWith('/'), 'Missing reader export URL: ' + file);
        const expected = await fs.readFile(path.join(root, url!), 'utf8');
        assert.equal(
          payload[kind].replaceAll('\r\n', '\n'),
          expected.replaceAll('\r\n', '\n'),
          'Reader copy/download mismatch: ' + file + '/' + kind,
        );
      }
    }
    for (const e of $('img[src],picture source[src],video[poster]').toArray())
      checkMedia($(e).attr('src') || $(e).attr('poster')!, file);
    for (const e of $('[srcset]').toArray())
      for (const item of $(e).attr('srcset')!.split(','))
        checkMedia(item.trim().split(/\s+/)[0], file);
    for (const doc of [original, $]) {
      doc('a[href]').each((_, e) => {
        if (isRemoved(doc(e).attr('href')!)) doc(e).remove();
      });
      doc(
        '[data-reader-print],[data-download-pdf],[data-reading-pdf]',
      ).remove();
      doc('.tools small').each((_, e) => {
        if (/PDF/.test(doc(e).text())) doc(e).remove();
      });
    }
    // Publishing changes asset addresses, not the text, slide order, or locked notes.
    if (original('#speaker-notes-enc').length) {
      assert.equal(
        $('#speaker-notes-enc').length,
        original('#speaker-notes-enc').length,
        'Lost notes envelope: ' + file,
      );
      assert.equal(
        $('#speaker-notes-enc').html(),
        original('#speaker-notes-enc').html(),
        'Encrypted notes changed: ' + file,
      );
    }
    const visible = (doc: ReturnType<typeof load>) => {
      const clone = load(doc.html());
      clone('script,style').remove();
      return clone('body').text().replace(/\s+/g, ' ').trim();
    };
    assert.equal(
      visible($),
      visible(original),
      'Published text changed: ' + file,
    );
    const outputIds = new Set(
      $('[id]')
        .toArray()
        .map((n) => $(n).attr('id')),
    );
    for (const e of original('[id]').toArray())
      assert(outputIds.has(original(e).attr('id')), 'Lost anchor in ' + file);
    for (const e of $('[src],[href],[poster]').toArray())
      for (const attr of ['src', 'href', 'poster']) {
        const s = $(e).attr(attr);
        if (
          !s ||
          s.startsWith('#') ||
          /^(?:mailto|tel|javascript|data):/.test(s)
        )
          continue;
        assert(!isRemoved(s), 'PDF/ZIP link in ' + file + ': ' + s);
        let u: URL;
        try {
          u = new URL(s, new URL('/' + file, siteOrigin));
        } catch {
          throw Error('Invalid asset URL in ' + file);
        }
        if (u.origin !== siteOrigin) continue;
        let rel = decodeURIComponent(u.pathname);
        if (manifest.paths[rel]) continue;
        const alias=redirects.find((r:any)=>r.source===rel);
        if(alias){const destination=new URL(alias.destination,siteOrigin);if(destination.origin!==siteOrigin)continue;rel=decodeURIComponent(destination.pathname);}
        const target = path.resolve(
          root,
          '.' + rel + (rel.endsWith('/') ? 'index.html' : ''),
        );
        assert(
          target.startsWith(path.resolve(root) + path.sep),
          'Outside output path',
        );
        await fs.access(target).catch(() => {
          throw Error('Broken deployed link: ' + s + ' in ' + file);
        });
      }
  }
  assert(bytes <= policy.storage.maxBytes, 'Deployment exceeds '+(policy.storage.maxBytes/1048576)+' MiB');
  return {
    version: 1,
    bytes,
    htmlCount,
    maxHtmlBytes,
    pdfFiles: 0,
    zipFiles: 0,
    embeddedAssets: 0,
    localContentImages: 0,
  };
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/verify-web-output.ts'))
  console.log(await verifyWebOutput());
