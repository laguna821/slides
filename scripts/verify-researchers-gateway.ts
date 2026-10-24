import fs from 'node:fs/promises';
import {load} from 'cheerio';
import assert from 'node:assert/strict';
import gallery from '../content/pele-researchers.json';
const root='web-dist',routes=['talks/pele-atlas/index.html','en/talks/pele-atlas/index.html'];
const assets=JSON.parse(await fs.readFile('content/web-assets.json','utf8'));
let imageBytes=0;
for(const url of [...gallery.cards.map(c=>c.image),'/images/pele-researchers/overview.webp']){
 const target=assets.paths[url];assert(target?.startsWith('https://'),'Public image missing '+url);
 const asset=Object.values<any>(assets.assets).find(a=>a.url===target);assert(asset);imageBytes+=asset.bytes;
}
let htmlBytes=0;const styles=new Set<string>();
for(const route of routes){
 const text=await fs.readFile(root+'/'+route,'utf8');htmlBytes+=Buffer.byteLength(text);const $=load(text);
 assert.equal($('[data-research-case]').length,14);
 assert.equal($('.pr-types a').length,15);
 assert.equal($('iframe').length,0);
 for(const a of $('[data-research-case],.pr-types a').toArray()){assert.equal($(a).attr('target'),'_blank');assert($(a).attr('rel')?.includes('noopener'));}
 assert(!$('script[src]').toArray().some(e=>/mermaid|pele.*engine/.test($(e).attr('src')||'')));
 for(const link of $('link[rel=stylesheet]').toArray())if($(link).attr('href')?.startsWith('/_astro/'))styles.add($(link).attr('href')!);
}
let cssBytes=0;
for(const url of styles){const css=await fs.readFile(root+url);if(css.toString().includes('research-gateway'))cssBytes+=css.length;}
const files=(await fs.readdir(root,{recursive:true})).map(f=>f.replaceAll('\\','/'));
assert(!files.some(f=>f.startsWith('mermaid-gallery/')),'Full research gallery must remain external');
const metadataBytes=(await fs.stat('content/pele-researchers.json')).size;
const bytes=imageBytes+htmlBytes+cssBytes+metadataBytes;assert(bytes<=500000,'Gateway budget exceeded '+bytes);
await fs.mkdir('validation/researchers-landing',{recursive:true});
const result={passed:true,cases:14,categories:15,imageBytes,bilingualHtmlBytes:htmlBytes,pageStylesBytes:cssBytes,metadataBytes,totalBytes:bytes,limitBytes:500000,fullGalleryCopied:false};
await fs.writeFile('validation/researchers-landing/budget.json',JSON.stringify(result,null,2)+'\n');console.log(result);
