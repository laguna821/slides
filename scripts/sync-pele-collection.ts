import fs from 'node:fs/promises';
import path from 'node:path';
import {readCollection,verifyCollectionSources} from './pele-collection';
import {sha} from './web-assets';
const collection=await readCollection();await verifyCollectionSources(collection,'public',false);
const local=JSON.parse(await fs.readFile('.local/asset-config.json','utf8'));
const config=JSON.parse(await fs.readFile(process.env.CMDS_EAGLE_CONFIG||local.cmdsEagleConfig,'utf8')).cloudProviders?.r2;
if(!config?.enabled||!config.workerUrl||!config.apiKey||!config.publicUrl)throw Error('Configured asset storage is unavailable');
const origin=new URL(config.publicUrl).origin;
let added=0,verified=0;
for(const file of collection.files.filter(f=>f.delivery==='proxy')){
 const bytes=await fs.readFile('public'+file.path);
 if(!file.url){
  const name='slides-pele-'+file.sha256+path.extname(file.path);const form=new FormData();
  form.append('file',new Blob([new Uint8Array(bytes)],{type:file.mime}),name);form.append('filename',name);form.append('content_type',file.mime);
  const r=await fetch(config.workerUrl.replace(/\/$/,'')+'/upload',{method:'POST',headers:{Authorization:'Bearer '+config.apiKey},body:form,signal:AbortSignal.timeout(120000)});
  if(!r.ok)throw Error('Collection upload HTTP '+r.status+'; no secret response logged');
  const data=await r.json() as {key:string};if(!data.key||data.key.includes('..'))throw Error('Invalid object key');
  file.url=config.publicUrl.replace(/\/$/,'')+'/'+data.key;added++;
  // Persist each observed upload, so an interrupted run verifies it instead of replaying it.
  await fs.writeFile('content/pele-collection.json',JSON.stringify(collection,null,2)+'\n');
 }
 if(new URL(file.url).origin!==origin)throw Error('Unexpected public asset origin');
 const r=await fetch(file.url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('Public collection HTTP '+r.status);
 const received=Buffer.from(await r.arrayBuffer());if(sha(received)!==file.sha256||received.length!==file.bytes)throw Error('Public collection hash mismatch: '+file.path);
 if((r.headers.get('content-type')||'').split(';')[0]!==file.mime.split(';')[0])throw Error('Public collection MIME mismatch: '+file.path);
 file.verifiedAt=new Date().toISOString();verified++;
 await fs.writeFile('content/pele-collection.json',JSON.stringify(collection,null,2)+'\n');
 if(verified%25===0)console.log(JSON.stringify({verified,added}));
}
await verifyCollectionSources(collection);await fs.writeFile('validation/pele-collection-assets.json',JSON.stringify({verifiedAt:new Date().toISOString(),verified,added,files:collection.files.length,manifestHash:sha(await fs.readFile('content/pele-collection.json'))},null,2)+'\n');
console.log(JSON.stringify({passed:true,verified,added}));
