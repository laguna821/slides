import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { load } from 'cheerio';
import { renderReader, sha, escape } from '../src/lib/reader';
import { workSchema } from '../src/lib/schema';
import { printInputDigest } from './print-contract';

const root=process.cwd();
const config=JSON.parse(await fs.readFile('content/print.json','utf8'));
const all=workSchema.array().parse(JSON.parse(await fs.readFile('content/works.json','utf8')));
const selected=process.argv.find(a=>a.startsWith('--work='))?.slice(7);
const fixture=process.argv.includes('--fixture');
const works=fixture?[{...all.find(w=>w.reader)!,id:'print-stress',slug:'print-stress',title:'긴 제목과 표·코드·세로형 그림이 함께 있는 인쇄 경계 사례 검증',event:'공개 게시하지 않는 합성 시험'}]:all.filter(w=>w.reader&&w.visibility!=='draft'&&(!selected||w.id===selected));
if(!works.length)throw Error('No registered readers');
await fs.mkdir('.local/print-v1',{recursive:true});
const bundle=await build({entryPoints:['scripts/print-browser.ts'],bundle:true,write:false,platform:'browser',format:'iife'});
const css=await fs.readFile('scripts/print-profile.css','utf8');
let currentHtml='';
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url!,'http://localhost');
  if(url.pathname==='/print/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(currentHtml);return;}
  if(url.pathname==='/print-runtime.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
  if(fixture&&url.pathname==='/print-fixture.svg'){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="1600"><rect width="100" height="1600" fill="#002e6e"/><path d="M0 0L100 1600M100 0L0 1600" stroke="#00b5ad" stroke-width="12"/></svg>');return;}
  const file=path.resolve(root,'public','.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(path.resolve(root,'public')+path.sep))throw Error('Outside public');
  const type:Record<string,string>={'.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
  res.setHeader('Content-Type',type[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=server.address() as {port:number};
const browser=await chromium.launch({headless:true});
let manifest:any={version:config.version,profile:config.profile,works:{}};
try{manifest=JSON.parse(await fs.readFile('content/print-manifest.json','utf8'));}catch{}
try{
 for(const work of works){
  const meta=fixture?{author:'합성 검증 원고',shortTitle:'인쇄 경계 사례'}:config.works[work.id];if(!meta?.author||!meta.shortTitle)throw Error('Print metadata missing: '+work.id);
  const source=fixture?{aliases:{},images:[{url:'/print-fixture.svg'}]}:JSON.parse(await fs.readFile(work.reader!.manifest,'utf8')).works[work.id];
  const stress='## 첫 절\n\n한글과 **강조**, [긴 링크](https://example.com/'+('long-path-'.repeat(25))+')를 보존합니다.\n\n- 첫 목록\n  - 두 번째 목록과 원문을 보존합니다.\n\n<figure><img src="/print-fixture.svg" alt="매우 긴 세로형 도해"><figcaption>세로형 이미지의 전체 구간과 이 캡션이 함께 유지되어야 합니다.</figcaption></figure>\n\n## 긴 표\n\n|행|내용|값|\n|---|---|---|\n'+Array.from({length:65},(_,i)=>`|${i+1}|반복 머리행과 본문 순서를 검증하는 내용 ${i+1}|${i*3}|`).join('\n')+'\n\n## 긴 코드\n\n```text\n'+Array.from({length:100},(_,i)=>`LINE-${i} `+'long-code-value '.repeat(8)).join('\n')+'\n```\n\n## 마지막\n\n끝까지 보존되어야 합니다.\n';
  const reader=renderReader(fixture?stress:await fs.readFile(work.reader!.source,'utf8'),source.aliases,source.wiki||{});
  const $=load(reader.html,null,false);
  $('a[href^="/"]').each((_,el)=>{$(el).attr('href','https://achmage-slides.vercel.app'+$(el).attr('href'));});
  // Plain source leaves are independent of pagination and synthetic header text.
  const leaves:string[]=[]; const visit=(n:any)=>{if(n.type==='text'&&n.data.trim())leaves.push(n.data);for(const c of n.children||[])visit(c);};
  $.root().children().each((_,el)=>visit(el));
  const metadata={...meta,date:work.date};
  const furniture=`@page hanmark-body { @top-left {content:${JSON.stringify(meta.shortTitle)};font:8pt Pretendard;color:#536778;} @top-right {content:"Achmage";font:8pt Pretendard;color:#536778;} @bottom-left {content:${JSON.stringify(meta.author+' · '+work.date)};font:8pt Pretendard;color:#536778;} @bottom-right {content:counter(page) " / " counter(pages);font:8pt Pretendard;color:#536778;} } @page hanmark-body:first { @top-left {content:none;} @top-right {content:none;} }`;
  currentHtml=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${escape(work.title)} · 읽기용 PDF</title><style id="print-styles">${css}</style></head><body class="hanmark-editorial-pdf-active"><section class="hanmark-editorial-pdf-root"><header class="print-title"><p class="kicker">ACHMAGE / READING EDITION</p><h1>${escape(work.title)}</h1><p class="meta">${escape(meta.author)} · ${escape(work.date)}</p>${work.event?'<p class="event">'+escape(work.event)+'</p>':''}</header><div class="hanmark-editorial-pdf-body">${$.html()}</div></section><script id="print-metadata" type="application/json">${JSON.stringify(metadata).replaceAll('<','\\u003c')}</script><script src="/print-runtime.js"></script></body></html>`;
  const page=await browser.newPage();
  currentHtml=currentHtml.replace('</style>',furniture+'</style>');
  await page.emulateMedia({media:'print'});
  page.on('pageerror',e=>console.error('Print page error',e.message));
  await page.goto(`http://127.0.0.1:${address.port}/print/`);
  const proof:any=await page.evaluate(()=>window.printReady);
  const before=fixture?{digest:'fixture',engines:{}}:await printInputDigest(work);
  const outDir='.local/print-v1/'+work.id;await fs.mkdir(outDir,{recursive:true});
  const localPdf=outDir+'/reading.pdf';
  await page.pdf({path:localPdf,preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false,tagged:true,outline:true});
  await fs.writeFile(outDir+'/source.json',JSON.stringify({leaves,images:source.images,links:reader.links,proof},null,2));
  const verify=spawnSync(process.env.PRINT_PYTHON||'python',['scripts/verify-print-pdf.py',localPdf,outDir+'/source.json'],{encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'}});
  if(verify.status!==0)throw Error(verify.stdout+verify.stderr);
  const checked=JSON.parse(verify.stdout);
  const bytes=await fs.readFile(localPdf),hash=sha(bytes);
  const url='/reading/pdf/'+work.slug+'/'+hash.slice(0,16)+'.pdf';
  if(!fixture){await fs.mkdir(path.dirname('public'+url),{recursive:true});await fs.writeFile('public'+url,bytes);}
  manifest.works[work.id]={url,sha256:hash,inputDigest:before.digest,profile:config.profile,hanmarkVersion:'2.7.0',hanmarkRevision:'3db078d75851ae8d94dcc96eff45a6fad1102d63',chromium:browser.version(),engines:before.engines,...checked,images:proof.images,sourceOrder:proof.sourceOrder,firstPageInsetPx:proof.firstPageInsetPx,geometryErrors:proof.geometry.length+proof.tableOverflow.length,imageMissing:0};
  await fs.writeFile(outDir+'/proof.json',JSON.stringify(manifest.works[work.id],null,2));
  console.log(work.id,JSON.stringify(manifest.works[work.id]));
  await page.close();
 }
 if(!fixture)await fs.writeFile('content/print-manifest.json',JSON.stringify(manifest,null,2)+'\n');
}finally{await browser.close();server.close();}
