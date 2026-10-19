import type { APIRoute } from 'astro';
import peleCases from '../../content/pele-examples.json';
import { works } from '../lib/content';
export const GET: APIRoute = () => {
  const paths = [
    '/',
    '/archive/',
    '/motion/',
    '/videos/',
    '/posters/',
    '/about/',
    '/talks/pele-social-science/code/',
    '/talks/pele-social-science/code/helpers/',
    ...peleCases.map(c=>'/talks/pele-social-science/code/'+c.id+'/'),
    ...works
      .filter((w) => w.visibility === 'listed' && w.seo === 'index')
      .flatMap((w) => [
        w.href,
        ...(w.reader ? [w.href + 'read/'] : []),
      ]),
  ];
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      paths
        .map(
          (p) =>
            '<url><loc>https://achmage-slides.vercel.app' + p + '</loc></url>',
        )
        .join('') +
      '</urlset>',
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
