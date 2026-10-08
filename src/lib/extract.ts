import { load } from 'cheerio';
import sanitizeHtml from 'sanitize-html';
import { marked } from 'marked';
import type { Segment } from './schema';
const privateSelectors =
  'script,style,noscript,template,[hidden],[data-private],.speaker-notes,.presenter-notes,[data-speaker-notes],[data-notes],aside.notes,#speaker-notes,#notes';
export function normalizeVideoUrl(
  input: string,
  base = 'https://achmage-slides.vercel.app/',
) {
  let u: URL;
  try {
    u = new URL(input, base);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.replace(/^www\./, '');
  let id = '';
  if (host === 'youtu.be') id = u.pathname.slice(1);
  if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host))
    id =
      u.searchParams.get('v') ||
      u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ||
      '';
  if (/^[a-zA-Z0-9_-]{11}$/.test(id))
    return {
      key: 'youtube:' + id,
      url: 'https://www.youtube.com/watch?v=' + id,
      type: 'youtube' as const,
    };
  if (/\.(mp4|webm|mov)$/i.test(u.pathname)) {
    u.hash = '';
    return { key: u.origin + u.pathname, url: u.href, type: 'file' as const };
  }
  return null;
}
export function extractHtml(html: string, href: string) {
  const $ = load(html);
  $(
    privateSelectors + ',.toolbar,.controls,[role=toolbar],dialog,.modal',
  ).remove();
  const root = $('main').length
    ? $('main')
    : $('.stage').length
      ? $('.stage')
      : $('body');
  const videoMap = new Map<string, ReturnType<typeof normalizeVideoUrl>>();
  root.find('video,video source,iframe,a').each((_, e) => {
    const x = normalizeVideoUrl(
      $(e).attr('src') || $(e).attr('href') || '',
      new URL(href, 'https://achmage-slides.vercel.app').href,
    );
    if (x) videoMap.set(x.key, x);
  });
  const slides = root.find('.slide,section[data-slide]');
  const segments: Segment[] = [];
  const blocks: string[] = [];
  if (slides.length) {
    slides.each((i, e) => {
      const node = $(e);
      const title =
        node.find('h1,h2').first().text().trim() || '슬라이드 ' + (i + 1);
      const id = node.attr('id') || 'section-' + (i + 1);
      const text = node.text().replace(/\s+/g, ' ').trim();
      segments.push({
        id,
        title,
        text,
        href: href + '#' + encodeURIComponent(id),
      });
      blocks.push(
        '<section id="' +
          escapeAttr(id) +
          '">' +
          sanitize(node.html() || '') +
          '</section>',
      );
    });
  } else {
    root.find('h1,h2,h3').each((i, e) => {
      const node = $(e),
        title = node.text().trim(),
        id = node.attr('id') || 'section-' + (i + 1);
      node.attr('id', id);
      const text = (title + ' ' + node.nextUntil('h1,h2,h3').text())
        .replace(/\s+/g, ' ')
        .trim();
      segments.push({
        id,
        title,
        text,
        href: href + '#' + encodeURIComponent(id),
      });
    });
    blocks.push(sanitize(root.html() || ''));
  }
  return {
    text: root.text().replace(/\s+/g, ' ').trim(),
    segments,
    readingHtml: blocks.join('\n'),
    videos: [...videoMap.values()],
  };
}
const escapeAttr = (s: string) =>
  s.replace(
    /[&"<>]/g,
    (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[c]!,
  );
export function sanitize(html: string) {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.filter(
      (t) => !['iframe'].includes(t),
    ),
    allowedAttributes: {
      a: ['href', 'title', 'rel'],
      section: ['id'],
      h1: ['id'],
      h2: ['id'],
      h3: ['id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });
}
export function renderMarkdown(markdown: string) {
  return extractHtml(marked.parse(markdown, { async: false }) as string, '/')
    .readingHtml;
}
export function vttText(vtt: string) {
  return vtt
    .replace(/^WEBVTT.*$/gm, '')
    .replace(/^\d+$/gm, '')
    .replace(/^.*-->.*$/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
