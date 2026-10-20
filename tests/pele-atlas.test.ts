import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const atlas=JSON.parse(fs.readFileSync('public/pele-atlas/comparison.json','utf8'));
test('Atlas preserves every original numeric record across the 47 shared states',()=>{
 assert.equal(atlas.models.length,18);
 assert.equal(atlas.models.reduce((n:number,m:any)=>n+Object.keys(m.compiled.scenes).length,0),47);
 const numeric=(o:any):any=>Array.isArray(o)?o.map(numeric):o&&typeof o==='object'?Object.fromEntries(Object.entries(o).filter(([k,v])=>typeof v==='number'||Array.isArray(v)||k==='id').map(([k,v])=>[k,numeric(v)])):o;
 for(const m of atlas.models){
  assert.deepEqual(numeric(m.input.records),numeric(m.sourceRecords),m.id+' source values');
  assert.deepEqual(numeric(m.compiled.records),numeric(m.sourceRecords),m.id+' compiled values');
  const ids=new Set(m.sourceRecords.map((r:any)=>r.id));
  assert.deepEqual(Object.keys(m.candidate).sort(),Object.keys(m.compiled.scenes).sort(),m.id+' states');
  for(const [key,scene]of Object.entries<any>(m.compiled.scenes)){
   assert(scene.keys.every((k:string)=>ids.has(k)),m.id+'/'+key+' model keys');
   const candidate=m.candidate[key];
   assert(['pele-svg','authored-svg'].includes(candidate.part));
   if(candidate.part==='pele-svg')assert(candidate.source?.length);
   else assert.equal(candidate.source,null,'Authored SVG must not pretend to be native syntax');
   for(const mark of candidate.svg.matchAll(/data-key="([^"]+)"/g))assert(ids.has(mark[1]),m.id+'/'+key+' mark '+mark[1]);
   assert(!/NaN|Infinity|undefined/.test(candidate.svg),m.id+'/'+key+' finite SVG');
  }
 }
});
test('Atlas preserves statistical caveats and the spatial per-100 denominator',()=>{
 const m=atlas.models.find((m:any)=>m.id==='spatial');
 assert.equal(m.compiled.options.find((o:any)=>o.value==='rate').label,'Per 100 population');
 assert(m.input.assumptions.some((s:string)=>s.includes('100')));
 const interval=atlas.models.find((m:any)=>m.id==='interval');
 assert(interval.input.assumptions.some((s:string)=>s.includes('not an exact small-sample')));
});
test('Editorial and historical collections retain contribution and variant boundaries',()=>{
 const editorial=JSON.parse(fs.readFileSync('public/pele-atlas/editorial.json','utf8'));
 assert.equal(editorial.length,6);
 assert.equal(new Set(editorial.map((c:any)=>c.id)).size,6);
 for(const c of editorial){assert(c.source&&c.svg&&c.sectionsKo.length===c.sectionsEn.length);assert.equal(c.table.headers.length,c.table.rows[0].length);}
 const history=JSON.parse(fs.readFileSync('public/pele-atlas/history.json','utf8'));
 assert(history.every((h:any)=>h.sha256.length===64&&h.screenReview==='historical-only'));
 assert.equal(history.find((h:any)=>h.id==='craft').variants.length,27);
 assert.equal(history.find((h:any)=>h.id==='expressive').variants.length,15);
 assert(fs.readdirSync('public/pele-atlas').every(n=>!n.endsWith('.pdf')&&!n.endsWith('.zip')));
});
