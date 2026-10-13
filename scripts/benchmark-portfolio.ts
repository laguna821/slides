import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';
const root=path.resolve('dist');
const types:Record<string,string>={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json'};
const servers=await Promise.all(['Pretendard','SameTone'].map(async(variant,index)=>{
 const server=http.createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url!,'http://localhost').pathname);if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))throw Error();let bytes=await fs.readFile(file);const ext=path.extname(file);if(variant==='Pretendard'&&['.html','.css'].includes(ext)){let text=bytes.toString().replaceAll('AchmageSameTone-1.000.woff2','PretendardVariable.woff2');if(ext==='.css')text=text.replaceAll('Achmage SameTone','Pretendard');bytes=Buffer.from(text);}res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
 await new Promise<void>(resolve=>server.listen(4340+index,'127.0.0.1',resolve));return server;
}));
const browser=await chromium.launch();const rows:any[]=[];
try{
 for(const profile of ['mobile','native'])for(const language of ['ko','en'])for(let run=1;run<=5;run++)for(const variant of run%2?['Pretendard','SameTone']:['SameTone','Pretendard']){
  const context=await browser.newContext({viewport:{width:profile==='mobile'?375:1440,height:900},serviceWorkers:'block'});const page=await context.newPage();const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  if(profile==='mobile')await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1600000/8,uploadThroughput:750000/8,connectionType:'cellular4g'});
  await page.addInitScript(()=>{(window as any).__metrics={lcp:0,cls:0};new PerformanceObserver(l=>{for(const e of l.getEntries())(window as any).__metrics.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries() as any)if(!e.hadRecentInput)(window as any).__metrics.cls+=e.value;}).observe({type:'layout-shift',buffered:true});});
  await page.goto('http://127.0.0.1:'+(variant==='Pretendard'?4340:4341)+(language==='en'?'/en/':'/'),{waitUntil:'domcontentloaded',timeout:120000});
  const metrics=await page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return {fontReadyMs:performance.now(),fcpMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,...(window as any).__metrics,fontFamily:getComputedStyle(document.body).fontFamily,fonts:performance.getEntriesByType('resource').filter(e=>e.name.endsWith('.woff2')).map(e=>({name:e.name.split('/').pop(),duration:e.duration,encodedBodySize:(e as PerformanceResourceTiming).encodedBodySize,transferSize:(e as PerformanceResourceTiming).transferSize}))};});
  rows.push({profile,language,run,variant,...metrics});console.log(profile,language,run,variant,Math.round(metrics.fontReadyMs));await context.close();
 }
}finally{await browser.close();for(const s of servers)s.close();await fs.mkdir('validation/benchmarks',{recursive:true});await fs.writeFile('validation/benchmarks/sametone-portfolio.json',JSON.stringify({measuredAt:new Date().toISOString(),environment:'Windows Chromium151; local HTTP; cold browser cache; mobile1.6Mbps down/750Kbps up/150ms latency; native unthrottled1440; same bilingual pages and assets, CSS font/preload substitution only; no CPU throttling. Sequential alternating five runs per cell. Font ready means document.fonts.ready plus two frames; LCP is observed at that point, not a completed interaction/session.',rows},null,2)+'\n');}
if(rows.length!==40)throw Error('Incomplete benchmark');
