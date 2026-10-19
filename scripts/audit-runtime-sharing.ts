import fs from 'node:fs/promises';
import {load} from 'cheerio';
import {regularFiles,sha} from './web-assets';
const groups=new Map<string,{kind:string,bytes:number,uses:string[]}>();
for(const file of (await regularFiles('web-dist')).filter(f=>f.endsWith('.html'))){
 const $=load(await fs.readFile('web-dist/'+file,'utf8'));
 $('style,script:not([src])').each((_,e)=>{
  const node=$(e),kind=e.tagName,code=node.html()||'',type=node.attr('type')||'';
  if(code.length<1000||kind==='script'&&type&&!/^(?:text|application)\/javascript$/.test(type))return;
  if(kind==='script'&&/document\.currentScript|import\.meta|(?:import|export)\s/.test(code))return;
  if(kind==='style'&&/url\(\s*['"]?(?!https?:|\/|data:)[^)'"\s]+/i.test(code))return;
  const key=kind+':'+sha(code),item=groups.get(key)||{kind,bytes:Buffer.byteLength(code),uses:[]};item.uses.push(file);groups.set(key,item);
 });
}
const rows=[...groups.entries()].map(([hash,x])=>({hash,...x,saving:x.bytes*(x.uses.length-1)})).sort((a,b)=>b.saving-a.saving);
await fs.writeFile('../validation/runtime-sharing-audit.json',JSON.stringify({rawSavingBytes:rows.reduce((n,r)=>n+r.saving,0),groups:rows},null,2));
console.log(JSON.stringify({rawSavingBytes:rows.reduce((n,r)=>n+r.saving,0),repeatedGroups:rows.filter(x=>x.uses.length>1).length,top:rows.slice(0,6)},null,2));
