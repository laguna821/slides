import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import works from '../content/works.json';

test('bilingual inline copy payload exactly matches downloadable text and Markdown',()=>{
 for(const work of works.filter(w=>'reader' in w&&w.visibility!=='draft')){
  for(const language of ['', '/en']){
   const directory='dist'+language+'/talks/'+work.slug+'/';
   const $=load(fs.readFileSync(directory+'read/index.html','utf8'));
   const raw=$('#reader-exports').text();
   assert(!raw.includes('<'),'Embedded JSON must escape markup');
   const payload=JSON.parse(raw);
   assert.equal(payload.text,fs.readFileSync(directory+'read.txt','utf8'));
   assert.equal(payload.markdown,fs.readFileSync(directory+'read.md','utf8'));
  }
 }
});
