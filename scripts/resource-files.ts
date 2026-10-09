import path from 'node:path';
import fs from 'node:fs/promises';
import type { Resource } from '../src/lib/schema';
export function localAssetPath(root:string,url:string) {
  if(!url.startsWith('/'))return null;
  if(url.startsWith('//')||url.includes('\\\\'))throw Error('Invalid local asset URL');
  const pathname=decodeURIComponent(new URL(url,'https://local.invalid').pathname);
  const base=path.resolve(root),file=path.resolve(base,'.'+pathname);
  if(!file.startsWith(base+path.sep))throw Error('Asset outside public directory');
  return file;
}
export function resourceFiles(r:Resource) {return [...new Set([r.preview,...r.versions.flatMap(v=>[v.html,v.pdf,v.image,...Object.keys(v.files)])].filter(Boolean) as string[])];}
export async function rejectDraftResource(root:string,r:Resource){for(const url of resourceFiles(r)){const file=localAssetPath(root,url);if(file && await fs.stat(file).then(()=>true,()=>false))throw Error('Draft resource must not ship: '+url);}}
