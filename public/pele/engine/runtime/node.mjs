import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {FONTS} from './brand.mjs';
import {renderDiagram} from './render.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function createNodeRenderer({canvasModule=process.env.ACHMAGE_CANVAS_MODULE}={}){
 const location=canvasModule||'@napi-rs/canvas';
 let canvas;try{const mod=await import(path.isAbsolute(location)?pathToFileURL(location).href:location);canvas=mod.default||mod;}catch{throw Error('@napi-rs/canvas를 찾지 못했습니다. --canvas-module로 기존 설치를 지정하세요. 추정 측정으로 대체하지 않습니다.');}
 const fonts={};
 for(const [key,font]of Object.entries(FONTS)){
  const file=path.join(root,'assets/fonts',font.file);
  if(!canvas.GlobalFonts.registerFromPath(file,font.family))throw Error('폰트 등록 실패: '+font.family);
  fonts[key]={family:font.family,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')};
 }
 return {fonts,canvasModule:location,render(input,options={}){
  const font=options.font||'sametone';if(!FONTS[font])throw Error('알 수 없는 폰트');
  const ctx=canvas.createCanvas(1,1).getContext('2d');
  const measurer={width(text,size,style=0){ctx.font=`${style&2?'italic ':''}${style&1?700:400} ${size}px "${FONTS[font].family}"`;return ctx.measureText(text).width;}};
  return renderDiagram(input,{...options,measurer});
 }};
}
