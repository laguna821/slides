import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateSharing} from '../scripts/experiments';
import registry from '../content/experiments.json';
test('sharing gate rejects missing/late metadata even when regenerated file pins match',async()=>{
 const item=registry.items.find(x=>x.id==='pkm-speaker-posters-2026')!;
 const base=path.join(process.cwd(),'public',item.path),tmp=await fs.mkdtemp(path.join(os.tmpdir(),'achmage-share-'));
 try{
  const original=await fs.readFile(path.join(base,'index.html'),'utf8');
  const m=JSON.parse(await fs.readFile(path.join(base,'share-manifest.json'),'utf8'));
  await validateSharing(base,item,original);
  for(const html of [original.replace('property="og:image"','property="removed:image"'),original.replace('<head>','<head>'+' '.repeat(5000))]){
   m.publicHtmlSha256=createHash('sha256').update(html).digest('hex');await fs.writeFile(path.join(tmp,'share-manifest.json'),JSON.stringify(m));
   await assert.rejects(validateSharing(tmp,item,html),/Early sharing metadata/);
  }
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
});
