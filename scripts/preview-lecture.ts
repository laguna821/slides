// Uses the site's existing, reviewed web projection; never alters the source deck.
import fs from 'node:fs/promises';
import {readManifest,transformText} from './web-assets';
const input=await fs.readFile(process.argv[2]||'../release/lecture-locked.html','utf8');
const manifest=await readManifest();
await fs.writeFile(process.argv[3]||'../release/lecture-web.html',transformText(input,'lecture.html',manifest));
for(const a of Object.values(manifest.assets).filter(a=>a.kind==='font')){
  const dest='../release'+a.url;await fs.mkdir(dest.slice(0,dest.lastIndexOf('/')),{recursive:true});
  await fs.copyFile('public'+a.url,dest);
}
