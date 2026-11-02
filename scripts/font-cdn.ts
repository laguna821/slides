import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { sha, type Manifest, type Asset } from './web-assets';

export const registryPath = 'content/font-cdn.json';
export const receiptPath = 'validation/font-cdn-verification.json';
export const bundleDirectory = '.local/font-cdn/assets';
export type FontFile = { sha256: string; bytes: number; mime: string; sourcePath: string; path: string; licenses: string[] };
export type TextFile = { path: string; content: string; mime: string };
export type FontRegistry = { version: 1; service: string; origin: string; fonts: Record<string, FontFile>; texts: TextFile[]; sameToneCss: string };
export async function readFontRegistry(): Promise<FontRegistry> {
  return JSON.parse(await fs.readFile(registryPath, 'utf8'));
}
export async function registerFontBytes(bytes: Buffer): Promise<Asset> {
  const registry=await readFontRegistry();
  const digest=sha(bytes), mime=fontMime(bytes);
  let font=registry.fonts[digest];
  if(!font) {
    // New families need their own redistribution notice, never a guessed license.
    const licenseSource='public/fonts/licenses/'+digest+'.txt';
    const content=await fs.readFile(licenseSource,'utf8').catch(()=>{throw Error('New font requires its license/NOTICE at '+licenseSource);});
    assert(content.trim(),'Empty font license');
    const licensePath='/licenses/'+sha(content)+'.txt';
    if(!registry.texts.some(t=>t.path===licensePath))registry.texts.push({path:licensePath,content,mime:'text/plain'});
    const publicPath=fontPath(digest,mime);
    const sourcePath='public/fonts/shared/'+path.posix.basename(publicPath);
    await fs.mkdir(path.dirname(sourcePath),{recursive:true});await fs.writeFile(sourcePath,bytes);
    font={sha256:digest,bytes:bytes.length,mime,sourcePath,path:publicPath,licenses:[licensePath]};
    registry.fonts[digest]=font;
    await fs.writeFile(registryPath,JSON.stringify(registry,null,2)+'\n');
  }
  assert(font.bytes===bytes.length && font.mime===mime,'Registered font bytes mismatch');
  return {sourceHash:digest,sha256:digest,url:registry.origin+font.path,sourcePath:font.sourcePath,bytes:font.bytes,mime,kind:'font',verifiedAt:''};
}
export function fontSourcePath(sourcePath: string) {
  assert(/^public\/fonts\/[\w./-]+$/.test(sourcePath) && !sourcePath.split('/').includes('..'), 'Unsafe font archive path');
  return sourcePath;
}
export function fontPath(digest: string, mime: string) {
  assert(/^[a-f0-9]{64}$/.test(digest), 'Invalid font hash');
  const ext = ({ 'font/woff2': 'woff2', 'font/woff': 'woff', 'font/ttf': 'ttf', 'font/otf': 'otf' } as Record<string,string>)[mime];
  assert(ext, 'Unsupported font MIME: '+mime);
  return '/fonts/'+digest+'.'+ext;
}
export function fontMime(bytes: Buffer) {
  const magic = bytes.subarray(0,4).toString();
  if(magic === 'wOF2')return 'font/woff2';
  if(magic === 'wOFF')return 'font/woff';
  if(magic === 'OTTO')return 'font/otf';
  if(bytes.subarray(0,4).equals(Buffer.from([0,1,0,0])))return 'font/ttf';
  throw Error('Unrecognized font binary');
}
export function validateRegistry(registry: FontRegistry) {
  const origin = new URL(registry.origin);
  assert(origin.protocol==='https:' && origin.origin===registry.origin && origin.hostname.endsWith('.workers.dev'), 'Expected verified workers.dev origin');
  assert(registry.service==='achmage-fonts' && registry.version===1, 'Unexpected font service');
  const paths = new Set<string>();
  for(const [digest,font] of Object.entries(registry.fonts)) {
    assert(digest===font.sha256 && font.path===fontPath(digest,font.mime), 'Font address must contain its byte hash');
    fontSourcePath(font.sourcePath);
    assert(font.bytes>0 && font.licenses.length>0, 'Font size/license registration required');
    for(const license of font.licenses)assert(registry.texts.some(t=>t.path===license), 'Missing font license');
    paths.add(font.path);
  }
  for(const text of registry.texts) {
    assert(/^\/(?:css|licenses)\/[\w./-]+$/.test(text.path) && !text.path.split('/').includes('..'), 'Unsafe text asset path');
    assert(text.path.includes(sha(text.content)), 'Text URL must be immutable and content-addressed');
    assert(!paths.has(text.path),'Duplicate font-service path'); paths.add(text.path);
  }
  assert(registry.texts.some(t=>t.path===registry.sameToneCss && t.mime==='text/css'),'Missing version-pinned SameTone CSS');
}
export async function validateFontArchives(registry: FontRegistry) {
  validateRegistry(registry);
  for(const font of Object.values(registry.fonts)) {
    const bytes=await fs.readFile(fontSourcePath(font.sourcePath));
    assert(sha(bytes)===font.sha256 && bytes.length===font.bytes && fontMime(bytes)===font.mime,'Archived font mismatch: '+font.sourcePath);
  }
}
export function validateFontManifest(manifest: Manifest, registry: FontRegistry) {
  for(const asset of Object.values(manifest.assets).filter(a=>a.kind==='font')) {
    const font=registry.fonts[asset.sha256];
    assert(font && asset.sourceHash===font.sha256 && asset.sourcePath===font.sourcePath && asset.bytes===font.bytes && asset.mime===font.mime && asset.url===registry.origin+font.path,'Unregistered/unpublished font; run upload:prepare: '+asset.sha256);
    assert(manifest.paths['/'+font.sourcePath.slice('public/'.length)]===asset.url,'Missing historical font redirect');
  }
}
export function connectFonts(manifest: Manifest, registry: FontRegistry) {
  const oldToNew: Record<string,string> = {};
  for(const asset of Object.values(manifest.assets).filter(a=>a.kind==='font')) {
    const font=registry.fonts[asset.sha256];
    assert(font,'Register font license before publication: '+asset.sha256);
    const url=registry.origin+font.path;
    oldToNew[asset.url]=url;
    asset.url=url; asset.sourcePath=font.sourcePath; asset.mime=font.mime;
    manifest.paths['/'+font.sourcePath.slice('public/'.length)]=url;
  }
  // Resolve all historical aliases directly, without a Vercel-to-Vercel hop.
  for(const [from,to] of Object.entries(manifest.paths))manifest.paths[from]=oldToNew[to] || to;
  for(const [from,to] of Object.entries(oldToNew))if(from.startsWith('/'))manifest.paths[from]=to;
}
export async function prepareFontBundle(registry: FontRegistry) {
  await validateFontArchives(registry);
  await preservePublishedFonts(registry);
  const output=path.resolve(bundleDirectory);
  assert(output.startsWith(path.resolve('.local/font-cdn')+path.sep),'Unsafe generated bundle directory');
  await fs.rm(output,{recursive:true,force:true}); await fs.mkdir(output,{recursive:true});
  for(const font of Object.values(registry.fonts)) {
    const target=path.join(output,font.path);await fs.mkdir(path.dirname(target),{recursive:true});
    await fs.copyFile(font.sourcePath,target);
  }
  for(const text of registry.texts) {
    const target=path.join(output,text.path);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,text.content);
  }
  const fontHeaders=Object.values(registry.fonts).map(f=>f.path+'\n  Content-Type: '+f.mime+'\n').join('\n');
  await fs.writeFile(path.join(output,'_headers'),'/*\n  Access-Control-Allow-Origin: *\n  Timing-Allow-Origin: *\n  Cache-Control: public, max-age=31536000, immutable\n  X-Content-Type-Options: nosniff\n\n'+fontHeaders);
  await fs.writeFile('.local/font-cdn/wrangler.json',JSON.stringify({name:registry.service,account_id:'c0894e24cdac65f1ee7510707b16800d',compatibility_date:'2026-11-02',workers_dev:true,assets:{directory:'./assets',html_handling:'none',not_found_handling:'none'}},null,2)+'\n');
}
export async function preservePublishedFonts(registry: FontRegistry) {
  const previous=await fs.readFile(receiptPath,'utf8').then(JSON.parse,e=>{if(e.code==='ENOENT')return null;throw e;});
  if(!previous)return;
  assert(previous.origin===registry.origin,'Existing shared font origin must remain available');
  const inventory=new Map([...Object.values(registry.fonts).map(f=>[f.path,f.sha256] as const),...registry.texts.map(t=>[t.path,sha(t.content)] as const)]);
  for(const file of previous.responses)assert(inventory.get(file.path)===file.sha256,'Previously published address removed or changed: '+file.path);
}
export async function verifyPublicFonts(registry: FontRegistry, allowMissing=false) {
  validateRegistry(registry);
  const expected=[...Object.values(registry.fonts).map(f=>({path:f.path,sha256:f.sha256,bytes:f.bytes,mime:f.mime})),...registry.texts.map(t=>({path:t.path,sha256:sha(t.content),bytes:Buffer.byteLength(t.content),mime:t.mime}))];
  const responses=[]; const missing=[];
  for(const file of expected) {
    const url=registry.origin+file.path;
    const response=await fetch(url,{redirect:'error',headers:{Origin:'https://achmage-slides.vercel.app'},signal:AbortSignal.timeout(60000)});
    if(allowMissing && response.status===404){missing.push(file.path);continue;}
    assert(response.ok,'Font public response '+response.status+': '+url);
    const bytes=Buffer.from(await response.arrayBuffer());
    const mime=(response.headers.get('content-type')||'').split(';')[0].trim();
    const cors=response.headers.get('access-control-allow-origin');
    const cache=response.headers.get('cache-control')||'';
    assert(sha(bytes)===file.sha256 && bytes.length===file.bytes,'Public font-service bytes changed: '+url);
    assert(mime===file.mime && cors==='*','Font-service MIME/CORS mismatch: '+url);
    assert(/(?:^|,)\s*public(?:,|$)/.test(cache) && /max-age=31536000/.test(cache) && /immutable/.test(cache),'Font-service cache mismatch: '+url);
    responses.push({...file,url,cors,cache,etag:response.headers.get('etag')});
  }
  return {version:1,verifiedAt:new Date().toISOString(),registryHash:sha(JSON.stringify(registry)),origin:registry.origin,responses,missing};
}
export async function checkFontReceipt(registry: FontRegistry) {
  const receipt=JSON.parse(await fs.readFile(receiptPath,'utf8'));
  assert(receipt.registryHash===sha(JSON.stringify(registry)) && receipt.missing.length===0,'Public font verification missing/stale; run fonts:verify');
  for(const font of Object.values(registry.fonts))assert(receipt.responses.some((r:any)=>r.url===registry.origin+font.path && r.sha256===font.sha256 && r.bytes===font.bytes && r.mime===font.mime && r.cors==='*'),'Font public receipt incomplete');
  for(const text of registry.texts)assert(receipt.responses.some((r:any)=>r.url===registry.origin+text.path && r.sha256===sha(text.content) && r.bytes===Buffer.byteLength(text.content) && r.mime===text.mime),'Font CSS/license receipt incomplete');
}
