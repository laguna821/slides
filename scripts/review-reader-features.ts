import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {builtReviewRoutes} from './release-gate';
const base=process.env.REVIEW_BASE||'http://127.0.0.1:4330';
const out='.local/i18n/review';
const browser=await chromium.launch();
const context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],acceptDownloads:true});
const page=await context.newPage();page.setDefaultTimeout(12000);
const readers:any[]=[],navigation:any[]=[],extra:any[]=[],downloads:any[]=[],search:any[]=[];
const settle=()=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
const ready=async()=>{await page.evaluate(async()=>{for(const i of document.images){i.loading='eager';if(i.getAttribute('src'))await i.decode().catch(()=>{});}});await settle();};
try {
 for(const route of (await builtReviewRoutes()).filter(r=>r.endsWith('/read/'))){
  await page.setViewportSize({width:375,height:900});await page.goto(base+route);await ready();
  const row:any={route,version:'2.0.0'};
  const toc=page.locator('.reader-toolbar [data-open-panel="reader-toc"]');
  await toc.click();assert(await page.locator('#reader-toc.panel-open').isVisible());row.toc=true;
  const anchor=page.locator('#reader-toc nav a').nth(1);const hash=await anchor.getAttribute('href');await anchor.click();assert(decodeURIComponent(new URL(page.url()).hash)===decodeURIComponent(hash!));row.anchors=true;
  await page.locator('.reader-toolbar [data-open-panel="reader-tools"]').click();
  for(const kind of ['text','markdown']){const b=page.locator('[data-copy-reader="'+kind+'"]');const url=await b.getAttribute('data-url');const expected=(await (await context.request.get(base+url)).text()).replaceAll('\r\n','\n');await b.click();await page.waitForFunction(expected=>navigator.clipboard.readText().then(t=>t.replaceAll('\r\n','\n')===expected),expected);row[kind==='text'?'copyText':'copyMarkdown']=true;}
  await page.locator('[data-copy-section]').click();await page.waitForTimeout(80);assert((await page.evaluate(()=>navigator.clipboard.readText())).startsWith(base+route+'#'));row.copySection=true;
  const md=page.locator('#reader-tools a[download]').filter({hasText:/Markdown/}).first();const mdWait=page.waitForEvent('download');await md.click();const mdDownload=await mdWait;assert(!(await mdDownload.failure()));row.download=true;
  row.graph=await page.locator('.reader-graph').count()>0;
  const pdf=page.locator('[data-download-pdf]').first();const pdfUrl=await pdf.getAttribute('href');const wait=page.waitForEvent('download');await pdf.click();const d=await wait;const bytes=await fs.readFile((await d.path())!);const sha256=createHash('sha256').update(bytes).digest('hex');const res=await context.request.get(base+pdfUrl);assert.equal(res.status(),200);assert.equal(createHash('sha256').update(await res.body()).digest('hex'),sha256);downloads.push({route,url:pdfUrl,sha256,pdfDownload:true,pdfResponse200:true,pdfBytesVerified:true});
  await page.keyboard.press('Escape');
  const images=page.locator('.reader-image-button');row.imageCount=await images.count();
  if(row.imageCount){await images.first().click();assert(await page.locator('#reader-image[open]').isVisible());await page.locator('[data-close-image]').click();}row.imageZoom=true;row.imageZoomApplicable=row.imageCount>0;
  await page.emulateMedia({media:'print'});row.print=await page.locator('.reader-toolbar').isHidden();await page.emulateMedia({media:'screen'});assert(row.print);
  const en=route.startsWith('/en/');await page.goto(base+route+'#'+(await page.locator('#reader-body h2').first().getAttribute('id')));await page.locator('[data-language-switch]').click();assert.equal(new URL(page.url()).pathname,en?route.slice(3):'/en'+route);assert(new URL(page.url()).hash);row.languageSwitch=true;
  readers.push(row);
  for(const width of [375,768,1440])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:900});await page.goto(base+route);await ready();await page.evaluate(t=>{document.documentElement.dataset.theme=t;localStorage.setItem('achmage-theme',t);},theme);await page.reload();await ready();
   const positions=[];
   for(const position of ['start','middle','end']){
    await page.evaluate(p=>scrollTo(0,p==='start'?0:p==='middle'?document.documentElement.scrollHeight/2:document.documentElement.scrollHeight),position);await settle();
    positions.push(await page.evaluate(position=>{const toolbar=document.querySelector('.reader-toolbar')!;const a=toolbar.querySelector('a')!.getBoundingClientRect();const rects=Array.from(toolbar.querySelectorAll('button')).map(b=>b.getBoundingClientRect());return {position,toolbarTop:toolbar.getBoundingClientRect().top,controlsVisible:rects.every(r=>r.top>=0&&r.bottom<=innerHeight&&r.right<=innerWidth&&r.left>=0),sameRow:Math.max(...rects.map(r=>r.top))-Math.min(...rects.map(r=>r.top))<1,noOverlap:a.right<=rects[0].left&&rects.every((r,i)=>!i||rects[i-1].right<=r.left),minTarget:Math.min(...rects.flatMap(r=>[r.width,r.height]))};},position));
   }
   const beforeFocus=await page.evaluate(()=>scrollY);const toggle=page.locator('.reader-toolbar .theme-toggle');await toggle.focus();const before=await page.evaluate(()=>scrollY);await page.keyboard.press('Enter');await settle();
   const changed=await page.evaluate(()=>({theme:document.documentElement.dataset.theme,saved:localStorage.getItem('achmage-theme'),scrollY,sync:new Set(Array.from(document.querySelectorAll('.theme-toggle'),e=>e.getAttribute('aria-pressed'))).size===1}));
   await toc.focus();await page.keyboard.press('Enter');const reachable=await page.locator('#reader-toc.panel-open').isVisible();await page.keyboard.press('Escape');const keyboard=await toc.evaluate(e=>document.activeElement===e);
   await page.reload();await ready();const persisted=await page.evaluate(()=>document.documentElement.dataset.theme===localStorage.getItem('achmage-theme'));
   navigation.push({route,width,theme,actualWidth:await page.evaluate(()=>innerWidth),themeSwitch:changed.theme!==theme,themeSync:changed.sync,themePersisted:persisted&&changed.saved===changed.theme,tocReachable:reachable,keyboard,scrollShift:changed.scrollY-before,automationFocusScrollShift:before-beforeFocus,positions});
  }
  for(const width of [320,1920])for(const theme of ['light','dark']){await page.setViewportSize({width,height:1000});await page.goto(base+route);await ready();await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);extra.push({route,width,theme,...await page.evaluate(()=>({actualWidth:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,columnWidth:document.querySelector('#reader-body')!.getBoundingClientRect().width}))});await page.screenshot({path:out+'/'+route.replace(/\W/g,'_')+'-'+width+'-'+theme+'.png'});}
  console.log('Reader verified',route);
 }
 for(const prefix of ['', '/en']){await page.goto(base+prefix+'/archive/?q=SameTone');await page.waitForFunction(()=>document.querySelector('.result-count')?.textContent?.includes('SameTone'));assert.equal(await page.locator('[data-work-id]:visible').count(),1);assert((await page.locator('[data-work-id]:visible').innerText()).includes('Achmage SameTone'));search.push({language:prefix?'en':'ko',sameTone:true});await page.goto(base+prefix+'/archive/?q=zzzzqwertynotfound');await page.locator('.empty-state').waitFor({state:'visible'});assert.equal(await page.locator('[data-work-id]:visible').count(),0);search.at(-1).empty=true;await page.locator('[data-reset]').click();assert((await page.locator('[data-work-id]:visible').count())>1);search.at(-1).reset=true;}
}finally{await fs.writeFile(out+'/features.json',JSON.stringify({readers,navigation,extra,downloads,search},null,2));await browser.close();}
console.log({readers:readers.length,navigation:navigation.length,extra:extra.length,downloads:downloads.length,search});
