# 전체 원문 읽기 계약 1.0.0 · 사이트 정책 3.0.0

## 원칙과 등록
발표는 원문 전체 읽기를 제공한다. 요약을 전체 읽기로 표시하지 않는다. 내용·통계·오탈자는 당시 원문을 보존하며 레이아웃만 바꾼다. 원문 속 역사적 링크와 사이트가 제공하는 현재 발표/PDF 링크를 구분한다. 후자는 works의 artifacts에서 생성한다.

works.reader에는 version, source(공개 Markdown), sourceVersion, manifest를 명시한다. manifest.works[id]에는 원문 파일/sourceSha256, Markdown SHA256, 이미지 URL·SHA256, 원문 단위의 검증 결과, 이전 앵커 별칭을 기록한다. 출처·전체 원문·이미지 대응을 검토한 후에만 해시를 갱신한다. 생성 읽기 HTML만 고치거나 manifest의 숫자만 바꿔 검사를 우회하지 않는다. prepare는 원본 텍스트를 다시 추출해 실제 읽기와 독립 대조한다.

본문과 복사·Markdown 저장·검색·목차는 하나의 공개 원고에서 생성한다. 저장본의 사이트 상대 링크는 절대 공개 URL로 만든다. 발표 도구·노트·스크립트를 제거한 HTML을 원고로 옮긴다. 원문 도해는 그림으로 보존하고 벡터의 글자는 본문에서도 읽을 수 있게 제공한다. 시각자료에만 담긴 내용은 해당 원본 그림과 슬라이드 링크로 확인할 수 있다. CMDS Share는 기능 참고이며 플러그인 코드 이식은 하지 않았다.

## Markdown과 주소
제목1–6단계, 목록, 체크 목록, 표, 인용, 코드, 이미지, Obsidian 콜아웃, 각주를 지원한다. 위키 링크·첨부는 manifest.wiki의 명시적 공개 URL 매핑이 필요하다. 미등록 위키 링크, 상대 이미지, 비공개/실행 HTML은 오류다. 지원하지 않는 수식/동적 플러그인 출력은 임의로 삭제하지 않고 원본 그림 또는 공개 형식으로 먼저 변환·대조한다. 새 문법은 회귀 fixture와 함께 지원한다.

제목별 해시 ID와 중복 순번을 사용한다. 다른 제목을 앞에 넣어도 주소가 유지된다. 같은 제목의 순서를 바꾸거나 제목 문구를 바꿀 때는 기존 ID를 명시적 heading id 또는 aliases로 고정한다. 재편집에서 이전 section-N을 삭제하지 않는다. 원문 대응표는 내용 순서와 도해 캡션 이동 여부를 구분한다. contiguousOrderPreserved=false는 전체 단위의 연속 순서가 바뀌었다는 뜻이며 leaf 누락 여부와 별개다.

## 관계와 공개 범위
연결 지도는 명시적 본문 링크·역방향 참조와 같은 주제를 구분한다. 색·선·텍스트 범례와 동등한 링크 목록을 제공한다. 등록된 listed 자료만 관계 대상으로 쓰고 unlisted/draft 및 미게시 휴먼볼트의 이름은 넣지 않는다. 빈 관계를 꾸며 만들지 않는다. noindex/링크 전용은 접근 통제가 아니다. 공개 저장소에 비공개 원본을 넣지 않는다.

## 필수 검수와 소급 적용
content:check → build(원문·이미지·출력 검증) → check → test → 실제 브라우저 검수 → release:verify를 지킨다. 빌드에서 생성된 HTML과 공통/실험 경로를 자동 수집한다. 모든 경로의375/768/1440×light/dark 결과를 기록한다. 각 읽기 페이지는 목차/앵커, 복사2종/실패 대체, Markdown저장, 이미지확대(없으면 해당 없음 근거), 지도, 인쇄를 확인한다.320px/200%확대/키보드/긴문서도 추가 검토한다.

reader UI·파서·메뉴·스키마가 바뀌면 기존 읽기 전체를 다시 검사한다. 검토 영수증은 정확한 코드·본문·자산 해시에 연결한다. 검사 누락·오래된 digest·본문/이미지 손실은 배포를 차단한다. GitHub branch protection은 사용자가 보류한 상태다.

원본 HTML/PDF/포스터는 바이트와 주소를 보존한다. 이번 이관은 사이트 읽기 표현만 바꾼다. 복구는 이전 Vercel production으로 전환하고 같은 Git 변경을 revert한다. 기준 정상 버전 main bdb86f2129554e0c422358e6e1641ba892dd6f61 / Vercel9XAFgZK9c8opsin2X8ttpX8VJiHk.

## 근거
AS019: research:rr-76045fcb82128e0d679449e53bfcf771:a2b4c33da3889d75e2ecae81ae59c03bf6567189f4c1229016bbf2c1910b6dd9
AS018 기존 발표: research:rr-9988c127b605008f351e7673a428d124:5bd1946338a67708233fcdba912ab8a6e6971d3cf1b45c43d5899e48e7b72f1c
CMDS Share 게시물 관찰: https://laguna821.github.io/obsidian-shared-notes/notes/zcjhojhx.html (2026-10-10)

도해 SVG에 글꼴을 내장할 때는 표시되는 글자만 subset한다. 한 SVG의 내장 font 데이터 합계는 128KiB 이하여야 한다. scripts/subset-reader-svg-font.py로 새 파일을 만들고 원본 URL은 유지한다. manifest의 fontSubsetOf에 보존된 원본 SVG를 연결하면 빌드에서 font-face 이외 벡터·텍스트 전체를 대조한다. 일반 비트맵 원본 바이트는 그대로 유지한다.
