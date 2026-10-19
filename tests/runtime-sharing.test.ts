import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {load} from 'cheerio';
import {shareableBlock,shareWebRuntime} from '../scripts/share-web-runtime';
test('data, named scripts, modules, currentScript and relative CSS stay inline',()=>{
 const code='x'.repeat(1500);
 for(const attrs of ([{id:'speaker-notes-enc',type:'application/json'},{type:'module'},{src:'/existing.js'}] as Record<string,string>[]))assert.equal(shareableBlock('script',attrs,code),false);
 assert.equal(shareableBlock('script',{},code+'document.currentScript'),false);
 assert.equal(shareableBlock('style',{},code+'a{background:url(../image.png)}'),false);
 assert.equal(shareableBlock('style',{},code+'a{filter:url(#clip)}'),false);
});
test('repeated exact runtime bytes are shared without changing data or block order',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'slides-runtime-'));
 try{
  const css='/* fixture */\n'+'a{color:blue}\n'.repeat(100),js='/* order fixture */\n'+'void 0;\n'.repeat(160),notes='{"ciphertext":"fixture-only"}';
  const html='<html><head><style>'+css+'</style></head><body><h1 id="slide">Keep this text</h1><script id="speaker-notes-enc" type="application/json">'+notes+'</script><script>'+js+'</script><script>void "last";</script></body></html>';
  for(const f of ['a.html','b.html'])await fs.writeFile(path.join(root,f),html);
  const report=await shareWebRuntime(root);assert.equal(report.assets,2);assert(report.rawSavingBytes>0);
  const $=load(await fs.readFile(path.join(root,'a.html'),'utf8'));
  assert.equal($('#slide').text(),'Keep this text');assert.equal($('#speaker-notes-enc').html(),notes);
  assert.equal(await fs.readFile(path.join(root,$('link').attr('href')!),'utf8'),css);
  assert.equal(await fs.readFile(path.join(root,$('script[src]').attr('src')!),'utf8'),js);
  assert($('script').last().text().includes('last'));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
