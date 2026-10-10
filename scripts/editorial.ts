import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
import { renderReader, sha, escape } from '../src/lib/reader';
import type { Work } from '../src/lib/schema';

export function sourceUnits(markdown: string) {
  return markdown.replaceAll('\r\n','\n').split(/(?=^## )/m).filter(s=>s.trim()).map((text,i)=>({id:'unit-'+(i+1),text}));
}
/** Editorial decisions are committed data, never inferred during a public build. */
export async function loadEditorial(work: Work, root=process.cwd()) {
  const spec=work.reader!;
  const read=async(p:string)=>{const f=path.resolve(root,p);if(!f.startsWith(path.resolve(root)+path.sep))throw Error('Editorial path outside repository');return fs.readFile(f,'utf8');};
  const original=await read(spec.source);
  const markdown=await read(spec.editorialSource);
  const map=JSON.parse(await read(spec.editorialManifest));
  if(map.version!=='2.0.0'||map.workId!==work.id||map.sourceSha256!==sha(original)||map.editorialSha256!==sha(markdown)||map.status!=='reviewed')throw Error('Editorial review missing or stale: '+work.id);
  if(!map.review?.reviewer||!['claims','images','links'].every(k=>typeof map.review[k]==='string'&&map.review[k].length>10))throw Error('Editorial review evidence missing');
  const units=sourceUnits(original);
  if(map.units.length!==units.length)throw Error('Editorial unit coverage mismatch');
  const anchors:Record<string,string[]>={};
  for(const unit of units){
    const record=map.units.find((x:any)=>x.id===unit.id);
    if(!record||record.sourceSha256!==sha(unit.text)||!record.reason||!['retain','edit','metadata'].includes(record.disposition))throw Error('Unreviewed editorial unit: '+unit.id);
    const marker='<!-- '+unit.id+' -->';
    if(markdown.split(marker).length!==2)throw Error('Editorial unit missing or duplicated: '+unit.id);
    const chunk=markdown.split(marker)[1].split(/<!-- unit-\d+ -->/)[0];
    if(record.editedSha256!==sha(chunk))throw Error('Editorial unit review stale: '+unit.id);
    anchors[unit.id]=record.legacyIds;
  }
  const source=JSON.parse(await read(spec.manifest)).works[work.id];
  const htmlInput=markdown.replace(/<!-- (unit-\d+) -->/g,(_,id)=>[id,...anchors[id]].map(a=>'<span class="reader-anchor" id="'+escape(a)+'"></span>').join(''));
  const reader=renderReader(htmlInput,{},source.wiki||{},Object.fromEntries(source.images.map((i:any)=>[i.url,i])),'e-');
  reader.markdown=renderReader(markdown.replace(/<!-- unit-\d+ -->\s*/g,''),{},source.wiki||{}).markdown;
  reader.sourceHash=sha(markdown);
  if(reader.images.length!==source.images.length||source.images.some((i:any)=>!reader.images.includes(i.url)))throw Error('Editorial image loss: '+work.id);
  validateEditorialLinks(reader.html);
  const links=JSON.parse(await read('validation/editorial-links.json'));
  if(links.sources[work.id]!==sha(markdown))throw Error('Editorial link review stale: '+work.id);
  for(const href of new Set(reader.links)){
    if(href.startsWith('#'))continue;
    const receipt=links.links.find((x:any)=>x.workId===work.id&&x.href===href);
    if(!receipt||receipt.status==='broken'||(receipt.status==='uncertain'&&!receipt.review))throw Error('Editorial link needs review: '+href);
    if(receipt.targetSha256){const bytes=await fs.readFile(path.join(root,'public',decodeURIComponent(new URL(href,'https://achmage-slides.vercel.app').pathname)));if(sha(bytes)!==receipt.targetSha256)throw Error('Link destination changed: '+href);}
  }
  return reader;
}

export function validateEditorialLinks(html:string) {
  const $=load(html);
  $('pre,code').remove();
  const walk=(nodes:any[])=>nodes.forEach(n=>{
    if(n.type==='text'&&(/!?\[\[|\]\(|(?:file|obsidian):\/\/|[A-Z]:\\/i.test(n.data)))throw Error('Unresolved editorial link syntax: '+n.data.slice(0,120));
    if(n.children)walk(n.children);
  });
  walk($.root().contents().toArray());
  $('a').each((_,el)=>{
    const url=$(el).attr('href');
    if(!url||!/^(?:https?:\/\/|mailto:|\/(?!\/)|#)/i.test(url)||!$(el).text().trim())throw Error('Unresolved editorial link destination');
  });
}
