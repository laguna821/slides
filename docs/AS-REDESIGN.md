# AS 웹사이트 개편 · 2026-10-09

기준: cd1d78e. 기존 발표 URL/원본 바이트 및 A 가로획만 teal인 로고 보존.

## 변경

- 첫 화면에 구체적 소개, 검색, 실제 대표발표/모션과 직접보기.
- 카드 요약 유지, 등록일과 발표일 구분, 빈 과목 주요진입 제외.
- 자막 전체 corpus + 시간 cue 색인. 구간별 결과는 고정 버전/시작/끝으로 연결.
- 실제 발표↔모션 관계는 임의 생성하지 않음. 구간/슬라이드 목적지는 데이터 등록 시 보존.
- 소개와 제작 의도를 사이트 내부에 설명하고 삽입 기능은 펼쳐보기로 제공.

## 운영 메타데이터

`dateKind`: published 또는 registered. `registeredAt`: 아카이브 등록일. `audience`, `takeaways`, `productionNote`, `featuredReason`은 확인된 사실만 입력. 없는 산출물 버튼은 만들지 않음. 대표작 선정은 기존 승인 상태 유지.

## 검증

테스트/타입/빌드, 화면 및 배포 결과는 validation/private와 docs/VALIDATION.md 참조. 기술 검증과 실제 사람의 이해도/최종 디자인 승인은 별개다. 외부 영상은 현재 0개이며 외부 서비스별 구간 정지 동작은 이 릴리스의 검증 대상이 아니다.

## 연구 revision

- AS001: `research:rr-57513b3bc22227160b2d5d0050e923e2:c3c18fe7862b2686454fc0e61cd9060e307ba6e44d90ed926b09fa17e48aa2e8`
- AS002: `research:rr-4bbd1ac8856da66da09edf89f8ed6dd4:5d9151d2bba501f1d8c4935cb12c5f49ca6348b76ae36b346f151c2d8b05004e`
- AS003: `research:rr-93f5d8dfaef15a20d92601c24fb7d99b:fc6b29efeb8ae49758ac8d92b9027c77946702468461a6a12ef9dfdcfa863789`
- AS004: `research:rr-58e22e589c199944b92cf507d03f1cef:15ff175a33886264072d58c313629cd76ee79ae8d4e26591587e20dc4aa1fbd3`
- AS005: `research:rr-eea8780654ab672159862a5dd3592dd1:8debd3498c97451faa740d6ada96b8ccd026bfc5a24a728a1040c5ab573918ec`
- AS006: `research:rr-39457e764d7ed7843675518448d7fe1d:180190281daa784782a97c21e792a9a1847bd5236e09250838eacc869cf1c9cd`
- AS007: `research:rr-a3591fc18f18ecf763f05ff9882cbe45:7424a2a7ac972eea19bda327984c70a6470f272a95b894cc4c90a12575b9e846`
- AS008: `research:rr-eaf6e146fc77bfb56f261161936e388d:ff7badceee004ad3c366049c522f5f51d6f52d80fe2b252012b199b3a1fc1c75`
- AS009: `research:rr-6b575e4b9428b3c3e98164fcf99221a2:59a64ec17e09e6c548cf02cc7604110186d49af35b991697ca752612d4accbcf`
- AS010: `research:rr-e9798b97b4ef9220afdd540ac4773f8d:7e26f1800df9d4771c282383bc480f975715d74339e9b52ac6c973c8b0d86cde`
- AS011: `research:rr-80b66319be88127513c6a5d6315de1bd:b5d2db2856036aec856b625fc538baef5a7c0a45dcf3491d7ef8b39fb7184c5f`
- AS012: `research:rr-70065b62b6112e9f626ee7eecd172799:053cbceebce02e452dbb98ec03a382fd063c65971c9d0335001d544a27ce8a8a`

## 복구

개편 전 코드 cd1d78e 및 Ready 배포 7sGrHn9iP3oXEztsJPhRcZETmQJd를 보존. 이전 배포로 Vercel 별칭을 되돌리거나 개편 커밋을 git revert로 복구한다. 강제 push는 사용하지 않는다.

