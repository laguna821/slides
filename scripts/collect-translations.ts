import fs from 'node:fs/promises';
import {translateHtml,hasKorean,normalize} from './localization';
const units=new Set<string>();
for(const rel of (await fs.readdir('dist',{recursive:true})).filter(x=>x.endsWith('.html')&&!x.startsWith('en'))){
  const html=await fs.readFile('dist/'+rel,'utf8');
  if(!html.includes('site-header')&&!html.includes('data-film-player'))continue;
  translateHtml(html,{},false,units);
}
const walk=(v:any)=>{if(typeof v==='string'&&hasKorean(v)&&!v.includes('<')&&!v.includes('\n'))units.add(normalize(v));else if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')Object.values(v).forEach(walk);};
for(const name of ['works','resources','media','usages'])walk(JSON.parse(await fs.readFile('content/'+name+'.json','utf8')));
await fs.mkdir('.local/i18n',{recursive:true});
await fs.writeFile('.local/i18n/units.json',JSON.stringify([...units],null,2));
console.log(units.size+' exact text units');
