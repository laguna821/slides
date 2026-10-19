export function validateSourceOnly(files:string[],notes:any,works:any[],resources:any[]){
 const sources=new Set((notes.decks||[]).map((d:any)=>String(d.source).replace(/^\//,'')));
 const outputs=new Set([
  ...works.flatMap((w:any)=>(w.artifacts||[]).map((a:any)=>String(a.url).replace(/^\//,''))),
  ...resources.flatMap((r:any)=>(r.versions||[]).map((v:any)=>String(v.html).replace(/^\//,'')))
 ]);
 for(const file of files){
  if(!sources.has(file)||outputs.has(file)||file.startsWith('/')||file.split(/[\\/]/).includes('..'))throw Error('Only registered, non-artifact note-source HTML may be archival-only: '+file);
 }
 return new Set(files);
}
