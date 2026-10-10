import type { APIRoute } from 'astro';
import { works } from '../../../lib/content';
export function getStaticPaths() {
  return works
    .filter((w) => w.reader)
    .map((work) => ({ params: { slug: work.slug }, props: { work } }));
}
export const GET: APIRoute = ({ props }) =>
  new Response(props.work.reader.markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${props.work.slug}.md"`,
      'X-Robots-Tag':
        props.work.visibility !== 'listed' || props.work.seo === 'noindex'
          ? 'noindex'
          : 'index',
    },
  });
