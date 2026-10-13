import fs from 'node:fs/promises';
import {hash} from './localization';
export async function englishPrintDigest(work:any){
 const paths=['package-lock.json','scripts/generate-english-pdfs.ts','scripts/english-print-contract.ts','scripts/print-browser.ts','scripts/print-profile.css','scripts/verify-print-pdf.py','public/fonts/PretendardVariable.woff2',...work.reader.images.map((p:string)=>'public'+p)];
 for(const p of await fs.readdir('scripts/hanmark',{recursive:true}))if((await fs.stat('scripts/hanmark/'+p)).isFile())paths.push('scripts/hanmark/'+p.replaceAll('\\','/'));
 const files:Record<string,string>={};
 for(const p of paths.sort()){const b=await fs.readFile(p);files[p]=hash(/\.(ts|css|json|py|md)$/.test(p)?b.toString('utf8').replaceAll('\r\n','\n'):b);}
 return hash(JSON.stringify({sourceHash:work.reader.sourceHash,files,title:work.title,date:work.date,event:work.event}));
}
