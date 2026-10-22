// Host interaction example. Trusted, precompiled SVG only; no renderer dependency.
export function attachExplorer(root,{items,listOnlyKeys=[],keyboardMode='auto'}={}){
 if(!root||!Array.isArray(items))throw new Error('root와 items가 필요합니다.');
 const rootClass=root.getAttribute('class');
 const byKey=new Map(items.map(i=>[i.key,i]));
 if(byKey.size!==items.length||items.some(i=>!i.key||!i.label||!i.detail||!i.evidence))throw new Error('중복 ID 또는 설명/근거 누락');
 const marks=[...root.querySelectorAll('[data-key]')],bound=new Set(marks.map(e=>e.dataset.key)),allowed=new Set(listOnlyKeys);
 if(!['auto','all','list'].includes(keyboardMode))throw new Error('keyboardMode: auto/all/list');
 const listKeyboard=keyboardMode==='list'||(keyboardMode==='auto'&&marks.length>24);
 const originals=[...marks,...root.querySelectorAll('svg')].map(el=>[el,Object.fromEntries(['role','tabindex','aria-label','aria-pressed','class','style'].map(k=>[k,el.getAttribute(k)]))]);
 // A static SVG image becomes an interactive group when host controls are attached.
 if(marks.some(e=>!byKey.has(e.dataset.key))||items.some(i=>!bound.has(i.key)&&!allowed.has(i.key)))throw new Error('원자료와 SVG ID 불일치');
 const panel=root.querySelector('[data-detail]'),status=root.querySelector('[data-status]'),list=root.querySelector('[data-items]'),dialog=root.querySelector('dialog'),modal=root.querySelector('[data-modal-body]'),pins=root.querySelector('[data-pins]');
 if(listKeyboard&&!list)throw new Error('고밀도 선택에는 정확한 항목 목록이 필요합니다.');
 const containers=[panel,status,list,modal,pins].filter(Boolean).map(el=>[el,[...el.childNodes],el.getAttribute('hidden')]);
 root.classList.add('pele-example');
 for(const svg of root.querySelectorAll('svg[role="img"]'))if(svg.querySelector('[data-key]'))svg.setAttribute('role','group');
 const cleanups=[];let selected=null,pinned=[],trigger=null,scale=0,openedHere=false;
 function listen(el,event,handler){if(!el)return;el.addEventListener(event,handler);cleanups.push(()=>el.removeEventListener(event,handler));}
 function node(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
 function description(i,target){if(!target)return;target.replaceChildren();target.append(node('h3',i.label));if(i.value!==undefined){const value=node('p',String(i.value)+' '+(i.unit||''));value.className='detail-value';target.append(value);}target.append(node('p',i.detail));target.append(node('p',[i.denominator,i.period].filter(Boolean).join(' · ')));target.append(node('small',i.evidence));}
 function update(){
  for(const e of marks){const i=byKey.get(e.dataset.key),s=e.dataset.key===selected,r=!!selected&&!s&&i.group&&i.group===byKey.get(selected)?.group;e.classList.toggle('is-selected',s);e.classList.toggle('is-related',!!r);e.setAttribute('aria-pressed',String(s));}
  for(const b of list?.querySelectorAll('[data-item]')||[])b.setAttribute('aria-pressed',String(b.dataset.item===selected));
  root.classList.toggle('has-selection',!!selected);
  if(selected){const i=byKey.get(selected);description(i,panel);if(status)status.textContent=i.label+' 선택 · '+[...marks].filter(e=>e.classList.contains('is-related')).length+'곳 관련 강조';}
  else{if(panel)panel.replaceChildren(node('h3','그림의 요소를 선택하세요'),node('p','원자료 목록에서도 같은 항목을 선택할 수 있습니다.'));if(status)status.textContent='선택 해제';}
 }
 function select(key,from){if(!byKey.has(key))throw new Error('알 수 없는 ID');selected=key;trigger=from;update();if(root.querySelector('[data-popup]')?.checked)open();}
 function open(){if(!selected||!dialog||!modal)return;description(byKey.get(selected),modal);if(!dialog.open){openedHere=true;dialog.showModal();}}
 function pin(){if(!selected||!pins)return;if(!pinned.includes(selected))pinned=[...pinned,selected].slice(-2);drawPins();}
 function drawPins(){if(!pins)return;pins.replaceChildren();for(const k of pinned){const i=byKey.get(k),a=node('article');description(i,a);const b=node('button','고정 해제');b.type='button';b.dataset.unpin=k;a.append(b);pins.append(a);}pins.hidden=!pinned.length;}
 for(const e of marks){const i=byKey.get(e.dataset.key);e.classList.toggle('is-primary',i.emphasis==='primary');e.setAttribute('role','button');e.setAttribute('tabindex',listKeyboard?'-1':'0');e.setAttribute('aria-label',i.label+(i.value!==undefined?' · '+i.value+' '+(i.unit||''):''));}
 if(list){list.replaceChildren();for(const i of items){const b=node('button',i.label+(i.value!==undefined?' · '+i.value+' '+(i.unit||''):''));b.type='button';b.dataset.item=i.key;list.append(b);}}
 const find=(e,selector)=>e.target instanceof Element?e.target.closest(selector):null;
 listen(root,'click',e=>{const mark=find(e,'[data-key]'),b=find(e,'[data-item]');if(mark&&root.contains(mark))select(mark.dataset.key,mark);else if(b)select(b.dataset.item,b);else if(find(e,'[data-clear]')){selected=null;pinned=[];update();drawPins();}else if(find(e,'[data-open]'))open();else if(find(e,'[data-pin]'))pin();else if(find(e,'[data-unpin]')){pinned=pinned.filter(k=>k!==find(e,'[data-unpin]').dataset.unpin);drawPins();}else if(find(e,'[data-close]'))dialog?.close();else if(find(e,'[data-theme]'))root.classList.toggle('pele-night');else if(find(e,'[data-zoom-in]'))zoom(1);else if(find(e,'[data-zoom-out]'))zoom(-1);else if(find(e,'[data-fit]'))zoom(0,true);});
 listen(root,'keydown',e=>{const m=find(e,'[data-key]');if(m&&(e.key==='Enter'||e.key===' ')){e.preventDefault();select(m.dataset.key,m);}});
 listen(dialog,'close',()=>{if(trigger?.isConnected)trigger.focus();});
 listen(dialog,'click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 function zoom(delta,fit=false){scale=fit?0:Math.max(0,Math.min(3,scale+delta));for(const svg of root.querySelectorAll('.diagram-scroll>svg')){const natural=svg.viewBox?.baseVal?.width||700;svg.style.width=scale?natural*Math.pow(1.3,scale-1)+'px':'';svg.style.maxWidth=scale?'none':'';}if(status)status.textContent=scale?'확대 탐색 · 그림 안에서 가로·세로 이동':'전체 개요';}
 update();let disposed=false;return{select(key,from){if(disposed)throw new Error('Explorer disposed');select(key,from);},clear(){if(disposed)return;selected=null;update();},destroy(){if(disposed)return;disposed=true;for(const f of cleanups)f();if(openedHere&&dialog?.open)dialog.close();for(const [el,attrs] of originals)for(const [k,v] of Object.entries(attrs)){if(v===null)el.removeAttribute(k);else el.setAttribute(k,v);}if(rootClass===null)root.removeAttribute('class');else root.setAttribute('class',rootClass);for(const [el,nodes,hidden]of containers){el.replaceChildren(...nodes);if(hidden===null)el.removeAttribute('hidden');else el.setAttribute('hidden',hidden);}}};
}
