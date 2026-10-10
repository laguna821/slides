import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import { works } from '../../../lib/content';
import specs from '../../../../content/works.json';
export function getStaticPaths(){
  return works.filter(w=>w.reader).map(work=>({params:{slug:work.slug},props:{work}}));
}
export const GET:APIRoute=async({props})=>{
  const spec=specs.find(w=>w.id===props.work.id)!.reader!;
  return new Response(await fs.readFile(spec.source,'utf8'),{headers:{
    'Content-Type':'text/markdown; charset=utf-8',
    'Content-Disposition':'attachment; filename="'+props.work.slug+'-original.md"',
    'X-Robots-Tag':'noindex'
  }});
};
