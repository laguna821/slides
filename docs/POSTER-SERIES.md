# 순환 포스터 업로드 계약 · 2.1.0

실험 경로 /experiments/pkm-poster-2026/ 는 종료된 실제 행사 리디자인이다. 포트폴리오 소유 작품으로 자동 등록하지 않는다. 홈·검색·아카이브·사이트맵에 넣지 않는다.

1. 공통 원고의 stable content id를 화면과 A2 양쪽에 연결한다. 사실·기관 역할·로고 출처·연구 revision을 확인한다.
2. 승인된 series-v1 renderer/viewer pin을 content/experiments.json에 기록한다. legacy rc6 자료는 자기 계약을 유지한다.
3. 등록 파일 목록과 SHA256, noindex, 실제 PDF 버튼, 공개 spec의 경로 제거, A2 필드·box·안전 영역을 content:check/build/test에서 강제한다.
4. release:verify는 기존 모든 공개 페이지와 실험 페이지의 실제 화면 검토를 요구한다. 새 파일이나 메뉴/정책 변경 뒤 이전 digest를 재사용하지 않는다.
5. 운영 배포 뒤 실제 HTTP·파일 해시·핵심 조작을 확인한다. 이전 정상 Git/Vercel 배포를 보존한다. GitHub 보호 설정은 사용자의 보류 결정 유지.

## 이번 시험 범위
네이비 고정 틀, 중앙 테마, 15초 순환, 사용자 조작 후 정지, 목차/장면 주소, 읽기 화면, 온라인 PDF 링크/오프라인 내장 PDF.
PDF는 A2 420×594mm / bleed 포함424×598mm, 여백 A, RGB 교정본. 인쇄소 ICC 및 실기기 검수는 별도다.
CMDS는 공식 PNG에서 사용자 요청에 따라 벡터 재구성. 공식 벡터 원본으로 표시하지 않는다. 한림대는 기존 스킬의 엠블럼 벡터.
원문: https://hallym.cmdspace.work/pkm-conference-2026

## 변경과 소급 적용
새 메뉴/산출물 유형/필수 메타데이터 변경 시 policy version + 검증기 + 문서를 함께 변경한다.
모든 기존 자료를 검사하되 기존 독립 발표 HTML의 바이트와 주소를 변경하지 않는다.
뷰어 업데이트는 버전별로 검수하고 공개 출력 해시를 갱신한다. 단순 최소 버전 문자열 비교로 기존 자료를 강제 변환하지 않는다.
PS01~PS05 정확한 기준 revision은 공개 poster-spec.json에 고정한다.

