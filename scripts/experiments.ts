import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
import {policy} from '../src/lib/policy';
export async function verifyExperiments(root=process.cwd(),stage='public',manifest?:any){
 const data=manifest??JSON.parse(await fs.readFile(path.join(root,'content/experiments.json'),'utf8'));
 if(data.version!==1||!Array.isArray(data.items))throw Error('Experiment registry invalid');
 const ids=new Set();
 for(const item of data.items){
  if(!/^[a-z0-9-]+$/.test(item.id)||ids.has(item.id))throw Error('Experiment id invalid');
  ids.add(item.id);
  if(item.path!=='/experiments/'+item.id+'/'||item.visibility!=='unlisted'||item.seo!=='noindex')throw Error('Experiment exposure policy invalid');
  if(item.contract!==policy.experimentalPosterContract||!policy.acceptedPosterViewers.includes(item.viewerVersion)||!/^[a-f0-9]{64}$/.test(item.packageSha256))throw Error('Unpinned experiment renderer');
  if(!item.researchRefs?.length||item.printStatus!=='needs-print-profile')throw Error('Experiment evidence/print status missing');
  const base=path.join(root,stage,item.path);
  for(const required of ['index.html','poster.pdf','poster-preview.png','poster-spec.json','print-audit.json'])if(!item.files?.[required])throw Error('Missing experiment file: '+required);
  const actual=(await fs.readdir(base)).sort();
  if(JSON.stringify(actual)!==JSON.stringify(Object.keys(item.files).sort()))throw Error('Unregistered experiment asset');
  for(const [file,hash] of Object.entries(item.files)){
   if(!/^[a-z0-9.-]+$/.test(file)||file.includes('..'))throw Error('Unsafe experiment filename');
   const bytes=await fs.readFile(path.join(base,file));
   if(createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('Experiment asset changed: '+file);
  }
  const html=await fs.readFile(path.join(base,'index.html'),'utf8'),$=load(html);
  if($('meta[name=robots]').attr('content')!=='noindex,nofollow')throw Error('Experiment must be noindex');
  if(!$('#pdf').attr('href')?.startsWith('poster.pdf'))throw Error('Missing actual PDF link');
  const spec=JSON.parse(await fs.readFile(path.join(base,'poster-spec.json'),'utf8'));
  const audit=JSON.parse(await fs.readFile(path.join(base,'print-audit.json'),'utf8'));
  const expectedPages=spec.print.pages?.length??1;
  if(audit.pages!==expectedPages||audit.trimMm.join(',')!=='420,594'||audit.mediaMm.join(',')!=='424,598'||audit.missingFields.length||!audit.regions.every((x:any)=>x.withinSafeArea))throw Error('A2 proof failed');
  if(!audit.logoStrip?.length||audit.logoStrip.some((x:any,i:number)=>x.heightMm!==13||(i>0&&Math.abs(x.xMm-audit.logoStrip[i-1].xMm-audit.logoStrip[i-1].widthMm-12)>.01)))throw Error('Co-organizer logo strip spacing failed');
  if(spec.logos.some((l:any)=>l.file||l.fileDark||!l.source||!l.sha256)||/C:[/\\\\]|file:\/\//i.test(JSON.stringify(spec)))throw Error('Private path in public spec');
  if(['1.1.0-rc.2','1.2.0-rc.1','1.2.0-rc.2','1.2.0-rc.3'].includes(item.viewerVersion) && spec.logos.some((l:any)=>!l.darkProvenance||!/^[a-f0-9]{64}$/.test(l.darkSha256)||!Object.values(item.files).includes(l.darkSha256)))throw Error('Dual logo asset missing');
  if(item.contract==='series-v2'){
   if(spec.schemaVersion!==2||spec.composition?.mode!=='complete-posters'||spec.composition.sharedRefs.length<2)throw Error('Complete-poster contract missing');
   const shared=spec.composition.sharedRefs;
   if(spec.print.pages){
    if(spec.print.rows||audit.pageAudits?.length!==expectedPages)throw Error('Ambiguous or incomplete paper composition');
    const allRefs=new Set<string>();
    for(const [n,p] of spec.print.pages.entries()){
     const refs=p.rows.flat();
     if(!p.focus||new Set(refs).size!==refs.length||!shared.every((id:string)=>refs.includes(id)))throw Error('Print poster essentials missing');
     refs.forEach((id:string)=>allRefs.add(id));
     const a=audit.pageAudits[n];
     if(a.id!==p.id||a.page!==n+1||a.missingFields.length||a.trimMm.join(',')!=='420,594'||a.mediaMm.join(',')!=='424,598'||!a.regions.every((x:any)=>x.withinSafeArea)||JSON.stringify(a.regions.map((x:any)=>x.id).sort())!==JSON.stringify([...refs].sort()))throw Error('Per-page A2 proof failed');
     if(n>0&&!item.files['poster-preview-'+String(n+1).padStart(2,'0')+'.png'])throw Error('Missing paper page preview');
    }
    if(allRefs.size!==spec.content.length||!spec.content.every((b:any)=>allRefs.has(b.id)))throw Error('Print content coverage failed');
   }

   if(spec.scenes.length!==$('#stage>.scene').length)throw Error('Authored poster count changed');
   if(/function splitScene/.test(html))throw Error('Automatic fragment pagination forbidden');
   const byid=new Map(spec.content.map((x:any)=>[x.id,x]));
   const first:any=byid.get(shared[0]);
   if(first?.title!==spec.title||!first?.body)throw Error('Poster identity incomplete');
   const weights=[];
   for(const scene of spec.scenes){
    if(!scene.focus||!shared.every((id:string)=>scene.refs.includes(id)))throw Error('Poster missing repeated essentials');
    const section=$('#'+scene.id);
    for(const id of scene.refs)if(section.find('[data-content-id="'+id+'"]').length!==1)throw Error('Poster content omitted');
    if(!section.find('.poster-facts').text().includes(spec.frame.date)||!section.find('.poster-facts').text().includes(spec.frame.place))throw Error('Poster facts missing');
    weights.push(scene.refs.filter((x:string)=>!shared.includes(x)).reduce((n:number,id:string)=>{
     const b:any=byid.get(id);return n+['kicker','title','subtitle','body','note'].map(k=>b[k]||'').join('').length+(b.items||[]).flat().join('').length;
    },0));
   }
   if(spec.scenes.length>1 && (!spec.composition.splitReason||Math.min(...weights)<160||Math.min(...weights)/Math.max(...weights)<.4))throw Error('Sparse or unbalanced poster pages');
  }
  if(stage==='dist'){
   for(const f of ['search-index.json','catalogue.json','sitemap.xml']){
    const txt=await fs.readFile(path.join(root,stage,f),'utf8');
    if(txt.includes(item.path)||txt.includes(item.id))throw Error('Experiment leaked to discovery: '+f);
   }
  }
 }
 return data.items.length;
}
