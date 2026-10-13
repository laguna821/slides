import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {inspectNotes,withoutNotes,validateLegacyNotes,verifyNotes} from '../scripts/notes-contract';
test('a fourth legacy exemption cannot bypass future notes checks',async()=>{
 const manifest=JSON.parse(await fs.readFile('content/presenter-notes.json','utf8'));
 validateLegacyNotes(manifest.legacy);
 assert.throws(()=>validateLegacyNotes([...manifest.legacy,{workId:'new',url:'/new.html',sha256:'fake'}]),/three frozen/);
 assert.throws(()=>validateLegacyNotes(manifest.legacy.map((e:any,i:number)=>i?e:{...e,sha256:'fake'})),/three frozen/);
});
test('unregistered new HTML cannot silently pass notes gate',async()=>{
 await assert.rejects(verifyNotes([{id:'new',visibility:'listed',artifacts:[{type:'html',role:'slides',url:'/decks/educational-harness-workshop-2026-07-06/v2/index.html'}]}]),/Missing presenter notes/);
});
test('notes-only outputs retain every slide, style and runtime byte',async()=>{
  const base='public/decks/educational-harness-workshop-2026-07-06/';
  for(const name of ['index.html','dark.html']){
    const before=await fs.readFile(base+'v2/'+name,'utf8');
    const after=await fs.readFile(base+'v2-notes/'+name,'utf8');
    assert.throws(()=>inspectNotes(before),/Invalid or absent/);
    assert.equal(inspectNotes(after).iterations,600000);
    assert.equal(withoutNotes(after),withoutNotes(before));
    assert.throws(()=>inspectNotes(after.replace('"iterations":600000','"iterations":1')),/Invalid/);
    assert.throws(()=>inspectNotes(after.replace('"AES-256-GCM"','"plaintext"')),/Invalid/);
  }
});
