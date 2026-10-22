import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sha} from './web-assets';
export type CollectionFile={path:string;originalSha256:string;sha256:string;bytes:number;mime:string;delivery:'local'|'proxy';url?:string;verifiedAt?:string};
export type Collection={version:1;basePath:string;diagramGroups:number;cases:number;files:CollectionFile[]};
export async function readCollection(root=process.cwd()):Promise<Collection>{return JSON.parse(await fs.readFile(path.join(root,'content/pele-collection.json'),'utf8'));}
export function validateCollection(c:Collection,requireRemote=true){
 assert.equal(c.basePath,'/pele/');assert.equal(c.diagramGroups,39);assert.equal(c.cases,104);
 assert.equal(new Set(c.files.map(f=>f.path)).size,c.files.length,'Duplicate collection file');
 for(const f of c.files){
  assert(f.path.startsWith('/pele/')&&!f.path.includes('..')&&!f.path.includes('\\'),'Unsafe collection path');
  assert(/^[a-f0-9]{64}$/.test(f.sha256)&&/^[a-f0-9]{64}$/.test(f.originalSha256));
  assert(f.bytes>0&&Number.isInteger(f.bytes));
  assert(['local','proxy'].includes(f.delivery));
  if(f.delivery==='local')assert(f.path.endsWith('.html'),'Only collection HTML is hosted locally');
  if(f.delivery==='proxy'&&requireRemote){const u=new URL(f.url!);assert.equal(u.protocol,'https:');assert(u.hostname.endsWith('.r2.dev'),'Unexpected collection asset host');assert(f.verifiedAt,'Unverified collection asset');}
 }
}
export async function verifyCollectionSources(c:Collection,root='public',requireRemote=true){
 validateCollection(c,requireRemote);
 for(const f of c.files){const b=await fs.readFile(path.join(root,f.path));assert.equal(b.length,f.bytes,f.path+' bytes');assert.equal(sha(b),f.sha256,f.path+' hash');}
 const pages=JSON.parse(await fs.readFile(path.join(root,'pele/data/catalog.json'),'utf8'));
 const ids=pages.flatMap((p:any)=>p.cases.map((c:any)=>c.id));assert.equal(pages.length,39);assert.equal(ids.length,104);assert.equal(new Set(ids).size,104,'Case belongs to more than one diagram group');
 for(const p of pages)for(const item of p.cases){assert(c.files.some(f=>f.path===item.url),'Missing case '+item.id);const data=JSON.parse(await fs.readFile(path.join(root,item.url),'utf8'));assert.equal(data.id,item.id);assert(data.svg.includes('<svg')&&data.source!==undefined,'Missing actual case input/output');}
}
export function collectionRewrites(c:Collection){return c.files.filter(f=>f.delivery==='proxy').map(f=>({source:f.path,destination:f.url!})).sort((a,b)=>a.source.localeCompare(b.source));}
