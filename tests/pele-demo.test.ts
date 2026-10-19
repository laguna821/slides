import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {workSchema} from '../src/lib/schema';
import {verifyNotes} from '../scripts/notes-contract';
import {translateHtml} from '../scripts/localization';
const read=async(p:string)=>fs.readFile(p,'utf8');
const json=async(p:string)=>JSON.parse(await read(p));
const hash=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');

test('18 code examples retain slide order, source and separate rendering roles',async()=>{
 const cases=await json('content/pele-examples.json');
 assert.equal(cases.length,18);assert.equal(new Set(cases.map((c:any)=>c.id)).size,18);assert.equal(new Set(cases.map((c:any)=>c.familyId)).size,9);
 for(const [i,c]of cases.entries()){
   assert.equal(c.number,i+1);assert.equal(c.pele.replaceAll('\r\n','\n'),(await read('public'+c.sourceBase+'/source.pele')).replaceAll('\r\n','\n'));
   assert.equal(c.figureCode,await read('public'+c.sourceBase+'/figure-branch.txt'));
   assert.match(c.pele,/^flowchart LR/);assert.match(c.figureCode,/if\s*\(v.kind/);
   const v=await json('public'+c.sourceBase+'/data.json');assert.equal(v.id,c.id);
   await fs.access('public'+c.sourceBase+'/slide.png');await fs.access('public'+c.sourceBase+'/'+c.id+'-native.svg');
   assert(!JSON.stringify(c).includes('C:\\Users\\'));
 }
 const code=await read('src/pages/talks/pele-social-science/code/[variant].astro');
 assert(code.replace(/\s+/g,' ').includes('Pele 관계도가 이 통계 그래프 전체를 생성한 것은 아닙니다.'));
 assert(!code.includes('set:html={c.pele}')); // syntax is inert, never executed as page markup
});

test('the catalog uses a demo and preserves both original notes-free decks by hash',async()=>{
 const w=(await json('content/works.json')).find((w:any)=>w.id==='pele-social-science');
 assert.equal(workSchema.parse(w).kind,'demo');assert.equal(w.event,undefined);assert.equal(w.reader,undefined);
 const provenance=await json('docs/pele-social-science-provenance.json');
 for(const [url,digest]of Object.entries(provenance.originals))assert.equal(hash(await fs.readFile('public'+url)),digest);
 await verifyNotes([w]);
 await assert.rejects(verifyNotes([{...w,kind:'talk'}]),/Preserved Pele demo/);
});

test('bilingual code display preserves Korean source, quotes and HTML-shaped input',async()=>{
 const s='flowchart LR\n A["한글 <script>alert(1)</script>"] --> B["95% CI"]';
 const html='<p>장표별 제작 코드</p><pre><code>'+s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')+'</code></pre>';
 const translated=translateHtml(html,await json('content/i18n/en.json'),true);
 assert(translated.includes('Code behind each slide'));assert(translated.includes('한글'));assert(!translated.includes('<script>alert'));
});
