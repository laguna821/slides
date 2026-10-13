import fs from 'node:fs/promises';
import {releaseDigest,releaseManifest,builtReviewRoutes,validateReview} from './release-gate';
import {reviewHash,validateApproval} from './publication-approval';
import {policy} from '../src/lib/policy';
const current=await releaseManifest(),digest=await releaseDigest();
const baseline=JSON.parse(await fs.readFile('validation/published-baseline.json','utf8'));
const changed=[...new Set([...Object.keys(current),...Object.keys(baseline.sourceFiles)])].filter(f=>current[f]!==baseline.sourceFiles[f]).sort();
const works=JSON.parse(await fs.readFile('content/works.json','utf8')).filter((w:any)=>w.visibility!=='draft');
const review=JSON.parse(await fs.readFile('validation/release-review.json','utf8'));
let reviewed=false,approval=false,reason='';
try{validateReview(review,digest,await builtReviewRoutes());reviewed=true;}catch(e){reason=String(e);}
if(process.env.UPLOAD_VALIDATION==='failure'||process.env.UPLOAD_VALIDATION==='cancelled'||process.env.UPLOAD_VALIDATION==='skipped'){reviewed=false;reason='현재 빌드/검증이 완료되지 않았습니다: '+process.env.UPLOAD_VALIDATION;}
try{validateApproval(JSON.parse(await fs.readFile('validation/publication-approval.json','utf8')),digest,review);approval=true;}catch{}
const status=reviewed?(approval?'approved':'awaiting-user-confirmation'):'needs-validation';
const report={version:1,status,policyVersion:policy.version,digest,reviewHash:reviewHash(review),baselineCommit:baseline.commit,changedFiles:changed,requiredFont:policy.webFont,requiredLanguages:['ko','en'],reviewed,reason,works:works.map((w:any)=>({id:w.id,title:w.title,ko:(w.kind==='motion'?'/motion/':'/talks/')+w.slug+'/',en:'/en'+(w.kind==='motion'?'/motion/':'/talks/')+w.slug+'/',reader:!!w.reader})),confirmation:'사용자가 변경 요약과 한·영 검토 결과를 확인한 뒤 현재 요청에 대해 명시적으로 게시를 승인해야 합니다. 규약의 과거 포괄 승인을 재사용하지 않습니다.'};
await fs.mkdir('validation/upload-request',{recursive:true});await fs.writeFile('validation/upload-request/request.json',JSON.stringify(report,null,2)+'\n');
const md='# 포트폴리오 게시 확인 요청\n\n상태: **'+status+'**\n\n- 정책: '+policy.version+'\n- 서체: Achmage SameTone 1.000 Full /100–900\n- 언어: 한국어와 영어 동시\n- 변경 파일: '+changed.length+'개\n- 배포 입력 해시: `'+digest+'`\n- 검토: '+(reviewed?'통과':'미완료: '+reason)+'\n- 사용자 확인: '+(approval?'현재 해시와 일치':'대기 — 자동 승인하지 않음')+'\n\n## 변경 파일\n\n'+changed.map(f=>'- `'+f+'`').join('\n')+'\n\n## 확인할 결과\n\n'+report.works.map((w:any)=>'- '+w.title+' · 한국어 `'+w.ko+'` · 영어 `'+w.en+'`'+(w.reader?' · 양언어 읽기/PDF/Markdown 포함':'')).join('\n')+'\n\nVercel 미리보기 주소는 해당 커밋의 배포 결과를 확인해 함께 제시합니다. 인증 보호로 확인하지 못한 항목은 미검증으로 표시합니다. 사용자 확인 후 승인 영수증을 기록하고 운영 배포·실제 응답 검증까지 진행합니다.\n';
await fs.writeFile('validation/upload-request/request.md',md);if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,md);
console.log(status+': '+changed.length+' changed files; validation/upload-request/request.md');
