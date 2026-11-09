import fs from 'node:fs/promises';
// Interface strings the site composes around the 2026-11-10 lecture (counts, page titles, topic lists), reported by
// scripts/report-missing-translations.ts. Built from the lecture's reviewed English so the wording stays identical.
const p='content/i18n/en.json',d=JSON.parse(await fs.readFile(p,'utf8'));
const title='내 주먹 속 사탕으로 상자 전체를 알 수 있을까요? — 기술통계와 추론통계의 기초';
const audience='R로 평균은 구해 보지만 표본의 숫자로 모집단을 말할 때 무엇이 달라지는지 아직 설명하기 어려운 대학원생';
const event='한림대학교 미디어스쿨 대학원 · 커뮤니케이션조사방법론 II · 2026년 11월 10일';
const label='강의 슬라이드 · 한국어 77장';
const topics=['연구방법론','양적 연구','기술통계','추론통계'];
const en=(k:string)=>{if(!d[k])throw Error('Register the lecture first: no reviewed English for '+k);return d[k];};
const t=topics.map(en);
Object.assign(d,{
 '공개 프로젝트 22개 · 최근 등록 2026.11.09':'22 public projects · Most recently added: November 9, 2026',
 [event+' · '+audience]:en(event)+' · '+en(audience),
 [audience+' · '+event+' · 2026.11.10']:en(audience)+' · '+en(event)+' · 2026.11.10',
 [title+' 상세 보기']:en(title)+' — Details',
 [title+' — Achmage']:en(title)+' — Achmage',
 [title+' · 웹 편집본 — Achmage']:en(title)+' · Web reading edition — Achmage',
 '같은 주제: 연구방법론, 양적 연구':'Shared topics: '+t[0]+', '+t[1],
 [topics.join(' / ')]:t.join(' / '),
 [topics.join(' · ')]:t.join(' · '),
 [label+' ↗']:en(label)+' ↗',
 '4개의 강의 자료':'4 course materials','10주차':'Week 10','전체 22개 자료':'All 22 works'
});
await fs.writeFile(p,JSON.stringify(d,null,2)+'\n');
console.log('Completed 13 contextual interface translations:',{title:en(title),topics:t.join(' · '),label:en(label)+' ↗'});
