import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const data=JSON.parse(await fs.readFile('validation/benchmarks/sametone-portfolio.json','utf8'));
assert.equal(data.rows.length,40);
const median=(xs:number[])=>xs.toSorted((a,b)=>a-b)[2];
const summaries=[];let table='| 조건 | 언어 | 기존 Pretendard | SameTone 1.000 | 변화 |\n|---|---|---:|---:|---:|\n';
for(const profile of ['mobile','native'])for(const language of ['ko','en']){
 const select=(variant:string)=>data.rows.filter((r:any)=>r.profile===profile&&r.language===language&&r.variant===variant);
 const before=select('Pretendard'),after=select('SameTone');assert.equal(before.length,5);assert.equal(after.length,5);
 for(const r of [...before,...after]){assert.equal(r.fonts.length,1);assert(r.fontFamily.includes(r.variant==='SameTone'?'Achmage SameTone':'Pretendard'));assert.equal(r.fonts[0].encodedBodySize,r.variant==='SameTone'?2140332:2057688);}
 const a=median(before.map((r:any)=>r.fontReadyMs)),b=median(after.map((r:any)=>r.fontReadyMs));const percent=(b/a-1)*100;
 summaries.push({profile,language,beforeMs:a,afterMs:b,changePercent:percent});
 table+='| '+(profile==='mobile'?'모바일 제한망':'데스크톱 무제한망')+' | '+(language==='ko'?'한국어':'영어')+' | '+(a/1000).toFixed(3)+'초 | '+(b/1000).toFixed(3)+'초 | '+(percent>=0?'+':'')+percent.toFixed(1)+'% |\n';
}
const report='# 포트폴리오 폰트 교체 실측\n\n측정: '+data.measuredAt+'\n\n'+table+'\n각 셀은 5회의 중앙값이며, 양수는 시간이 늘었다는 뜻이다. 동일한 새 포트폴리오 페이지에서 웹폰트와 preload만 교체했다. 영어판은 이번에 새로 생성했으므로 과거 영문 운영 사이트와 비교한 결과가 아니다.\n\n- SameTone Full WOFF2: 2,140,332바이트. 기존 Pretendard Variable: 2,057,688바이트. 82,644바이트(4.02%) 증가.\n- Chromium 151, Windows, 로컬 HTTP, 매회 새 컨텍스트·브라우저 캐시 비활성화. 모바일375px, 1.6Mbps 다운로드/750Kbps 업로드/150ms 지연. 데스크톱1440px, 네트워크 제한 없음. CPU 제한 없음.\n- 지표: 탐색 시작부터 document.fonts.ready 이후 두 프레임까지. 전체 이미지·영상 로딩 완료나 실제 사용자의 운영망 분포를 뜻하지 않는다. 작은 차이는 반복 측정의 변동을 포함한다.\n- 순서는 두 폰트를 교대로 바꾸어 총40회 순차 측정했다. 로컬 서버의 실제 HTTP 전송에 브라우저 네트워크 제한을 적용했다.\n- 이번 변경의 목적은 자체 서체와 한·영 서비스 통일이다. 폰트 배포 사이트의 개발버전 대비 용량·속도 개선율을 이 포트폴리오에 적용하지 않는다.\n\n원시 측정값: [sametone-portfolio.json](../validation/benchmarks/sametone-portfolio.json). 재현: npm exec tsx scripts/benchmark-portfolio.ts 후 npm exec tsx scripts/summarize-font-benchmark.ts.\n';
await fs.writeFile('docs/FONT-BENCHMARK.md',report);console.log(JSON.stringify(summaries,null,2));
