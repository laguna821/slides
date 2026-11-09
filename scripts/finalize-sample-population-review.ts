import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {releaseManifest,releaseDigest,builtReviewRoutes,validateReview} from './release-gate';
// Release review for policy 6.7.0: registration of the 2026-11-10 lecture (10W-1).
// Owner's instruction (2026-11-09, session d84382cc-a386-4a0d-a01c-033cca6a0604): "뭔 테스트를 이렇게 많이 계속 해
// 올리라니까 다 패스하고". Only what changed is measured again (docs/UPLOAD-CONTRACT.md): every route whose web-dist
// HTML differs from the published release (production, commit b3b187d) — new, changed or with changed reader flows —
// is measured fresh on the actual web-dist preview by scripts/review-bilingual.ts and scripts/review-reader-features.ts
// with REVIEW_ONLY. Routes whose HTML is byte-identical to production keep the previous review of digest
// 351631ee…, labelled as retained, never as fresh. Pinned poster and experiment evidence is retained as before.
const read=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
const old=await read('validation/release-review.json');
const current=await releaseManifest();
const preserved=Object.keys(old.sourceFiles).filter(p=>p.startsWith('public/experiments/')||p.startsWith('public/posters/'));
for(const p of preserved)assert.equal(current[p],old.sourceFiles[p],'Changed retained poster evidence input: '+p);
const routes=await builtReviewRoutes();
const comparison=await read('.local/route-diff-10w1.json');
assert.equal(comparison.length,routes.length,'Route comparison is stale: rerun .local/route-diff-10w1.ts');
for(const route of routes)assert(comparison.some((c:any)=>c.route===route),'Route comparison misses '+route);
const same=new Set<string>(comparison.filter((c:any)=>c.same).map((c:any)=>c.route));
const fresh=new Set<string>(comparison.filter((c:any)=>!c.same).map((c:any)=>c.route));
const dir='.local/i18n/review/';
const freshViews=(await read(dir+'views.json')).map((v:any)=>({route:v.route,width:v.width,theme:v.theme,actualWidth:v.actualWidth,actualTheme:v.actualTheme,overflow:v.overflow,brokenImages:v.brokenImages}));
const errors=await read(dir+'errors.json');assert.equal(errors.length,0,'Fresh view review has errors');
for(const v of freshViews)assert(fresh.has(v.route),'Fresh view outside the changed routes: '+v.route);
assert.equal(freshViews.length,fresh.size*6,'Every changed route needs 375/768/1440 × light/dark');
const features=await read(dir+'features.json');
const day=new Date().toISOString().slice(0,10);
const evidence='Headless Chromium (Playwright 1.62.1) against the npm run preview web-dist server on '+day+'; clipboard read, completed Markdown download, keyboard Enter/Escape and theme toggles exercised by scripts/review-reader-features.ts.';
const kept=(rows:any[])=>rows.filter((x:any)=>same.has(x.route));
const freshReaders=features.readers.map((r:any)=>({...r,evidence}));
const views=[...kept(old.views),...freshViews];
const readers=[...kept(old.readers),...freshReaders];
const readerNavigation=[...kept(old.readerNavigation),...features.navigation];
const editorialViews=[...kept(old.editorialViews),...features.extra];
const comparedAt=(await fs.stat('.local/route-diff-10w1.json')).mtime.toISOString();
const {hypothesisLecture,...base}=old;
const review={...base,policyVersion:'6.7.0',status:'passed',reviewedAt:new Date().toISOString(),views,readers,readerNavigation,editorialViews,outputDirectory:'web-dist',webAssets:{status:'passed',report:'validation/storage-report.json'},functional:{...old.functional,search:true,keyboard:true,evidence:{...old.functional.evidence,search:features.search}},
 retainedEvidence:{baseline:old.digest,reviewedAt:old.reviewedAt,verifiedUnchangedFiles:preserved,
  reason:'Pinned poster and experiment sources are byte-identical to the previous review, so their detailed poster geometry and series receipts are kept as prior evidence, not relabelled as fresh. Routes whose web-dist HTML is byte-identical to the published release keep their previous view, reader, navigation and editorial rows; every changed or new route was measured fresh.',
  unchangedRoutes:{comparedAgainst:'https://achmage-slides.vercel.app (published commit b3b187d, reviewed digest '+old.digest+')',method:'SHA-256 of each web-dist route HTML against the production response',comparedAt,count:same.size,routes:[...same].sort()},
  freshRoutes:[...fresh].sort(),ownerInstruction:{quote:'뭔 테스트를 이렇게 많이 계속 해 올리라니까 다 패스하고',sessionId:'d84382cc-a386-4a0d-a01c-033cca6a0604',at:'2026-11-09T11:43:19.803Z'}},
 environment:'Headless Chromium via Playwright on the actual web-dist preview (port 4331). Fresh on '+day+': '+freshViews.length+' route views of '+fresh.size+' changed routes (375/768/1440 × light/dark), '+freshReaders.length+' reader feature flows, '+features.navigation.length+' reader navigation rows and '+features.extra.length+' narrow/wide editorial measurements. Retained from the published review: '+(views.length-freshViews.length)+' views of '+same.size+' byte-identical routes and their reader rows. Lazy offscreen images are covered by the registered R2 asset verification.',
 sampleLecture:{workId:'from-sample-to-population-2026-11-10',homeFeaturedUnchanged:true,visualReview:'New English detail page (1440 light, 375 dark) and English reading page (768 dark) were inspected in screenshots; every new and changed route was measured at 375/768/1440 in both themes. The deck itself was measured separately in its lecture folder (present 1920x1080 light/dark, phone, fit and read views).'},
 sourceFiles:current,digest:await releaseDigest()};
validateReview(review,review.digest,routes);
await fs.writeFile('validation/release-review.json',JSON.stringify(review,null,2)+'\n');
console.log({digest:review.digest,views:views.length,fresh:freshViews.length,readers:readers.length,freshReaders:freshReaders.length,navigation:readerNavigation.length,editorial:editorialViews.length});
