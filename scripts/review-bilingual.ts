import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {builtReviewRoutes} from './release-gate';
const root='.local/i18n/review';await fs.mkdir(root,{recursive:true});
const base=process.env.REVIEW_BASE||'http://127.0.0.1:4330';
const browser=await chromium.launch({headless:true});
const routes=await builtReviewRoutes();const views:any[]=[];const errors:any[]=[];
const jobs=routes.flatMap(route=>[375,768,1440].flatMap(width=>['light','dark'].map(theme=>({route,width,theme}))));
try{
 await Promise.all(Array.from({length:3},async()=>{
  const context=await browser.newContext();const page=await context.newPage();
  while(jobs.length){const job=jobs.shift()!;try{
   await page.setViewportSize({width:job.width,height:900});
   await page.addInitScript(theme=>{localStorage.setItem('achmage-theme',theme);},job.theme);
   const response=await page.goto(base+job.route,{waitUntil:'domcontentloaded'});if(!response?.ok())throw Error('HTTP '+response?.status());
   await page.evaluate(async()=>{document.querySelectorAll('img').forEach(i=>i.loading='eager');await document.fonts.ready;await Promise.all(Array.from(document.images,i=>i.decode().catch(()=>{})));});
   const row=await page.evaluate(()=>({actualWidth:innerWidth,actualHeight:innerHeight,actualTheme:document.documentElement.dataset.theme,overflow:document.documentElement.scrollWidth>innerWidth+1,brokenImages:Array.from(document.images).filter(i=>i.getAttribute('src')&&!i.naturalWidth).map(i=>i.src),font:getComputedStyle(document.body).fontFamily,overflowElements:Array.from(document.querySelectorAll('body *')).filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+2&&getComputedStyle(e).position!=='fixed';}).slice(0,8).map(e=>({tag:e.tagName,class:e.className,text:e.textContent?.slice(0,80)}))}));
   const name=job.route.replace(/[^a-z0-9]+/gi,'_')+'-'+job.width+'-'+job.theme+'.png';
   await page.screenshot({path:root+'/'+name});views.push({...job,...row,screenshot:root+'/'+name});
   if(row.overflow||row.brokenImages.length)errors.push({...job,...row});
  }catch(e){errors.push({...job,error:String(e)});}}
  await context.close();
 }));
}finally{await browser.close();await fs.writeFile(root+'/views.json',JSON.stringify(views,null,2));await fs.writeFile(root+'/errors.json',JSON.stringify(errors,null,2));}
console.log(JSON.stringify({views:views.length,errors:errors.length,details:errors.slice(0,8)}));
if(errors.length)process.exitCode=1;
