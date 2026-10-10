import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { workSchema } from '../src/lib/schema';
import { hashPrintInputs, printInputDigest, verifyPrintArtifact } from '../scripts/print-contract';
import { choosePdfTableWidth } from '../scripts/hanmark/io/editorialPdfTablePolicy';
const works=workSchema.array().parse(JSON.parse(await fs.readFile('content/works.json','utf8'))).filter(w=>w.reader);
test('print fingerprint is independent of filesystem enumeration order',()=>{
  const metadata={title:'한글 원고'}, engines={playwright:'pinned'};
  assert.equal(hashPrintInputs({'Z':'1','a':'2','io/file':'3'},metadata,engines),hashPrintInputs({'io/file':'3','a':'2','Z':'1'},metadata,engines));
});
test('every existing reader has a current verified PDF companion',async()=>{
  for(const w of works){const pdf=await verifyPrintArtifact(w);assert(pdf.pages>0);assert(pdf.url.endsWith('.pdf'));}
});
test('title/event/visibility edits invalidate PDF evidence before publication',async()=>{
  const w=works[0];
  for(const patch of [{title:w.title+' 개정'},{event:'변경된 행사'},{visibility:'unlisted' as const}]) {
    const changed={...w,...patch};assert.notEqual((await printInputDigest(w)).digest,(await printInputDigest(changed)).digest);
    await assert.rejects(verifyPrintArtifact(changed),/재생성/);
  }
});
test('unregistered PDF receipt cannot stand in for another manuscript',async()=>{
  await assert.rejects(verifyPrintArtifact({...works[0],id:'not-registered'}),/재생성/);
});
test('HanMark widens dense tables without shrinking body type',()=>{
  const normal={height:200,overflow:false,maxRowHeight:35,headerLines:[1,1],bodyLines:[1,2,2,1]};
  assert.equal(choosePdfTableWidth(normal,{...normal,height:120},956),'column');
  assert.equal(choosePdfTableWidth({...normal,overflow:true},normal,956),'full');
  assert.equal(choosePdfTableWidth({...normal,height:500,bodyLines:[5,7,6]},normal,956),'full');
});
