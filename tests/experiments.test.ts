import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {verifyExperiments,validateParallelPoster} from '../scripts/experiments';
const original=JSON.parse(await fs.readFile('content/experiments.json','utf8'));
test('registered series assets, provenance, paper and PDF link are valid',async()=>assert.equal(await verifyExperiments(),original.items.length));
test('public experiment cannot silently enter listings',async()=>{const m=structuredClone(original);m.items[0].visibility='listed';await assert.rejects(verifyExperiments(process.cwd(),'public',m),/exposure/);});
test('experiment output changes invalidate the asset pin',async()=>{const m=structuredClone(original);m.items[0].files['poster.pdf']='0'.repeat(64);await assert.rejects(verifyExperiments(process.cwd(),'public',m),/changed/);});
test('unapproved renderer cannot ship as an experiment',async()=>{const m=structuredClone(original);m.items[0].viewerVersion='unknown';await assert.rejects(verifyExperiments(process.cwd(),'public',m),/renderer/);});

test('geometry review page count is pinned to the actual poster spec',async()=>{const m=structuredClone(original);m.items.find((x:any)=>x.id==='pkm-speaker-posters-2026').screenScenes=1;await assert.rejects(verifyExperiments(process.cwd(),'public',m),/page count/);});

test('HTML two posters and independently composed one-page CMYK A2 stay separate',async()=>{
 const item=original.items.find((x:any)=>x.id==='pkm-speaker-posters-2026');
 const spec=JSON.parse(await fs.readFile('public'+item.path+'poster-spec.json','utf8'));
 const audit=JSON.parse(await fs.readFile('public'+item.path+'print-audit.json','utf8'));
 assert.equal(spec.scenes.length,2);assert.equal(audit.pages,1);validateParallelPoster(item,spec,audit);
 assert.throws(()=>validateParallelPoster({...item,printPages:2},spec,audit),/page count/);
 const omitted=structuredClone(spec);omitted.print.rows.pop();assert.throws(()=>validateParallelPoster(item,omitted,audit),/coverage/);
 for(const patch of [{preflight:{...audit.preflight,rgbOperators:1}},{preflight:{...audit.preflight,embeddedFonts:[]}},{outputProfile:{...audit.outputProfile,sha256:'0'.repeat(64)}}])assert.throws(()=>validateParallelPoster(item,spec,{...audit,...patch}));
 const split=structuredClone(spec);split.print.pages=[{rows:spec.print.rows},{rows:spec.print.rows}];delete split.print.rows;
 assert.throws(()=>validateParallelPoster({...item,printPages:2},split,{...audit,pages:2}),/authorization/);
});
