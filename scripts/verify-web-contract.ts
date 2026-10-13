import fs from 'node:fs/promises';
import {load} from 'cheerio';
import assert from 'node:assert/strict';
import {policy} from '../src/lib/policy';
import {hash} from './localization';
export function validateFontCss(css:string){
 const faces=css.match(/@font-face\s*\{[^}]+\}/g)||[];
 assert(faces.some(f=>/font-family:\s*["']?Achmage SameTone["']?\s*;/.test(f)&&f.includes(policy.webFont.url)&&/font-weight:\s*100\s+900/.test(f)),'SameTone variable font face missing');
 const families=[...css.matchAll(/(?:^|\})\s*body\s*\{([^}]+)\}/g)].flatMap(m=>[...m[1].matchAll(/font-family:\s*([^;]+)/g)].map(v=>v[1]));
 assert(families.length&&/^["']?Achmage SameTone["']?,/.test(families.at(-1)!), 'Site body must default to SameTone');
}
export function validatePagePair(ko:string,en:string,route:string){
 const k=load(ko),e=load(en);assert.equal(k('html').attr('lang'),'ko');assert.equal(e('html').attr('lang'),'en');
 for(const [$,language]of [[k,'ko'],[e,'en']] as const){const canonicalRoute=language==='ko'&&route==='/404.html'?'/404/':language==='ko'&&k('body.embed-page').length?route.replace(/embed\/$/,''):route;assert.equal($('link[rel=canonical]').attr('href'),'https://achmage-slides.vercel.app'+(language==='en'?'/en':'')+canonicalRoute);assert.equal($('link[rel=alternate][hreflang=ko]').length,1);assert.equal($('link[rel=alternate][hreflang=en]').length,1);
  if($('.site-header').length){assert.equal($('link[as=font][rel=preload]').attr('href'),policy.webFont.url);assert.equal($('[data-language-switch]').attr('href'),language==='ko'?'/en'+route:route);}
 }
}
export async function verifyWebContract(){
 assert.equal(hash(await fs.readFile('dist'+policy.webFont.url)),policy.webFont.sha256,'정식 SameTone 바이트 불일치');
 const cssFiles=(await fs.readdir('dist/_astro')).filter(f=>f.endsWith('.css'));const css=(await Promise.all(cssFiles.map(f=>fs.readFile('dist/_astro/'+f,'utf8')))).join('\n');
 validateFontCss(css);
 let pairs=0;
 for(const file of (await fs.readdir('dist',{recursive:true})).map(f=>f.replaceAll('\\','/')).filter(f=>f.endsWith('.html')&&!f.startsWith('en/'))){
  const ko=await fs.readFile('dist/'+file,'utf8');if(!ko.includes('site-header')&&!ko.includes('class="embed-page"'))continue;
  const en=await fs.readFile('dist/en/'+file,'utf8');validatePagePair(ko,en,'/'+file.replace(/index\.html$/,''));pairs++;
 }
 assert(pairs>0);console.log('SameTone and bilingual page contract: '+pairs+' pairs verified');
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/verify-web-contract.ts'))await verifyWebContract();
