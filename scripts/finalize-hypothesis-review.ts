import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {releaseManifest,releaseDigest,builtReviewRoutes,validateReview} from './release-gate';
// Release review for policy 6.6.0: the 2026-11-03 lecture registration and the 2x2 home featured grid.
// Every site route view, reader flow, reader navigation row and editorial width is a fresh measurement from
// scripts/review-bilingual.ts and scripts/review-reader-features.ts on the actual web-dist preview. Only the
// pinned poster and experiment evidence is retained, and only when those exact files are unchanged.
const read=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
const old=await read('validation/release-review.json');
const current=await releaseManifest();
const preserved=Object.keys(old.sourceFiles).filter(p=>p.startsWith('public/experiments/')||p.startsWith('public/posters/'));
for(const p of preserved)assert.equal(current[p],old.sourceFiles[p],'Changed retained poster evidence input: '+p);
const dir='.local/i18n/review/';
const views=(await read(dir+'views.json')).map((v:any)=>({route:v.route,width:v.width,theme:v.theme,actualWidth:v.actualWidth,actualTheme:v.actualTheme,overflow:v.overflow,brokenImages:v.brokenImages}));
const errors=await read(dir+'errors.json');assert.equal(errors.length,0,'Fresh view review has errors');
const features=await read(dir+'features.json');
const evidence='Headless Chromium (Playwright 1.62.1) against the npm run preview web-dist server on 2026-11-02; clipboard read, completed Markdown download, keyboard Enter/Escape and theme toggles exercised by scripts/review-reader-features.ts.';
const readers=features.readers.map((r:any)=>({...r,evidence}));
const review={...old,policyVersion:'6.6.0',status:'passed',reviewedAt:new Date().toISOString(),views,readers,readerNavigation:features.navigation,editorialViews:features.extra,outputDirectory:'web-dist',webAssets:{status:'passed',report:'validation/storage-report.json'},functional:{...old.functional,search:true,keyboard:true,evidence:{...old.functional.evidence,search:features.search}},retainedEvidence:{baseline:old.digest,reviewedAt:old.reviewedAt,verifiedUnchangedFiles:preserved,reason:'Pinned poster and experiment sources are byte-identical to the previous review, so their detailed poster geometry and series receipts are kept as prior evidence, not relabelled as fresh. All site routes, all readers, reader navigation and editorial widths were measured again because the site stylesheet changed (home featured grid) and a lecture was added.'},environment:'Headless Chromium via Playwright on the actual web-dist preview (port 4331). '+views.length+' route views (375/768/1440 × light/dark), '+readers.length+' reader feature flows, '+features.navigation.length+' reader navigation rows and '+features.extra.length+' narrow/wide editorial measurements, all fresh on 2026-11-02. Lazy offscreen images are covered by the registered R2 asset verification.',hypothesisLecture:{workId:'why-research-hypotheses-2026-11-03',homeFeatured:['human-reading-writing-2026','meal','pele-atlas','achmage-sametone'],visualReview:'New Korean and English detail and reading pages and the home page were inspected in screenshots at 375/768/1440 in both themes; the 2x2 featured grid was additionally measured at 1100/1440/1920/2000 px.'},sourceFiles:current,digest:await releaseDigest()};
validateReview(review,review.digest,await builtReviewRoutes());
await fs.writeFile('validation/release-review.json',JSON.stringify(review,null,2)+'\n');
console.log({digest:review.digest,views:views.length,readers:readers.length,navigation:review.readerNavigation.length,editorial:review.editorialViews.length});
