import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {releaseManifest,releaseDigest,builtReviewRoutes,validateReview} from './release-gate';
// Release review for policy 6.7.0: registration of two motion works made with the video script skill (2026-11-12),
// Norman Door (featured 2, replacing meal) and Espresso (featured 3, replacing pele-atlas).
// Owner's instruction (2026-11-09, session d84382cc-a386-4a0d-a01c-033cca6a0604): only what changed is measured again
// (docs/UPLOAD-CONTRACT.md). Every route whose web-dist HTML differs from the published release (production, commit
// a9248ee) is measured fresh on the actual web-dist preview by scripts/review-bilingual.ts and
// scripts/review-reader-features.ts with REVIEW_ONLY. Routes whose HTML is byte-identical to production keep the review
// of the published digest, labelled as retained, never as fresh. The published review is read from git HEAD so that a
// rerun after a documentation edit never treats its own output as the published baseline.
const read=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
const old=JSON.parse(execFileSync('git',['show','HEAD:validation/release-review.json'],{encoding:'utf8',maxBuffer:1e9}));
const current=await releaseManifest();
const preserved=Object.keys(old.sourceFiles).filter(p=>p.startsWith('public/experiments/')||p.startsWith('public/posters/'));
for(const p of preserved)assert.equal(current[p],old.sourceFiles[p],'Changed retained poster evidence input: '+p);
const routes=await builtReviewRoutes();
const comparison=await read('.local/route-diff-video-films.json');
assert.equal(comparison.length,routes.length,'Route comparison is stale: rerun .local/route-diff-video-films.ts');
for(const route of routes)assert(comparison.some((c:any)=>c.route===route),'Route comparison misses '+route);
const same=new Set<string>(comparison.filter((c:any)=>c.same).map((c:any)=>c.route));
const fresh=new Set<string>(comparison.filter((c:any)=>!c.same).map((c:any)=>c.route));
const dir='.local/i18n/review/';
const freshViews=(await read(dir+'views.json')).map((v:any)=>({route:v.route,width:v.width,theme:v.theme,actualWidth:v.actualWidth,actualTheme:v.actualTheme,overflow:v.overflow,brokenImages:v.brokenImages}));
const errors=await read(dir+'errors.json');assert.equal(errors.length,0,'Fresh view review has errors');
for(const v of freshViews)assert(fresh.has(v.route),'Fresh view outside the changed routes: '+v.route);
assert.equal(freshViews.length,fresh.size*6,'Every changed route needs 375/768/1440 × light/dark');
const features=await read(dir+'features.json');
assert.equal(features.search?.length,2,'Archive search must be exercised in Korean and English');
const day=new Date().toISOString().slice(0,10);
const evidence='Headless Chromium (Playwright 1.62.1) against the npm run preview web-dist server on '+day+'; clipboard read, completed Markdown download, keyboard Enter/Escape and theme toggles exercised by scripts/review-reader-features.ts.';
const kept=(rows:any[])=>rows.filter((x:any)=>same.has(x.route));
const freshReaders=features.readers.map((r:any)=>({...r,evidence}));
const views=[...kept(old.views),...freshViews];
const readers=[...kept(old.readers),...freshReaders];
const readerNavigation=[...kept(old.readerNavigation),...features.navigation];
const editorialViews=[...kept(old.editorialViews),...features.extra];
const comparedAt=(await fs.stat('.local/route-diff-video-films.json')).mtime.toISOString();
const {sampleLecture,...base}=old;
const review={...base,policyVersion:'6.7.0',status:'passed',reviewedAt:new Date().toISOString(),views,readers,readerNavigation,editorialViews,outputDirectory:'web-dist',webAssets:{status:'passed',report:'validation/storage-report.json'},functional:{...old.functional,search:true,keyboard:true,evidence:{...old.functional.evidence,search:features.search}},
 retainedEvidence:{baseline:old.digest,reviewedAt:old.reviewedAt,verifiedUnchangedFiles:preserved,
  reason:'Pinned poster and experiment sources are byte-identical to the previous review, so their detailed poster geometry and series receipts are kept as prior evidence, not relabelled as fresh. Routes whose web-dist HTML is byte-identical to the published release keep their previous view, reader, navigation and editorial rows; every changed or new route was measured fresh.',
  unchangedRoutes:{comparedAgainst:'https://achmage-slides.vercel.app (published commit a9248ee, reviewed digest '+old.digest+')',method:'SHA-256 of each web-dist route HTML against the production response',comparedAt,count:same.size,routes:[...same].sort()},
  freshRoutes:[...fresh].sort(),ownerInstruction:{quote:'뭔 테스트를 이렇게 많이 계속 해 올리라니까 다 패스하고',sessionId:'d84382cc-a386-4a0d-a01c-033cca6a0604',at:'2026-11-09T11:43:19.803Z'}},
 environment:'Headless Chromium via Playwright on the actual web-dist preview (port 4331). Fresh on '+day+': '+freshViews.length+' route views of '+fresh.size+' changed routes (375/768/1440 × light/dark), Korean and English archive search, '+freshReaders.length+' reader feature flows (no reading page changed). Retained from the published review: '+(views.length-freshViews.length)+' views of '+same.size+' byte-identical routes and their reader rows. Lazy offscreen images are covered by the registered R2 asset verification.',
 videoFilms:{workIds:['norman-door','espresso'],featured:{2:'norman-door (was meal)',3:'espresso (was pele-atlas)'},unfeaturedStillListed:['meal','pele-atlas'],
  homeFirstScreen:'1280x620, 1366x625, 1440x760, 1920x940 and 2560x1290 in Korean and English: introduction and four featured cards fit without scrolling (Chromium, local web-dist preview).',
  playback:'The Espresso detail page played the pinned raw GitHub MP4 and seeked to 100 s (readyState 4, 1920x1080).',
  visualReview:'Korean home (1440 light), English home (1440 dark), Norman Door detail (1440 light) and English Espresso detail (375 dark) were inspected in screenshots.',
  notJudged:'Sound and aesthetics of the films were not judged in this registration.',
  publication:'docs/video-script-films-2026-11-12-publication.md'},
 sourceFiles:current,digest:await releaseDigest()};
validateReview(review,review.digest,routes);
await fs.writeFile('validation/release-review.json',JSON.stringify(review,null,2)+'\n');
console.log({digest:review.digest,views:views.length,fresh:freshViews.length,readers:readers.length,freshReaders:freshReaders.length,navigation:readerNavigation.length,editorial:editorialViews.length});
