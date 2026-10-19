import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const legacyPins:Record<string,string>={
 'ai-reading-pilot|/AI_reading_3week_pilot_20261008.html':'45ea835cdfb8a802925a429ef7ccae2390744370357d7267e32fc3e1a71c62e6',
 'human-reading-writing-2026|/decks/human-reading-writing-2026/index.html':'97ae1b25d7b3756a1384ca42561e330ef758215364d7a01f779b7fff5c26c7d1',
 'media-colloquium-2026-06-10|/decks/media-colloquium-2026-06-10/index.html':'0814c89c48d1ca6adb9aa63329b9bd6376eec3b6603a80c134a5d751b8957fb0',
};
export function validateLegacyNotes(entries:any[]){
 if(entries.length!==3 || new Set(entries.map(e=>e.workId+'|'+e.url)).size!==3 ||
 entries.some(e=>legacyPins[e.workId+'|'+e.url]!==e.sha256))throw Error('Only the three frozen legacy notes exceptions are allowed');
}
const payload=/<script type="application\/json" id="speaker-notes-enc">([\s\S]*?)<\/script>/g;
export function inspectNotes(html:string) {
  const matches=[...html.matchAll(payload)];
  if(matches.length!==1)throw Error('Exactly one encrypted notes envelope required');
  const e=JSON.parse(matches[0][1]);
  const meta=JSON.parse(html.match(/<script type="application\/json" id="deck-meta">([\s\S]*?)<\/script>/)![1]);
  if(!e || e.version!==1 || e.algorithm!=='AES-256-GCM' || e.kdf!=='PBKDF2-SHA256' || e.iterations!==600000 ||
    e.aad!=='achmage-notes-v1:'+meta.id || Buffer.from(e.salt,'base64').length!==16 ||
    Buffer.from(e.iv,'base64').length!==12 || Buffer.from(e.ciphertext,'base64').length<18)
    throw Error('Invalid or absent notes encryption');
  if(!html.includes('openNotes') || !html.includes('AchmageNotes.attach') || !html.includes('k === "n"'))
    throw Error('N-key notes runtime missing');
  return e;
}
export const withoutNotes=(s:string)=>s.replace(payload,'<notes-payload/>');
export async function verifyNotes(works:any[],root=process.cwd()) {
  const manifest=JSON.parse(await fs.readFile(path.join(root,'content/presenter-notes.json'),'utf8'));
  validateLegacyNotes(manifest.legacy);
  const read=(url:string)=> {
    if(!url.startsWith('/')||url.includes('..'))throw Error('Local deck path required');
    return fs.readFile(path.join(root,'public',url));
  };
  for(const w of works.filter(w=>w.visibility!=='draft'))for(const a of w.artifacts.filter((a:any)=>a.type==='html'&&a.role==='slides')){
    const b=await read(a.url);
    const demo=manifest.preservedDemos?.find((e:any)=>e.url===a.url&&e.workId===w.id);
    if(demo){
      const approved=JSON.parse(await fs.readFile(path.join(root,'docs/pele-social-science-provenance.json'),'utf8'));
      const notes=b.toString('utf8').match(/<script[^>]*id="speaker-notes-enc"[^>]*>([\s\S]*?)<\/script>/);
      if(w.kind!=='demo'||w.id!=='pele-social-science'||sha(b)!==demo.sha256||approved.originals[a.url]!==demo.sha256||!notes||JSON.parse(notes[1])!==null)throw Error('Preserved Pele demo changed or contains authored notes');
      continue;
    }
    const legacy=manifest.legacy.find((e:any)=>e.url===a.url&&e.workId===w.id);
    if(legacy){if(sha(b)!==legacy.sha256)throw Error('Legacy notes exception changed');continue;}
    if(!manifest.decks.some((e:any)=>e.url===a.url&&e.workId===w.id))throw Error('Missing presenter notes contract: '+w.id);
  }
  for(const e of manifest.decks){
    const b=await read(e.url),original=await read(e.source);
    if(sha(b)!==e.sha256||sha(original)!==e.sourceSha256)throw Error('Notes artifact bytes changed');
    inspectNotes(b.toString('utf8'));
    if(!/^docs\/[a-z0-9-]+\.json$/.test(e.provenance))throw Error('Approved deck provenance required');
    const provenance=JSON.parse(await fs.readFile(path.join(root,e.provenance),'utf8'));
    if(e.enginePackageSha256!==provenance.remake.packageSha256 ||
      ![provenance.remake.htmlSha256,provenance.remake.darkHtmlSha256].includes(e.sourceSha256))
      throw Error('Notes source requires approved engine provenance');
    if(withoutNotes(b.toString('utf8'))!==withoutNotes(original.toString('utf8')))throw Error('Notes packaging changed slide/runtime bytes');
    if(e.notesState!=='empty'&&e.notesState!=='authored')throw Error('Notes content state required');
    const proof=manifest.verification[e.sha256];
    if(!proof || proof.notesState!==e.notesState || proof.credentialProfile!==manifest.credentialProfile ||
      !['wrongPassword','correctPassword','relock','reloadLocked','nOpensPrompt'].every(k=>proof[k]===true))
      throw Error('Notes browser/credential verification missing: '+e.url);
  }
  if(sha(await fs.readFile(path.join(root,manifest.producer.path)))!==manifest.producer.sha256)throw Error('Notes producer review stale');
}
