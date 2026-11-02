import fs from 'node:fs/promises';
import path from 'node:path';
import {load} from 'cheerio';
import {sha,renderReader,validateReaderCoverage} from '../src/lib/reader';
import {sourceUnits} from './editorial';
import {normalize} from './localization';
import {readManifest,transformText} from './web-assets';
// Registers the 2026-11-03 lecture (Communication Research Methods II, week 9 in the Hallym 2026-2 calendar) from its Achmage Presentation
// build in ../research-methods-2-remake/9W-1. English comes from that folder's reviewed site/english.json.
const id='why-research-hypotheses-2026-11-03',base='/decks/'+id+'/v1.0.0',lecture='../research-methods-2-remake/9W-1';
const read=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p:string,v:any)=>{await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,JSON.stringify(v,null,2)+'\n');};
const exists=(p:string)=>fs.access(p).then(()=>true,()=>false);
const deck=await read(lecture+'/deck.light.json'),englishPath=lecture+'/site/english.json';
const english:Record<string,string>=await exists(englishPath)?await read(englishPath):{};
const dictionary=await read('content/i18n/en.json'),needed=new Set<string>();
const tr=(ko:string)=>{const k=normalize(ko);if(!/[가-힣]/.test(k))return;needed.add(k);if(english[k])dictionary[k]=english[k];};

const title='AI가 다 해주는데 연구가설은 왜 세워야 할까요? — 사회과학 양적 조사방법론의 기초';
const summary='AI가 분석까지 대신해 주는데도 연구가설을 직접 세워야 하는 이유는 무엇일까요? 가설의 기본 구조에서 과학적 지식의 조건, 연역과 귀납, 이론의 역할까지 이어지는 42장 강의입니다.';
const audience='AI로 분석은 돌려 보지만 연구가설을 왜, 어떻게 세우는지 아직 설명하기 어려운 대학원생';
const event='한림대학교 미디어스쿨 대학원 · 커뮤니케이션조사방법론 II · 2026년 11월 3일';
const body=['AI가 분석을 대신해 주는 시대에도 무엇을 검증할지는 연구자가 정해야 합니다. 가설의 기본 구조와 H1·H0, 변인의 측정 수준에서 시작해 내 가설이 왜 과학적 지식이 될 수 있는지를 다시 묻습니다.','한림대학교 미디어스쿨 대학원 「커뮤니케이션조사방법론 II」 9주차 강의입니다. 2024년 학부 조사방법론 9주차 자료의 문구와 순서를 그대로 두고 Achmage Presentation으로 다시 만들었습니다. 반증가능성·포괄성·반복가능성, 연역법과 귀납법, 추론통계의 1종·2종 오류, 관련 연구와 이론으로 가설을 일반화하는 단계를 다룹니다.','개념도는 Achmage Pele로 그렸고, 사진과 일러스트는 2024년 강의자료 원본입니다(원출처 미기재). 마지막 장의 주간 과제는 각자의 연구 관심사로 가설·연구문제를 세우고 설문 척도를 찾아보는 세 문항입니다.','한국어 슬라이드와 전체 읽기, 영어 소개·읽기를 제공합니다.'];
const takeaways=['가설을 ‘A가 늘면 B도 늘거나 준다’는 기본 구조와 H1·H0로 적습니다.','반증가능성·포괄성·반복가능성으로 과학적 지식의 조건을 점검합니다.','관련 연구와 이론으로 내 가설을 일반화하고 변인의 측정 수준을 확인합니다.'];
const topics=['연구방법론','양적 연구','연구가설','AI와 학습'];
const label='강의 슬라이드 · 한국어 42장';
const posterAlt='H1(연구가설/대립가설)과 H0(영가설/귀무가설)을 독립변인·종속변인 상자로 나란히 보여 주는 가설 구조 도식 슬라이드';
for(const s of [title,summary,audience,event,label,posterAlt,...body,...takeaways,...topics])tr(s);

