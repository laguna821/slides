import { Marked } from 'marked';
import markedFootnote from 'marked-footnote';
import { load } from 'cheerio';
import sanitizeHtml from 'sanitize-html';
import { createHash } from 'node:crypto';
import { workHref, type Work } from './schema';

export const READER_VERSION = '1.0.0';
/** Embedded fonts must be subset to the figure; never duplicate a whole deck font. */
export function validateReaderSvgFont(svg: string, original?: string) {
  const fonts = [...svg.matchAll(/data:font\/[^;,]+;base64,([^\s)'\"]+)/g)];
  if (
    fonts.reduce((n, m) => n + Buffer.from(m[1], 'base64').length, 0) >
    128 * 1024
  )
    throw Error('Reader SVG embedded font exceeds 128 KiB; subset its glyphs');
  const withoutFonts = (s: string) => s.replace(/@font-face\s*\{[^}]+\}/g, '');
  if (original !== undefined && withoutFonts(svg) !== withoutFonts(original))
    throw Error('SVG subset changed original vector or text');
}
export const sha = (s: string | Buffer) =>
  createHash('sha256').update(s).digest('hex');
export const plainKey = (s: string) => s.normalize('NFC').replace(/\s+/g, '');
export const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
export type ReaderHeading = { id: string; title: string; depth: number };
export type ReaderDocument = {
  version: string;
  html: string;
  text: string;
  markdown: string;
  headings: ReaderHeading[];
  images: string[];
  links: string[];
  sourceHash: string;
};
export type ReaderRelation = {
  id: string;
  title: string;
  href: string;
  kinds: ('citation' | 'topic')[];
  topics: string[];
};
export function validateReaderCoverage(
  source: string,
  kind: 'markdown' | 'html',
  reader: ReaderDocument,
) {
  const leaves: string[] = [];
  if (kind === 'markdown') leaves.push(renderReader(source).text);
  else {
    const $ = load(source);
    $(
      'script,style,template,noscript,.speaker-notes,.presenter-notes,[data-private],[data-speaker-notes],[data-notes],aside.notes,#speaker-notes,#notes,.toolbar,.controls,[role=toolbar],dialog,.modal,.chrome-tl,.chrome-tr,.chrome-bl,.chrome-br,[hidden]',
    ).remove();
    $('section').each((_, s) => {
      const visit = (n: any) => {
        if (n.type === 'text' && n.data.trim()) leaves.push(n.data);
        for (const c of n.children || []) visit(c);
      };
      visit(s);
    });
  }
  const actual = plainKey(reader.text);
  const missing = leaves.filter((s) => !actual.includes(plainKey(s)));
  if (!leaves.length || missing.length)
    throw Error(
      'Reader original text missing: ' + JSON.stringify(missing.slice(0, 3)),
    );
  return leaves.length;
}
const parser = new Marked({ gfm: true }, markedFootnote());

/** Render public authored Markdown once; scripts and arbitrary style never enter the reader. */
export function renderReader(
  markdown: string,
  aliases: Record<string, string[]> = {},
  wiki: Record<string, string> = {},
  sizes: Record<string, { width: number; height: number }> = {},
): ReaderDocument {
  const clean = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\s*\r?\n/, '');
  const $ = load(parser.parse(clean, { async: false }) as string, null, false);
  if (
    $(
      'script,style,template,noscript,iframe,object,embed,form,[data-private],[data-speaker-notes],[data-notes],aside.notes,#speaker-notes,#notes,.speaker-notes,.presenter-notes,[hidden]',
    ).length
  )
    throw Error('Private or executable content in public Markdown');
  $('*').each((_, el) => {
    if (
      Object.keys('attribs' in el ? el.attribs : {}).some(
        (k) => /^on/i.test(k) || k === 'srcdoc',
      )
    )
      throw Error('Executable attribute in public Markdown');
  });
  $(
    'script,style,template,iframe,object,embed,[data-private],[data-speaker-notes],.speaker-notes,.presenter-notes,[hidden]',
  ).remove();
  // Resolve wiki syntax only in text nodes, never inside code or raw attributes.
  const visit = (nodes: any[]) =>
    nodes.forEach((n) => {
      if (n.type === 'text' && /!?\[\[/.test(n.data)) {
        if ($(n).parents('pre,code').length) return;
        $(n).replaceWith(
          escape(n.data).replace(
            /(!?)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
            (_m, embed, target, label) => {
              const url = wiki[target];
              if (!url) throw Error('Unresolved public wiki link: ' + target);
              return embed
                ? `<img src="${escape(url)}" alt="${label || target}">`
                : `<a href="${escape(url)}">${label || target}</a>`;
            },
          ),
        );
      } else if (n.children) visit([...n.children]);
    });
  visit($.root().contents().toArray());
  $('blockquote').each((_, el) => {
    const first = $(el).children('p').first();
    const m = first.html()?.match(/^\[!([\w-]+)\]([+-])?\s*/);
    if (!m) return;
    const type = m[1].toLowerCase();
    $(el).addClass('reader-callout').attr('data-callout', type);
    first.html(first.html()!.slice(m[0].length));
    $(el).prepend(
      `<span class="callout-label">${escape(type.toUpperCase())}</span>`,
    );
  });
  const counts = new Map<string, number>();
  const headings: ReaderHeading[] = [];
  $('h1,h2,h3,h4,h5,h6').each((_, el) => {
    const h = $(el),
      title = h.text().trim(),
      base = 'h-' + sha(title).slice(0, 12),
      n = (counts.get(base) || 0) + 1;
    counts.set(base, n);
    const key = n === 1 ? base : base + '-' + n,
      id = h.attr('id') || key;
    h.attr('id', id);
    headings.push({ id, title, depth: Number(el.tagName.slice(1)) });
    for (const alias of aliases[id] || [])
      if (alias !== id)
        h.before(`<span class="reader-anchor" id="${escape(alias)}"></span>`);
  });
  $('a[href]').each((_, el) => {
    const a = $(el),
      url = a.attr('href')!;
    if (/^(?:javascript|data|file|obsidian):/i.test(url))
      throw Error('Unsafe reader link');
    a.attr('rel', 'noopener noreferrer');
  });
  $('img').each((_, el) => {
    const img = $(el),
      src = img.attr('src') || '';
    if (!/^(?:https:\/\/|\/(?!\/))/.test(src))
      throw Error(
        'Reader image needs resolved public URL: ' + src.slice(0, 120),
      );
    if (!img.attr('alt')?.trim())
      throw Error('Reader image alt required: ' + src);
    img.attr('loading', 'lazy').attr('decoding', 'async');
    if (sizes[src])
      img
        .attr('width', String(sizes[src].width))
        .attr('height', String(sizes[src].height));
  });
  const html = sanitizeHtml($.html(), {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      'img',
      'figure',
      'figcaption',
      'input',
    ],
    allowedAttributes: {
      '*': ['id'],
      a: [
        'href',
        'title',
        'rel',
        'aria-label',
        'data-footnote-ref',
        'data-footnote-backref',
      ],
      img: ['src', 'alt', 'title', 'loading', 'decoding', 'width', 'height'],
      span: ['class'],
      blockquote: ['class', 'data-callout'],
      section: ['class', 'data-footnotes'],
      code: ['class'],
      input: ['type', 'checked', 'disabled'],
      th: ['align'],
      td: ['align'],
    },
    allowedClasses: {
      span: ['reader-anchor', 'callout-label'],
      blockquote: ['reader-callout'],
      section: ['footnotes'],
      code: [/^language-/],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: { img: ['https'] },
    allowProtocolRelative: false,
    transformTags: {
      input: (_tag, attrs) => ({
        tagName: 'input',
        attribs: {
          type: 'checkbox',
          disabled: '',
          ...('checked' in attrs ? { checked: '' } : {}),
        },
      }),
    },
  });
  const out = load(html, null, false);
  const ids = out('[id]')
    .map((_, e) => out(e).attr('id')!)
    .get();
  if (new Set(ids).size !== ids.length) throw Error('Duplicate reader anchor');
  for (const a of out('a[href^="#"]').toArray())
    if (!ids.includes(decodeURIComponent(out(a).attr('href')!.slice(1))))
      throw Error('Broken reader anchor: ' + out(a).attr('href'));
  const portable = parser
    .lexer(clean)
    .map((token) =>
      token.type === 'code'
        ? token.raw
        : token.raw
            .split(/(`+[^`]*`+)/g)
            .map((part, i) =>
              i % 2
                ? part
                : part.replace(
                    /(\]\()\/(?!\/)/g,
                    '$1https://achmage-slides.vercel.app/',
                  ),
            )
            .join(''),
    )
    .join('');
  return {
    version: READER_VERSION,
    html,
    text: out.text(),
    markdown: portable,
    headings,
    images: out('img')
      .map((_, e) => out(e).attr('src')!)
      .get(),
    links: out('a[href]')
      .map((_, e) => out(e).attr('href')!)
      .get(),
    sourceHash: sha(markdown),
  };
}

export function readerRelations(
  current: Pick<Work, 'id' | 'topics' | 'visibility'>,
  works: (Pick<
    Work,
    'id' | 'slug' | 'title' | 'kind' | 'topics' | 'visibility' | 'artifacts'
  > & { reader?: ReaderDocument })[],
): ReaderRelation[] {
  if (current.visibility !== 'listed') return [];
  const here = works.find((w) => w.id === current.id);
  const address = (value: string) => {
    try {
      const u = new URL(value, 'https://achmage-slides.vercel.app');
      return u.origin + u.pathname;
    } catch {
      return value;
    }
  };
  const references = (from: typeof here, to: typeof here) => {
    if (!from || !to) return false;
    const destination = workHref(to),
      targets = [
        destination,
        destination + 'read/',
        ...to.artifacts.map((a) => a.url),
      ].map(address);
    return (
      from.reader?.links.some((link) => targets.includes(address(link))) ||
      false
    );
  };
  return works
    .filter((w) => w.visibility === 'listed' && w.id !== current.id)
    .flatMap((w) => {
      const href = workHref(w);
      const citation = references(here, w) || references(w, here);
      const topics = w.topics.filter((t) => current.topics.includes(t));
      if (!citation && !topics.length) return [];
      return [
        {
          id: w.id,
          title: w.title,
          href,
          kinds: [
            ...(citation ? ['citation' as const] : []),
            ...(topics.length ? ['topic' as const] : []),
          ],
          topics,
        },
      ];
    });
}
