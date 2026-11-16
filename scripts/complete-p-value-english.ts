import fs from 'node:fs/promises';
// Interface strings the site composes around the 2026-11-17 lecture (counts, page titles, topic lists), reported by
// scripts/report-missing-translations.ts. Built from the lecture's reviewed English so the wording stays identical.
// The two fragments around the YouTube address come from the slide-14 description, which the reader splits at the link.
const p='content/i18n/en.json',d=JSON.parse(await fs.readFile(p,'utf8'));
const title='내 말이 틀릴 확률은 얼마일까요? — p-value와 가설검정, 그리고 가설 세우기';
const audience='p < .05는 외웠지만 그것이 무엇을 뜻하는지, 가설을 어떻게 세워야 하는지 아직 설명하기 어려운 대학원생';
const event='한림대학교 미디어스쿨 대학원 · 커뮤니케이션조사방법론 II · 2026년 11월 17일';
const label='강의 슬라이드 · 한국어 70장';
const topics=['연구방법론','양적 연구','가설검정','추론통계'];
const en=(k:string)=>{if(!d[k])throw Error('Register the lecture first: no reviewed English for '+k);return d[k];};
const t=topics.map(en);
Object.assign(d,{
 '공개 프로젝트 25개 · 최근 등록 2026.11.16':'25 public projects · Most recently added: November 16, 2026',
 [event+' · '+audience]:en(event)+' · '+en(audience),
 [audience+' · '+event+' · 2026.11.17']:en(audience)+' · '+en(event)+' · 2026.11.17',
 [title+' 상세 보기']:en(title)+' — Details',
 [title+' — Achmage']:en(title)+' — Achmage',
 [title+' · 웹 편집본 — Achmage']:en(title)+' · Web reading edition — Achmage',
 '같은 주제: 연구방법론, 양적 연구, 추론통계':'Shared topics: '+t[0]+', '+t[1]+', '+t[3],
 [topics.join(' / ')]:t.join(' / '),
 [topics.join(' · ')]:t.join(' · '),
 [label+' ↗']:en(label)+' ↗',
 '5개의 강의 자료':'5 course materials','11주차':'Week 11','전체 25개 자료':'All 25 works',
 'YouTube 영상 ‘XCOM: Enemy Unknown 99% miss’ (':'YouTube video ‘XCOM: Enemy Unknown 99% miss’ (',
 ') – 게임에서 명중 확률 99%인데도 빗나가는 장면':') – a scene in which a shot with a 99% chance to hit still misses'
});
await fs.writeFile(p,JSON.stringify(d,null,2)+'\n');
console.log('Completed 15 contextual interface translations:',{title:en(title),topics:t.join(' · '),label:en(label)+' ↗'});
