import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
export const manifestPath = 'content/web-assets.json';
export const siteOrigin = 'https://achmage-slides.vercel.app';
export const sha = (b: Buffer | string) =>
  createHash('sha256').update(b).digest('hex');
export const dataPattern = () =>
  /data:((?:image|font|application)\/[\w.+-]+)(?:;charset=[\w-]+)?;base64,([A-Za-z0-9+/=\r\n]+)/g;
export const svgDataPattern = () => /(["'])data:image\/svg\+xml,(.*?)\1/gs;
export const isMedia = (p: string) =>
  /\.(?:png|jpe?g|webp|gif|avif|svg)$/i.test(p);
export const isBrandAsset = (p: string) =>
  /^brand\/(?:favicon|achmage-(?:wordmark|symbol)(?:-reversed|-mono)?|ach-frame(?:-reversed|-mono)?)\.svg$/.test(
    p,
  );
export const isRemoved = (p: string) => /\.(?:pdf|zip)(?:[?#].*)?$/i.test(p);
export const isText = (p: string) =>
  /\.(?:html|css|js|mjs|svg|json|md|txt|xml)$/i.test(p);
export type Asset = {
  sourceHash: string;
  sha256: string;
  url: string;
  bytes: number;
  mime: string;
  kind: 'image' | 'font';
  verifiedAt: string;
  conversion?: string;
};
export type Manifest = {
  version: 1;
  assets: Record<string, Asset>;
  paths: Record<string, string>;
};
export async function readManifest(): Promise<Manifest> {
  try {
    return JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch (e: any) {
    if (e.code === 'ENOENT') return { version: 1, assets: {}, paths: {} };
    throw e;
  }
}
export async function files(root: string): Promise<string[]> {
  return (await fs.readdir(root, { recursive: true }))
    .filter((f) => !f.split(/[\\/]/).includes('.git'))
    .map((f) => f.replaceAll('\\', '/'))
    .sort()
    .filter((f) => !f.endsWith('/'));
}
export async function regularFiles(root: string) {
  const result = [];
  for (const f of await files(root))
    if ((await fs.stat(path.join(root, f))).isFile()) result.push(f);
  return result;
}
export function assetKey(mime: string, bytes: Buffer) {
  return mime.toLowerCase() + ':' + sha(bytes);
}
export function webUrl(url: string, file: string, manifest: Manifest): string {
  if (!url || url.startsWith('#') || url.startsWith('data:')) return url;
  let u: URL;
  try {
    u = new URL(url, new URL('/' + file, siteOrigin));
  } catch {
    return url;
  }
  if (u.origin !== siteOrigin) return url;
  const mapped = manifest.paths[decodeURIComponent(u.pathname)];
  return mapped ? mapped + u.search + u.hash : url;
}
export function replaceData(text: string, manifest: Manifest) {
  return text.replace(dataPattern(), (_all, mime, data) => {
    if (mime === 'application/pdf') return '';
    const asset = manifest.assets[assetKey(mime, Buffer.from(data, 'base64'))];
    if (!asset)
      throw Error('Unregistered embedded asset; run assets:sync: ' + mime);
    return asset.url;
  });
}
export function cleanJson(value: any, context = ''): any {
  if (Array.isArray(value))
    return value
      .filter(
        (v) =>
          !(
            context === 'artifacts' &&
            v &&
            typeof v === 'object' &&
            (v.type === 'pdf' ||
              (typeof v.url === 'string' && isRemoved(v.url)))
          ),
      )
      .map((v) => cleanJson(v, context));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([k, v]) =>
            !(k === 'readingPdf' && v && typeof v === 'object') &&
            !(k === 'pdf' && typeof v === 'string' && isRemoved(v)) &&
            !(context === 'files' && isRemoved(k)),
        )
        .map(([k, v]) => [k, cleanJson(v, k)]),
    );
  return value;
}
export function transformText(text: string, file: string, manifest: Manifest) {
  let result = replaceData(text, manifest).replace(
    svgDataPattern(),
    (_all, q, data) => {
      const a =
        manifest.assets[
          assetKey('image/svg+xml', Buffer.from(decodeURIComponent(data)))
        ];
      if (!a) throw Error('Unregistered encoded SVG; run assets:sync');
      return q + a.url + q;
    },
  );
  // Absolute site URLs and root-relative references, including JSON/Markdown.
  for (const [source, target] of Object.entries(manifest.paths).sort(
    (a, b) => b[0].length - a[0].length,
  )) {
    result = result.split(siteOrigin + source).join(target);
    result = result.replace(
      new RegExp(
        '(?<![A-Za-z0-9:/.-])' +
          source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
          '(?=[?\\#"\'\\s)<>`]|$)',
        'g',
      ),
      () => target,
    );
  }
  if (file.endsWith('.json'))
    return JSON.stringify(cleanJson(JSON.parse(result)));
  if (file.endsWith('.md')) {
    result = result.replace(
      /(!?\[[^\]\n]*\]\()([^\s)]+)([^)]*\))/g,
      (_, before, url, after) => before + webUrl(url, file, manifest) + after,
    );
    result = result.replace(
      /^(\s*\[[^\]\n]+\]:\s*)(\S+)/gm,
      (_, before, url) => before + webUrl(url, file, manifest),
    );
  }
  if (file.endsWith('.html')) {
    const $ = load(result);
    $('a[href]').each((_, e) => {
      if (isRemoved($(e).attr('href')!)) $(e).remove();
    });
    $('[data-reader-print],[data-download-pdf],[data-reading-pdf]').remove();
    $('.tools small').each((_, e) => {
      if (/PDF/.test($(e).text())) $(e).remove();
    });
    $('[src],[href],[poster],[data-src]').each((_, e) => {
      for (const attr of ['src', 'href', 'poster', 'data-src']) {
        const v = $(e).attr(attr);
        if (v) $(e).attr(attr, webUrl(v, file, manifest));
      }
    });
    $('[srcset]').each((_, e) => {
      $(e).attr(
        'srcset',
        $(e)
          .attr('srcset')!
          .split(',')
          .map((s) => {
            const [url, ...rest] = s.trim().split(/\s+/);
            return [webUrl(url, file, manifest), ...rest].join(' ');
          })
          .join(', '),
      );
    });
    result = $.html();
  }
  // CSS URLs can be relative to an HTML or CSS file.
  result = result.replace(
    /url\(\s*(["']?)([^)'"\s]+)\1\s*\)/g,
    (_, q, url) => 'url(' + q + webUrl(url, file, manifest) + q + ')',
  );
  return result;
}
