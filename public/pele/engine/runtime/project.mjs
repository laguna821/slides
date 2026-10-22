import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createNodeRenderer} from './node.mjs';
import {rasterize} from './raster.mjs';
import {mermaidBlocks} from './hwpx.mjs';
import {dataTable} from './render.mjs';
import {FONTS,THEMES,PROFILES} from './brand.mjs';

const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const json=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const safe=(root,name)=>{const dest=path.resolve(root,name),rel=path.relative(root,dest);if(!rel||rel.startsWith('..')||path.isAbsolute(rel))throw Error('출력 경로가 생성 폴더를 벗어납니다.');return dest;};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const optional=async p=>{try{return await json(p);}catch(e){if(e.code==='ENOENT')return null;throw e;}};
async function fingerprint(){
 const files=['project.mjs','node.mjs','render.mjs','brand.mjs','raster.mjs','hwpx.mjs','catalog.mjs','../scripts/bind-svg.mjs','../package-lock.json'];
 const chunks=await Promise.all(files.map(n=>fs.readFile(new URL(n,import.meta.url))));
 for(const f of Object.values(FONTS))chunks.push(await fs.readFile(new URL('../assets/fonts/'+f.file,import.meta.url)));
 chunks.push(await fs.readFile(new URL('../vendor/pele/pele.mjs',import.meta.url)));
 return sha(Buffer.concat(chunks));
}
async function embeddedFont(svg,font){const f=FONTS[font],b=await fs.readFile(new URL('../assets/fonts/'+f.file,import.meta.url));return svg.replace('<style>',"<style>@font-face{font-family:'"+f.family+"';src:url(data:font/woff2;base64,"+b.toString('base64')+") format('woff2');font-weight:100 900}");}
async function sources(spec,base){
  const diagrams=new Map(),inputs=[];
  if(spec.manuscript){
    const p=path.resolve(base,spec.manuscript),bytes=await fs.readFile(p);
    inputs.push({path:p,sha256:sha(bytes)});
    for(const block of mermaidBlocks(bytes.toString('utf8'))){
      const id=/^\s*%%\s*@id:\s*([a-zA-Z0-9_-]+)\s*$/m.exec(block.source)?.[1];
      if(!id||diagrams.has(id))throw Error('원고 도식에는 중복되지 않는 %% @id: 이름이 필요합니다.');
      diagrams.set(id,block.source);
    }
  }
  for(const d of spec.diagrams||[]){
    if(!/^[\w-]+$/.test(d.id)||diagrams.has(d.id))throw Error('중복되거나 잘못된 도표 ID');
    let value=d.input;
    if(d.sourceFile){const p=path.resolve(base,d.sourceFile),b=await fs.readFile(p);inputs.push({path:p,sha256:sha(b)});value=d.format==='json'?JSON.parse(b):b.toString('utf8');}
    if(value===undefined)throw Error('도표 입력이 없습니다: '+d.id);
    diagrams.set(d.id,value);
  }
  for(const o of spec.outputs||[])if(o.format==='hwpx'){const p=path.resolve(base,o.input);inputs.push({path:p,sha256:sha(await fs.readFile(p))});}
  for(const o of spec.outputs||[])if(o.format==='html-host'){const p=path.resolve(base,o.input);inputs.push({path:p,sha256:sha(await fs.readFile(p))});}
  return {diagrams,inputs};
}
async function checkFiles(current){
  const conflicts=[];
  for(const f of current?.files||[]){
    try{if(sha(await fs.readFile(f.path))!==f.sha256)conflicts.push({path:f.path,reason:'modified'});}
    catch(e){if(e.code==='ENOENT')conflicts.push({path:f.path,reason:'missing'});else throw e;}
  }
  return conflicts;
}
export async function projectStatus(specPath,outputRoot){
  const spec=await json(specPath),root=path.resolve(path.dirname(path.resolve(specPath)),outputRoot||spec.outputDir||'outputs'),current=await optional(path.join(root,'current.json'));
  const {inputs}=await sources(spec,path.dirname(path.resolve(specPath)));
  const conflicts=await checkFiles(current);
  return {status:conflicts.length?'conflict':!current?'unbuilt':
    sha(JSON.stringify(spec))!==current.specSha256||await fingerprint()!==current.runtimeSha256||JSON.stringify(inputs)!==JSON.stringify(current.inputs)?'stale':'current',
    current,conflicts,inputs};
}
export async function recoverProject(specPath,outputRoot){
 const spec=await json(specPath),root=path.resolve(path.dirname(path.resolve(specPath)),outputRoot||spec.outputDir||'outputs'),lockPath=path.join(root,'.build-lock');
 const lock=await optional(lockPath);if(!lock)return {status:'no-lock'};
 if(!Number.isInteger(lock.pid)||lock.pid<=0)throw Error('잠금 소유자 기록이 없습니다. 자동 해제하지 않습니다.');
 let alive=true;try{process.kill(lock.pid,0);}catch(e){if(e.code==='ESRCH')alive=false;else throw e;}
 if(alive)throw Error('잠금 소유 프로세스가 존재합니다. 자동 해제하지 않습니다.');
 await fs.unlink(lockPath);return {status:'recovered',previousOwner:lock,current:await optional(path.join(root,'current.json')),retainedStages:true};
}
export async function buildProject(specPath,{outputRoot,mode='build',canvasModule}={}){
  const spec=await json(specPath),base=path.dirname(path.resolve(specPath)),root=path.resolve(base,outputRoot||spec.outputDir||'outputs');
  if(spec.schemaVersion!==1||!Array.isArray(spec.outputs)||!spec.outputs.length)throw Error('schemaVersion:1, outputs가 필요합니다.');
  await fs.mkdir(root,{recursive:true});
  const lockPath=path.join(root,'.build-lock');
  const lock=await fs.open(lockPath,'wx').catch(()=>{throw Error('다른 빌드 또는 중단된 빌드의 잠금이 있습니다. 프로세스와 journal을 확인하세요.');});
  await lock.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString(),specPath:path.resolve(specPath)}));
  let stage;
  try{
    const current=await optional(path.join(root,'current.json'));
    if(mode==='build'&&current)throw Error('이미 생성된 프로젝트입니다. update를 사용하세요.');
    if(mode==='update'&&!current)throw Error('먼저 build를 실행하세요.');
    const conflicts=await checkFiles(current);
    if(conflicts.length)throw Object.assign(new Error('사람이 변경하거나 삭제한 출력이 있습니다.'),{code:'OUTPUT_CONFLICT',conflicts});
    const {diagrams,inputs}=await sources(spec,base);
    const engine=await createNodeRenderer({canvasModule:canvasModule||spec.canvasModule});
    const id=crypto.randomUUID(),relativeGeneration='generations/'+id;
    stage=path.join(root,'.stage-'+id);await fs.mkdir(stage);
    const final=path.join(root,relativeGeneration),files=[],records=[],names=new Set();
    const emit=async(name,bytes,kind)=>{
      if(names.has(name))throw Error('중복 출력 경로: '+name);names.add(name);
      const dest=safe(stage,name);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes,{flag:'wx'});
      files.push({path:safe(final,name),relativePath:name,sha256:sha(bytes),kind});
    };
    for(const output of spec.outputs){
      const input=diagrams.get(output.diagramId);
      if(input===undefined)throw Error('도표 ID 없음: '+output.diagramId);
      const profile=output.profile||'web';
      if(!['web','slide','report','note','image'].includes(profile))throw Error('알 수 없는 출력 프로필');
      const r=engine.render(input,{...output.options,profile,theme:output.theme||'light',font:output.font||'sametone',width:output.width||768,idPrefix:'pele-'+output.diagramId+'-'});
      if(!r.ok)throw Error(r.diagnostics.map(d=>d.message).join('\n'));
      r.svg=await embeddedFont(r.svg,r.font);
      let bytes;
      if(output.format==='svg')bytes=r.svg;
      else if(output.format==='png')bytes=(await rasterize(r,engine.canvasModule)).bytes;
      else if(output.format==='html-host'){
        const p=path.resolve(base,output.input),original=await fs.readFile(p,'utf8');
        if(output.sourceSha256&&sha(Buffer.from(original))!==output.sourceSha256)throw Error('호스트 원본 해시 불일치');
        if(profile==='slide'&&(!output.enginePin?.rendererPath||!output.enginePin?.packageSha256))throw Error('기존 발표자료의 rendererPath와 packageSha256 고정을 기록하세요.');
        const start='<!-- pele:'+output.diagramId+' -->',end='<!-- /pele:'+output.diagramId+' -->';
        const a=original.indexOf(start),b=original.indexOf(end);
        if(a<0||b<a||original.indexOf(start,a+start.length)>=0||original.indexOf(end,b+end.length)>=0)throw Error('유일한 Pele 호스트 삽입 표지가 필요합니다.');
        const fragment='<figure data-pele-id="'+esc(output.diagramId)+'">'+r.svg+'<figcaption>'+esc(r.description)+'</figcaption></figure>'+dataTable(r.items||[]);
        bytes=original.slice(0,a+start.length)+'\n'+fragment+'\n'+original.slice(b);
      }
      else if(output.format==='html'){
        // Exported HTML remains readable without JS and external font/network access.
        bytes='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(r.title)+'</title><style>body{margin:0 auto;padding:20px;max-width:1100px;font:18px "'+FONTS[r.font].family+'";background:'+THEMES[r.theme].bg+';color:'+THEMES[r.theme].fg+'}pre,code{font-family:inherit;white-space:pre-wrap;overflow-wrap:anywhere}svg{display:block;max-width:100%;height:auto}figure{margin:0;overflow:auto}table{border-collapse:collapse}td,th{padding:.5em;border:1px solid #789}a:focus,button:focus{outline:3px solid #0066b3}</style><main><h1>'+esc(r.title)+'</h1><figure>'+r.svg+'<figcaption>'+esc(r.description)+'</figcaption></figure>'+dataTable(r.items||[])+'<details><summary>원본과 제약</summary><pre>'+esc(typeof input==='string'?input:JSON.stringify(input,null,2))+'</pre><ul>'+r.diagnostics.map(d=>'<li>'+esc(d.message)+'</li>').join('')+'</ul></details></main></html>';
      }else if(output.format==='hwpx'){
        const hallym=path.resolve(base,output.hallymModule||spec.hallymModule||'');
        if(!output.hallymModule&&!spec.hallymModule)throw Error('HWPX 출력에는 hallymModule 경로가 필요합니다.');
        const {preservingEdit}=await import(pathToFileURL(hallym).href);
        const inputPath=path.resolve(base,output.input),sourceBytes=await fs.readFile(inputPath);
        if(sha(sourceBytes)!==output.sourceSha256)throw Error('HWPX 입력이 바뀌었습니다. 다시 inspect 하세요.');
        const inspect=await preservingEdit({mode:'inspect',input:inputPath,pythonExecutable:spec.pythonExecutable});
        if(inspect.status!=='success')throw Error(inspect.failure?.message);
        const target=inspect.pictures.find(p=>p.section===output.target.section&&p.pictureIndex===output.target.pictureIndex&&p.imageSha256===output.target.imageSha256);
        if(!target||!target.width||!target.height)throw Error('HWPX 대상 그림이 달라졌습니다.');
        const inchWidth=target.width/7200;
        const displayedFont=(output.options?.fontSize||PROFILES[profile].fontSize)*Math.min(inchWidth*72/r.width,target.height/100/r.height);
        if(displayedFont<(output.minFontPt||8))throw Error('HWPX 그림 틀에서 도표 글자가 너무 작습니다. 도식을 나누거나 틀을 키우세요.');
        const mod=await import(path.isAbsolute(engine.canvasModule)?pathToFileURL(engine.canvasModule).href:engine.canvasModule),api=mod.default||mod;
        const png=await rasterize(r,engine.canvasModule),image=await api.loadImage(png.bytes);
        const w=Math.max(png.width,Math.ceil(png.height*target.width/target.height)),h=Math.ceil(w*target.height/target.width);
        if(w*h>32000000)throw Error('그림 틀 이미지 크기 제한');
        const cv=api.createCanvas(w,h),ctx=cv.getContext('2d');ctx.fillStyle=THEMES[r.theme].bg;ctx.fillRect(0,0,w,h);ctx.drawImage(image,(w-png.width)/2,(h-png.height)/2);
        const imageName=output.path+'.png';await emit(imageName,await cv.encode('png'),'hwpx-source-image');
        const dest=safe(stage,output.path);
        const edited=await preservingEdit({mode:'edit',input:inputPath,sourceSha256:output.sourceSha256,output:dest,pythonExecutable:spec.pythonExecutable,operations:[{kind:'replace-diagram',target:output.target,image:safe(stage,imageName)}]});
        if(edited.status!=='success')throw Error(edited.failure?.message);
        bytes=await fs.readFile(dest);await fs.unlink(dest);
      }else throw Error('지원하지 않는 출력: '+output.format);
      await emit(output.path,bytes,output.format);
      records.push({diagramId:output.diagramId,sourceSha256:sha(JSON.stringify(input)),output:output.path,profile,theme:r.theme,font:r.font,fonts:engine.fonts,enginePin:output.enginePin,diagnostics:r.diagnostics});
    }
    for(const input of inputs)if(sha(await fs.readFile(input.path))!==input.sha256)throw Error('생성 중 원본이 바뀌었습니다.');
    const manifest={schemaVersion:1,generation:id,version:'1.0.0-rc.2',engine:'1.6.0',runtimeSha256:await fingerprint(),specSha256:sha(JSON.stringify(spec)),inputs,files,records,previous:current?.generation||null};
    await fs.writeFile(path.join(stage,'manifest.json'),JSON.stringify(manifest,null,2));
    await fs.mkdir(path.join(root,'generations'),{recursive:true});await fs.rename(stage,final);stage=null;
    const pointer=path.join(root,'current.'+id+'.tmp');await fs.writeFile(pointer,JSON.stringify(manifest,null,2));await fs.rename(pointer,path.join(root,'current.json'));
    return {status:'success',manifest:path.join(root,'current.json'),...manifest};
  }finally{
    await lock.close();await fs.unlink(lockPath);
    // A failed stage is retained for diagnosis; current.json still selects the last complete generation.
  }
}
