import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {isMedia,isRemoved,isText,readManifest,regularFiles,siteOrigin} from './web-assets';
import {inspectNotes} from './notes-contract';
export async function verifyWebOutput(root='web-dist'){
 const manifest=await readManifest();const list=await regularFiles(root);let bytes=0,maxHtmlBytes=0,htmlCount=0;
 for(const file of list){
  assert(!isRemoved(file),'PDF/ZIP in deployment: '+file);
  assert(!isMedia(file)||file.startsWith('brand/'),'Local content media in deployment: '+file);
  const b=await fs.readFile(path.join(root,file));bytes+=b.length;
  if(!isText(file))continue;const text=b.toString();
  assert(!/data:(?:image|font|application\/(?:font|x-font|pdf))/i.test(text),'Embedded asset in '+file);
  if(!file.endsWith('.html'))continue;htmlCount++;maxHtmlBytes=Math.max(maxHtmlBytes,b.length);
  assert(b.length<=2*1024*1024,'HTML exceeds 2 MiB: '+file);
  const $=load(text);
  const source=await fs.readFile(path.join('dist',file),'utf8');
  const original=load(source);
  for(const doc of [original,$]){
   doc('a[href]').each((_,e)=>{if(isRemoved(doc(e).attr('href')!))doc(e).remove();});
   doc('[data-reader-print],[data-download-pdf],[data-reading-pdf]').remove();
   doc('.tools small').each((_,e)=>{if(/PDF/.test(doc(e).text()))doc(e).remove();});
  }
  // Publishing changes asset addresses, not the text, slide order, or locked notes.
  if(source.includes('id="speaker-notes-enc"'))assert.deepEqual(inspectNotes(text),inspectNotes(source),'Encrypted notes changed');
  const visible=(doc:ReturnType<typeof load>)=>{const clone=load(doc.html());clone('script,style').remove();return clone('body').text().replace(/\s+/g,' ').trim();};
  assert.equal(visible($),visible(original),'Published text changed: '+file);
  for(const e of original('[id]').toArray())assert($('[id]').toArray().some(n=>$(n).attr('id')===original(e).attr('id')),'Lost anchor in '+file);
  for(const e of $('[src],[href],[poster]').toArray())for(const attr of ['src','href','poster']){
   const s=$(e).attr(attr);if(!s||s.startsWith('#')||/^(?:mailto|tel|javascript|data):/.test(s))continue;
   assert(!isRemoved(s),'PDF/ZIP link in '+file+': '+s);
   let u:URL;try{u=new URL(s,new URL('/'+file,siteOrigin));}catch{throw Error('Invalid asset URL in '+file);}
   if(u.origin!==siteOrigin)continue;
   const rel=decodeURIComponent(u.pathname);if(manifest.paths[rel])continue;
   const target=path.resolve(root,'.'+rel+(rel.endsWith('/')?'index.html':''));
   assert(target.startsWith(path.resolve(root)+path.sep),'Outside output path');
   await fs.access(target).catch(()=>{throw Error('Broken deployed link: '+s+' in '+file);});
  }
 }
 assert(bytes<=50*1024*1024,'Deployment exceeds 50 MiB');
 return {version:1,bytes,htmlCount,maxHtmlBytes,pdfFiles:0,zipFiles:0,embeddedAssets:0,localContentImages:0};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/verify-web-output.ts'))console.log(await verifyWebOutput());
