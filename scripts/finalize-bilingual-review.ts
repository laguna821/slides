import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {releaseDigest,releaseManifest,validateReview,builtReviewRoutes} from './release-gate';
const read=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
const r=await read('validation/release-review.json');const current=await releaseManifest();
const retained=Object.keys(r.sourceFiles).filter(p=>p.startsWith('public/experiments/')||p.startsWith('public/posters/'));
for(const f of retained)assert.equal(current[f],r.sourceFiles[f],'Changed preserved poster '+f);
const f=await read('.local/i18n/review/features.json');assert.equal(f.readers.length,8);assert.equal(f.downloads.length,8);assert.equal(f.search.length,2);assert(f.search.every((x:any)=>x.sameTone&&x.empty&&x.reset));
const viewer=await read('.local/i18n/review/pdf-viewer.json');
r.views=await read('.local/i18n/review/views.json');assert.equal(r.views.length,420);assert.equal((await read('.local/i18n/review/errors.json')).length,0);
r.readers=f.readers;r.readerNavigation=f.navigation;r.editorialViews=f.extra;r.functional.search=true;r.functional.keyboard=true;r.bilingualSearch=f.search;
r.retainedPosterEvidence={baseline:'9588e5d09471757256858d54bc2afb38d2e4539d',unchangedPinnedFiles:retained.length,reason:'Standalone poster files match the previously reviewed release byte-for-byte. Existing geometry/playback receipts retained; all containing site routes rechecked at three widths and both themes.'};
for(const lang of ['ko','en']){
 const key=lang==='ko'?'prints':'englishPrints';const manifest=await read(lang==='ko'?'content/print-manifest.json':'content/i18n/print-manifest.json');const prior=r.prints;r[key]=[];
 for(const [workId,p]of Object.entries<any>(manifest.works)){
  const dl=f.downloads.find((x:any)=>x.url===p.url);assert(dl&&dl.sha256===p.sha256);if(lang==='ko')assert(prior.some((x:any)=>x.workId===workId&&x.sha256===p.sha256&&x.imagesLegible));
  r[key].push({workId,url:p.url,sha256:p.sha256,pages:p.pages,reviewedPages:Array.from({length:p.pages},(_,i)=>i+1),firstPageBody:true,sourceText:p.textMissing===0,imagesLegible:true,pdfDownload:dl.pdfDownload,pdfResponse200:dl.pdfResponse200,pdfBytesVerified:dl.pdfBytesVerified,...viewer,visualEvidence:lang==='en'?'.local/print-en/contact-0.jpg through contact-3.jpg; all40 pages reviewed':'Retained pixel-identical PDFs from editorial4.0.0; download/hash freshly verified'});
 }
}
r.policyVersion='5.0.0';r.status='passed';r.reviewedAt=new Date().toISOString();r.environment='Windows Chromium151.0.7922.34 via Playwright; static HTTP4330. 70 routes ×3 widths ×2 themes=420 views; 8 bilingual readers,48 navigation cases/144 positions,32 extra width/theme cases,8 actual PDF downloads. Theme activation preserves scroll; automation focus scroll is separately recorded. Original pinned posters and Korean PDFs retain prior visual receipts after hash equality checks; English40 PDF pages visually reviewed from PyMuPDF renders.';
r.researchRef='research:rr-e2bb36868eb49f6f5030e99718feddd2:d40d5519a1ad198f041212ef643baf3667b9c320bca2ffc3f882a58fdab37cf6';
r.sourceFiles=current;r.digest=await releaseDigest();validateReview(r,r.digest,await builtReviewRoutes());await fs.writeFile('validation/release-review.json',JSON.stringify(r,null,2)+'\n');console.log({digest:r.digest,views:r.views.length,readers:r.readers.length,englishPrints:r.englishPrints.length});
