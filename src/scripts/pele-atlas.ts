// Trusted, versioned static SVG compiled by the atlas producer. No user SVG or runtime renderer.
type Json=Record<string,any>;
const atlasElement=document.querySelector<HTMLElement>('[data-pele-atlas]');
if(atlasElement){
 const root:HTMLElement=atlasElement;
 const $=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const en=document.documentElement.lang==='en',t=(ko:string,eng:string)=>en?eng:ko;
 const selection=$<HTMLSelectElement>('[data-case]'),states=$<HTMLSelectElement>('[data-state]'),dialog=$<HTMLDialogElement>('[data-atlas-dialog]');
 let comparison:Json,editorial:Json[],history:Json[],section='editorial',selected='',zoom=false,lastTrigger:HTMLElement|null=null;
 const diagrams=new Set<HTMLElement>();
 const node=(tag:string,text?:string)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 function draw(target:HTMLElement,svg:string,interactive=false){
  diagrams.add(target);const shadow=target.shadowRoot||target.attachShadow({mode:'open'});
  shadow.innerHTML='<style>:host{display:block;font-family:inherit}svg{display:block;width:100%;height:auto;max-width:none;--pele-bg:#fff;--pele-fg:#16334a;--pele-surface:#eff5f5;--pele-line:#526573;--pele-border:#7295a5;--pele-node:#eff5f5;--pele-font:"Achmage SameTone"}svg text{font-family:"Achmage SameTone",sans-serif}[data-key]{cursor:pointer}[data-key].selected{filter:drop-shadow(0 0 2px #087f7b)}[data-key].selected :is(rect,circle,path,polygon){stroke:#087f7b;stroke-width:3}svg [data-key].selected text{stroke:none}[data-key]:focus{outline:3px solid #087f7b;outline-offset:3px}svg[role=group]{overflow:visible}</style>'+svg;
  const s=shadow.querySelector('svg')!;if(interactive){s.setAttribute('role','group');for(const mark of shadow.querySelectorAll<SVGElement>('[data-key]')){mark.setAttribute('role','button');mark.setAttribute('tabindex','-1');mark.addEventListener('click',()=>inspect(mark.dataset.key!,target));}}
  target.tabIndex=-1;target.style.width=zoom?'1100px':'100%';
 }
 function table(spec:Json){
  const wrap=node('div');wrap.className='atlas-table-wrap';const table=node('table'),head=node('thead'),tr=node('tr');
  for(const h of spec.headers)tr.append(node('th',String(h)));head.append(tr);table.append(head);const body=node('tbody');
  for(const row of spec.rows){const tr=node('tr');for(const cell of row)tr.append(node('td',typeof cell==='object'?JSON.stringify(cell):String(cell)));body.append(tr);}table.append(body);wrap.append(table);return wrap;
 }
 function recordText(r:Json){return Object.entries(r).filter(([k])=>k!=='id'&&k!=='label').map(([k,v])=>k+': '+(typeof v==='object'?JSON.stringify(v):v)).join(' · ');}
 function inspect(key:string,trigger:HTMLElement){
  const m=comparison.models.find((m:Json)=>m.id===selection.value),r=m?.input.records.find((r:Json)=>r.id===key);if(!r)return;
  selected=key;lastTrigger=trigger;
  for(const d of diagrams)for(const mark of d.shadowRoot?.querySelectorAll<SVGElement>('[data-key]')||[]){mark.classList.toggle('selected',mark.dataset.key===key);mark.setAttribute('aria-pressed',String(mark.dataset.key===key));}
  for(const b of $('[data-record-list]').querySelectorAll<HTMLButtonElement>('button'))b.setAttribute('aria-pressed',String(b.dataset.key===key));
  $('[data-detail-title]').textContent=r.label||r.id;
  const detail=$('[data-detail]');detail.replaceChildren(node('p',recordText(r)),node('p',en?m.input.question:m.questionKo),node('p',en?m.input.source:m.sourceKo));
  for(const a of (en?m.input.assumptions:m.assumptionsKo))detail.append(node('p',a));
  const scene=m.compiled.scenes[states.value],derived=scene.rows.find((x:Json)=>x.id===key);if(derived)detail.append(node('p',t('현재 상태: ','Current state: ')+recordText(derived)));if(scene.note)detail.append(node('p',en?scene.noteEn:scene.note));
  $('[data-atlas-status]').textContent=t('선택: ','Selected: ')+(r.label||r.id);
  if($('[data-popup]').getAttribute('aria-pressed')==='true'){
   $('[data-modal-title]').textContent=r.label||r.id;$('[data-modal-body]').replaceChildren(...[...detail.children].map(n=>n.cloneNode(true)));if(!dialog.open)dialog.showModal();
  }
 }
 function active(){
  $('[data-static-fallback]').hidden=true;
  diagrams.clear();selected='';$('[data-inspector]').hidden=section!=='comparison';$('[data-state-wrap]').hidden=section!=='comparison';$('[data-comparison]').hidden=section!=='comparison';$('[data-editorial]').hidden=section!=='editorial';$('[data-history]').hidden=section!=='history';$('[data-source-wrap]').hidden=section==='history';
  selection.disabled=section==='history';$('[data-portrait]').hidden=section==='history';$('[data-popup]').hidden=section!=='comparison';$('[data-zoom]').hidden=section==='history';
  if(section==='editorial'){
   const c=editorial.find(c=>c.id===selection.value)||editorial[0];
   $('[data-title]').textContent=en?c.titleEn:c.titleKo;$('[data-message]').textContent=en?c.messageEn:c.messageKo;$('[data-purpose]').textContent=en?c.purposeEn:c.purposeKo;
   const target=$('[data-editorial]');target.replaceChildren();const figure=node('figure');figure.className='atlas-editorial-figure';const v=node('div');v.className='atlas-viewport';const chart=node('div');v.append(chart);figure.append(v);target.append(figure);draw(chart,c.svg);
   if(c.figure){const f=node('figure');f.className='atlas-editorial-figure';const viewport=node('div');viewport.className='atlas-viewport';const div=node('div');viewport.append(div);f.append(viewport,node('figcaption',t('별도 SVG · 기존 계산 캐시의 계수와 95% 신뢰구간','Authored SVG · coefficients and 95% CIs from the existing calculation cache')));target.append(f);draw(div,c.figureSvg);}
   target.append(table(c.table));const prose=node('div');prose.className='atlas-prose';for(const [h,p]of(en?c.sectionsEn:c.sectionsKo)){const article=node('section');article.append(node('h3',h),node('p',p));prose.append(article);}target.append(prose);
   $('[data-source]').textContent=c.source;$('[data-source-note]').textContent=t('Pele 1.6.0가 관계 배치를 생성했습니다. 표·본문·세로형 편집·확대는 HTML이며 통계 도표는 별도 SVG입니다.','Pele 1.6.0 generates relation layout. Tables, prose, portrait editing and zoom belong to HTML; statistical plots are authored SVG.');
   $('[data-footnote]').textContent=t('웹 편집 예시 · A4 비율은 화면 구성의 출발점이며 PDF나 물리 인쇄 규격을 보장하지 않습니다.','Web editorial example · A4 proportions guide the screen composition; this is not a PDF or a physical-print guarantee.');
  }else if(section==='comparison'){
   const m=comparison.models.find((m:Json)=>m.id===selection.value),c=m.compiled,s=c.scenes[states.value],v=m.candidate[states.value];
   $('[data-title]').textContent=en?m.titleEn:m.titleKo;$('[data-message]').textContent=en?c.question:m.questionKo;$('[data-purpose]').textContent=m.id.toUpperCase()+' / SAME MODEL';
   draw($('[data-baseline]'),s.svg.replaceAll('data-vz-key=','data-key='),true);draw($('[data-candidate]'),v.svg,true);
   $('[data-credit]').textContent=(v.part==='pele-svg'?'Pele SVG':'Authored SVG')+' · '+v.note;
   const list=$('[data-record-list]');list.replaceChildren();
   for(const r of c.records){const b=node('button',r.label||r.id) as HTMLButtonElement;b.type='button';b.dataset.key=r.id;b.addEventListener('click',()=>inspect(r.id,b));list.append(b);}
   $('[data-detail-title]').textContent=t('정확한 항목에서 세부 근거까지','From exact records to the evidence');
   $('[data-detail]').replaceChildren(node('p',t('그림 또는 항목 목록을 선택하면 실제 원자료·단위·조건을 확인할 수 있습니다. 필터로 숨겨진 항목도 원자료 목록에는 남습니다.','Select a mark or record to inspect actual source values, units and conditions. Filtered records remain available in the exact source list.')));
   $('[data-source]').textContent=v.source||JSON.stringify({input:m.input,view:states.value,rows:s.rows,summary:s.summary,note:s.note},null,2);
   $('[data-source-note]').textContent=t('원본과 동일한 계산·전환 상태입니다. Pele SVG가 아닌 상태는 원래 SVG 기하를 유지하며 HTML 선택과 편집을 적용했습니다. 전체 교체나 절감률을 주장하지 않습니다.','Uses the same calculation and view states. Non-Pele states preserve the original SVG geometry with HTML selection and editorial styling. This does not claim full replacement or a savings ratio.');
   $('[data-footnote]').textContent=t('가상 시연 자료 · 원자료 해시 ','Synthetic demonstration · source input hash ')+m.originalInputHash;
  }else{
   $('[data-title]').textContent=t('한 번의 성공보다, 축적된 실험의 범위','The scope of accumulated experiments');$('[data-message]').textContent=t('서로 다른 과제와 변형을 구분하고, 당시 결과의 한계를 남깁니다.','Distinguish tasks from variants and retain the limits of the original findings.');$('[data-purpose]').textContent='RESEARCH / PROVENANCE';
   const target=$('[data-history]');target.replaceChildren();const grid=node('div');grid.className='atlas-history';
   for(const h of history){const a=node('a') as HTMLAnchorElement;a.href=h.url;a.append(node('small',h.id+' · '+h.version),node('h3',en?h.titleEn:h.titleKo),node('p',en?h.scopeEn:h.scopeKo),node('small',h.sha256.slice(0,16)+'…'));grid.append(a);}target.append(grid);
   $('[data-footnote]').textContent=t('과거 링크의 화면 검토는 해당 실험 당시의 결과입니다. 새 아틀라스 검수와 합산하지 않습니다.','Historical screen reviews belong to their original experiments and are not counted as new atlas verification.');
  }
  const hash=new URLSearchParams({section,case:selection.value,state:states.value,portrait:root.dataset.portrait||'false'});window.history.replaceState(null,'','#'+hash);$('[data-atlas-status]').textContent=t('선택한 예시를 표시했습니다.','Selected example is ready.');
 }
 function populate(id?:string,state?:string){
  selection.replaceChildren();for(const c of section==='editorial'?editorial:comparison.models){const o=document.createElement('option');o.value=c.id;o.textContent=en?(c.titleEn||c.id):c.titleKo;selection.append(o);}
  if(id&&[...selection.options].some(o=>o.value===id))selection.value=id;stateOptions(state);active();
 }
 function stateOptions(value?:string){states.replaceChildren();if(section==='comparison'){const m=comparison.models.find((m:Json)=>m.id===selection.value);for(const o of m.compiled.options){const option=document.createElement('option');option.value=o.value;option.textContent=o.label;states.append(option);}states.value=value&&m.compiled.scenes[value]?value:m.compiled.initial;}}
 function language(){for(const [selector,ko,eng]of[['[data-case-label]','예시 선택','Choose example'],['[data-state-label]','같은 상태','Same state'],['[data-portrait]','세로형 보기','Portrait view'],['[data-zoom]','도식 확대','Enlarge diagram'],['[data-popup]','상세 팝업','Detail popup'],['[data-dialog-close]','닫기','Close'],['[data-baseline-label]','기존 표현','Original representation'],['[data-candidate-label]','새 표현 · 제작 기여 표시','New representation · contributions shown']])$(selector).textContent=t(ko,eng);}
 language();selection.addEventListener('change',()=>{stateOptions();active();});states.addEventListener('change',active);
 for(const b of root.querySelectorAll<HTMLButtonElement>('[data-section]'))b.addEventListener('click',()=>{section=b.dataset.section!;for(const x of root.querySelectorAll('[data-section]'))x.setAttribute('aria-pressed',String(x===b));populate();});
 $('[data-portrait]').addEventListener('click',()=>{root.dataset.portrait=String(root.dataset.portrait!=='true');$('[data-portrait]').setAttribute('aria-pressed',root.dataset.portrait);active();});
 $('[data-zoom]').addEventListener('click',()=>{zoom=!zoom;$('[data-zoom]').setAttribute('aria-pressed',String(zoom));for(const d of diagrams)d.style.width=zoom?'1100px':'100%';});
 $('[data-popup]').addEventListener('click',()=>{const b=$('[data-popup]');b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true'));});
 $('[data-dialog-close]').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>lastTrigger?.focus());
 Promise.all(['/pele-atlas/comparison.json','/pele-atlas/editorial.json','/pele-atlas/history.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error(String(r.status));return r.json();})).then(([c,e,h])=>{comparison=c;editorial=e;history=h;const params=new URLSearchParams(location.hash.slice(1));section=['editorial','comparison','history'].includes(params.get('section')||'')?params.get('section')!:'editorial';root.dataset.portrait=params.get('portrait')==='true'?'true':'false';for(const b of root.querySelectorAll<HTMLButtonElement>('[data-section]'))b.setAttribute('aria-pressed',String(b.dataset.section===section));$('[data-portrait]').setAttribute('aria-pressed',root.dataset.portrait);populate(params.get('case')||undefined,params.get('state')||undefined);}).catch(()=>{$('[data-atlas-status]').textContent=t('예시를 불러오지 못했습니다. 연결을 확인한 뒤 새로고침하거나 아래 원본 링크를 열어 주세요.','Examples could not load. Check the connection and refresh, or open the original links below.');});
}
