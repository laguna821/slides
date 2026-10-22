import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createNodeRenderer} from './node.mjs';
import {rasterize} from './raster.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export function mermaidBlocks(text){
 const blocks=[];let open=null,offset=0;
 for(const line of text.match(/[^\n]*\n|[^\n]+$/g)||[]){
  const body=line.replace(/\r?\n$/,'');
  if(open){
   if(new RegExp('^[ \\t]{0,3}'+open.char+'{'+open.length+',}\\s*$').test(body)){
    if(open.mermaid)blocks.push({index:open.index,end:offset+line.length,source:text.slice(open.content,offset)});
    open=null;
   }
  }else{
   const match=/^[ \t]{0,3}(`{3,}|~{3,})(.*)$/.exec(body);
   if(match)open={index:offset,content:offset+line.length,char:match[1][0],length:match[1].length,mermaid:match[2].trim()==='mermaid'};
  }
  offset+=line.length;
 }
 if(open?.mermaid)throw Error('닫히지 않은 Mermaid 블록입니다. 원고의 코드 펜스를 확인하세요.');
 return blocks;
}
// Called by hallym-kordoc only for compose. Existing-form edits never enter here.
export async function prepareKordoc(request){
 if(request.mode!=='compose'||request.pele===false)return request;
 let raw=request.markdown??(request.markdownFile?await fs.readFile(request.markdownFile,'utf8'):null);
 const sections={...request.sections},texts=[raw,...Object.values(sections)].filter(x=>typeof x==='string');
 if(!texts.some(x=>mermaidBlocks(x).length))return request;
 if(!request.outputDir)throw Error('Pele 도식이 있는 문서는 outputDir를 지정해야 합니다.');
 const assetDir=path.resolve(request.outputDir+'-pele-assets');await fs.mkdir(assetDir,{recursive:true});
 const engine=await createNodeRenderer({canvasModule:request.pele?.canvasModule}),images={...request.images},records=[];
 async function transform(text){
  if(typeof text!=='string')return text;
  const matches=mermaidBlocks(text);let cursor=0,rewritten='';
  for(const match of matches){
   const source=match.source,sourceSha256=sha(source),key='pele-'+sourceSha256.slice(0,16)+'.png';
   const r=engine.render(source,{profile:'report',width:request.pele?.width||680,theme:request.pele?.theme||'light',font:request.pele?.font||'sametone',idPrefix:'hwpx-'+sourceSha256.slice(0,12)+'-'});
   if(!r.ok)throw Error('HWPX 도식 변환 실패: '+r.diagnostics.map(x=>x.message).join(' '));
   const png=await rasterize(r,engine.canvasModule),pngPath=path.join(assetDir,key),svgPath=pngPath.replace(/\.png$/,'.svg');
   await fs.writeFile(pngPath,png.bytes);await fs.writeFile(svgPath,r.svg);await fs.writeFile(pngPath.replace(/\.png$/,'.mmd'),source);
   images[key]=pngPath;records.push({sourceSha256,svgSha256:sha(r.svg),pngSha256:sha(png.bytes),pngPath,svgPath,fonts:engine.fonts,diagnostics:r.diagnostics});
   const caption=r.title.replace(/[\[\]\r\n]/g,' ');
   const warning=r.diagnostics.length?'도표 검토 주의: '+r.diagnostics.map(d=>d.message).join(' ')+'\n':'';
   rewritten+=text.slice(cursor,match.index)+`![${caption}](${key})\n\n${r.description===r.title?'':r.description+'\n'}${warning}\n`;cursor=match.end;
  }return rewritten+text.slice(cursor);
 }
 if(raw!==null)raw=await transform(raw);for(const key of Object.keys(sections))sections[key]=await transform(sections[key]);
 await fs.writeFile(path.join(assetDir,'manifest.json'),JSON.stringify({engine:'1.6.0',version:'1.0.0-rc.2',records},null,2));
 return {...request,...(raw!==null?{markdown:raw,markdownFile:undefined}:{}),sections,images};
}
