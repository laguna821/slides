import {render,detectType} from '../vendor/pele/pele.mjs';
import {bindById,bindXY,escape as esc,tags} from '../scripts/bind-svg.mjs';
import {FONTS,PROFILES,svgStyle,VERSION} from './brand.mjs';
import {catalog} from './catalog.mjs';
let serial=0;
export {esc};
export function normalize(input){
 if(typeof input==='string')return {kind:'mermaid',source:input};
 if(!input||typeof input!=='object')throw Error('Mermaid 문자열 또는 데이터 객체가 필요합니다.');
 if(input.kind==='mermaid'&&typeof input.source==='string')return input;
 if(input.kind!=='xy')throw Error('지원 입력: mermaid, xy. 다른 통계 분석은 보존된 레시피를 사용하세요.');
 const {labels,series}=input;
 if(!Array.isArray(labels)||!labels.length||!Array.isArray(series)||!series.length||series.length>8)throw Error('XY 라벨과 1–8개 계열이 필요합니다.');
 const keys=new Set();
 for(const s of series){
  if(!['bar','line'].includes(s.type)||s.values?.length!==labels.length||s.items?.length!==labels.length)throw Error('XY 계열·값·항목 수 불일치');
  for(let i=0;i<s.values.length;i++){
   if(!Number.isFinite(s.values[i]))throw Error('결측값을 0으로 바꾸지 않습니다. 표 또는 별도 분석 레시피를 사용하세요.');
   const x=s.items[i];if(!x?.key||keys.has(x.key)||x.value!==s.values[i])throw Error('XY 키 중복 또는 원자료 값 불일치');keys.add(x.key);
  }
 }
 // Grammar literals cannot introduce directives or new statements.
 const quote=x=>{const t=String(x);if(/["\n\r\[\]<>]/.test(t))throw Error('XY 라벨에 문법 제어문자가 있습니다. 표시명을 명시적으로 정리하세요.');return '"'+t+'"';};
 const vals=series.flatMap(s=>s.values),min=input.min??Math.min(0,...vals),max=input.max??Math.max(1,...vals);
 if(!Number.isFinite(min)||!Number.isFinite(max)||min>=max||vals.some(v=>v<min||v>max))throw Error('축 범위가 값을 포함하지 않습니다.');
 return {...input,source:`xychart-beta\n x-axis [${labels.map(quote).join(',')}]\n y-axis ${quote(input.unit||'값')} ${min} --> ${max}\n${series.map(s=>` ${s.type} [${s.values.join(',')}]`).join('\n')}`,items:series.flatMap(s=>s.items)};
}
export function directives(source){
 const out={key:[],interpretation:[],aux:[]};
 for(const m of source.matchAll(/^\s*%%\s*@(?<role>key|interp|aux|caption|alt):\s*(?<value>.*)$/gm)){
  const {role,value}=m.groups;if(['caption','alt'].includes(role))out[role]=value;else out[role==='interp'?'interpretation':role].push(...value.split(',').map(x=>x.trim()).filter(Boolean));
 }return out;
}
function decorate(svg,roles,diagnostics){
 const ts=tags(svg),patches=[];
 for(const [role,ids]of Object.entries(roles).filter(([k])=>['key','interpretation','aux'].includes(k))){
  for(const id of new Set(ids)){
   const matches=ts.filter(t=>t.attrs['data-id']===esc(id)&&/\bpele-node\b/.test(t.attrs.class||''));
   if(matches.length!==1){diagnostics.push({code:'semantic-target',severity:'warning',message:`${role}: ${id} 강조 대상이 유일하지 않습니다.`});continue;}
   const t=matches[0];let p=patches.find(p=>p.start===t.start);if(!p){p={start:t.start,end:t.openEnd,text:t.raw};patches.push(p);}p.text=p.text.replace(/class="/,`class="achmage-${role} `);
  }
 }for(const p of patches.sort((a,b)=>b.start-a.start))svg=svg.slice(0,p.start)+p.text+svg.slice(p.end);return svg;
}
export function renderDiagram(input,options={}){
 const diagnostics=[];let spec;
 try{
  spec=normalize(input);const {profile='web',theme='light',font='sametone',measurer}=options;
  if(!PROFILES[profile]||!FONTS[font])throw Error('지원하지 않는 출력 프로필 또는 폰트');
  if(!measurer||typeof measurer.width!=='function')throw Error('실제 폰트 측정기가 필요합니다. Node는 createNodeRenderer, 브라우저는 mountDiagram을 사용하세요.');
  const type=detectType(spec.source),entry=catalog.find(x=>x.id===type),p=PROFILES[profile],width=options.width??p.width;
  if(!Number.isFinite(width)||width<160||width>10000)throw Error('출력 폭은 160–10000px이어야 합니다.');
  if(spec.source.length>100000)throw Error('입력이 100,000자를 초과합니다.');
  if(/(?:^|\n)\s*(?:style|classDef|linkStyle)\s|%%\{|themeVariables\s*:/m.test(spec.source)&&!options.allowSourceStyles)throw Error('원문 고정 스타일은 테마를 덮어씁니다. 제거하거나 allowSourceStyles를 명시하세요.');
  if(type==='sankey'&&/[^\x00-\x7F]/.test(spec.source.replace(/^\s*%%.*$/gm,'')))throw Error('Pele 1.6.0 Sankey는 ASCII 입력이 필요합니다. 한글 이름을 삭제하지 말고 원자료 표 또는 흐름도로 대체하세요.');
  const roles=directives(spec.source),title=spec.title||roles.caption||entry?.name||'도표',description=spec.description||roles.alt||title;
  const prefix=options.idPrefix||`ach-pele-${++serial}-`;
  if(!/^[a-zA-Z][\w-]*$/.test(prefix))throw Error('idPrefix는 영문자로 시작하는 고유 ID여야 합니다.');
  const result=render(spec.source,{fontFamily:FONTS[font].family,fontFamilyMono:FONTS[font].family,fontSize:options.fontSize??p.fontSize,measurer,maxWidth:width,autoDirection:options.autoDirection??p.autoDirection,idPrefix:prefix,links:false,images:false,limit:100000,maxEdges:500,now:options.now??new Date('2026-10-21T00:00:00Z'),config:options.config});
  let svg=result.svg;
  if(spec.kind==='xy'){
   svg=bindXY(svg,spec.series);
   for(const label of spec.labels)if(!svg.includes(esc(label)))diagnostics.push({code:'missing-axis-label',severity:'warning',message:`축 라벨 ${label}가 화면에서 생략됐습니다. 원자료 표를 확인하고 폭을 늘리세요.`});
  }else if(spec.bindings)svg=bindById(svg,spec.bindings);
  svg=decorate(svg,roles,diagnostics);
  if(entry?.minWidth>width)diagnostics.push({code:'narrow-surface',severity:'warning',message:`${entry.name}: ${entry.minWidth}px 이상 또는 ${entry.fallback}. 자동 축소만으로 읽기 검증을 통과하지 않습니다.`});
  if(['treemap','sequence','xychart','quadrantChart'].includes(type))diagnostics.push({code:'visual-review',severity:'warning',message:entry.limits});
  if(result.width>width+1)diagnostics.push({code:'overflow',severity:'warning',message:'자연 폭이 출력 폭을 초과합니다. 가로 탐색 또는 별도 구성을 사용하세요.'});
  // Accessible name is author supplied; static artifacts never imply button behaviour.
  svg=svg.replace(/<svg\b([^>]*)>/,(_,attrs)=>`<svg${attrs.replace(/\srole="[^"]*"|\saria-labelledby="[^"]*"/g,'')} role="img" aria-labelledby="${prefix}title ${prefix}desc"><title id="${prefix}title">${esc(title)}</title><desc id="${prefix}desc">${esc(description)}</desc><style>${svgStyle(theme,font)}</style>`);
  return {...result,svg,ok:true,source:spec.source,title,description,items:spec.items||[],diagnostics,profile,theme,font,measurement:'font-metrics',version:VERSION};
 }catch(error){return {ok:false,svg:null,source:spec?.source??(typeof input==='string'?input:''),items:spec?.items||[],diagnostics:[...diagnostics,{code:'render-error',severity:'error',message:String(error.message||error)}],version:VERSION};}
}
export function dataTable(items=[],caption='원자료'){
 if(!items.length)return '';
 return `<table><caption>${esc(caption)}</caption><thead><tr><th>항목</th><th>값·단위</th><th>설명·근거</th></tr></thead><tbody>${items.map(i=>`<tr><th>${esc(i.label??i.key)}</th><td>${esc(i.value===undefined?'기록 없음':String(i.value)+' '+(i.unit||''))}</td><td>${esc([i.detail,i.evidence,i.denominator!==undefined?'분모 '+i.denominator:'',i.period].filter(Boolean).join(' · '))}</td></tr>`).join('')}</tbody></table>`;
}
