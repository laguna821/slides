import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {releaseManifest} from '../scripts/release-gate';

test('Pele source fingerprints survive checkout line endings but reject content changes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pele-fingerprint-'));
 try{
  for(const dir of ['src','content','public','scripts','tests','docs','.github'])await fs.mkdir(path.join(root,dir));
  for(const file of ['package.json','package-lock.json','astro.config.mjs','tsconfig.json','vercel.json','AGENTS.md','.gitattributes'])await fs.writeFile(path.join(root,file),file.endsWith('.json')?'{}':'');
  await fs.writeFile(path.join(root,'content/works.json'),'[]');
  const source=path.join(root,'public/source.pele');
  await fs.writeFile(source,'flowchart LR\r\n A["근거"] --> B["판단"]\r\n');
  const crlf=(await releaseManifest(root))['public/source.pele'];
  await fs.writeFile(source,'flowchart LR\n A["근거"] --> B["판단"]\n');
  assert.equal((await releaseManifest(root))['public/source.pele'],crlf);
  await fs.writeFile(source,'flowchart LR\n A["근거"] --> C["보류"]\n');
  assert.notEqual((await releaseManifest(root))['public/source.pele'],crlf);
 }finally{
  assert(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));
  await fs.rm(root,{recursive:true,force:true});
 }
});
