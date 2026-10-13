import fs from 'node:fs/promises';
import { load } from 'cheerio';
import { createHash } from 'node:crypto';

export const normalize = (s:string) => s.replace(/\s+/g,' ').trim();
export const hasKorean = (s:string) => /[가-힣]/.test(s);
export const hash = (s:string|Buffer) => createHash('sha256').update(s).digest('hex');
export type Translations = Record<string,string>;
export async function dictionary():Promise<Translations> {
  return JSON.parse(await fs.readFile('content/i18n/en.json','utf8'));
}
/** Exact text units, never substring replacement; markup and original anchors survive. */
export function translateHtml(html:string, strings:Translations, fragment=false, collect?:Set<string>) {
  const $=load(html,null,!fragment);
  const translate=(s:string) => {
    const key=normalize(s);
    if(!hasKorean(key))return s;
    if(collect){collect.add(key);return s;}
    if(!strings[key])throw Error('Missing English translation: '+key);
    return s.replace(s.trim(),' '+strings[key]+' ');
  };
  const visit=(node:any)=>{
    if(['script','style','code','pre'].includes(node.name))return;
    if(node.type==='text')node.data=translate(node.data);
    for(const child of node.children||[])visit(child);
  };
  visit($.root()[0]);
  $('*').each((_,node)=>{
    for(const attr of ['alt','title','aria-label','placeholder','content']){
      const value=$(node).attr(attr);
      if(value && !(attr==='content' && !['description','og:title','og:description'].includes($(node).attr('name')||$(node).attr('property')||'')))$(node).attr(attr,translate(value));
    }
  });
  return $.html();
}
