# 순환 포스터 rc2 검수 · 2026-10-09

사용자 지시: 첫 장부터 기본1초 순환, 본문/상하단 테마 동기화, 라이트/다크 벡터 로고 쌍. 기존15초·네이비 색 고정 계약을 대체한다.

- series viewer 1.1.0-rc.2 / 사이트 정책2.1.1.
- Python9 tests, site28 tests, Astro/TypeScript0errors/0warnings.
- 실제 Edge 13routes ×375/768/1440 ×light/dark =78뷰, 넘침0·확인된 깨진 이미지0. 실제375 요청은110%확대 환경에서376px, 나머지는768/1440px.
- 포스터 전 장면 두테마:376×667(14),768×1023(10),1440×900(10),320×480(18). 총52장면에서 clipping0/overflow0. 본문·상하단 배경/문서테마 일치, 표시 로고 variant 일치, 로고가 모두 로드됐음.44px 조작영역 유지.
- 자동전환 DOM샘플간 간격977/978/1114/994/1001/984ms.1초 설정이며 브라우저 스케줄링·샘플링 지연 포함. 전체읽기/복귀후 tools-toggle 초점 및 정지 유지.
- 검색 “판단”2/9, 목록 URL 복원 확인. 기존28개 회귀 검사 통과.
- 라이트 로고와 다크 로고의 모든 geometry/path/transform 동일, 색상만 변경. fileDark의 스크립트/래스터/외부참조 거절 검사 포함.
- A2 미리보기 PNG·print-audit 해시가 rc1과 동일. PDF는 creator 버전 메타데이터 갱신이며 원고·페이지 조판은 동일.
- 실제 iOS/Android와 인쇄소 ICC는 미검증. PDF는 RGB 교정본. 기존 짧은 가로 화면의 읽기 fallback 계약 유지.

구현 근거:
research:rr-c9823a2bf65aba8c19330cf312bb8ace:b2a5bba8f655835d1db07c3bfe076f7e34c08bf2638104d5b8a5fdaf6d1c8dd5
이전 기준과 실패 기록은 PS04/PS05 원번호를 유지한다.

