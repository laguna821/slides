import test from 'node:test';
import assert from 'node:assert/strict';
import {validateApproval,reviewHash} from '../scripts/publication-approval';
import {validateFontCss,validatePagePair} from '../scripts/verify-web-contract';
import {policy} from '../src/lib/policy';
const now=Date.parse('2026-10-13T02:00:00Z');
const review={policyVersion:policy.version,digest:'current',status:'passed',reviewedAt:'2026-10-13T01:00:00Z'};
const approval={version:1,status:'approved',scope:'portfolio-production',policyVersion:policy.version,digest:'current',reviewHash:reviewHash(review),decision:{by:'user',quote:'이 버전으로 게시해 주세요.',sessionId:'synthetic-test-session',at:'2026-10-13T01:30:00Z'}};
test('publication requires specific current user confirmation and unchanged review',()=>{
 validateApproval(approval,'current',review,now);
 for(const a of [null,{}, {...approval,status:'pending'},{...approval,status:'revoked'},{...approval,digest:'old'},{...approval,policyVersion:'old'},{...approval,decision:{...approval.decision,by:'agent'}},{...approval,decision:{...approval.decision,quote:''}},{...approval,decision:{...approval.decision,at:'2026-10-13T00:00:00Z'}}])assert.throws(()=>validateApproval(a,'current',review,now));
 assert.throws(()=>validateApproval(approval,'current',{...review,reviewedAt:'2026-10-13T01:10:00Z'},now));
 assert.throws(()=>validateApproval({...approval,decision:{...approval.decision,at:'2026-10-14T00:00:00Z'}},'current',review,now));
});
test('font file presence alone cannot mask a different website default',()=>{
 const face='@font-face{font-family:"Achmage SameTone";src:url('+policy.webFont.url+');font-weight:100 900}';
 validateFontCss(face+'body{font-family:"Achmage SameTone",sans-serif;}');
 assert.throws(()=>validateFontCss(face+'body{font-family:Pretendard,sans-serif;}'));
 assert.throws(()=>validateFontCss(face.replace('100 900','400')+'body{font-family:"Achmage SameTone",sans-serif;}'));
});
test('explicit Pele publication delegation still requires the exact request and current review binding',()=>{
 const a={...approval,boundAt:'2026-10-13T01:50:00Z',decision:{by:'user',quote:'게시 확인 굳이 물어보지 말고 공개까지 하라고',correctionQuote:'전체 사례 원본이 vercel 내 포트폴리오 사이트에 안보이는데? 로그인 안해도  이런 전체 내용을 볼 수 있게 해야지 왜 이렇게 해놨어 ㅡㅡ',sessionId:'01a15c26-4e1d-7a12-89d8-79e6c6ec37b2',authorization:'publish-when-verified',requestScope:'pele-complete-public-migration',at:'2026-10-13T00:00:00Z'}};
 validateApproval(a,'current',review,now);
 assert.throws(()=>validateApproval({...a,boundAt:'2026-10-13T00:30:00Z'},'current',review,now));
 assert.throws(()=>validateApproval({...a,decision:{...a.decision,requestScope:'unrelated-change'}},'current',review,now));
 assert.throws(()=>validateApproval({...a,digest:'old'},'current',review,now));
});
test('research gateway delegation is limited to the exact approved plan and verified revision',()=>{
 const reviewed={...review,reviewedAt:'2026-10-24T03:30:00Z'};
 const a={...approval,reviewHash:reviewHash(reviewed),boundAt:'2026-10-24T03:40:00Z',decision:{by:'user',quote:'Implement the proposed plan.',sessionId:'01a15c26-4e1d-7a12-89d8-79e6c6ec37b2',authorization:'publish-when-verified',requestScope:'researchers-public-gateway',turnId:'01a16bc9-34c8-7823-a254-f42c816e2324',planTurnId:'01a16bc6-716a-7083-925c-4b79f5976ca3',planTitle:'Pele Atlas 개편 — 대표 14종과 공개 연구 갤러리 연결',at:'2026-10-24T02:41:50.000Z'}};
 const time=Date.parse('2026-10-24T04:00:00Z');
 validateApproval(a,'current',reviewed,time);
 for(const change of [{turnId:'different'},{planTurnId:'different'},{requestScope:'other'},{quote:'Continue'},{sessionId:'another-session'}])assert.throws(()=>validateApproval({...a,decision:{...a.decision,...change}},'current',reviewed,time));
 assert.throws(()=>validateApproval({...a,boundAt:'2026-10-24T03:00:00Z'},'current',reviewed,time));
 assert.throws(()=>validateApproval({...a,digest:'stale'},'current',reviewed,time));
});
test('new site pages require corresponding language and SameTone preload',()=>{
 const html=(lang:string)=>'<html lang="'+lang+'"><head><link rel="canonical" href="https://achmage-slides.vercel.app/'+(lang==='en'?'en/':'')+'"><link rel="alternate" hreflang="ko"><link rel="alternate" hreflang="en"><link rel="preload" as="font" href="'+policy.webFont.url+'"></head><body><header class="site-header"><a data-language-switch href="'+(lang==='en'?'/':'/en/')+'"></a></header></body></html>';
 validatePagePair(html('ko'),html('en'),'/');
 assert.throws(()=>validatePagePair(html('ko'),html('ko'),'/'));
 assert.throws(()=>validatePagePair(html('ko'),html('en').replace(policy.webFont.url,'/old.woff2'),'/'));
});
