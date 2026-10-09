import type { Media, Usage, PublicWork } from './schema';
export function clipHref(
  slug: string,
  version: string,
  start: number,
  end: number,
) {
  return (
    '/motion/' +
    slug +
    '/?' +
    new URLSearchParams({
      v: version,
      start: String(start),
      end: String(end),
    }) +
    '#watch'
  );
}
export function usageHref(u: Usage, media: Media, owner: PublicWork) {
  const version = media.versions.find((v) => v.id === u.version)!;
  if (media.external) return version.url;
  return clipHref(owner.slug, u.version, u.start, u.end);
}
export function slideHref(work: PublicWork, slideId?: string) {
  return slideId &&
    work.segments.some((s) => s.id === slideId && s.kind !== 'caption')
    ? work.href + 'read/#' + encodeURIComponent(slideId)
    : work.href;
}
export function embedCode(url: string, title: string) {
  const escape = (s: string) =>
    s
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  return (
    '<div style="position:relative;width:100%;aspect-ratio:16/9"><iframe src="' +
    escape(url) +
    '" title="' +
    escape(title) +
    '" loading="lazy" allow="fullscreen" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>'
  );
}
