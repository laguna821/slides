# 순환 포스터 업로드 계약 · 2.1.1

실험 경로 /experiments/pkm-poster-2026/ 는 종료된 실제 행사 리디자인이다. 포트폴리오 소유 작품으로 자동 등록하지 않는다. 홈·검색·아카이브·사이트맵에 넣지 않는다.

1. 공통 원고의 stable content id를 화면과 A2 양쪽에 연결한다. 사실·기관 역할·로고 출처·연구 revision을 확인한다.
2. 승인된 series-v1 renderer/viewer pin을 content/experiments.json에 기록한다. legacy rc6 자료는 자기 계약을 유지한다.
3. 등록 파일 목록과 SHA256, noindex, 실제 PDF 버튼, 공개 spec의 경로 제거, A2 필드·box·안전 영역을 content:check/build/test에서 강제한다.
4. release:verify는 기존 모든 공개 페이지와 실험 페이지의 실제 화면 검토를 요구한다. 새 파일이나 메뉴/정책 변경 뒤 이전 digest를 재사용하지 않는다.
5. 운영 배포 뒤 실제 HTTP·파일 해시·핵심 조작을 확인한다. 이전 정상 Git/Vercel 배포를 보존한다. GitHub 보호 설정은 사용자의 보류 결정 유지.

## 이번 시험 범위
위치 고정 틀, 본문·상하단 동기 테마, 첫 장부터 1초 순환, 사용자 조작 후 정지, 목차/장면 주소, 읽기 화면, 온라인 PDF 링크/오프라인 내장 PDF.
PDF는 A2 420×594mm / bleed 포함424×598mm, 여백 A, RGB 교정본. 인쇄소 ICC 및 실기기 검수는 별도다.
CMDS는 공식 PNG에서 사용자 요청에 따라 벡터 재구성. 공식 벡터 원본으로 표시하지 않는다. 한림대는 기존 스킬의 엠블럼 벡터.
원문: https://hallym.cmdspace.work/pkm-conference-2026

## 변경과 소급 적용
새 메뉴/산출물 유형/필수 메타데이터 변경 시 policy version + 검증기 + 문서를 함께 변경한다.
모든 기존 자료를 검사하되 기존 독립 발표 HTML의 바이트와 주소를 변경하지 않는다.
뷰어 업데이트는 버전별로 검수하고 공개 출력 해시를 갱신한다. 단순 최소 버전 문자열 비교로 기존 자료를 강제 변환하지 않는다.
PS01~PS05 정확한 기준 revision은 공개 poster-spec.json에 고정한다.


## 자동재생 교정 · 1.1.0-rc.2
사용자 지정 기본 체류시간은 1초. 장면별 명시값은 1–120초로 검증한다. 터치·수동이동·포커스 후 정지 및 모션감소 설정은 유지한다. 렌더러 기본값·뷰어 fallback·예제·공개 fixture·OS·EJ를 함께 갱신한다.
research:rr-c9823a2bf65aba8c19330cf312bb8ace:38076383d8a13aa8ce11da0ed536bf9ca5bd77e6c306df5d43d447f248b602a3

상하단 바는 본문의 실제 장면 테마와 함께 전환한다. 수동 light/dark 모드도 전체 화면에 적용한다. 첫 로딩 theme-color/문서 배경·읽기/도구 패널도 일치시킨다. 로고 형태는 유지하고 라이트/다크 SVG를 별도 제작·전환한다. 색상 파생본 출처와 파일 해시를 기록한다.
research:rr-c9823a2bf65aba8c19330cf312bb8ace:db672f0792c60a586f6a86ca3ead6a003c145f938d82ad0a200de6fc3113a98c

듀얼 로고 필수: 공개 spec의 sha256/darkSha256 및 실제 SVG 파일을 모두 등록한다. PDF 라이트 로고는 유지하고 흰 배경판/CSS filter 반전 대신 검증한 별도 벡터를 사용한다.
research:rr-c9823a2bf65aba8c19330cf312bb8ace:6ea7dea77489e3013c70d0e37e09e1cb48c3ca76a7f9eb4969ed82c20a945c18

## 2.2.0 / series-v2 · 완결 포스터 우선
신규 순환 포스터는 한 장 전체 조판부터 검토한다. 행사 제목·핵심·일시·장소·참여 조건을 각 장에 반복하고 충분한 장별 상세 내용을 편집한다. 잔여 문단 자동 넘기기/기기별 장수 증가 금지. PKM 시험본은 전체7블록을 한 장으로 재편집했다. 구버전 renderer 핀은 기존 자료용으로 보존한다. 검증은 sharedRefs·focus·페이지별 콘텐츠·분량 균형·실측 contain·PDF를 포함한다. 인쇄 색 교정/실기기 검증은 별도.
