import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
import {renderReader,sha} from '../src/lib/reader';
import {validateEditorialLinks} from './editorial';
const works=JSON.parse(await fs.readFile('content/works.json','utf8'));
const receipts:any[]=[];
const external=new Map<string,any>();
for(const work of works.filter((w:any)=>w.reader)){
 const md=await fs.readFile(work.reader.editorialSource,'utf8'),r=renderReader(md);
 validateEditorialLinks(r.html);
 for(const href of [...new Set(r.links)]){
  if(/^https?:/.test(href)){
   if(!external.has(href)){
    try{const res=await fetch(href,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Achmage-publication-link-review/2.0'}});
     external.set(href,{status:res.ok?'reachable':[404,410].includes(res.status)?'broken':'uncertain',httpStatus:res.status,finalUrl:res.url});await res.body?.cancel();
    }catch(e){external.set(href,{status:'uncertain',reason:String(e)});}
   }
   receipts.push({workId:work.id,href,...external.get(href)});continue;
  }
  if(href.startsWith('mailto:')){receipts.push({workId:work.id,href,status:'mailto'});continue;}
  const u=new URL(href,'https://achmage-slides.vercel.app');
  const file=path.resolve('public','.'+decodeURIComponent(u.pathname));
  if(!file.startsWith(path.resolve('public')+path.sep))throw Error('Link outside public root');
  const bytes=await fs.readFile(file),html=bytes.toString('utf8'),$=load(html);
  const fragment=decodeURIComponent(u.hash.slice(1));
  let method='file';
  if(fragment){
   const dom=$('[id]').toArray().some(e=>$(e).attr('id')===fragment);
   const numeric=/^\d+$/.test(fragment)&&Number(fragment)>0&&Number(fragment)<=$('section.slide,section[data-slide],.slide').length;
   // Pin known legacy contracts; no arbitrary script is executed.
   const registered=['/decks/media-colloquium-2026-06-10/index.html','/decks/human-reading-writing-2026/index.html'].includes(u.pathname);
   if(!dom&&!(numeric&&registered))throw Error('Broken local fragment: '+href);
   method=dom?'dom-id':'registered-numeric-slide';
  }
  receipts.push({workId:work.id,href,status:'reachable',method,targetSha256:sha(bytes)});
 }
}
const proof={version:'2.0.0',checkedAt:new Date().toISOString(),sources:Object.fromEntries(await Promise.all(works.filter((w:any)=>w.reader).map(async(w:any)=>[w.id,sha(await fs.readFile(w.reader.editorialSource,'utf8'))]))),links:receipts};
await fs.mkdir('validation',{recursive:true});await fs.writeFile('validation/editorial-links.json',JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({total:receipts.length,external:[...external.entries()]},null,2));
if(receipts.some(r=>r.status==='broken'))process.exitCode=1;
