import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {collect} from '../scripts/remote-preview.mjs';

test('failed source still collects types, tests and translations, skips stale web output and remains failed',async()=>{
  const seen:string[]=[],files=new Map<string,string>();
  const result=await collect(async c=>{seen.push(c.name);return {exitCode:c.name==='source'?1:0,output:'actual '+c.name};},async(k,v)=>{files.set(k,v);});
  assert.deepEqual(seen,['source','types','tests','translations']);
  assert.equal(result.passed,false);assert.equal(result.productionApproval,false);
  assert.equal(result.checks.find(c=>c.name==='web')?.status,'blocked');
  assert.equal(JSON.parse(files.get('report.json')!).passed,false);
});

test('one failed independent check fails the aggregate without hiding other diagnostics',async()=>{
  const result=await collect(async c=>({exitCode:c.name==='types'?2:0,output:c.name}),async()=>{});
  assert.equal(result.checks.length,5);assert.equal(result.passed,false);
  assert.equal(result.checks.find(c=>c.name==='web')?.passed,true);
});

test('release workflow remains strict and preview is manual instead of a second push trigger',async()=>{
  const root=new URL('../',import.meta.url);
  const release=await fs.readFile(new URL('.github/workflows/validate.yml',root),'utf8');
  const preview=await fs.readFile(new URL('.github/workflows/pele-source-preview.yml',root),'utf8');
  assert.match(release,/push:\s*\n\s+branches: \[main\]/);
  assert.match(release,/ready_for_review/);assert.match(release,/pull_request\.draft == false/);
  assert.match(release,/run: npm run release:verify/);
  assert.doesNotMatch(release,/continue-on-error/);
  assert.doesNotMatch(preview,/^\s+push:/m);assert.match(preview,/workflow_dispatch:/);
  assert.match(preview,/if: always\(\)/);
  const vercelSource=await fs.readFile(new URL('vercel.json',root),'utf8');
  assert.equal([...vercelSource.matchAll(/"git"\s*:/g)].length,1,'No duplicate git configuration');
  const vercel=JSON.parse(vercelSource);
  assert.deepEqual(vercel.git.deploymentEnabled,{'**':false,main:true,'pele-statistics-source-guide':true,'codex/topic-lecture-62-web':true});
  assert.equal(vercel.buildCommand,'npm run release:verify');
});
