import fs from 'node:fs/promises';
import path from 'node:path';
import {load} from 'cheerio';
import {sha,renderReader,validateReaderCoverage} from '../src/lib/reader';
import {sourceUnits} from './editorial';
import {normalize} from './localization';
const id='still-working-on-my-topic-2026-10-20',base='/decks/'+id+'/v1.0.0';
const read=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p:string,v:any)=>{await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,JSON.stringify(v,null,2)+'\n');};
const rows=await read('../lecture-content.json'),english=await read('../english-content.json');
if(rows.length!==106||english.length!==rows.length)throw Error('Lecture inventory mismatch');
const dictionary=await read('content/i18n/en.json');
const tr=(ko:string,en:string)=>{if(ko&&/[가-힣]/.test(ko)){if(!en)throw Error('Missing authored English: '+ko);dictionary[normalize(ko)]=en;}};
for(const pair of await read('../english-paragraph-pairs.json'))tr(pair.ko,pair.en);
const captions={caption:'가상 사례 · AI 생성 삽화',source:'가상 학생 민서 · 수업용 예시 · AI 생성 삽화'};
tr(captions.caption,'Fictional example · AI-generated illustration');tr(captions.source,'Fictional student Minseo · Classroom example · AI-generated illustration');
tr('수업용 자체 작성 예시','Original classroom example');tr('출처·구분:','Source and evidence status:');
tr('스킬 ZIP 받기','Download the skill ZIP');tr('학생용 빈 볼트 받기','Download the empty student vault');
tr('바로 시작하기','Getting started');tr('원본 화면의 보조 문구','Supporting text from the original screen');
for(let i=0;i<rows.length;i++){
 const r=rows[i],e=english[i];tr(r.title.replaceAll('\n',' '),e[0]);tr(r.body,e[1]);tr(r.detail,e[2]);
 const parts=(r.compare||r.steps||[]).flat();const translated=e[3]||[];
 if(parts.length!==translated.length)throw Error('English comparison/steps mismatch '+(i+1));
 parts.forEach((k:string,j:number)=>tr(k,translated[j]));
 tr(r.source,r.source.includes('수업용 재구성 가설')?'Altay & Gilardi (2024), PNAS Nexus · Classroom reconstruction of a hypothesis':r.source.includes('PDF 3쪽')?'Altay & Gilardi (2024), PNAS Nexus · Study 1, PDF page 3':r.source.includes('PDF 7쪽')?'Altay & Gilardi (2024), PNAS Nexus · Study 2, PDF page 7':r.source==='교수자 설명 · 수업용 가상 사례'?'Instructor explanation and fictional classroom scenario':r.source.includes('교수자')?'Instructor observation and recollection of last week’s oral responses':r.source.includes('Lee')?'Lee et al. (2025), CHI · The Impact of Generative AI on Critical Thinking · Self-report survey':r.source.includes('가상')?'Fictional student Minseo · Classroom example · AI-generated illustration':r.source==='수업용 자체 작성 예시'?'Original classroom example':r.source);
}
const title='교수님, 저 주제를 아직 잡고 있어요 — 그 말을 지금 몇 개월째 하고 계십니까?';
const summary='AI로 쓴 15페이지를 왜 설명하지 못할까요? 가상 대학원생 민서의 사례로 주제 좁히기·논문 읽기·이론·가설·방법·지도교수 면담을 연결하는 106장 강의입니다.';
const audience='AI로 초안을 만들지만 자신의 연구 질문과 방법을 설명하기 어려운 대학원생';
const event='한림대학교 미디어스쿨 대학원 · 커뮤니케이션조사방법론 II · 2026년 10월 20일';
const body=['“아직 주제를 잡고 있어요”라는 말을 몇 개월째 반복하고 있다면, 원고의 분량보다 질문이 어떻게 달라졌는지부터 살펴봅니다. 가상 대학원생 민서가 AI로 만든 15페이지 앞에서 막히고, 실제 논문을 읽으며 질문을 바꾸는 과정을 따라갑니다.','한림대학교 미디어스쿨 대학원 「커뮤니케이션조사방법론 II」 8주차를 위해 제작한 강의입니다. 지난주 설문척도 수업에서 이어져, 관심 분야를 비교할 장면으로 좁히고 개념·이론·가설·측정·설계를 연결합니다.','본편 104장에는 CMDS 스타일의 가상 사례 삽화 14개를 사용했습니다. 마지막 두 장은 Socratic Advisor와 빈 Obsidian 볼트를 받아 각자 이어가는 안내입니다. 설치 실습이 강의의 중심은 아닙니다.','한국어 슬라이드와 전체 읽기, 영어 소개·읽기를 제공합니다. 관찰·가상 예시·실제 논문 근거를 구분하며, 스킬이 학생 대신 프로포절을 완성하거나 이해도를 자동 채점한다고 소개하지 않습니다.'];
const enBody=['If you have been saying I am still working on my topic for months, begin by asking how your question changed rather than how many pages you wrote. Follow fictional graduate student Minseo from being unable to explain an AI-produced draft to revising questions by reading an actual paper.','Prepared for week eight of graduate Communication Research Methods II at Hallym University Media School. Building on the previous survey-scale lesson, it connects concrete comparisons with concepts, theory, hypotheses, measurement, and research design.','The 104-slide main lecture uses fourteen CMDS-style fictional illustrations. The final two slides offer Socratic Advisor and an empty Obsidian vault for individual follow-up. Software installation practice is not the main lesson.','Includes the Korean slides and full reading version, with English introduction and reading. Observations, fictional examples, and actual research evidence are distinguished. The skill is not presented as completing a proposal for the student or automatically grading understanding.'];
tr(title,'Professor, I am still working on my topic — How many months have you been saying that?');
tr(summary,'Why can you not explain fifteen pages drafted with AI? A 106-slide lecture following fictional graduate student Minseo through topic refinement, paper reading, theory, hypotheses, methods, and advisor meetings.');
tr(audience,'Graduate students who use AI to draft but struggle to explain their own research questions and methods');
tr(event,'Hallym University Media School · Graduate Communication Research Methods II · October 20, 2026');
body.forEach((v,i)=>tr(v,enBody[i]));
const takeaways=['넓은 관심을 실제로 비교할 연구 질문으로 좁힙니다.','논문에서 확인한 내용과 아직 모르는 것을 구분합니다.','이론·가설·측정·설계를 연결해 지도받을 질문을 만듭니다.'];
takeaways.forEach((v,i)=>tr(v,['Narrow a broad interest into a research question with a concrete comparison.','Distinguish what you checked in a paper from what remains unknown.','Connect theory, hypotheses, measurement, and design to formulate questions for guidance.'][i]));
const labels=['강의 슬라이드 · 한국어 106장','Socratic Advisor 스킬 ZIP','학생용 빈 Obsidian 볼트'];
labels.forEach((v,i)=>tr(v,['Lecture slides · 106 slides in Korean','Socratic Advisor skill ZIP','Empty student Obsidian vault'][i]));
const topics=['연구방법론','대학원 연구','논문 읽기','AI와 학습'];topics.forEach((v,i)=>tr(v,['Research methods','Graduate research','Reading research papers','AI and learning'][i]));
const posterAlt='주제를 아직 잡고 있는 가상 대학원생 민서와 흘러가는 달력';tr(posterAlt,'Fictional graduate student Minseo trying to find a topic as calendar pages pass');
const work={id,slug:id,title,summary,date:'2026-10-20',registeredAt:'2026-10-19',kind:'lecture',topics,visibility:'listed',seo:'index',status:'selected',poster:'/images/'+id+'.png',posterAlt,audience,takeaways,event,body:body.join('\n\n'),course:{id:'communication-research-methods-ii-2026-2',title:'커뮤니케이션조사방법론 II',term:'2026학년도 2학기',week:8},artifacts:[{id:'topic-lecture-html',type:'html',role:'slides',url:base+'/index.html',label:labels[0],version:'1.0.0',modes:['present','read']},{id:'socratic-advisor-skill',type:'link',role:'kit',url:'https://github.com/laguna821/slides/releases/download/socratic-advisor-0.1.0/Achmage-Socratic-Advisor-0.1.0-skill.zip',label:labels[1],version:'0.1.0',modes:['download']},{id:'socratic-advisor-vault',type:'link',role:'kit',url:'https://github.com/laguna821/slides/releases/download/socratic-advisor-0.1.0/Achmage-Socrates-student-vault-0.1.0.zip',label:labels[2],version:'0.1.0',modes:['download']}],mediaIds:[],resourceIds:[],htmlSource:'public'+base+'/index.html',reader:{version:'2.0.0',source:'content/reading/'+id+'.md',sourceVersion:'1.0.0 · 2026-10-20',manifest:'content/reading/manifest.json',editorialSource:'content/editorial/'+id+'.md',editorialManifest:'content/editorial/'+id+'.json'},provenance:'docs/topic-lecture-provenance.json'};
await fs.mkdir('public'+base,{recursive:true});await fs.copyFile('../release/lecture-fulltext.html','public'+base+'/source.html');await fs.copyFile('../release/lecture-fulltext-locked.html','public'+base+'/index.html');await fs.copyFile('../release/lecture-fulltext-web.html','public'+base+'/source-web.html');
await fs.copyFile('../assets/01-topic.png','public/images/'+id+'.png');
const originalSource=await fs.readFile('../release/lecture-fulltext.html','utf8'),source=await fs.readFile('../release/lecture-fulltext-web.html','utf8'),$=load(source),assets=await read('content/web-assets.json'),deck=await read('../deck.json');
work.htmlSource='public'+base+'/source-web.html';
tr('실제 논문 원문','Original research paper');tr('AI와 비판적 사고 연구','Research on AI and critical thinking');tr('대학원 지도 안내','Graduate advising guide');
const intro='## 강의 전체 읽기\n\n'+body.join('\n\n')+'\n\n[실제 논문 원문](https://doi.org/10.1093/pnasnexus/pgae403) · [AI와 비판적 사고 연구](https://www.microsoft.com/en-us/research/publication/the-impact-of-generative-ai-on-critical-thinking-self-reported-reductions-in-cognitive-effort-and-confidence-effects-from-a-survey-of-knowledge-workers/) · [대학원 지도 안내](https://gradschool.cornell.edu/academic-progress/opportunities-resources-support/advising-guide-for-research-students-2025/)\n\n';tr('강의 전체 읽기','Read the complete lecture');
let archive=intro,editorial='<!-- unit-1 -->\n\n'+intro;const images:any[]=[];
const norm=(s:string)=>s.replace(/\s/g,'');
for(let i=0;i<rows.length;i++){
 const r=rows[i],sid='s'+String(i+1).padStart(3,'0');
 let chunk='## '+String(i+1).padStart(3,'0')+'. '+r.title.replaceAll('\n',' ')+'\n\n';
 tr(String(i+1).padStart(3,'0')+'. '+r.title.replaceAll('\n',' '),String(i+1).padStart(3,'0')+'. '+english[i][0]);
 if(r.body)chunk+=r.body+'\n\n';
 for(const [label,text] of r.compare||r.steps||[])chunk+='**'+label+'**\n\n'+text+'\n\n';
 if(r.detail)chunk+=r.detail+'\n\n';
 if(r.image){
  const asset=deck.materials.find((a:any)=>a.id==='img-'+r.image),a=assets.assets['image/png:'+asset.sha256];
  if(!a)throw Error('Original illustration missing from R2 registry '+r.image);
  const alt='가상 사례 삽화 · '+r.image;tr(alt,'Fictional classroom illustration · '+r.image);
  chunk+='!['+alt+']('+a.url+')\n\n';images.push({url:a.url,sha256:a.sha256,width:1672,height:941});
 }
 if(i===rows.length-2)for(const a of work.artifacts.slice(1))chunk+='['+a.label+']('+a.url+')\n\n';
 chunk+='출처·구분: '+r.source+'\n\n';tr('출처·구분: '+r.source,'Source and evidence status: '+(dictionary[normalize(r.source)]||r.source));
 const section=$('#'+sid).clone();section.find('script,style,template,noscript,[hidden]').remove();const leaves:string[]=[];
 const walk=(x:any)=>{if(x.type==='text'&&x.data.trim())leaves.push(x.data.trim());for(const c of x.children||[])walk(c);};walk(section[0]);
 const extras=[...new Set(leaves)].filter(t=>!norm(chunk).includes(norm(t)));
 for(const text of extras)if(/^발표\s*·/.test(text))tr(text,text.replace(/^발표/,'Presentation'));
 archive+=chunk+(extras.length?'### 원본 화면의 보조 문구\n\n'+extras.join('\n\n')+'\n\n':'');editorial+='<!-- unit-'+(i+2)+' -->\n\n'+chunk;
}
await fs.writeFile(work.reader.source,archive);await fs.writeFile(work.reader.editorialSource,editorial);
const rd=renderReader(archive),leafCount=validateReaderCoverage(source,'html',rd);
const mf=await read(work.reader.manifest);mf.works[id]={source:'public'+base+'/source-web.html',sourceSha256:sha(source),markdownSha256:sha(archive),units:rows.map((r:any,i:number)=>({id:'s'+String(i+1).padStart(3,'0'),sha256:sha(r.title+r.body+r.detail),characters:(r.title+r.body+r.detail).length,contiguousOrderPreserved:false})),images,aliases:{},wiki:{},leafCount,missing:0};await write(work.reader.manifest,mf);
await write(work.reader.editorialManifest,{version:'2.0.0',workId:id,status:'reviewed',sourceSha256:sha(archive),editorialSha256:sha(editorial),review:{reviewer:'Codex + independent lecture_content_review',date:'2026-10-19',claims:'Independent review checked all 106 slides and the actual paper. Seven clarifications adopted; direct teaching voice retained. Fictional scenes and instructor recollection remain labelled.',images:'Fourteen original CMDS-style generated fictional scenes. Images and text are explicitly illustrative; actual research findings are supported separately.',links:'Versioned student packages verified against released bytes. Research source locations checked; external link status recorded separately.'},units:sourceUnits(archive).map((u:any,i:number)=>{const chunk=editorial.split('<!-- '+u.id+' -->')[1].split(/<!-- unit-\d+ -->/)[0];return {id:u.id,sourceSha256:sha(u.text),legacyIds:i?['s'+String(i).padStart(3,'0')]:[],disposition:'edit',reason:'Keep all teaching content and illustrations; omit repeated page furniture from continuous reading.',editedSha256:sha(chunk)};})});
const works=await read('content/works.json'),at=works.findIndex((w:any)=>w.id===id);if(at<0)works.unshift(work);else works[at]=work;await write('content/works.json',works);
await write('content/i18n/en.json',dictionary);
const notes=await read('content/presenter-notes.json');const locked=await fs.readFile('public'+base+'/index.html');notes.decks=notes.decks.filter((e:any)=>e.workId!==id);notes.decks.push({workId:id,url:base+'/index.html',source:base+'/source.html',sourceSha256:sha(originalSource),sha256:sha(locked),notesState:'authored',enginePackageSha256:'234d5032fb53adb9268cbfee1bd4063ac12179999de5b8621a49e59a6ce15c4b',provenance:'docs/topic-lecture-provenance.json'});await write('content/presenter-notes.json',notes);
await write('docs/topic-lecture-provenance.json',{version:1,original:{filename:'교수님-저-주제를-아직-잡고-있어요.md',sha256:sha(await fs.readFile('../원고-원본보관.md'))},remake:{packageSha256:'234d5032fb53adb9268cbfee1bd4063ac12179999de5b8621a49e59a6ce15c4b',htmlSha256:sha(originalSource),webProjectionSha256:sha(source),version:'1.0.0',slides:106,illustrations:14},adaptation:'All 170 manuscript body paragraphs are represented in 104 lecture slides, followed by two individual follow-up instructions. Independent content clarifications applied. Original manuscript preserved outside the release. No private source notes or local paths published. Reader extraction uses the site web projection to avoid parsing embedded image bytes.'});
const links=await read('validation/editorial-links.json');links.sources[id]=sha(editorial);links.links=links.links.filter((l:any)=>l.workId!==id);const reader=renderReader(editorial);
for(const href of new Set(reader.links))if(!href.startsWith('#')){
 let status='uncertain',http:number|undefined;try{const res=await fetch(href,{signal:AbortSignal.timeout(30000)});http=res.status;if(res.ok)status='verified';await res.body?.cancel();}catch{}
 links.links.push({workId:id,href,status,http,checkedAt:new Date().toISOString(),review:status==='uncertain'?'Stable published source or release address; automated fetch was unavailable. Do not label HTTP verification as passed.':undefined});
}
await write('validation/editorial-links.json',links);console.log({id,slides:rows.length,images:images.length,leafCount,translations:Object.keys(dictionary).length});
