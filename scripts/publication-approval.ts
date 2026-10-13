import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {canonicalJson,releaseDigest} from './release-gate';
import {policy} from '../src/lib/policy';
export const reviewHash=(review:unknown)=>createHash('sha256').update(canonicalJson(review)).digest('hex');
export function validateApproval(a:any,digest:string,review:any,now=Date.now()){
 if(a?.version!==1||a.status!=='approved'||a.scope!=='portfolio-production'||a.digest!==digest||a.policyVersion!==policy.version||a.reviewHash!==reviewHash(review))throw Error('게시 승인 없음 또는 승인 이후 변경됨: 사용자에게 현재 변경 요약과 한·영 결과를 확인받으세요.');
 if(review.status!=='passed'||review.digest!==digest||review.policyVersion!==policy.version||!Number.isFinite(Date.parse(review.reviewedAt)))throw Error('승인 대상의 검토가 오래되었습니다.');
 if(a.decision?.by!=='user'||typeof a.decision.quote!=='string'||a.decision.quote.trim().length<1||typeof a.decision.sessionId!=='string'||a.decision.sessionId.trim().length<8||!Number.isFinite(Date.parse(a.decision.at))||Date.parse(a.decision.at)>now+60000||Date.parse(a.decision.at)<Date.parse(review.reviewedAt))throw Error('사용자의 실제 확인 발언·세션·검토 이후 확인 시각이 필요합니다.');
}
export async function checkApproval(){
 const digest=await releaseDigest();const review=JSON.parse(await fs.readFile('validation/release-review.json','utf8'));
 const a=await fs.readFile('validation/publication-approval.json','utf8').then(JSON.parse).catch(()=>null);
 validateApproval(a,digest,review);console.log('사용자 확인과 현재 배포 파일·검토 해시가 일치합니다.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.includes('--required')||process.env.VERCEL_ENV==='production')await checkApproval();
 else console.log('미리보기 검사 완료. 운영 게시에는 별도의 현재 사용자 확인이 필요합니다.');
}
