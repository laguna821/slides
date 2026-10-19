import fs from 'node:fs/promises';
import path from 'node:path';
import {load} from 'cheerio';
import {regularFiles,sha} from './web-assets';

/** Share Shiki's repeated token colors across source examples, with no client
 * highlighter, code-text change, theme change or expansion of the public input.
 */
export async function shareCodeTokens(root:string){
 const documents=new Map<string,ReturnType<typeof load>>();
 const styles=new Map<string,string>();
 let replaced=0,before=0;
 for(const file of (await regularFiles(root)).filter(f=>f.endsWith('.html')).sort()){
   const html=await fs.readFile(path.join(root,file),'utf8');
   if(!html.includes('data-source-code'))continue;
   const $=load(html);let changed=false;
   $('.source-code .astro-code span[style]').each((_,element)=>{
     const style=$(element).attr('style')!;
     // Only the two static hex color declarations emitted by this component.
     // Never hoist layout, URLs, arbitrary properties, or user-authored styles.
     if(!/^(?:color:#[0-9a-f]{3,8};--shiki-dark:#[0-9a-f]{3,8};?)$/i.test(style))return;
     let name=styles.get(style);
     if(!name){name='ct-'+styles.size.toString(36);styles.set(style,name);}
     $(element).removeAttr('style').addClass(name);replaced++;changed=true;
   });
   if(changed){documents.set(file,$);before+=Buffer.byteLength(html);}
 }
 if(!replaced)return{files:0,tokens:0,styles:0,savedBytes:0};
 const css=[...styles].map(([style,name])=>'.source-code .astro-code .'+name+'{'+style+'}').join('\n');
 const url='/_code-tokens/'+sha(css).slice(0,20)+'.css';
 await fs.mkdir(path.join(root,'_code-tokens'),{recursive:true});await fs.writeFile(path.join(root,url),css);
 let after=Buffer.byteLength(css);
 for(const [file,$]of documents){$('head').append($('<link rel="stylesheet">').attr('href',url));const html=$.html();await fs.writeFile(path.join(root,file),html);after+=Buffer.byteLength(html);}
 return{files:documents.size,tokens:replaced,styles:styles.size,savedBytes:before-after};
}
