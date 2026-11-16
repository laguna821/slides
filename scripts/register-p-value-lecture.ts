import fs from 'node:fs/promises';
import path from 'node:path';
import {load} from 'cheerio';
import {sha,renderReader,validateReaderCoverage} from '../src/lib/reader';
import {sourceUnits} from './editorial';
import {normalize} from './localization';
import {readManifest} from './web-assets';
// Registers the 2026-11-17 lecture (Communication Research Methods II, week 11 in the Hallym 2026-2 calendar) from its
// Achmage Presentation build in ../research-methods-2-remake/11W-1 (the 2024 undergraduate 6W-1 and 6W-2 slides merged).
// English comes from that folder's reviewed site/english.json. Same method as register-sample-population-lecture.ts:
// R code and console output stay verbatim code blocks, tables become Markdown tables with one translation unit per cell,
// and a link inside a sentence keeps the words before it. The deck's one video slide (w1-14) is read as its still and
// alt text; the player's on-screen words come in as the slide's supplementary text.
const id='p-value-and-hypotheses-2026-11-17',base='/decks/'+id+'/v1.0.0',lecture='../research-methods-2-remake/11W-1';
const read=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p:string,v:any)=>{await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,JSON.stringify(v,null,2)+'\n');};
const exists=(p:string)=>fs.access(p).then(()=>true,()=>false);
const deck=await read(lecture+'/deck.light.json'),englishPath=lecture+'/site/english.json';
const english:Record<string,string>=await exists(englishPath)?await read(englishPath):{};
const dictionary=await read('content/i18n/en.json'),needed=new Set<string>();
const tr=(ko:string)=>{const k=normalize(ko);if(!/[가-힣]/.test(k))return;needed.add(k);if(english[k])dictionary[k]=english[k];};

const title='내 말이 틀릴 확률은 얼마일까요? — p-value와 가설검정, 그리고 가설 세우기';
const summary='주먹으로 뽑은 사탕으로 상자 전체를 추정할 때 내 말이 틀릴 확률(p-value)은 얼마일까요? 1종·2종 오류와 둘의 상충관계, 귀무가설과 대립가설을 세워 검정하는 순서, 독립변인·종속변인과 변인의 측정 방식(명서등비)까지 잇는 70장 강의입니다.';
const audience='p < .05는 외웠지만 그것이 무엇을 뜻하는지, 가설을 어떻게 세워야 하는지 아직 설명하기 어려운 대학원생';
const event='한림대학교 미디어스쿨 대학원 · 커뮤니케이션조사방법론 II · 2026년 11월 17일';
const body=['내 주먹 속 사탕으로 상자 전체를 말할 때, 내 말이 틀릴 확률은 얼마일까요? 지난 시간의 추론통계학을 이어받아 p-value를 “내 주장이 틀릴 확률”로 풀고, 1종 오류와 2종 오류, 그리고 추정 범위를 넓히거나 좁힐 때 두 오류가 맞바뀌는 상충관계를 사탕 뽑기 비유로 설명합니다.','한림대학교 미디어스쿨 대학원 「커뮤니케이션조사방법론 II」 11주차 강의입니다. 2024년 학부 조사방법론 6주차 자료 두 편의 문구와 순서를 그대로 두고 한 편으로 합쳐 Achmage Presentation으로 다시 만들었습니다. 귀무가설과 대립가설을 세우는 단계, 독립변인과 종속변인, 변인의 측정 방식(명목·서열·등간·비율)을 다룹니다.','슬라이드의 R 코드는 R 4.3.3으로 실제로 실행한 결과를 함께 실었습니다. 딸기 초콜릿 데이터의 신뢰구간과 t-test 결과(p = .298)가 슬라이드의 숫자와 같습니다. 원본의 GIF 장면은 같은 장면의 YouTube 영상으로 바꾸어 슬라이드에서 바로 재생할 수 있습니다. 사진과 일러스트는 2024년 강의자료 원본입니다(원출처 미기재).','한국어 슬라이드와 전체 읽기, 영어 소개·읽기를 제공합니다.'];
const takeaways=['p-value를 “내 주장이 틀릴 확률”로 설명하고, 유의확률 .05가 무엇을 뜻하는지 말할 수 있습니다.','1종 오류와 2종 오류를 구분하고, 추정 범위를 넓히거나 좁힐 때 두 오류가 어떻게 맞바뀌는지 이해합니다.','독립변인과 종속변인으로 귀무가설과 대립가설을 세우고, 변인을 명목·서열·등간·비율 척도로 측정하는 방식을 구분합니다.'];
const topics=['연구방법론','양적 연구','가설검정','추론통계'];
const label='강의 슬라이드 · 한국어 70장';
const posterAlt='‘P-value란? “내 주장이 틀릴 확률”’ 슬라이드: p-value를 설명하는 네 문장 아래 ‘950번 뽑기 (100개): 딸기 초콜릿이 6개 – 15개 사이’의 살색 주먹과 ‘1000번중 50번 (100개): 어? 왜 0개나 100개가 나와?? 속된말로 “뽀록” or “운빨”’의 파란 주먹 사진';
for(const s of [title,summary,audience,event,label,posterAlt,...body,...takeaways,...topics])tr(s);

