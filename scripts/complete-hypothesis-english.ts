import fs from 'node:fs/promises';
const p='content/i18n/en.json',d=JSON.parse(await fs.readFile(p,'utf8'));
const title='AI가 다 해주는데 연구가설은 왜 세워야 할까요? — 사회과학 양적 조사방법론의 기초',en=d[title];
const audience='AI로 분석은 돌려 보지만 연구가설을 왜, 어떻게 세우는지 아직 설명하기 어려운 대학원생',enAudience=d[audience];
if(!en||!enAudience)throw Error('Register the lecture first: title and audience need reviewed English');
Object.assign(d,{
 '공개 프로젝트 21개 · 최근 등록 2026.11.02':'21 public projects · Most recently added: November 2, 2026',
 ['한림대학교 미디어스쿨 대학원 · 커뮤니케이션조사방법론 II · 2026년 11월 3일 · '+audience]:'Hallym University Media School, graduate program · Communication Research Methods II · November 3, 2026 · '+enAudience,
 [audience+' · 한림대학교 미디어스쿨 대학원 · 커뮤니케이션조사방법론 II · 2026년 11월 3일 · 2026.11.03']:enAudience+' · Hallym University Media School, graduate program · Communication Research Methods II · November 3, 2026 · 2026.11.03',
 [title+' 상세 보기']:en+' — Details',
 [title+' — Achmage']:en+' — Achmage',
 [title+' · 웹 편집본 — Achmage']:en+' · Web reading edition — Achmage',
 '같은 주제: 연구방법론, AI와 학습':'Shared topics: Research methods, AI and learning',
 '연구방법론 / 양적 연구 / 연구가설 / AI와 학습':'Research methods / Quantitative research / Research hypotheses / AI and learning',
 '연구방법론 · 양적 연구 · 연구가설 · AI와 학습':'Research methods · Quantitative research · Research hypotheses · AI and learning',
 '강의 슬라이드 · 한국어 42장 ↗':'Lecture slides · 42 slides in Korean ↗',
 '우리나라 인구수 만큼 (예: 5000만개) 여러 종류의 사탕이 들어있는 가상의 사탕 상자':'An imaginary candy box holding many kinds of candy, as many as the population of Korea (e.g., 50 million)',
 '몇 종류의 사탕이 있는지 모름':'We do not know how many kinds of candy there are',
 '3개의 강의 자료':'3 course materials','9주차':'Week 9','전체 21개 자료':'All 21 works'
});
await fs.writeFile(p,JSON.stringify(d,null,2)+'\n');
console.log('Completed 15 contextual interface translations.');
