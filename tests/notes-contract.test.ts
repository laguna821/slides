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
test('a pending-lock deck must be the unchanged approved source with no notes and an owner decision',async()=>{
 const {createHash}=await import('node:crypto');const os=await import('node:os');const path=await import('node:path');
 const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
 const real=JSON.parse(await fs.readFile('content/presenter-notes.json','utf8'));
 const page=(notes:string)=>'<script type="application/json" id="deck-meta">{"id":"0123456789abcdef01234567"}</script>'+
  '<script type="application/json" id="speaker-notes-enc">'+notes+'</script><script>openNotes();AchmageNotes.attach();</script>';
 const source=page('null');
 const setup=async(index:string,entry:Record<string,unknown>={})=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'pending-lock-'));
  await fs.mkdir(path.join(root,'content'),{recursive:true});await fs.mkdir(path.join(root,'public/d'),{recursive:true});await fs.mkdir(path.join(root,'docs'));
  await fs.writeFile(path.join(root,'public/d/source.html'),source);await fs.writeFile(path.join(root,'public/d/index.html'),index);
  await fs.writeFile(path.join(root,'docs/d-provenance.json'),JSON.stringify({remake:{packageSha256:'engine',htmlSha256:sha(source)}}));
  await fs.writeFile(path.join(root,'producer.txt'),'producer');
  await fs.writeFile(path.join(root,'content/presenter-notes.json'),JSON.stringify({legacy:real.legacy,decks:[],producer:{path:'producer.txt',sha256:sha('producer')},
   pendingLock:[{workId:'d',url:'/d/index.html',source:'/d/source.html',sourceSha256:sha(source),sha256:sha(index),notesState:'none',enginePackageSha256:'engine',
    provenance:'docs/d-provenance.json',ownerDecision:{quote:'원격이라 PIN을 넣을 수 없음',sessionId:'s',at:'2026-11-16T09:00:00.000Z'},...entry}]}));
  return root;
 };
 const work=[{id:'d',visibility:'listed',artifacts:[{type:'html',role:'slides',url:'/d/index.html'}]}];
 await verifyNotes(work,await setup(source));
 await assert.rejects(verifyNotes(work,await setup(page('{"version":1}'))),/unchanged approved source/);
 await assert.rejects(verifyNotes(work,await setup(source,{ownerDecision:undefined})),/owner decision/);
 await assert.rejects(verifyNotes(work,await setup(source,{notesState:'empty'})),/state must be none/);
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
