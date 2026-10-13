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
test('new site pages require corresponding language and SameTone preload',()=>{
 const html=(lang:string)=>'<html lang="'+lang+'"><head><link rel="canonical" href="https://achmage-slides.vercel.app/'+(lang==='en'?'en/':'')+'"><link rel="alternate" hreflang="ko"><link rel="alternate" hreflang="en"><link rel="preload" as="font" href="'+policy.webFont.url+'"></head><body><header class="site-header"><a data-language-switch href="'+(lang==='en'?'/':'/en/')+'"></a></header></body></html>';
 validatePagePair(html('ko'),html('en'),'/');
 assert.throws(()=>validatePagePair(html('ko'),html('ko'),'/'));
 assert.throws(()=>validatePagePair(html('ko'),html('en').replace(policy.webFont.url,'/old.woff2'),'/'));
});
