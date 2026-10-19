import fs from 'node:fs/promises';
import path from 'node:path';
import {load} from 'cheerio';
import {regularFiles,sha} from './web-assets';

export function shareableBlock(tag:string,attrs:Record<string,string>,code:string){
 if(Buffer.byteLength(code)<1000||attrs.id||attrs.src)return false;
 if(tag==='style')return Object.keys(attrs).every(k=>k==='media')&&!/@import\b/.test(code)&&!/url\(\s*['"]?(?!https?:|\/|data:)[^)'"\s]+/i.test(code);
 if(tag!=='script'||Object.keys(attrs).some(k=>k!=='type'))return false;
 if(attrs.type&&!/^(?:text|application)\/javascript$/.test(attrs.type))return false;
 return !/document\.currentScript|import\.meta|(?:import|export)\s/.test(code);
}
/** Exact CSS/JS bytes, unchanged cascade and execution order. Data stays inline. */
export async function shareWebRuntime(root:string){
 const documents=new Map<string,ReturnType<typeof load>>(),groups=new Map<string,{code:string,tag:string,uses:number}>();
 for(const file of (await regularFiles(root)).filter(f=>f.endsWith('.html'))){
  const $=load(await fs.readFile(path.join(root,file),'utf8'));documents.set(file,$);
  $('style,script:not([src])').each((_,e)=>{const code=$(e).html()||'';if(!shareableBlock(e.tagName,e.attribs,code))return;const key=e.tagName+'-'+sha(code),prior=groups.get(key);if(prior)prior.uses++;else groups.set(key,{code,tag:e.tagName,uses:1});});
 }
 const assets=new Map<string,string>();let removedBytes=0,insertedBytes=0;
 for(const [key,g] of groups)if(g.uses>1){
  const url='/_deck-runtime/'+key+(g.tag==='style'?'.css':'.js');assets.set(key,url);
  const target=path.join(root,url);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,g.code);
  insertedBytes+=Buffer.byteLength(g.code);removedBytes+=Buffer.byteLength(g.code)*g.uses;
 }
 for(const [file,$] of documents){let changed=false;
  $('style,script:not([src])').each((_,e)=>{const code=$(e).html()||'';if(!shareableBlock(e.tagName,e.attribs,code))return;const url=assets.get(e.tagName+'-'+sha(code));if(!url)return;
   if(e.tagName==='style'){const replacement=$('<link rel="stylesheet">').attr('href',url);if(e.attribs.media)replacement.attr('media',e.attribs.media);$(e).replaceWith(replacement);}
   else $(e).attr('src',url).empty();changed=true;
  });
  if(changed)await fs.writeFile(path.join(root,file),$.html());
 }
 return {assets:assets.size,removedBytes,insertedBytes,rawSavingBytes:removedBytes-insertedBytes};
}
