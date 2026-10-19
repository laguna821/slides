import fs from 'node:fs/promises';
const p='content/i18n/en.json',d=JSON.parse(await fs.readFile(p,'utf8'));
const title='교수님, 저 주제를 아직 잡고 있어요 — 그 말을 지금 몇 개월째 하고 계십니까?',en='Professor, I am still working on my topic — How many months have you been saying that?';
Object.assign(d,{
 '공개 프로젝트 15개 · 최근 등록 2026.10.19':'15 public projects · Most recently added: October 19, 2026',
 '한림대학교 미디어스쿨 대학원 · 커뮤니케이션조사방법론 II · 2026년 10월 20일 · AI로 초안을 만들지만 자신의 연구 질문과 방법을 설명하기 어려운 대학원생':'Hallym University Media School, graduate program · Communication Research Methods II · October 20, 2026 · Graduate students who draft with AI but find it hard to explain their research questions and methods',
 [title+' 상세 보기']:en+' — Details',
 '같은 주제: 연구방법론':'Related topic: Research methods',
 [title+' — Achmage']:en+' — Achmage',
 '연구방법론 / 대학원 연구 / 논문 읽기 / AI와 학습':'Research methods / Graduate research / Reading papers / AI and learning',
 'AI로 초안을 만들지만 자신의 연구 질문과 방법을 설명하기 어려운 대학원생 · 한림대학교 미디어스쿨 대학원 · 커뮤니케이션조사방법론 II · 2026년 10월 20일 · 2026.10.20':'Graduate students who draft with AI but find it hard to explain their research questions and methods · Hallym University Media School, graduate program · Communication Research Methods II · October 20, 2026 · 2026.10.20',
 '연구방법론 · 대학원 연구 · 논문 읽기 · AI와 학습':'Research methods · Graduate research · Reading papers · AI and learning',
 '강의 슬라이드 · 한국어 66장 ↗':'Lecture slides · 66 slides in Korean ↗',
 'Socratic Advisor 스킬 ZIP ↗':'Socratic Advisor skill ZIP ↗',
 '학생용 빈 Obsidian 볼트 ↗':'Empty Obsidian vault for students ↗',
 [title+' · 웹 편집본 — Achmage']:en+' · Web reading edition — Achmage',
 '2개의 강의 자료':'2 course materials','8주차':'Week 8','전체 15개 자료':'All 15 works'
});
await fs.writeFile(p,JSON.stringify(d,null,2)+'\n');
console.log('Completed 15 contextual interface translations.');
