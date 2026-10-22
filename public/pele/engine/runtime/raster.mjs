import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {tokens} from './brand.mjs';
import {tags} from '../scripts/bind-svg.mjs';
// Rasterise the already rendered SVG; never lay out a second diagram for HWPX.
export async function rasterize(result,canvasModule,{scale=2}={}){
 if(!result.ok)throw Error('실패한 SVG는 이미지로 변환할 수 없습니다.');
 if(!Number.isFinite(scale)||scale<=0)throw Error('PNG 배율은 유한한 양수여야 합니다.');
 const width=Math.ceil(result.width*scale),height=Math.ceil(result.height*scale);
 if(!Number.isFinite(width*height)||width*height>32_000_000)throw Error('도표 이미지가 너무 큽니다. 도식을 나누세요.');
 const mod=await import(path.isAbsolute(canvasModule)?pathToFileURL(canvasModule).href:canvasModule),api=mod.default||mod;
 const vars=Object.fromEntries([...result.svg.matchAll(/(--[\w-]+):([^;"}]+)/g)].map(m=>[m[1],m[2]]));
 Object.assign(vars,Object.fromEntries(Object.entries(tokens(result.theme,result.font)).map(([k,v])=>[k,v.replaceAll('"','')])));
 let svg=result.svg;
 for(let i=0;i<8&&svg.includes('var(');i++)svg=svg.replace(/var\((--[\w-]+)(?:,\s*([^()]*))?\)/g,(all,key,fallback)=>vars[key]||fallback||all);
 if(svg.includes('var('))throw Error('미해결 SVG 색상 변수');
 // Skia's SVG decoder does not apply CSS font shorthand or selector rules.
 // Materialise only our known rules without changing geometry or laying out text again.
 const fontSize=/\bfont:([\d.]+)px/.exec(svg)?.[1];
 if(!fontSize)throw Error('SVG 기본 글꼴 크기를 확인할 수 없습니다.');
 const ts=tags(svg),patches=[];
 for(const t of ts){
  const attrs={};
  if(t===ts[0]){attrs['font-size']=fontSize;attrs['font-family']=vars['--pele-font'];attrs.width=String(result.width*scale);attrs.height=String(result.height*scale);}
  const cls=t.parent?.attrs.class||'';
  if(/\bachmage-key\b/.test(cls)&&['rect','path','polygon'].includes(t.name)){attrs.stroke=vars['--pele-accent'];attrs['stroke-width']='3';}
  if(/\bachmage-interpretation\b/.test(cls)&&['rect','polygon'].includes(t.name))attrs['stroke-dasharray']='5 3';
  if(/\bachmage-aux\b/.test(cls)&&['rect','polygon'].includes(t.name))attrs.fill=vars['--pele-surface-alt'];
  if(!Object.keys(attrs).length)continue;
  let raw=t.raw;
  for(const [key,value]of Object.entries(attrs)){const re=new RegExp('\\s'+key+'="[^"]*"');raw=re.test(raw)?raw.replace(re,` ${key}="${value}"`):raw.replace(/\/?>$/,end=>` ${key}="${value}"`+end);}
  patches.push({start:t.start,end:t.openEnd,raw});
 }
 for(const p of patches.reverse())svg=svg.slice(0,p.start)+p.raw+svg.slice(p.end);
 const image=await api.loadImage(Buffer.from(svg));
 const canvas=api.createCanvas(width,height),ctx=canvas.getContext('2d');
 ctx.fillStyle=vars['--pele-bg'];ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
 return {bytes:await canvas.encode('png'),width,height,scale};
}
