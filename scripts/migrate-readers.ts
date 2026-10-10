/** One-time, explicit migration of the four approved public sources. Not a vault crawler. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { load } from 'cheerio';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { renderReader, sha, plainKey, escape } from '../src/lib/reader';
import { extractHtml, renderMarkdown } from '../src/lib/extract';
const works = JSON.parse(await fs.readFile('content/works.json', 'utf8'));
if (works.some((w: any) => w.reader))
  throw Error(
    'One-time migration already applied. Update an explicitly registered source and renew its coverage instead.',
  );
const td = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
td.use(gfm);
td.addRule('blocks', {
  filter: ['div', 'section'],
  replacement: (c) => '\n\n' + c + '\n\n',
});
const privateSel =
  'script,style,template,noscript,.speaker-notes,.presenter-notes,[data-private],[data-speaker-notes],[data-notes],aside.notes,#speaker-notes,#notes,.toolbar,.controls,[role=toolbar],dialog,.modal';
const manifest: any = { version: '1.0.0', works: {} };
for (const w of works.filter((w: any) => w.kind === 'talk')) {
  const previous = w.markdownSource
    ? execFileSync('git', ['show', 'HEAD:' + w.markdownSource], {
        encoding: 'utf8',
      })
    : '';
  const legacy = w.htmlSource
    ? extractHtml(await fs.readFile(w.htmlSource, 'utf8'), '/').segments
    : extractHtml(renderMarkdown(previous), '/').segments;
  const assetRoot = 'public/reading/' + w.slug + '/assets';
  await fs.mkdir(assetRoot, { recursive: true });
  const source = w.id.startsWith('educational-harness')
    ? 'public/decks/' + w.slug + '/v1/source.md'
    : w.htmlSource ||
      'public' + w.artifacts.find((a: any) => a.type === 'html').url;
  const raw = await fs.readFile(source, 'utf8');
  const sourceHash = sha(Buffer.from(raw));
  let markdown = '',
    units: any[] = [],
    imageSources: any[] = [];
  const publicAsset = async (bytes: Buffer, ext: string) => {
    const h = sha(bytes),
      url = '/reading/' + w.slug + '/assets/' + h.slice(0, 20) + '.' + ext;
    await fs.writeFile('public' + url, bytes);
    return url;
  };
  if (source.endsWith('.md')) {
    markdown = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\s*\r?\n/, '');
    // Use already verified deck images; preserve source URL -> exact byte mapping.
    const matches = [...markdown.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
    const sourceManifest = JSON.parse(
      await fs.readFile('docs/educational-harness-provenance.json', 'utf8'),
    );
    // Exact source URL and pinned byte hash, never filename/order inference.
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i],
        entry = sourceManifest.source.images.find(
          (x: any) =>
            x.source === m[2] || '/decks/' + w.slug + '/v1/' + x.file === m[2],
        );
      if (!entry) throw Error('Source image mapping missing');
      const local = entry.file;
      const file = path.resolve('public/decks/' + w.slug + '/v1', local),
        bytes = await fs.readFile(file);
      if (sha(bytes) !== entry.sha256)
        throw Error('Image provenance hash mismatch');
      const url = '/decks/' + w.slug + '/v1/' + local;
      markdown = markdown.replace(m[0], `![${entry.alt}](${url})`);
      imageSources.push({ source: m[2], url, sha256: sha(bytes) });
    }
    const original = renderReader(markdown);
    units = [{ id: 'original-manuscript', text: original.text }];
  } else {
    const $ = load(raw);
    const css = $('style').text();
    $(privateSel).remove();
    $('.chrome-tl,.chrome-tr,.chrome-bl,.chrome-br').remove();
    const sections = $('section');
    if (!sections.length) throw Error('No source slides');
    const chunks: string[] = [];
    for (let i = 0; i < sections.length; i++) {
      const s = $(sections[i]);
      s.find('[hidden]').remove();
      const before = s.text();
      const sourceUrl = w.artifacts.find((a: any) => a.type === 'html').url;
      for (const img of s.find('img').toArray()) {
        const im = $(img),
          src = im.attr('src') || '';
        let url = src;
        if (src.startsWith('data:image/')) {
          const m = src.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/s);
          if (!m) throw Error('Unsupported image');
          url = await publicAsset(Buffer.from(m[2], 'base64'), m[1]);
        } else if (!/^https:\/\//.test(src))
          url = new URL(src, 'https://achmage-slides.vercel.app' + sourceUrl)
            .pathname;
        im.attr('src', url).attr(
          'alt',
          im.attr('alt') || `${i + 1}장 원문 시각자료`,
        );
        imageSources.push({
          source: src.slice(0, 100),
          url,
          sha256: url.startsWith('/')
            ? sha(await fs.readFile('public' + url))
            : null,
        });
      }
      // Preserve diagrams as standalone vectors, with their original labels also in text.
      for (const svg of s.find('svg').toArray()) {
        const v = $(svg);
        if (!v.find('text').length) {
          v.remove();
          continue;
        }
        const labels = v
          .find('text')
          .map((_, e) => $(e).text())
          .get();
        v.attr('xmlns', 'http://www.w3.org/2000/svg');
        v.removeAttr('style');
        v.prepend('<style>' + css.replace(/@import[^;]+;/g, '') + '</style>');
        const url = await publicAsset(Buffer.from($.html(v)), 'svg');
        v.replaceWith(
          `<figure><img src="${url}" alt="${i + 1}장 원문 도해"><figcaption>${labels.map(escape).join(' · ')}</figcaption></figure>`,
        );
        imageSources.push({
          source: `slide-${i + 1}-svg`,
          url,
          sha256: sha(await fs.readFile('public' + url)),
        });
      }
      s.find('h1,h2,h3,h4,h5,h6').each((_, e) => {
        const depth = Math.min(6, Number(e.tagName.slice(1)) + 2);
        e.tagName = 'h' + depth;
      });
      let converted = td.turndown(s.html() || '');
      const heading =
        s.find('h3,h4,.cover-title').first().text().trim() || `${i + 1}장`;
      const sourceAnchor =
        w.id === 'ai-reading-pilot'
          ? s.attr('id') || 'section-' + (i + 1)
          : String(i + 1);
      chunks.push(
        `## ${String(i + 1).padStart(2, '0')}. ${heading.replace(/\n/g, ' ')}\n\n[원본 ${i + 1}장 보기](${sourceUrl}#${sourceAnchor})\n\n${converted}`,
      );
      units.push({ id: 'slide-' + (i + 1), text: before });
    }
    markdown = chunks.join('\n\n---\n\n');
  }
  const mdFile = 'content/reading/' + w.slug + '.md';
  if (previous)
    await fs.writeFile('content/reading/' + w.slug + '.previous.md', previous);
  await fs.writeFile(mdFile, markdown + '\n');
  const rendered = renderReader(markdown + '\n');
  const aliases: Record<string, string[]> = {};
  const mainHeads = rendered.headings.filter((h) => h.depth === 2);
  for (let i = 0; i < legacy.length; i++) {
    let h = rendered.headings.find(
      (h) => plainKey(h.title) === plainKey(legacy[i].title),
    );
    if (!h && w.id === 'media-colloquium-2026-06-10')
      h = mainHeads[[0, 1, 9, 22, 38, 48, 53, 57][i] ?? 0];
    if (!h) h = mainHeads[i];
    if (h) {
      aliases[h.id] ||= [];
      aliases[h.id].push(legacy[i].id);
    }
  }
  const textKey = plainKey(rendered.text);
  // Text node boundary whitespace can change; the text of each source unit must remain.
  const coverage = units.map((u) => ({
    id: u.id,
    sha256: sha(u.text),
    characters: u.text.length,
    preserved:
      plainKey(u.text).split('').length === 0 ||
      textKey.includes(plainKey(u.text)),
  }));
  // Presentation SVG labels and block boundaries are reordered into readable blocks. Verify every source text leaf as well.
  let leaves: string[] = [];
  if (!source.endsWith('.md')) {
    const $ = load(raw);
    $(privateSel + ',.chrome-tl,.chrome-tr,.chrome-bl,.chrome-br').remove();
    $('section').each((_, s) => {
      const visit = (n: any) => {
        if (n.type === 'text' && n.data.trim()) leaves.push(n.data);
        for (const c of n.children || []) visit(c);
      };
      visit(s);
    });
  } else leaves = [rendered.text];
  const missing = leaves.filter((t) => !textKey.includes(plainKey(t)));
  if (missing.length)
    throw Error(w.id + ' text missing: ' + JSON.stringify(missing.slice(0, 8)));
  manifest.works[w.id] = {
    source,
    sourceSha256: sourceHash,
    markdownSha256: rendered.sourceHash,
    units: coverage,
    leafCount: leaves.length,
    missing: 0,
    images: imageSources,
    aliases,
  };
  delete w.htmlSource;
  delete w.markdownSource;
  w.reader = {
    version: '1.0.0',
    source: mdFile,
    sourceVersion:
      w.artifacts.find((a: any) => a.type === 'html')?.version || w.date,
    manifest: 'content/reading/manifest.json',
  };
  console.log(
    w.id,
    rendered.headings.length,
    'headings',
    rendered.images.length,
    'images',
    leaves.length,
    'text leaves',
  );
}
await fs.writeFile(
  'content/reading/manifest.json',
  JSON.stringify(manifest, null, 2) + '\n',
);
await fs.writeFile('content/works.json', JSON.stringify(works, null, 2) + '\n');
