import fs from 'node:fs/promises';
import {dictionary,translateHtml} from './localization';
const strings=await dictionary(),keys=new Set<string>();
for(const name of await fs.readdir('dist',{recursive:true})){
 if(!name.endsWith('.html')||name.replaceAll('\\','/').startsWith('en/'))continue;
 const html=await fs.readFile('dist/'+name,'utf8');
 if(html.includes('site-header')||html.includes('class="embed-page"'))translateHtml(html,strings,false,keys);
}
const missing=[...keys].filter(k=>!strings[k]).sort();
await fs.mkdir('validation/atlas-diagnostics',{recursive:true});
await fs.writeFile('validation/atlas-diagnostics/missing-translations.json',JSON.stringify(missing,null,2));
console.log('MISSING_TRANSLATIONS '+JSON.stringify(missing));
// Diagnostic evidence only; the ordinary build-English failure remains the gate.
