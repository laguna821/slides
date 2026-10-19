import fs from 'node:fs/promises';
import {load} from 'cheerio';
const input=await fs.readFile('../release/lecture-fulltext-web.html','utf8'),$=load(input);
const rows=$('body').children().map((_,e)=>({tag:e.tagName,id:$(e).attr('id'),class:$(e).attr('class'),bytes:Buffer.byteLength($.html(e)),text:$(e).text().length})).get().sort((a,b)=>b.bytes-a.bytes);
const classes:Record<string,number>={};$('*').each((_,e)=>{for(const c of ($(e).attr('class')||'').split(/\s+/).filter(Boolean))classes[c]=(classes[c]||0)+1});
console.log(JSON.stringify({topClasses:Object.entries(classes).sort((a,b)=>b[1]-a[1]).slice(0,18),slideSample:$('.slide').first().html()?.slice(-5500)},null,2));
console.log(JSON.stringify({elements:$('*').length,slides:$('.slide').length,ticks:$('.tp-ticks').length,tickElements:$('.tp-ticks i').length,ticksBytes:$('.tp-ticks').toArray().reduce((n,e)=>n+Buffer.byteLength($.html(e)),0),tickSamples:$('.tp-ticks').slice(0,2).map((_,e)=>$.html(e).slice(0,240)).get(),rows,scripts:$('script').map((_,e)=>({id:$(e).attr('id'),type:$(e).attr('type'),bytes:Buffer.byteLength($(e).html()||'')})).get()},null,2));
