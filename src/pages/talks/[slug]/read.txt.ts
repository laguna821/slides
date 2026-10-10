import type { APIRoute } from 'astro';
import { works } from '../../../lib/content';
export function getStaticPaths() {
  return works
    .filter((w) => w.reader)
    .map((work) => ({ params: { slug: work.slug }, props: { work } }));
}
export const GET: APIRoute = ({ props }) =>
  new Response(props.work.reader.text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex',
    },
  });