// One reading chunk per slide, in deck order. Text stays as authored; inline emphasis is dropped so each
// paragraph is one translation unit, and every diagram's description is body text, not only alt text.
const assets=(await readManifest()).assets;
const urlFor=(bytes:Buffer,mime:string)=>{const a=assets[mime+':'+sha(bytes)];if(!a)throw Error('Image not registered in web-assets.json; run assets:sync');return a;};
const fromData=(uri:string)=>{const m=/^data:(image\/[a-z]+);base64,(.+)$/.exec(uri)!;return urlFor(Buffer.from(m[2],'base64'),m[1]);};
const images:any[]=[];
const txt=(n:any):string=>typeof n==='string'?n:n.type==='br'?'\n':(n.children||[]).map(txt).join('');
const flat=(s:string)=>s.split('\n').map(x=>x.trim()).filter(Boolean).join('\n');
async function material(n:any,out:string[]){
 const m=deck.materials.find((x:any)=>x.id===n.asset),bytes=await fs.readFile(lecture+'/'+m.file);
 const mime=m.file.endsWith('.webp')?'image/webp':m.file.endsWith('.png')?'image/png':'image/jpeg',a=urlFor(bytes,mime);
 tr(m.alt);out.push('!['+m.alt+']('+a.url+')');images.push({url:a.url,sha256:a.sha256});
 if(n.caption){tr(n.caption);out.push(n.caption);}
}
async function blocks(n:any,out:string[]){
 if(typeof n==='string'){if(n.trim()){tr(n);out.push(n.trim());}return;}
 const roles:string[]=n.roles||[];
 if(n.type==='material')return material(n,out);
 if(roles.includes('headline'))return;
 if(n.type==='ul'){
  const items=(n.children||[]).map((li:any)=>flat(txt(li)).replaceAll('\n',' '));
  if(roles.includes('body-list')&&items.length===1){tr(items[0]);out.push('> '+items[0]);return;}
  for(const t of items)tr(t);out.push(items.map((t:string)=>'- '+t).join('\n'));return;
 }
 if(n.type==='blockquote'){const t=flat(txt(n)).replaceAll('\n',' ');tr(t);out.push('> '+t);return;}
 if(n.type==='p'&&(n.children||[]).some((c:any)=>c.type==='a')){const a=n.children.find((c:any)=>c.type==='a');out.push('['+txt(a)+']('+a.url+')');return;}
 if(roles.includes('cell')&&(n.children||[])[0]?.roles?.includes('cell-no')){
  const [no,head,...rest]=n.children;const t=txt(no)+' '+txt(head);tr(t);out.push('**'+t+'**');for(const c of rest)await blocks(c,out);return;
 }
 if(n.type==='p'||n.type==='span'){
  const t=flat(txt(n));if(!t)return;tr(t.replaceAll('\n',' '));
  const only=(n.children||[]).length===1&&n.children[0].type==='strong';
  out.push(only?'**'+t.replaceAll('\n',' ')+'**':t.replaceAll('\n','  \n'));return;
 }
 for(const c of n.children||[])await blocks(c,out);
}
const intro='## 강의 전체 읽기\n\n'+body.join('\n\n')+'\n\n';tr('강의 전체 읽기');
const dark=await read(lecture+'/deck.dark.json');
const source=await fs.readFile('public'+base+'/source-web.html','utf8').catch(()=>'');
let archive=intro,editorial='<!-- unit-1 -->\n\n'+intro;const chunks:string[]=[];
for(const [i,s] of deck.slides.entries()){
 const no=String(i+1).padStart(2,'0'),heading=no+'. '+s.title;tr(heading);
 const out:string[]=[];
 for(const n of s.nodes)await blocks(n,out);
 if(s.imageData){
  const a=fromData(s.imageData);tr(s.alt);images.push({url:a.url,sha256:a.sha256});
  const d=dark.slides.find((x:any)=>x.id===s.id);if(d?.imageData)fromData(d.imageData);
  out.push('!['+s.alt+']('+a.url+')',s.alt);if(s.caption){tr(s.caption);out.push(s.caption);}
 }
 let chunk='## '+heading+'\n\n'+out.join('\n\n')+'\n\n';
 if(source){
  const $=load(source),section=$('section#'+s.id).clone();section.find('script,style,template,noscript,[hidden]').remove();
  const leaves:string[]=[];const walk=(x:any)=>{if(x.type==='text'&&x.data.trim())leaves.push(x.data.trim());for(const c of x.children||[])walk(c);};walk(section[0]);
  const norm=(t:string)=>t.replace(/\s/g,'');const extras=[...new Set(leaves)].filter(t=>!norm(chunk).includes(norm(t)));
  if(extras.length){for(const t of extras)tr(t);chunk+='### 원본 화면의 보조 문구\n\n'+extras.join('\n\n')+'\n\n';tr('원본 화면의 보조 문구');}
 }
 chunks.push(chunk);archive+=chunk;editorial+='<!-- unit-'+(i+2)+' -->\n\n'+chunk;
}

