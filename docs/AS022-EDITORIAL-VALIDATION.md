# AS022 · 웹 편집본 출시 검증

## 변경과 근거

원문 Markdown 4편과 기존 HTML/PDF를 보관하면서 content/editorial의 별도 원고와 단위 대응표를 추가했다. 논지별 절, 읽기 위계, 출처, 링크 검토, 공통 출력 계약을 정책4.0 / reader2.0으로 고정한다.

- 설계: research:rr-63dd1455bf5e891ef29830b7ecd1e737:28647c835acb50a807cdf6d441f65149042ce679c2848071e41a2549b2215117
- 앵커 충돌 실험: research:rr-63dd1455bf5e891ef29830b7ecd1e737:445f3e860972d4a05de79f5ca83fecc2d88aea0733d3fce451dc2dba3eff4dcc
- 대형 화면 검토: research:rr-63dd1455bf5e891ef29830b7ecd1e737:f2c18e168de3f421212c381eb73dac7a9a4b80c57c5f20b5fc2aa6186a49d6e2

## 확인 결과

- build/check 및 회귀검사49건 통과. 원문 보관본·이미지51개·기존 발표 주소 보존.
- 35개 경로 ×375/768/1440px ×양 테마 =210개 화면: 가로 넘침·깨진 이미지 없음.
- 읽기4편 ×3개 폭 ×양 테마 =24개 탐색 조건, 처음·중간·끝72개 위치. 고정 탐색·키보드·테마 동기화·위치 보존 확인.
- 추가320/1920px 양 테마16개 검사. 1920px 본문 폭720px. CSS2배 확대 시험4편 넘침 없음(브라우저 자체 확대 인증과 구분).
- 본문·Markdown 복사와 실제 저장 파일 일치, 현재 문단 링크 복사, 이미지 확대·연결 지도 확인.
- 새 HanMark PDF5/5/12/13쪽, 총35쪽. 텍스트 누락0·이미지 누락0·기하 오류0, 글꼴 내장. 실제 브라우저 다운로드4개 해시 일치.
- 링크101개 목적지 검사. Monash403과 Springer 인증 경유는 미확정 접근으로 기록하고 원문 URL 유지. 만료 판정이나 임의 대체를 하지 않음.

Edge 네이티브 PDF 탭은 해당 URL에 도달했지만 CUA 탐색은 시간 초과, 화면은 빈 화면으로 관측되어 뷰어 UI는 미검증이다. PDF 자체는 모든 쪽의 렌더링과 실제 다운로드로 따로 검증했다.

## 운영

신규 등록은 EDITORIAL-CONTRACT.md를 따른다. npx tsx scripts/audit-editorial-links.ts로 링크 영수증을 생성하고 불확실한 결과는 이유를 검토 기록에 남긴다. 원고 변경 후 대응표 검토, print:generate, content:check, release:verify 순서로 검증한다. release-review의 sourceFiles/digest는 실제 화면 검사 완료 후에만 갱신한다.

## 복구 기준

기준 Git 커밋: c60b6df3f3e7ddbbacbfc35e83a393cee68a70c4.
기준 Vercel 배포: 2MgPwEEuq78DUCK3nG8BFg55oPZy.
운영 장애 시 기존 정상 배포로 복귀하고 이번 PR의 squash 커밋을 revert한다. 기존 발표·인쇄 PDF 파일은 제거하지 않았으므로 원래 링크가 유지된다. GitHub main 보호 설정은 사용자 요청대로 보류한다.
