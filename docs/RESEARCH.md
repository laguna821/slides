# 근거와 버전 고정

- R005 발표 구성 분석: `research:rr-93a315eb6d796be93a8199e69ae7cdae:ab2f48000ce792b6729a0d131aa0e194c0cb68366ae40681bbf363fc15f7fa90`
- 모션 제작·사용자 평가 기록: `research:rr-3397c15e1edc811c64a3ad33fcad1780:0783a68532585c96cfe5263246deed947b98de0bf1d1c6a556ff6978f11e805e`
- 구현 연구 R-001: `research:rr-c3a7be96cdea7d16bbcdb248f8aa1be9:ce75a04284a60666732d27789b0a080a1ca66b395aa81cf5cd53f17289e396e4` (UI 검증 중간 revision; 완료 revision은 검증 결과와 Achmage 작업 기록에 후속 연결)
- 검색 원형: achmage-markdown-renderer `6177bf9e57998e1572347eba271ecc5ff70307a3`. 순수 검색 모듈만 사용하고 볼트 탐색·로컬 파일 서버는 포함하지 않습니다.
- 모션 공개본: Achmage-Skills `fc8659c6700e47650d39d1747ee1ea8eced59a53`. 카드의 공개/대표작 판정은 파일명이나 기술 검증 통과 여부와 구분합니다.

첨부 OT는 가로 폭 사용 참고 자료이며 이 사이트로 복사하지 않았습니다. 사용자 소유 Harness Engineering 사례의 큰 타이포그래피와 이미지 구성을 참고하고 독립 브랜드로 제작했습니다. labs.cmdspace.work의 탐색·자료 정리 구조는 기능 설계 참고이며 코드나 화면을 복제하지 않습니다.

## 발표 엔진

이번 출시의 기존 발표 HTML은 바이트를 보존해 직접 엽니다. 해시는 `content/legacy.json`으로 검사합니다. 별도 새 발표를 만들지 않았으며 사이트용 노트 암호화도 만들지 않았습니다.

병행 업그레이드 중인 발표 엔진은 **승인된 rendererPath와 packageSha256를 확보·검증한 뒤** 새 발표 등록에 사용합니다. 미확인 최신 버전을 이 사이트의 기본 엔진으로 자동 선택하지 않습니다. 승인 패키지 연결 전까지 새 엔진의 PDF·암호화 노트·발표자 창 통과를 이 사이트의 검증 성과로 주장하지 않습니다.

연동 기록에는 rendererPath, packageSha256, engine version, reviewRefs, 입력 원문 해시, 출력 HTML/PDF 해시, 모바일/키보드/전체화면/노트 복호화 테스트 결과를 함께 남깁니다. 사이트의 artifact.modes는 해당 파일이 실제 지원하는 기능만 표시합니다.