const missing=[...needed].filter(k=>!dictionary[k]);
if(process.argv.includes('--collect')){await write(lecture+'/site/korean-strings.json',[...needed]);console.log({needed:needed.size,missing:missing.length});process.exit(0);}
// --draft registers the Korean content without English only to list the remaining interface strings locally.
if(missing.length&&!process.argv.includes('--draft'))throw Error(missing.length+' strings lack reviewed English, e.g. '+missing.slice(0,3).join(' | '));
if(!source)throw Error('Create public'+base+'/source-web.html first (assets:sync, then --web)');

const work={id,slug:id,title,summary,date:'2026-11-03',registeredAt:'2026-11-02',kind:'lecture',topics,visibility:'listed',seo:'index',status:'selected',poster:'/images/'+id+'.png',posterAlt,audience,takeaways,event,body:body.join('\n\n'),course:{id:'communication-research-methods-ii-2026-2',title:'커뮤니케이션조사방법론 II',term:'2026학년도 2학기',week:9},artifacts:[{id:'hypothesis-lecture-html',type:'html',role:'slides',url:base+'/index.html',label,version:'1.0.0',modes:['present','read']}],mediaIds:[],resourceIds:[],htmlSource:'public'+base+'/source-web.html',reader:{version:'2.0.0',source:'content/reading/'+id+'.md',sourceVersion:'1.0.0 · 2026-11-03',manifest:'content/reading/manifest.json',editorialSource:'content/editorial/'+id+'.md',editorialManifest:'content/editorial/'+id+'.json'},provenance:'docs/'+id+'-provenance.json'};
await fs.writeFile(work.reader.source,archive);await fs.writeFile(work.reader.editorialSource,editorial);
const rd=renderReader(archive),leafCount=validateReaderCoverage(source,'html',rd);
const unique=[...new Map(images.map(x=>[x.url,x])).values()];
const mf=await read(work.reader.manifest);mf.works[id]={source:'public'+base+'/source-web.html',sourceSha256:sha(source),markdownSha256:sha(archive),units:deck.slides.map((s:any,i:number)=>({id:'s'+String(i+1).padStart(2,'0'),sha256:sha(chunks[i]),characters:chunks[i].length,contiguousOrderPreserved:true})),images,aliases:{},wiki:{},leafCount,missing:0};await write(work.reader.manifest,mf);
await write(work.reader.editorialManifest,{version:'2.0.0',workId:id,status:'reviewed',sourceSha256:sha(archive),editorialSha256:sha(editorial),review:{reviewer:'Claude Code (Achmage Presentation remake session) with instructor feedback on 2026-11-02',date:'2026-11-02',claims:'All 42 slides keep the 2024 wording and order with the instructor-approved typo and term fixes; the instructor reviewed the first build slide by slide and the requested changes are applied. No new factual claims are added.',images:'Twelve Achmage Pele concept diagrams (light and dark variants) and eight photographs or illustrations from the 2024 course slides, whose original sources are not recorded there. Diagram descriptions are also given as body text.',links:'One external example link (a YouTube advertisement named on the original slide). Its response status is recorded separately.'},units:sourceUnits(archive).map((u:any,i:number)=>{const chunk=editorial.split('<!-- '+u.id+' -->')[1].split(/<!-- unit-\d+ -->/)[0];return {id:u.id,sourceSha256:sha(u.text),legacyIds:[],disposition:'retain',reason:'Retained as written: the reading text already follows the slides one by one in the original order, so no editorial change was needed.',editedSha256:sha(chunk)};})});
const works=await read('content/works.json'),at=works.findIndex((w:any)=>w.id===id);if(at<0)works.unshift(work);else works[at]=work;await write('content/works.json',works);
await write('content/i18n/en.json',dictionary);
const only=await read('content/web-source-only.json'),src='decks/'+id+'/v1.0.0/source.html';if(!only.files.includes(src))only.files.push(src);await write('content/web-source-only.json',only);
const original=await fs.readFile('public'+base+'/source.html');
const locked=await fs.readFile('public'+base+'/index.html').catch(()=>null);
if(locked){const notes=await read('content/presenter-notes.json');notes.decks=notes.decks.filter((e:any)=>e.workId!==id);notes.decks.push({workId:id,url:base+'/index.html',source:base+'/source.html',sourceSha256:sha(original),sha256:sha(locked),notesState:'empty',enginePackageSha256:'234d5032fb53adb9268cbfee1bd4063ac12179999de5b8621a49e59a6ce15c4b',provenance:work.provenance});await write('content/presenter-notes.json',notes);}
await write(work.provenance,{version:1,original:{filename:'9W-1.pptx (조사방법론 2024-1, 강의 PPT/9W)',slides:43},remake:{packageSha256:'234d5032fb53adb9268cbfee1bd4063ac12179999de5b8621a49e59a6ce15c4b',bundleLockSha256:'2d5266dd230dc16f3f71fe5c62f6eb7cd27a154bf4e279d35f1faadf3c98d4c3',htmlSha256:sha(original),webProjectionSha256:sha(source),version:'1.0.0',slides:42,diagrams:12,photographs:8,font:'Achmage SameTone 1.000 through the engine custom-font option'},adaptation:'Wording and order of the 2024 undergraduate week-9 slides are kept; instructor-approved fixes: typos, H1/H0 terms, the Describe translation, matched brackets and the course subtitle. After the instructor review of the first build: duplicate slide 24 and the review slide 2 removed, three titles changed and one explanation added by the instructor, cycle arrows restored from the original SmartArt connectors, measurement levels emphasised as instructed. One light-based HTML switches theme at runtime; dark diagram variants are attached per slide by CSS and the remaining theme font references point to SameTone. Instructor notes are not authored for this deck. No private notes or local paths are published.'});
const links=await read('validation/editorial-links.json');links.sources[id]=sha(editorial);links.links=links.links.filter((l:any)=>l.workId!==id);
for(const href of new Set(renderReader(editorial).links))if(!href.startsWith('#')){
 let status='uncertain',http:number|undefined;try{const res=await fetch(href,{signal:AbortSignal.timeout(30000)});http=res.status;if(res.ok)status='verified';await res.body?.cancel();}catch{}
 links.links.push({workId:id,href,status,http,checkedAt:new Date().toISOString(),review:status==='uncertain'?'Automated fetch unavailable; the link is the example named on the original slide. Do not label HTTP verification as passed.':undefined});
}
await write('validation/editorial-links.json',links);
console.log({id,slides:deck.slides.length,images:unique.length,leafCount,translations:needed.size,locked:!!locked});
