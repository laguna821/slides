import fs from 'node:fs/promises';
import {load} from 'cheerio';
import TurndownService from 'turndown';
import {gfm} from 'turndown-plugin-gfm';
import {sha,renderReader,validateReaderCoverage} from '../src/lib/reader';
import {sourceUnits} from './editorial';
import {normalize,translateHtml} from './localization';
const id='still-working-on-my-topic-2026-10-20',base='/decks/'+id+'/v1.0.0';
const read=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p:string,v:unknown)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n');
const rows=await read('../recomposition/storyboard.json');
if(rows.length!==62)throw Error('Expected reviewed 62-slide source');
const source=await fs.readFile('../release/lecture-recomposed-web.html','utf8');
const original=await fs.readFile('../release/lecture-recomposed.html');
const locked=await fs.readFile('../release/lecture-recomposed-locked.html');
const $=load(source),assets=await read('content/web-assets.json');
const works=await read('content/works.json'),work=works.find((w:any)=>w.id===id);
if(!work)throw Error('Original work registration missing');
work.summary='AI로 쓴 15페이지를 왜 설명하지 못할까요? 가상 대학원생 민서의 사례로 주제 좁히기·논문 읽기·이론·가설·방법·지도교수 면담을 연결하는 62장 강의입니다.';
const body=[
'“아직 주제를 잡고 있어요”라는 말을 몇 개월째 반복하고 있다면, 원고의 분량보다 질문이 어떻게 달라졌는지부터 살펴봅니다. 가상 대학원생 민서가 AI로 만든 15페이지 앞에서 막히고, 실제 논문을 읽으며 질문을 바꾸는 과정을 따라갑니다.',
'한림대학교 미디어스쿨 대학원 「커뮤니케이션조사방법론 II」 8주차를 위해 제작한 강의입니다. 지난주 설문척도 수업에서 이어져, 관심 분야를 비교할 장면으로 좁히고 개념·이론·가설·측정·설계를 연결합니다.',
'본편 60장과 후속 안내 2장으로 구성했습니다. 11개의 가상 사례 삽화, 비교표와 단계별 설명으로 슬라이드만 보며 논지를 따라갈 수 있게 만들었습니다. 마지막 두 장에서는 Socratic Advisor와 빈 Obsidian 볼트로 각자 공부를 이어갑니다.',
'한국어 슬라이드와 전체 읽기, 영어 소개·읽기를 제공합니다. 관찰·가상 예시·실제 논문 근거를 구분하며, 스킬이 학생 대신 프로포절을 완성하거나 이해도를 자동 채점한다고 소개하지 않습니다.'
];
work.body=body.join('\n\n');work.artifacts[0].label='강의 슬라이드 · 한국어 62장';work.artifacts[0].modes=['present','read'];
work.htmlSource='public'+base+'/source-web.html';
await fs.mkdir('public'+base,{recursive:true});
await fs.copyFile('../release/lecture-recomposed.html','public'+base+'/source.html');
await fs.copyFile('../release/lecture-recomposed-locked.html','public'+base+'/index.html');
await fs.copyFile('../release/lecture-recomposed-web.html','public'+base+'/source-web.html');
const intro='## 강의 전체 읽기\n\n'+body.join('\n\n')+'\n\n[실제 논문 원문](https://doi.org/10.1093/pnasnexus/pgae403) · [AI와 비판적 사고 연구](https://www.microsoft.com/en-us/research/publication/the-impact-of-generative-ai-on-critical-thinking-self-reported-reductions-in-cognitive-effort-and-confidence-effects-from-a-survey-of-knowledge-workers/) · [대학원 지도 안내](https://gradschool.cornell.edu/academic-progress/opportunities-resources-support/advising-guide-for-research-students-2025/)\n\n';
let archive=intro,editorial='<!-- unit-1 -->\n\n'+intro;const images:any[]=[];
const td=new TurndownService({headingStyle:'atx',bulletListMarker:'-'});td.use(gfm);
td.addRule('line-break',{filter:'br',replacement:()=> ' '});
td.addRule('semantic-table',{filter:'table',replacement:(_content,node)=>{
 const rows=Array.from((node as HTMLElement).querySelectorAll('tr')).map(row=>
  Array.from(row.querySelectorAll('th,td')).map(cell=>(cell.textContent||'').replace(/\s+/g,' ').trim().replace(/\|/g,'\\|')));
 if(!rows.length)return '';
 return '\n\n'+[rows[0],rows[0].map(()=> '---'),...rows.slice(1)].map(row=>'| '+row.join(' | ')+' |').join('\n')+'\n\n';
}});
for(let i=0;i<rows.length;i++){
 const sid='r'+String(i+1).padStart(3,'0'),section=$('#'+sid).clone();
 if(section.length!==1)throw Error('Source slide missing '+sid);
 const originalSection=section.clone();
 section.find('script,style,template,noscript,[hidden],.chrome-tl,.chrome-tr,.chrome-bl,.chrome-br,footer,.kicker').remove();
 section.find('h2.headline').first().remove();
 section.find('h3').each((_,el)=>{$(el).replaceWith('<h3>'+$(el).text()+'</h3>');});
 let chunk='## '+rows[i].title+'\n\n';
 if(i===0)chunk+='**'+rows[i].texts[0]+'**\n\n';
 chunk+=td.turndown(section.html()||'')+'\n\n';
 const leaves:string[]=[];originalSection.find('script,style,template,noscript,[hidden],.chrome-tl,.chrome-tr,.chrome-bl,.chrome-br').remove();
 const walk=(n:any)=>{if(n.type==='text'&&n.data.trim())leaves.push(n.data.trim());for(const c of n.children||[])walk(c);};walk(originalSection[0]);
 const key=(s:string)=>s.replace(/\s/g,'');
 const extras=[...new Set(leaves)].filter(t=>!key(renderReader(chunk).text).includes(key(t)));
 archive+=chunk+(extras.length?'### 원본 화면의 보조 문구\n\n'+extras.join('\n\n')+'\n\n':'');
 editorial+='<!-- unit-'+(i+2)+' -->\n\n'+chunk;
 section.find('img').each((_,img)=>{const url=$(img).attr('src')!,a:any=Object.values(assets.assets).find((a:any)=>a.url===url);if(!a)throw Error('Image missing from R2 registry '+url);images.push({url,sha256:a.sha256,width:1672,height:941});});
}
await fs.writeFile(work.reader.source,archive);await fs.writeFile(work.reader.editorialSource,editorial);
const rd=renderReader(archive),leafCount=validateReaderCoverage(source,'html',rd),mf=await read(work.reader.manifest);
mf.works[id]={source:work.htmlSource,sourceSha256:sha(source),markdownSha256:sha(archive),units:rows.map((r:any,i:number)=>({id:'r'+String(i+1).padStart(3,'0'),sha256:sha(JSON.stringify(r)),characters:JSON.stringify(r).length,contiguousOrderPreserved:false})),images,aliases:{},wiki:{},leafCount,missing:0};await write(work.reader.manifest,mf);
await write(work.reader.editorialManifest,{version:'2.0.0',workId:id,status:'reviewed',sourceSha256:sha(archive),editorialSha256:sha(editorial),review:{reviewer:'Codex; source content independently reviewed by recomposed_review',date:'2026-10-19',claims:'The final 62-slide content was compared against every PDF text unit. Independent source review found and corrected clipping and methodological ambiguity. The reading projection preserves the same wording and relationships, including limitations.',images:'All eleven fictional AI-generated illustrations from the reviewed slides are preserved using the registered R2 URLs. These are classroom scenarios, not empirical evidence.',links:'Research links and versioned student package links retain their exact destinations; HTTP observations are recorded separately.'},units:sourceUnits(archive).map((u:any,i:number)=>{const chunk=editorial.split('<!-- '+u.id+' -->')[1].split(/<!-- unit-\d+ -->/)[0];return {id:u.id,sourceSha256:sha(u.text),legacyIds:i?['r'+String(i).padStart(3,'0')]:[],disposition:'edit',reason:'Preserve the reviewed slide text, tables and images; remove repeated presentation furniture from continuous reading.',editedSha256:sha(chunk)};})});
await write('content/works.json',works);
const notes=await read('content/presenter-notes.json');notes.decks=notes.decks.filter((e:any)=>e.workId!==id);notes.decks.push({workId:id,url:base+'/index.html',source:base+'/source.html',sourceSha256:sha(original),sha256:sha(locked),notesState:'authored',enginePackageSha256:'234d5032fb53adb9268cbfee1bd4063ac12179999de5b8621a49e59a6ce15c4b',provenance:'docs/topic-lecture-provenance.json'});await write('content/presenter-notes.json',notes);
await write('docs/topic-lecture-provenance.json',{version:1,original:{filename:'교수님-저-주제를-아직-잡고-있어요.md',sha256:sha(await fs.readFile('../원고-원본보관.md'))},remake:{packageSha256:'234d5032fb53adb9268cbfee1bd4063ac12179999de5b8621a49e59a6ce15c4b',htmlSha256:sha(original),webProjectionSha256:sha(source),version:'1.0.0',slides:62,illustrations:11},adaptation:'The original fifteen manuscript sections were recomposed into sixty lecture slides and two follow-up slides using the pinned native semantic layout. Complete reader text and all eleven figures are preserved. Private notes and local paths are excluded.',research:'research:rr-d1654188fea2d2797bab6bbdff2de715:e616984e8728e6c54d3577ff16e10b7acda73cb162c4bac09454b3c2a081ef85'});
const links=await read('validation/editorial-links.json');links.sources[id]=sha(editorial);const previous=links.links.filter((l:any)=>l.workId===id);links.links=links.links.filter((l:any)=>l.workId!==id);
for(const href of new Set(renderReader(editorial).links))if(!href.startsWith('#')){const known=previous.find((p:any)=>p.href===href);if(known)links.links.push(known);else {let http:number|undefined,status='uncertain';try{const r=await fetch(href,{signal:AbortSignal.timeout(15000)});http=r.status;if(r.ok)status='verified';await r.body?.cancel();}catch{}links.links.push({workId:id,href,status,http,checkedAt:new Date().toISOString(),review:status==='uncertain'?'Published source destination retained; automated HTTP verification unavailable.':undefined});}}
await write('validation/editorial-links.json',links);
const dict=await read('content/i18n/en.json'),strings=new Set<string>();translateHtml(renderReader(editorial).html,dict,true,strings);for(const s of [work.summary,work.artifacts[0].label,...body])strings.add(normalize(s));
await write('../recomposition/english-missing.json',[...strings].filter(s=>/[가-힣]/.test(s)&&!dict[s]));
console.log({slides:rows.length,images:images.length,leafCount,missingEnglish:[...strings].filter(s=>/[가-힣]/.test(s)&&!dict[s]).length});
