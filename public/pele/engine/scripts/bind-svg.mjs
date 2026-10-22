// Narrow adapter for Pele 1.6.0 generated SVG; NOT an SVG sanitizer or general parser.
export const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function tags(svg){
 const all=[],stack=[];const re=/<\/?[A-Za-z][^>]*>/g;let m;
 while((m=re.exec(svg))){const raw=m[0];if(raw.startsWith('</')){const n=raw.match(/^<\/([^\s>]+)/)[1],p=stack.pop();if(!p||p.name!==n)throw new Error('SVG 태그 구조 불일치');p.end=re.lastIndex;continue;}
  const name=raw.match(/^<([^\s/>]+)/)[1],attrs={};for(const a of raw.matchAll(/([:\w-]+)="([^"]*)"/g))attrs[a[1]]=a[2];
  const t={name,attrs,start:m.index,openEnd:re.lastIndex,end:re.lastIndex,parent:stack.at(-1),raw};all.push(t);if(!raw.endsWith('/>'))stack.push(t);
 }if(stack.length)throw new Error('닫히지 않은 SVG');return all;
}
const has=(t,c)=>(t.attrs.class||'').split(/\s+/).includes(c);
function apply(svg,patches){for(const p of patches.sort((a,b)=>b.start-a.start))svg=svg.slice(0,p.start)+p.text+svg.slice(p.end);return svg;}
function attr(i){return ' data-key="'+escape(i.key)+'"';}
export function bindById(svg,bindings){
 const ts=tags(svg),patches=[],used=new Set();
 for(const b of bindings){const found=ts.filter(t=>has(t,b.className)&&t.attrs['data-id']===escape(b.id));if(found.length!==1)throw new Error('ID 결합 대상 불일치: '+b.id);const t=found[0];if(used.has(t.start))throw new Error('중복 대상');used.add(t.start);patches.push({start:t.start,end:t.openEnd,text:t.raw.replace(/\s*\/?>$/,end=>attr(b.item)+(end.includes('/')?'/>' : '>'))});}
 return apply(svg,patches);
}
export function bindXY(svg,series){
 const ts=tags(svg),groups=ts.filter(t=>t.name==='g'&&(has(t,'pele-bars')||has(t,'pele-line')));
 if(groups.length!==series.length)throw new Error('XY 계열 수 불일치');
 const patches=[];
 for(let k=0;k<groups.length;k++){const g=groups[k],s=series[k],kind=has(g,'pele-bars')?'bar':'line';
 if(kind!==s.type||s.items.length!==s.values.length||s.values.some(v=>!Number.isFinite(v)))throw new Error('XY 모델 불일치');
 const marks=ts.filter(t=>t.parent===g&&t.name===(kind==='bar'?'rect':'circle'));
 if(marks.length!==s.values.length)throw new Error('XY 표식 누락: 목록 선택으로 전환하거나 별도 좌표 어댑터 필요');
 const xs=marks.map(t=>+(t.attrs.x??t.attrs.cx));if(xs.some((v,i)=>!Number.isFinite(v)||(i&&v<=xs[i-1])))throw new Error('XY 표식 순서/방향 불일치');
 const ys=marks.map(t=>kind==='bar'?+t.attrs.height:+t.attrs.cy);
 // Verify geometry is affine in the supplied values; this catches most reordered-value bindings.
 const a=s.values.findIndex(v=>v!==s.values[0]);if(a>=0){const slope=(ys[a]-ys[0])/(s.values[a]-s.values[0]);if(!Number.isFinite(slope)||Math.abs(slope)<1e-8||(kind==='bar'&&s.values.every(v=>v>=0)&&slope<=0)||(kind==='line'&&slope>=0))throw new Error('XY 값/좌표 방향 불일치');for(let j=0;j<ys.length;j++)if(Math.abs(ys[j]-(ys[0]+slope*(s.values[j]-s.values[0])))>.12)throw new Error('XY 값/좌표 불일치');}
 for(let j=0;j<marks.length;j++){const t=marks[j],i=s.items[j];let shape=svg.slice(t.start,t.end);if(kind==='line')shape+='<circle cx="'+t.attrs.cx+'" cy="'+t.attrs.cy+'" r="14" fill="transparent"/>';patches.push({start:t.start,end:t.end,text:'<g'+attr(i)+'>'+shape+'</g>'});}
 }return apply(svg,patches);
}
