import fs from 'node:fs/promises';
const m=JSON.parse(await fs.readFile('content/web-assets.json','utf8'));
const a=Object.values<any>(m.assets).find(a=>a.kind==='image'&&a.url.startsWith('https:'));
const rows=[];
for(const origin of ['https://achmage-slides.vercel.app','http://127.0.0.1:4331']){
 const r=await fetch(a.url,{headers:{Origin:origin},signal:AbortSignal.timeout(30000)});
 rows.push({url:a.url,origin,status:r.status,allowOrigin:r.headers.get('access-control-allow-origin'),type:r.headers.get('content-type')});
 await r.arrayBuffer();
}
await fs.writeFile('../validation/r2-cors-probe.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
