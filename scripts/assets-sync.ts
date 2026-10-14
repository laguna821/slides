import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {Resvg} from '@resvg/resvg-js';
import {assetKey,dataPattern,svgDataPattern,isMedia,isText,manifestPath,readManifest,regularFiles,sha,type Asset} from './web-assets';
const local=await fs.readFile('.local/asset-config.json','utf8').then(JSON.parse,()=>({}));
const configPath=process.env.CMDS_EAGLE_CONFIG||local.cmdsEagleConfig;
if(!configPath)throw Error('Set CMDS_EAGLE_CONFIG to the existing local CMDS Eagle data.json. Never copy its secrets into this repository.');
const config=JSON.parse(await fs.readFile(configPath,'utf8')).cloudProviders?.r2;
if(!config?.enabled||!config.workerUrl||!config.apiKey||!config.publicUrl)throw Error('Existing CMDS R2 configuration is incomplete');
const publicBase=new URL(config.publicUrl);if(publicBase.protocol!=='https:')throw Error('HTTPS public origin required');
const manifest=await readManifest();let added=0,reused=0;
const mimeByExt:Record<string,string>={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.otf':'font/otf'};
const extByMime:Record<string,string>=Object.fromEntries(Object.entries(mimeByExt).map(([k,v])=>[v,k]));
await fs.mkdir('.local/asset-fonts',{recursive:true});
await fs.mkdir('public/fonts/shared',{recursive:true});
async function save(){for(const [k,v]of Object.entries(manifest.paths))if(k===v)delete manifest.paths[k];await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');}
async function verify(asset:Asset){
 const u=new URL(asset.url);if(u.origin!==publicBase.origin)throw Error('Unexpected R2 public origin');
 const r=await fetch(u,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('R2 public verification HTTP '+r.status);
 const bytes=Buffer.from(await r.arrayBuffer());if(sha(bytes)!==asset.sha256)throw Error('R2 public hash mismatch');
 if(!(r.headers.get('content-type')||'').split(';')[0].startsWith(asset.mime.split('/')[0]+'/'))throw Error('R2 content type mismatch');
 asset.verifiedAt=new Date().toISOString();
}
async function register(bytes:Buffer,mime:string):Promise<Asset>{
 const key=assetKey(mime,bytes);const prior=manifest.assets[key];
 if(prior){reused++;return prior;}
 const sourceHash=sha(bytes);let output=bytes,outMime=mime;
 if(mime==='image/svg+xml'&&/data:(?:font|application)\//.test(bytes.toString())){
  // Image-mode SVG cannot fetch external fonts. Rasterize at 2x with its exact
  // embedded fonts, rather than silently replacing the typeface.
  const svg=bytes.toString();const fontFiles:string[]=[];
  for(const m of svg.matchAll(dataPattern()))if(/^(font\/|application\/(?:x-font|font))/.test(m[1])){
   const b=Buffer.from(m[2],'base64');const base=path.resolve('.local/asset-fonts',sha(b));
   const input=base+'.woff2',output=base+'.ttf';await fs.writeFile(input,b);
   const py=process.env.ASSET_PYTHON||local.python||'python';
   const converted=spawnSync(py,['-c','from fontTools.ttLib import TTFont; import sys; f=TTFont(sys.argv[1]); f.flavor=None; f.save(sys.argv[2])',input,output],{encoding:'utf8'});
   if(converted.status!==0)throw Error('Font conversion failed; install fontTools with WOFF2 support in ASSET_PYTHON');
   fontFiles.push(output);
  }
  const stripped=svg.replace(dataPattern(),(s,m)=>/^(font\/|application\/(?:x-font|font))/.test(m)?'':s);
  output=Buffer.from(new Resvg(stripped,{fitTo:{mode:'zoom',value:2},font:{fontFiles,loadSystemFonts:false}}).render().asPng());outMime='image/png';
 }
 const digest=sha(output);
 const isFont=/^(font\/|application\/(?:x-font|font))/.test(mime);
 let url:string;
 if(isFont){
  const ext=extByMime[mime]||(bytes.subarray(0,4).toString()==='wOF2'?'.woff2':'.woff');
  url='/fonts/shared/'+digest+ext;await fs.writeFile('public'+url,bytes);
 }else{
  const existing=Object.values(manifest.assets).find(a=>a.sha256===digest&&a.kind==='image');
  if(existing)url=existing.url;
  else{
   const name='slides-'+digest+(extByMime[outMime]||'.bin');
   const form=new FormData();form.append('file',new Blob([new Uint8Array(output)],{type:outMime}),name);form.append('filename',name);form.append('content_type',outMime);
   const response=await fetch(config.workerUrl.replace(/\/$/,'')+'/upload',{method:'POST',headers:{Authorization:'Bearer '+config.apiKey},body:form,signal:AbortSignal.timeout(120000)});
   if(!response.ok)throw Error('CMDS R2 upload HTTP '+response.status+' (no secret response body logged)');
   const data=await response.json() as {key:string};if(!data.key||data.key.includes('..'))throw Error('Invalid upload object key');
   url=config.publicUrl.replace(/\/$/,'')+'/'+data.key;
  }
 }
 const asset:Asset={sourceHash,sha256:digest,url,bytes:output.length,mime:outMime,kind:isFont?'font':'image',verifiedAt:new Date().toISOString()};
 if(!isFont)await verify(asset);
 manifest.assets[key]=asset;added++;await save();console.log('Verified asset '+added+': '+outMime+' '+output.length+' bytes');return asset;
}
for(const file of await regularFiles('dist')){
 const bytes=await fs.readFile(path.join('dist',file));
 if((isMedia(file)&&!file.startsWith('brand/'))||(/\.(?:woff2?|ttf|otf)$/.test(file)&&file!=='fonts/AchmageSameTone-1.000.woff2'&&!file.startsWith('fonts/shared/'))){
  const asset=await register(bytes,mimeByExt[path.extname(file).toLowerCase()]);manifest.paths['/'+file]=asset.url;await save();
 }else if(isText(file)){
  for(const m of bytes.toString().matchAll(dataPattern())){
   if(m[1]==='application/pdf')continue;
   await register(Buffer.from(m[2],'base64'),m[1]);
  }
  for(const m of bytes.toString().matchAll(svgDataPattern()))await register(Buffer.from(decodeURIComponent(m[2])),'image/svg+xml');
 }
}
if(process.argv.includes('--verify-all'))for(const asset of Object.values(manifest.assets))if(asset.kind==='image')await verify(asset);
await save();console.log(JSON.stringify({added,reused,unique:Object.keys(manifest.assets).length,paths:Object.keys(manifest.paths).length}));
