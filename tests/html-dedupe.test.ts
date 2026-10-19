import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {dedupeWebHtml} from '../scripts/dedupe-web-html';
test('only identical HTML becomes a one-hop alias to the existing index',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'slides-html-'));
 try{
  await fs.mkdir(path.join(root,'deck'));
  for(const f of ['index.html','source-web.html'])await fs.writeFile(path.join(root,'deck',f),'<h1 id="first">Same lecture</h1>');
  await fs.writeFile(path.join(root,'deck/dark.html'),'<h1 id="first">Different theme setting</h1>');
  const r=await dedupeWebHtml(root);assert.deepEqual(r.aliases,{'/deck/source-web.html':'/deck/index.html'});assert(r.savedBytes>0);
  assert((await fs.readFile(path.join(root,'deck/index.html'),'utf8')).includes('Same lecture'));
  assert((await fs.readFile(path.join(root,'deck/dark.html'),'utf8')).includes('Different'));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
