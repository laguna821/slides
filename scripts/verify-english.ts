import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {hash} from './localization';
const ko=JSON.parse(await fs.readFile('src/generated/content.json','utf8')).works;
const en=JSON.parse(await fs.readFile('src/generated/english.json','utf8')).works;
const proof=JSON.parse(await fs.readFile('content/i18n/print-manifest.json','utf8'));
const index=JSON.parse(await fs.readFile('dist/en/search-index.json','utf8')).entries;
for(const w of en){
 const original=ko.find((x:any)=>x.id===w.id);assert(original);
 const html=await fs.readFile('dist'+w.href+'index.html','utf8');const $=load(html);
 assert.equal($('html').attr('lang'),'en');assert.equal($('link[rel=canonical]').attr('href'),'https://achmage-slides.vercel.app'+w.href);
 assert.equal($('link[hreflang=ko]').attr('href'),'https://achmage-slides.vercel.app'+original.href);
 assert.equal(index.some((x:any)=>x.workId===w.id),w.visibility==='listed');
 if(!w.reader)continue;
 const r=load(await fs.readFile('dist'+w.href+'read/index.html','utf8'));
 assert.equal(r('#reader-body').text(),w.reader.text);
 assert.equal(await fs.readFile('dist'+w.href+'read.txt','utf8'),w.reader.text);
 assert.equal(await fs.readFile('dist'+w.href+'read.md','utf8'),w.reader.markdown);
 for(const url of w.reader.images)assert(w.reader.markdown.includes('https://achmage-slides.vercel.app'+url),'Markdown image must remain portable: '+url);
 assert.deepEqual(w.reader.headings.map((h:any)=>h.id),original.reader.headings.map((h:any)=>h.id));
 assert.equal(r('#reader-body img').length,original.reader.images.length);
 assert.equal(r('[data-reader-print]').attr('href'),proof.works[w.id].url);
 assert.equal(hash(await fs.readFile('dist'+proof.works[w.id].url)),proof.works[w.id].sha256);
 for(const a of r('a[href^="#"]').toArray()){const id=r(a).attr('href')!.slice(1);assert(r('[id]').toArray().some(e=>r(e).attr('id')===decodeURIComponent(id)),'Missing anchor '+id);}
}
const font=await fs.readFile('dist/fonts/AchmageSameTone-1.000.woff2');assert.equal(hash(font),'5ddc1264367dc547619dbae3f16df530cb74209f8d43808e86268d8cf9406d16');
const figs=JSON.parse(await fs.readFile('content/i18n/figure-manifest.json','utf8'));
for(const f of figs){assert.equal(hash(await fs.readFile('public'+f.source)),f.sourceHash);assert.equal(hash(await fs.readFile('dist'+f.target)),f.sha256);}
console.log('English verified: '+en.length+' works, four complete readers/PDFs, original anchors, exports, search, 12 derivative diagrams, official font hash.');
