import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {hash} from './localization';
const [base,label]=process.argv.slice(2);if(!base||!label)throw Error('Usage: base label');
const rows:any[]=[];
for(const language of ['ko','en']){
 const prefix=language==='en'?'/en':'';
 const manifest=JSON.parse(await fs.readFile(language==='en'?'content/i18n/print-manifest.json':'content/print-manifest.json','utf8'));
 for(const route of ['/','/archive/','/about/','/talks/achmage-sametone/',...Object.keys(manifest.works).map(id=>'/talks/'+id+'/read/')]){
  const response=await fetch(base+prefix+route);assert.equal(response.status,200);const html=await response.text();const $=load(html);assert.equal($('html').attr('lang'),language);assert.equal($('link[rel=canonical]').attr('href'),'https://achmage-slides.vercel.app'+prefix+route);assert($('link[rel=preload][as=font]').attr('href')?.includes('AchmageSameTone-1.000.woff2'));assert($('[data-language-switch]').length);rows.push({route:prefix+route,status:200,language});
 }
 for(const [id,p]of Object.entries<any>(manifest.works)){
  const response=await fetch(base+p.url);assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(hash(bytes),p.sha256);assert(response.headers.get('content-type')?.includes('application/pdf'));assert(response.headers.get('content-disposition')?.includes('inline'));assert(response.headers.get('x-robots-tag')?.includes('noindex'));rows.push({url:p.url,status:200,sha256:p.sha256,bytes:bytes.length});
  for(const ext of ['md','txt']){const url=prefix+'/talks/'+id+'/read.'+ext;const r=await fetch(base+url);assert.equal(r.status,200);assert(r.headers.get('content-type')?.includes('text/plain'));const text=await r.text();assert.equal(text,await fs.readFile('dist'+url,'utf8'));rows.push({url,status:200,sha256:hash(text)});}
 }
 const index=await fetch(base+prefix+'/search-index.json');assert.equal(index.status,200);assert((await index.text()).includes('Achmage SameTone'));
}
const f=await fetch(base+'/fonts/AchmageSameTone-1.000.woff2');assert.equal(f.status,200);assert.equal(hash(Buffer.from(await f.arrayBuffer())),'5ddc1264367dc547619dbae3f16df530cb74209f8d43808e86268d8cf9406d16');rows.push({font:'Achmage SameTone 1.000',status:200,cache:f.headers.get('cache-control')});
for(const legacy of JSON.parse(await fs.readFile('content/legacy.json','utf8')).filter((x:any)=>x.url.endsWith('.html')&&!x.url.endsWith('/print.html'))){const res=await fetch(base+legacy.url);assert.equal(res.status,200);assert.equal(hash(Buffer.from(await res.arrayBuffer())),legacy.sha256);rows.push({legacy:legacy.url,status:200,sha256:legacy.sha256});}
await fs.mkdir('validation/deployments',{recursive:true});await fs.writeFile('validation/deployments/'+label+'.json',JSON.stringify({base,at:new Date().toISOString(),rows},null,2)+'\n');console.log(label+': '+rows.length+' remote route/export/font/legacy checks passed');
