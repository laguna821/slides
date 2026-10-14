import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';import {load} from 'cheerio';import {renderReader,plainKey,validateReaderCoverage} from '../src/lib/reader';
const id='survey-scale-intro-2026-10-13',root='public/decks/'+id+'/v1.3.0',html=fs.readFileSync(root+'/source.html','utf8'),$=load(html),data=JSON.parse($('#lesson-data').text()),md=fs.readFileSync('content/editorial/'+id+'.md','utf8'),reader=renderReader(md);
test('survey reader preserves every instructional field, including hidden branches and response formats',()=>{
 const text=plainKey(reader.text),skip=new Set(['id','kind','time','section','source','widget','tone','links']);let checked=0;
 function walk(v:any,k=''){if(skip.has(k))return;if(typeof v==='string'){checked++;const normalized=v.replace(/^[ABC] · /,'');assert(text.includes(plainKey(normalized)),v);}else if(Array.isArray(v))v.forEach(x=>walk(x,k));else if(v&&typeof v==='object')Object.entries(v).forEach(([a,b])=>walk(b,a));}
 data.forEach((x:any)=>walk(x));assert.equal(checked,883);assert.equal(data.length,43);assert.equal(data.filter((x:any)=>x.kind==='lab').length,20);
 assert.equal(data.filter((x:any)=>x.kind==='lab').flatMap((x:any)=>x.branches).length,60);assert.equal(data.filter((x:any)=>x.kind==='lab').flatMap((x:any)=>x.hints).length,60);
 const archive=renderReader(fs.readFileSync('content/reading/'+id+'.md','utf8'));assert.equal(validateReaderCoverage(html,'html',archive),524);
});
test('survey fixed-population table and candidate selection match the lesson',()=>{
 const s=data.find((x:any)=>x.id==='s09'),first=Array(5).fill(0),second=Array(5).fill(0);
 for(const[row,a,b]of s.rows){const n=Number(row.match(/(\d+)명/)[1]);first[a-1]+=n;second[b-1]+=n;}
 assert.deepEqual(first,[0,3,3,0,6]);assert.deepEqual(second,[6,0,3,0,3]);
 const t=load(reader.html);const rows=t('table tbody tr').toArray().map(e=>t(e).find('td').toArray().slice(1).map(c=>Number(t(c).text())));
 assert.deepEqual(rows,[first,second,[0,0,12,0,0]]);assert(rows.every(a=>a.reduce((s,n)=>s+n,0)===12));
 const candidates=data.find((x:any)=>x.id==='s16').candidates;assert.deepEqual(candidates.map((c:any,i:number)=>c.keep?i+1:null).filter(Boolean),[1,3,5]);
 assert(reader.text.includes('산술평균 계산 규칙이 아닙니다'));
});
test('survey public source removes machine paths and keeps pinned runtime metadata',()=>{
 assert(!/C:(?:\\|\/)(?:Users|CodexHome)/i.test(html));const p=JSON.parse($('#deck-provenance').text());assert.equal(p.extensionVersion,'1.3.0');assert.equal(p.engine.packageSha256,'369538c1eb3372a7138bc67ed171c326a0c76236c11f3ec9f8198d35a314012e');
 assert.equal($('#speaker-notes-enc').length,1);
});

