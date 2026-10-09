import test from 'node:test';
import assert from 'node:assert/strict';
import { workSchema,resourceSchema,validateResources } from '../src/lib/schema';
import { validatePolicy } from '../src/lib/policy';
import { makeSearchEntries,runSearch,defaultFilters,readFilters,writeFilters } from '../src/lib/search';
import { validateReview,canonicalJson,validatePosterGeometry } from '../scripts/release-gate';
test('deployment config formatting is stable while semantic changes invalidate review',()=>{
 assert.equal(canonicalJson({headers:[{value:'nosniff',key:'X'}],buildCommand:'verify'}),canonicalJson({buildCommand:'verify',headers:[{key:'X',value:'nosniff'}]}));
 assert.notEqual(canonicalJson({buildCommand:'verify'}),canonicalJson({buildCommand:'build'}));
});
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { localAssetPath,rejectDraftResource } from '../scripts/resource-files';
test('draft resources reject query, encoded path and manifest-only assets',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'achmage-draft-'));
 try{
  await fs.writeFile(path.join(temp,'private.html'),'private');
  assert.equal(localAssetPath(temp,'/private.html?v=1#x'),path.join(temp,'private.html'));
  assert.equal(localAssetPath(temp,'/pr%69vate.html'),path.join(temp,'private.html'));
  await assert.rejects(rejectDraftResource(temp,{...resource,preview:'/private.html?v=1'}));
  await assert.rejects(rejectDraftResource(temp,{...resource,versions:[{...resource.versions[0],files:{'/private.html#preview':'a'.repeat(64)}}]}));
  assert.throws(()=>localAssetPath(temp,'/%2e%2e%2foutside.txt'));
 }finally{await fs.rm(temp,{recursive:true,force:true});}
});
const work=workSchema.parse({id:'event',slug:'event',title:'행사',summary:'행사 내용을 소개합니다.',date:'2026-10-09',registeredAt:'2026-10-09',kind:'poster',topics:['교육'],visibility:'listed',seo:'index',status:'study',poster:'/cover.webp',posterAlt:'행사 포스터',resourceIds:['event-poster']});
const resource=resourceSchema.parse({id:'event-poster',kind:'poster',workId:'event',title:'행사 포스터',summary:'일정과 발표자',body:'발표자 홍길동',preview:'/cover.webp',previewAlt:'포스터',currentVersion:'v1',versions:[{id:'v1',html:'/poster.html',pdf:'/poster.pdf',engineVersion:'1.0.0-rc.6',viewerVersion:'1.0.0-rc.6',packageSha256:'a'.repeat(64),files:{'/poster.html':'b'.repeat(64),'/poster.pdf':'c'.repeat(64)}}]});
test('poster resource owner/exposure/version validated',()=>{
 validateResources([work],[resource]);validatePolicy([work],[],[resource]);
 assert.throws(()=>validateResources([work],[]));
 const second=workSchema.parse({...work,id:'other',slug:'other'});
 assert.throws(()=>validateResources([{...work,visibility:'draft'},second],[resource]));
 assert.throws(()=>validateResources([work],[resource,resource]));
});
test('published work requires context and current poster viewer',()=>{
 assert.throws(()=>validatePolicy([{...work,registeredAt:undefined}],[],[resource]));
 assert.throws(()=>validatePolicy([{...work,kind:'talk'}],[],[resource]));
 assert.throws(()=>validatePolicy([work],[],[{...resource,versions:[{...resource.versions[0],viewerVersion:'1.0.0-rc.5'}]}]));
});
test('poster text gives one project search result and URL restored',()=>{
 const entries=makeSearchEntries([{...work,href:'/talks/event/',readingHtml:'',body:'발표자 홍길동',videoCount:0,segments:[{id:'poster-event-poster',title:'포스터',text:'발표자 홍길동',href:'/talks/event/#poster-event-poster',kind:'poster'}]}]);
 const filters={...defaultFilters,q:'홍길동',resource:'poster'};
 const result=runSearch(entries,filters);assert.equal(result.length,1);assert.equal(result[0].href,'/talks/event/#poster-event-poster');
 assert.deepEqual(readFilters(new URLSearchParams(writeFilters(filters))),filters);
});
test('release rejects stale or incomplete review',()=>{
 assert.throws(()=>validateReview({policyVersion:'2.0.0',digest:'old',status:'passed'},'new'));
 assert.throws(()=>validateReview({policyVersion:'2.0.0',digest:'same',status:'passed',views:[]},'same'));
});

test('circulating posters require measured stable geometry for every size and theme',()=>{
 const route='/experiments/test/';
 const rows=[375,768,1440].flatMap(width=>['light','dark'].map(theme=>({route,width,actualWidth:width,theme,pages:['a','b'],sameScale:true,sameLogicalWidth:true,clipped:0,boxMaxDelta:0,headingMaxDelta:0,factsMaxDelta:0})));
 validatePosterGeometry(rows,route,2);
 validatePosterGeometry(rows.map(r=>({...r,pages:['single']})),route,1);
 assert.throws(()=>validatePosterGeometry(rows,route,3));
 assert.throws(()=>validatePosterGeometry(rows.slice(1),route,2));
 for(const change of [{boxMaxDelta:49},{headingMaxDelta:1},{factsMaxDelta:NaN},{sameScale:false},{sameLogicalWidth:false},{clipped:1},{pages:['a','a']}]){
  assert.throws(()=>validatePosterGeometry([{...rows[0],...change},...rows.slice(1)],route,2));
 }
});
