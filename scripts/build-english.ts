import fs from 'node:fs/promises';
import path from 'node:path';
import {load} from 'cheerio';
import TurndownService from 'turndown';
import {gfm} from 'turndown-plugin-gfm';
import {dictionary,normalize,hasKorean,translateHtml,hash} from './localization';
import {makeSearchEntries} from '../src/lib/search';
import {englishPrintDigest} from './english-print-contract';
const strings=await dictionary();
const t=(s:string)=>{if(!hasKorean(s))return s;const v=strings[normalize(s)];if(!v)throw Error('Missing metadata translation: '+s);return v;};
const data=JSON.parse(await fs.readFile('src/generated/content.json','utf8'));
const candidates=(await fs.readdir('dist',{recursive:true})).map(f=>f.replaceAll('\\','/')).filter(f=>f.endsWith('.html')&&!f.startsWith('en/'));
const pages=new Map<string,string>();
for(const f of candidates){const s=await fs.readFile('dist/'+f,'utf8');if(s.includes('site-header')||s.includes('class="embed-page"'))pages.set('/'+f.replace(/index\.html$/,''),f);}
export const englishUrl=(url:string)=>{
  if(url.startsWith('https://achmage-sametone.achmage2.chatgpt.site'))return url.replace(/\.site\/(?:en\/)?/,'.site/en/');
  if(!url.startsWith('/')||url.startsWith('//')||url.startsWith('/en/'))return url;
  const p=url.split(/[?#]/)[0];
  return pages.has(p)||/\/read\.(md|txt)$/.test(p)?'/en'+url:url;
};
const rewriteLinks=($:ReturnType<typeof load>)=>{
  $('a[href],form[action],[data-url]').each((_,e)=>{for(const a of ['href','action','data-url']){const v=$(e).attr(a);if(v)$(e).attr(a,englishUrl(v));}});
};
const td=new TurndownService({headingStyle:'atx',codeBlockStyle:'fenced'});td.use(gfm);
td.addRule('preserveAnchors',{filter:['h1','h2','h3','h4','h5','h6'],replacement:(content,node)=>'\n\n<a id="'+(node as HTMLElement).id+'"></a>\n\n'+'#'.repeat(Number(node.nodeName.slice(1)))+' '+content+'\n\n'});
td.keep(['figure','figcaption']);
let figures:Record<string,string>={};try{figures=JSON.parse(await fs.readFile('content/i18n/figures.json','utf8'));}catch{}
const englishWorks=data.works.map((w:any)=>{
  const en={...w,href:englishUrl(w.href),title:t(w.title),summary:t(w.summary),posterAlt:t(w.posterAlt),topics:w.topics.map(t),artifacts:w.artifacts.map((a:any)=>({...a,label:t(a.label),url:englishUrl(a.url)})),takeaways:w.takeaways.map(t)};
  for(const f of ['audience','event','featuredReason','productionNote'])if(w[f])en[f]=w[f].split(/\n\s*\n/).map(t).join('\n\n');
  en.relations=w.relations?.map((r:any)=>({...r,title:t(r.title),href:englishUrl(r.href),topics:r.topics?.map(t)}));
  en.readingHtml=translateHtml(w.readingHtml,strings,true);
  const $=load(en.readingHtml,null,false);rewriteLinks($);
  $('img[src]').each((_,e)=>{const v=$(e).attr('src')!;if(figures[v])$(e).attr('src',figures[v]);});
  en.readingHtml=$.html();en.body=$.text();
  if(w.reader){
    const portable=load(en.readingHtml,null,false);
    portable('a[href^="/"],img[src^="/"]').each((_,e)=>{if(portable(e).closest('code,pre').length)return;for(const attr of ['href','src']){const value=portable(e).attr(attr);if(value?.startsWith('/')&&!value.startsWith('//'))portable(e).attr(attr,'https://achmage-slides.vercel.app'+value);}});
    en.reader={...w.reader,html:en.readingHtml,text:$.text(),markdown:td.turndown(portable.html()),headings:w.reader.headings.map((h:any)=>({...h,title:t(h.title)})),images:w.reader.images.map((s:string)=>figures[s]||s),links:$('a[href]').map((_,e)=>$(e).attr('href')).get(),sourceHash:hash(w.reader.sourceHash+en.readingHtml+en.title+en.event)};
    en.segments=en.reader.headings.map((h:any)=>({id:h.id,title:h.title,text:h.title+' '+$('#'+h.id).nextUntil('h1,h2,h3,h4,h5,h6').text(),href:en.href+'read/#'+h.id}));
  }else en.segments=[];
  return en;
});
await fs.mkdir('src/generated',{recursive:true});
await fs.writeFile('src/generated/english.json',JSON.stringify({works:englishWorks},null,2));
if(process.argv.includes('--prepare')){console.log('English source prepared: '+englishWorks.length+' works');process.exit(0);}
const print=JSON.parse(await fs.readFile('content/i18n/print-manifest.json','utf8'));
for(const w of englishWorks.filter((w:any)=>w.reader)){
  const p=print.works[w.id];if(!p||p.sourceHash!==w.reader.sourceHash||p.inputDigest!==await englishPrintDigest(w)||p.textMissing!==0||!p.fontsEmbedded||!p.a4||p.geometryErrors!==0)throw Error('English PDF needs regeneration: '+w.id);
  if(hash(await fs.readFile('public'+p.url))!==p.sha256)throw Error('English PDF bytes changed');
  w.readingPdf={url:p.url,pages:p.pages,version:'1.0.0'};
}
for(const [route,file]of pages){
  const ko=await fs.readFile('dist/'+file,'utf8');
  const $=load(translateHtml(ko,strings));rewriteLinks($);
  $('html').attr('lang','en');
  const canonical='https://achmage-slides.vercel.app/en'+route;
  $('link[rel="canonical"]').attr('href',canonical);$('meta[property="og:url"]').attr('content',canonical);
  $('meta[property="og:locale"]').remove();$('head').append('<meta property="og:locale" content="en_US">');
  $('[data-language-switch]').attr({href:route,lang:'ko',hreflang:'ko','aria-label':'한국어로 보기'}).text('KO');
  $('option[value]').each((_,e)=>{const v=$(e).attr('value')!;if(hasKorean(v))$(e).attr('value',t(v));});
  const w=englishWorks.find((w:any)=>route===w.href.replace(/^\/en/,'')+'read/');
  if(w){
    $('#reader-body').html(w.reader.html);
    $('#reader-exports').text(JSON.stringify({text:w.reader.text,markdown:w.reader.markdown}).replace(/</g,'\\u003c'));
    $('[data-reading-pdf],[data-reader-print],[data-download-pdf]').attr('href',w.readingPdf.url);
    $('.reader-actions small').text('A4 · Two columns · '+w.readingPdf.pages+' pages');
    for(const ext of ['md','txt']){const target='dist'+w.href+'read.'+ext;await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,ext==='md'?w.reader.markdown:w.reader.text);}
  }
  $('link[hreflang]').remove();
  $('head').append(`<link rel="alternate" hreflang="ko" href="https://achmage-slides.vercel.app${route}"><link rel="alternate" hreflang="en" href="${canonical}"><link rel="alternate" hreflang="x-default" href="https://achmage-slides.vercel.app${route}">`);
  const dest='dist/en/'+file;await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,$.html());
  const k=load(ko);k('link[hreflang]').remove();k('[data-language-switch]').attr('href','/en'+route);k('head').append(`<link rel="alternate" hreflang="ko" href="https://achmage-slides.vercel.app${route}"><link rel="alternate" hreflang="en" href="${canonical}"><link rel="alternate" hreflang="x-default" href="https://achmage-slides.vercel.app${route}">`);await fs.writeFile('dist/'+file,k.html());
}
await fs.writeFile('dist/en/search-index.json',JSON.stringify({version:1,entries:makeSearchEntries(englishWorks)}));
await fs.writeFile('src/generated/english.json',JSON.stringify({works:englishWorks},null,2));
await fs.writeFile('dist/en/catalogue.json',JSON.stringify({version:2,works:englishWorks.filter((w:any)=>w.visibility==='listed').map(({reader,body,segments,readingHtml,...w}:any)=>w)}));
const sitemap=await fs.readFile('dist/sitemap.xml','utf8');
await fs.writeFile('dist/sitemap.xml',sitemap.replace('</urlset>',[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>'<url><loc>'+m[1].replace('.app/','.app/en/')+'</loc></url>').join('')+'</urlset>'));
console.log('English static pages: '+pages.size+'; all four reader exports and search share translated text.');
