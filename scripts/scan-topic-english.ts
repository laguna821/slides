import fs from 'node:fs/promises';
import {translateHtml} from './localization';
const dict=JSON.parse(await fs.readFile('content/i18n/en.json','utf8')),units=new Set<string>();
for(const p of await fs.readdir('dist',{recursive:true})){if(!p.endsWith('.html')||p.replaceAll('\\','/').startsWith('en/'))continue;const s=await fs.readFile('dist/'+p,'utf8');if(!s.includes('site-header')&&!s.includes('class="embed-page"'))continue;translateHtml(s,dict,false,units);}
console.log(JSON.stringify([...units].filter(t=>!dict[t]),null,2));
