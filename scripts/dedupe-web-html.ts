import fs from 'node:fs/promises';
import path from 'node:path';
import {regularFiles,sha} from './web-assets';
/** Only byte-identical generated HTML is aliased; originals stay in public/. */
export async function dedupeWebHtml(root:string){
 const groups=new Map<string,string[]>();
 for(const file of (await regularFiles(root)).filter(f=>f.endsWith('.html'))){const hash=sha(await fs.readFile(path.join(root,file)));groups.set(hash,[...(groups.get(hash)||[]),file]);}
 const aliases:Record<string,string>={};let savedBytes=0;
 for(const group of groups.values()){
  if(group.length<2)continue;
  group.sort((a,b)=>Number(!a.endsWith('/index.html'))-Number(!b.endsWith('/index.html'))||a.localeCompare(b));
  const canonical=group[0];
  for(const file of group.slice(1)){savedBytes+=(await fs.stat(path.join(root,file))).size;aliases['/'+file]='/'+canonical;await fs.unlink(path.join(root,file));}
 }
 return {aliases,savedBytes};
}
