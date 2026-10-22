import {renderDiagram,dataTable} from './render.mjs';
import {FONTS,tokens,PROFILES} from './brand.mjs';
import {attachExplorer} from '../assets/explorer.mjs';
const fontPromises=new Map();
async function loadFont(key){
 if(!FONTS[key])throw Error('알 수 없는 폰트');
 if(!fontPromises.has(key))fontPromises.set(key,(async()=>{
  const f=FONTS[key],face=new FontFace(f.family,`url("${new URL('../assets/fonts/'+f.file,import.meta.url).href}")`,{weight:'100 900'});
  await face.load();document.fonts.add(face);return face;
 })().catch(e=>{fontPromises.delete(key);throw e;}));
 return fontPromises.get(key);
}
export async function mountDiagram(element,input,options={}){
 if(!(element instanceof HTMLElement))throw Error('HTML 컨테이너가 필요합니다.');
 let disposed=false,current=input,opts={profile:'web',theme:'light',font:'sametone',...options},generation=0,result=null,error=null,explorer=null,lastWidth=0;
 const root=document.createElement('section');root.className='achmage-diagram';
 root.innerHTML='<p class="render-status" role="status" aria-live="polite"></p><div class="diagram-scroll" tabindex="0" aria-label="도표 가로 탐색"></div><aside data-detail aria-live="polite"></aside><div data-items></div><div class="source-data"></div>';
 const status=root.querySelector('.render-status'),view=root.querySelector('.diagram-scroll'),data=root.querySelector('.source-data');element.append(root);
 function theme(){for(const el of [root,view.querySelector('svg')].filter(Boolean))for(const [k,v]of Object.entries(tokens(opts.theme,opts.font)))el.style.setProperty(k,v);}
 async function draw(){
  if(disposed)return null;const ticket=++generation;const local={...opts},source=current;
  try{
   await loadFont(local.font);if(disposed||ticket!==generation)return null;
   const width=local.width||element.clientWidth||PROFILES[local.profile]?.width||960;lastWidth=element.clientWidth;
   const ctx=document.createElement('canvas').getContext('2d');if(!ctx)throw Error('Canvas 측정기를 만들 수 없습니다.');
   const measurer={width(text,size,style=0){ctx.font=`${style&2?'italic ':''}${style&1?700:400} ${size}px "${FONTS[local.font].family}"`;return ctx.measureText(text).width;}};
   const next=renderDiagram(source,{...local,width,measurer});if(!next.ok)throw Error(next.diagnostics.map(x=>x.message).join(' '));
   const selected=root.querySelector('[data-key][aria-pressed="true"]')?.dataset.key;
   explorer?.destroy();explorer=null;view.innerHTML=next.svg;data.innerHTML=dataTable(next.items);
   result=next;error=null;theme();
   if(next.items.length){explorer=attachExplorer(root,{items:next.items});if(selected&&next.items.some(x=>x.key===selected))explorer.select(selected);}
   status.textContent=next.diagnostics.map(x=>x.message).join(' ')||'정상 렌더링';root.dataset.state='ready';
   local.onRender?.(next);return next;
  }catch(e){
   if(disposed||ticket!==generation)return null;error=e;root.dataset.state='error';status.textContent=`현재 입력 오류: ${e.message}${result?' · 이전 정상 그림을 표시 중입니다.':' · 표시할 정상 그림이 없습니다.'}`;local.onError?.(e);return null;
  }
 }
 const observer=new ResizeObserver(()=>{if(!disposed&&element.clientWidth>0&&element.clientWidth!==lastWidth&&!opts.width)void draw();});observer.observe(element);
 const api={get result(){return result;},get error(){return error;},get source(){return current;},get element(){return root;},update(next,changes={}){if(disposed)throw Error('이미 해제된 도표');current=next;opts={...opts,...changes};return draw();},refresh(){return draw();},setTheme(next){if(disposed)throw Error('이미 해제된 도표');tokens(next,opts.font);opts.theme=next;theme();if(result)result={...result,theme:next};},setFont(next){if(disposed)throw Error('이미 해제된 도표');opts.font=next;return draw();},destroy(){if(disposed)return;disposed=true;generation++;observer.disconnect();explorer?.destroy();explorer=null;root.remove();}};
 await draw();return api;
}