// One reading chunk per slide, in deck order. Text stays as authored; inline emphasis is dropped so each paragraph or table
// cell is one translation unit, and every diagram's description is body text, not only alt text.
const assets=(await readManifest()).assets;
const urlFor=(bytes:Buffer,mime:string)=>{const a=assets[mime+':'+sha(bytes)];if(!a)throw Error('Image not registered in web-assets.json; run assets:sync');return a;};
const fromData=(uri:string)=>{const m=/^data:(image\/[a-z]+);base64,(.+)$/.exec(uri)!;return urlFor(Buffer.from(m[2],'base64'),m[1]);};
const images:any[]=[];
const txt=(n:any):string=>typeof n==='string'?n:n.type==='br'?'\n':(n.children||[]).map(txt).join('');
const flat=(s:string)=>s.split('\n').map(x=>x.trim()).filter(Boolean).join('\n');
const has=(n:any,role:string):boolean=>typeof n!=='string'&&((n.roles||[]).includes(role)||(n.children||[]).some((c:any)=>has(c,role)));
// Prose must render as the same text: "1인~7인" would otherwise become strikethrough (GFM ~...~) and "1) 모집단 :" at a
// line start a list marker. Only the Markdown is escaped (never code blocks); translation keys stay the visible text.
const lit=(t:string)=>t.replace(/[\\`*~<]/g,'\\$&').split('\n').map(x=>x.replace(/^(\d+)([.)])(\s|$)/,'$1\\$2$3').replace(/^([-+>#])(\s)/,'\\$1$2')).join('\n');
const alt=(t:string)=>lit(t).replace(/[[\]]/g,'\\$&').replaceAll('\n',' ');
async function material(n:any,out:string[]){
 const m=deck.materials.find((x:any)=>x.id===n.asset),bytes=await fs.readFile(lecture+'/'+m.file);
 const mime=m.file.endsWith('.webp')?'image/webp':m.file.endsWith('.png')?'image/png':'image/jpeg',a=urlFor(bytes,mime);
 tr(m.alt);out.push('!['+alt(m.alt)+']('+a.url+')');images.push({url:a.url,sha256:a.sha256});
 if(n.caption){tr(n.caption);out.push(lit(n.caption));}
}
function table(n:any,out:string[]){
 const rows:any[]=[];const collect=(x:any)=>{if(typeof x==='string')return;if(x.type==='tr'){rows.push(x);return;}for(const c of x.children||[])collect(c);};collect(n);
 const grid=rows.map(r=>(r.children||[]).filter((c:any)=>typeof c!=='string'&&(c.type==='td'||c.type==='th')).map((c:any)=>flat(txt(c)).replaceAll('\n',' ')));
 for(const r of grid)for(const t of r)tr(t);
 const width=Math.max(...grid.map(r=>r.length)),pad=(r:string[])=>[...r,...Array(width-r.length).fill('')].map(t=>lit(t).replaceAll('|','\\|'));
 const [head,...rest]=grid;   // a table without a header row shows its first row as the header
 out.push(['| '+pad(head).join(' | ')+' |','|'+Array(width).fill(' --- ').join('|')+'|',...rest.map(r=>'| '+pad(r).join(' | ')+' |')].join('\n'));
}
async function blocks(n:any,out:string[]){
 if(typeof n==='string'){if(n.trim()){tr(n);out.push(n.trim());}return;}
 const roles:string[]=n.roles||[];
 if(n.type==='material')return material(n,out);
 if(roles.includes('headline'))return;
 if(n.type==='pre'){const code=txt(n).replace(/\s+$/,'');out.push('```'+(has(n,'prompt')?'text':'r')+'\n'+code+'\n```');return;}
 if(n.type==='table')return table(n,out);
 if(n.type==='ul'){
  const items=(n.children||[]).map((li:any)=>flat(txt(li)).replaceAll('\n',' '));
  if(roles.includes('body-list')&&items.length===1){tr(items[0]);out.push('> '+lit(items[0]));return;}
  for(const t of items)tr(t);out.push(items.map((t:string)=>'- '+lit(t)).join('\n'));return;
 }
 if(n.type==='blockquote'){const t=flat(txt(n)).replaceAll('\n',' ');tr(t);out.push('> '+lit(t));return;}
 if(n.type==='p'&&(n.children||[]).some((c:any)=>c?.type==='a')){
  const parts=(n.children||[]).map((c:any)=>{
   if(typeof c!=='string'&&c.type==='a')return '['+txt(c)+']('+c.url+')';
   const t=(typeof c==='string'?c:txt(c)).replace(/\s+/g,' ');if(t.trim())tr(t);return lit(t);
  });
  out.push(parts.join('').trim());return;
 }
 if(n.type==='p'||n.type==='span'){
  const t=flat(txt(n));if(!t)return;
  const only=(n.children||[]).length===1&&n.children[0].type==='strong';
  // A multi-line paragraph keeps its lines (hard breaks) and the English build translates text nodes one by one, so each
  // line is its own translation unit; a single-line or wholly bold paragraph stays one unit.
  if(only||!t.includes('\n'))tr(t.replaceAll('\n',' '));else for(const line of t.split('\n'))tr(line);
  out.push(only?'**'+lit(t.replaceAll('\n',' '))+'**':lit(t).replaceAll('\n','  \n'));return;
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
  out.push('!['+alt(s.alt)+']('+a.url+')',lit(s.alt));if(s.caption){tr(s.caption);out.push(lit(s.caption));}
 }
 let chunk='## '+lit(heading)+'\n\n'+out.join('\n\n')+'\n\n';
 if(source){
  const $=load(source),section=$('section#'+s.id).clone();section.find('script,style,template,noscript,[hidden]').remove();
  const leaves:string[]=[];const walk=(x:any)=>{if(x.type==='text'&&x.data.trim())leaves.push(x.data.trim());for(const c of x.children||[])walk(c);};walk(section[0]);
  const norm=(t:string)=>t.replace(/\s/g,'').replace(/\\/g,'');const extras=[...new Set(leaves)].filter(t=>!norm(chunk).includes(norm(t)));
  if(extras.length){for(const t of extras)tr(t);chunk+='### 원본 화면의 보조 문구\n\n'+extras.map(lit).join('\n\n')+'\n\n';tr('원본 화면의 보조 문구');}
 }
 chunks.push(chunk);archive+=chunk;editorial+='<!-- unit-'+(i+2)+' -->\n\n'+chunk;
}

const missing=[...needed].filter(k=>!dictionary[k]);
if(process.argv.includes('--collect')){await write(lecture+'/site/korean-strings.json',[...needed]);await write(lecture+'/site/missing-strings.json',missing);console.log({needed:needed.size,missing:missing.length});process.exit(0);}
// --draft registers the Korean content without English only to list the remaining interface strings locally.
if(missing.length&&!process.argv.includes('--draft'))throw Error(missing.length+' strings lack reviewed English, e.g. '+missing.slice(0,3).join(' | '));
if(!source)throw Error('Create public'+base+'/source-web.html first (assets:sync, then the web copy)');

const work={id,slug:id,title,summary,date:'2026-11-17',registeredAt:'2026-11-16',kind:'lecture',topics,visibility:'listed',seo:'index',status:'selected',poster:'/images/'+id+'.png',posterAlt,audience,takeaways,event,body:body.join('\n\n'),course:{id:'communication-research-methods-ii-2026-2',title:'커뮤니케이션조사방법론 II',term:'2026학년도 2학기',week:11},artifacts:[{id:'p-value-lecture-html',type:'html',role:'slides',url:base+'/index.html',label,version:'1.0.0',modes:['present','read']}],mediaIds:[],resourceIds:[],htmlSource:'public'+base+'/source-web.html',reader:{version:'2.0.0',source:'content/reading/'+id+'.md',sourceVersion:'1.0.0 · 2026-11-17',manifest:'content/reading/manifest.json',editorialSource:'content/editorial/'+id+'.md',editorialManifest:'content/editorial/'+id+'.json'},provenance:'docs/'+id+'-provenance.json'};
await fs.writeFile(work.reader.source,archive);await fs.writeFile(work.reader.editorialSource,editorial);
const rd=renderReader(archive),leafCount=validateReaderCoverage(source,'html',rd);
const unique=[...new Map(images.map(x=>[x.url,x])).values()];
const mf=await read(work.reader.manifest);mf.works[id]={source:'public'+base+'/source-web.html',sourceSha256:sha(source),markdownSha256:sha(archive),units:deck.slides.map((s:any,i:number)=>({id:'s'+String(i+1).padStart(2,'0'),sha256:sha(chunks[i]),characters:chunks[i].length,contiguousOrderPreserved:true})),images,aliases:{},wiki:{},leafCount,missing:0};await write(work.reader.manifest,mf);
await write(work.reader.editorialManifest,{version:'2.0.0',workId:id,status:'reviewed',sourceSha256:sha(archive),editorialSha256:sha(editorial),review:{reviewer:'Claude Code (Achmage Presentation remake session) with instructor feedback on 2026-11-16',date:'2026-11-16',claims:'All 70 slides keep the 2024 wording and order of the week-6 slides 6W-1 and 6W-2 with typo and quotation-mark fixes only; 6W-1 slide 21 takes the instructor-corrected version from 6W-2 slide 6. The R results are the actual output of running the slide code in R 4.3.3, and the t-test output is split onto the next slide so code and result fit a 16:9 slide. On instructor request the GIF of slide 14 is replaced by the same scene as a YouTube video. No new factual claims are added.',images:'Re-drawn collages of the 2024 slide pictures (candy box, fists, the type I/II error table, the normal-curve p-value figure and the 명서등비 staircase) in light and dark variants, photographs or illustrations from the 2024 course slides, whose original sources are not recorded there, and a drawn still that names the YouTube video. Picture descriptions are also given as body text.',links:'External links named on the slides: the YouTube video of slide 14 (youtu.be/lK4ouRWGHHI). Its response status is recorded separately.'},units:sourceUnits(archive).map((u:any)=>{const chunk=editorial.split('<!-- '+u.id+' -->')[1].split(/<!-- unit-\d+ -->/)[0];return {id:u.id,sourceSha256:sha(u.text),legacyIds:[],disposition:'retain',reason:'Retained as written: the reading text already follows the slides one by one in the original order, so no editorial change was needed.',editedSha256:sha(chunk)};})});
const works=await read('content/works.json'),at=works.findIndex((w:any)=>w.id===id);if(at<0)works.unshift(work);else works[at]=work;await write('content/works.json',works);
await write('content/i18n/en.json',dictionary);
const only=await read('content/web-source-only.json'),src='decks/'+id+'/v1.0.0/source.html';if(!only.files.includes(src))only.files.push(src);await write('content/web-source-only.json',only);
const original=await fs.readFile('public'+base+'/source.html');
const locked=await fs.readFile('public'+base+'/index.html').catch(()=>null);
// A byte copy of the source is the pending-lock publication (.local/pending-lock-11w1.ts), not a locked deck.
if(locked&&sha(locked)!==sha(original)){const notes=await read('content/presenter-notes.json');notes.decks=notes.decks.filter((e:any)=>e.workId!==id);notes.decks.push({workId:id,url:base+'/index.html',source:base+'/source.html',sourceSha256:sha(original),sha256:sha(locked),notesState:'empty',enginePackageSha256:'234d5032fb53adb9268cbfee1bd4063ac12179999de5b8621a49e59a6ce15c4b',provenance:work.provenance});await write('content/presenter-notes.json',notes);}
await write(work.provenance,{version:1,original:{filename:'6W-1.pptx + 6W-2.pptx (조사방법론 2024-1, 강의 PPT/6W)',slides:82},remake:{packageSha256:'234d5032fb53adb9268cbfee1bd4063ac12179999de5b8621a49e59a6ce15c4b',bundleLockSha256:'2d5266dd230dc16f3f71fe5c62f6eb7cd27a154bf4e279d35f1faadf3c98d4c3',htmlSha256:sha(original),webProjectionSha256:sha(source),version:'1.0.0',slides:70,peleDiagrams:0,rOutput:'R 4.3.3 console output: the strawberry chocolate data frame, its confidence interval and a one-sample t-test',font:'Achmage SameTone 1.000 through the engine custom-font option'},adaptation:'Wording and order of the 2024 undergraduate week-6 slides (6W-1 and 6W-2) are kept and merged into one deck. 6W-2 slides 1–10 (cover and review of 6W-1) and 12–14 (identical to 6W-1 slides 27–29) were dropped; the instructor-corrected 6W-2 slide 6 replaces 6W-1 slide 21. Fixes: typos, quotation marks and the course subtitle; R comments moved onto their own lines so the code runs. Every R code block is shown with its actual R 4.3.3 output; the t-test output is placed on the following slide (added) because code and result do not fit one 16:9 slide. On instructor request the GIF of slide 14 is replaced by the same scene as a YouTube video (https://youtu.be/lK4ouRWGHHI), played in a privacy-enhanced youtube-nocookie player when the deck is opened over the web, with a still and a link otherwise. Original slide pictures are re-drawn at their source positions in brand colours; one light-based HTML switches theme at runtime with dark figure and collage variants attached by CSS, and the remaining theme font references point to SameTone. Instructor notes are not authored for this deck. No private notes or local paths are published.'});
const links=await read('validation/editorial-links.json');links.sources[id]=sha(editorial);links.links=links.links.filter((l:any)=>l.workId!==id);
for(const href of new Set(renderReader(editorial).links))if(!href.startsWith('#')){
 let status='uncertain',http:number|undefined;try{const res=await fetch(href,{signal:AbortSignal.timeout(30000)});http=res.status;if(res.ok)status='verified';await res.body?.cancel();}catch{}
 links.links.push({workId:id,href,status,http,checkedAt:new Date().toISOString(),review:status==='uncertain'?'Automated fetch unavailable or not OK; the link is named on the slide. Do not label HTTP verification as passed.':undefined});
}
await write('validation/editorial-links.json',links);
console.log({id,slides:deck.slides.length,images:unique.length,leafCount,translations:needed.size,locked:!!locked});
