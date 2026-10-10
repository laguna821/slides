import fs from 'node:fs/promises';
import path from 'node:path';
import { sha } from '../src/lib/reader';
import type { Work } from '../src/lib/schema';

export async function printInputDigest(work: Work, root=process.cwd()) {
  const files: Record<string,string>={};
  const add=async (f:string)=>{const bytes=await fs.readFile(path.join(root,f));files[f]=sha(/\.(ts|css|json|py|md)$/.test(f)?bytes.toString('utf8').replaceAll('\r\n','\n'):bytes);};
  for(const f of ['package-lock.json','src/lib/reader.ts','content/print.json','scripts/print-browser.ts','scripts/print-profile.css','scripts/generate-reader-pdfs.ts','scripts/print-contract.ts','scripts/verify-print-pdf.py','public/fonts/PretendardVariable.woff2',work.reader!.source,work.reader!.manifest])await add(f);
  for(const f of await fs.readdir(path.join(root,'scripts/hanmark'),{recursive:true})){
    const rel='scripts/hanmark/'+f.replaceAll('\\','/');if((await fs.stat(path.join(root,rel))).isFile())await add(rel);
  }
  const manifest=JSON.parse(await fs.readFile(path.join(root,work.reader!.manifest),'utf8')).works[work.id];
  for(const img of manifest.images)await add('public'+img.url);
  const pkg=JSON.parse(await fs.readFile(path.join(root,'package-lock.json'),'utf8'));
  const engines={playwright:pkg.packages['node_modules/playwright'].version,esbuild:pkg.packages['node_modules/esbuild'].version};
  const metadata={id:work.id,title:work.title,date:work.date,event:work.event,visibility:work.visibility,seo:work.seo};
  return {digest:sha(JSON.stringify({files,metadata,engines})),files,engines};
}

export async function verifyPrintArtifact(work:Work, root=process.cwd()) {
  const all=JSON.parse(await fs.readFile(path.join(root,'content/print-manifest.json'),'utf8'));
  const proof=all.works[work.id];
  if(!proof || proof.inputDigest!==(await printInputDigest(work,root)).digest)throw Error('읽기 PDF 재생성 필요: '+work.id);
  if(!/^\/reading\/pdf\/[a-z0-9-]+\/[a-f0-9]{16}\.pdf$/.test(proof.url))throw Error('Invalid print PDF path');
  const bytes=await fs.readFile(path.join(root,'public'+proof.url));
  if(sha(bytes)!==proof.sha256||!bytes.subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('Print PDF bytes changed');
  const config=JSON.parse(await fs.readFile(path.join(root,'content/print.json'),'utf8'));
  const source=JSON.parse(await fs.readFile(path.join(root,work.reader!.manifest),'utf8')).works[work.id];
  if(all.version!==config.version||proof.profile!==config.profile||!Number.isInteger(proof.pages)||proof.pages<1||proof.textMissing!==0||proof.geometryErrors!==0||proof.imageMissing!==0||proof.fontsEmbedded!==true||proof.a4!==true||proof.sourceOrder!==true||proof.images!==source.images.length)throw Error('Unverified print PDF');
  return {url:proof.url,pages:proof.pages,version:all.version};
}
