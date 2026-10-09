# AS016 · PKM 발표 원본과 포스터 등록

2026-10-09 사용자 요청으로 「인간 중심 읽기와 쓰기」를 공개 프로젝트로 등록했다. 파일명은 「Hallym - 내가 쓰기 위해 AI를 쓴다」이며, Padlet 작성자 Changhyun Ahn(laguna821)의 18쪽 PDF와 표지·행사·발표자가 일치한다. 로컬 완성본 안내 v5가 가리키는 18장 파일을 사용했다.

- 프로젝트: /talks/human-reading-writing-2026/
- 원본 HTML: /decks/human-reading-writing-2026/index.html
- 원본 PDF: /decks/human-reading-writing-2026/slides.pdf
- 포스터 등록본: /posters/hallym-pkm-2026/v1/index.html
- 원래 공유 글: https://padlet.com/johnfkoo951/hallym-pkm-conference-2026-s023rrnlpyhas2njhtk9/wish/J24jale6rLGEQ0A1

## 보존과 공개 범위

HTML과 PDF는 원본 바이트를 복사하고 content/legacy.json에서 SHA256을 고정했다. HTML 15429033 bytes, PDF 12471417 bytes/18쪽. 기존 deck-stage 엔진을 그대로 사용하며 새 발표 엔진으로 재생성하지 않는다. 보관된 manifest의 bytes15426399는 실제 파일과 다르므로 현 파일 해시와 내장 renderer 해시를 docs/pkm-artifact-provenance.json에 별도 기록했다. 과거 패키지 핀은 추정하지 않는다.

HTML에는 실행되는 발표자 노트 요소가 없다. 빈 예시는 주석에만 존재한다. 원본 안내 문서의 발표자 전환 메모, 제작 파일, 이전 버전 및 볼트의 다른 내용은 공개하지 않았다. Pretendard 라이선스는 동일 글꼴의 기존 공개 OFL 사본을 동봉했다.

읽기 화면은 발표의 요약 안내라고 명시한 새 Markdown이다. 기존 추출기의 합성 section 앵커를 원본 발표 링크로 오인하지 않도록 읽기 안내의 원본 링크는 실제 엔진이 지원하는 #1–#18을 사용한다. 그림 장의 원문을 추정해 전사하지 않는다.

포스터는 2026년 10월에 제작한 종료 행사의 AI 요약·재편집 사례로 표시한다. 다른 연사의 원본 발표를 본인 작품으로 등록하지 않는다. 현재 rc5 화면/PDF 내용은 그대로 두고 등록본 canonical/OG 주소만 변경했다. 기존 실험 주소와 실험 색인 제외 규약은 유지한다. 내용만 등록했으므로 사이트 정책2.4.0을 유지한다.

## 검증

- build: 29 generated routes, 32 non-legacy HTML pages의 로컬 링크·공개 정책 검사 통과.
- check: 50 files, errors/warnings/hints 모두0. test:33 passed.
- Edge actual DOM: 일반14경로 ×375·768·1440 ×light/dark=84화면, 기존/신규 포스터3경로 ×같은6조건=18화면. 총102조건에서 문서 가로넘침/깨진 이미지 없음.
- 실제 CSS 폭은 모바일376px(375±1 규약 충족),768px,1440px. 사이트 모바일 높이800px, 포스터667px.
- 기존 rc5와 등록 사본을 각각 실제 이전/다음 버튼으로 전환 측정: 두 장의 외곽·제목·일시장소 기하 차이0px. 모바일 본문 폭 비율93.37%, 잘림0.
- 포스터 자동 순환1장 light →2장 dark 확인. 사양의4초 간격/독립A2 1쪽 유지. 등록본의 별도 카카오톡 실제 캐시 미리보기는 아직 확인하지 않았으며 기존 실험 주소에서의 사용자 확인과 구분한다.
- 검색 원음 +발표유형+포스터포함+목록:1개 결과. 문단 #section-12 →원본 #12 이동,뒤로가기URL/필터복원 확인.
- HTML ArrowRight1→2,End→18,Home→1과 새 페이지 진입의 #12 동작 확인. CSS 고정 stage의 body높이0 때문에 body키입력 대신 보이는 원본 제어 버튼을 사용했다.
- F 단축키의 실제 전체화면 진입은 이번 Edge 자동조작에서 확인되지 않았다. 원본 엔진 코드는 수정하지 않았으며 통과로 주장하지 않는다.
- PDF18쪽,1440×810pt,주석0. 포스터 PDF는 기존 A2 1쪽 CMYK 파일과 바이트 동일.

## 검사 시행착오

이전 포스터 로컬 서버가8796/8797에서 실행되고 있어 최초 로컬 페이지가404였다. 사용 중인 서버는 변경하지 않고 새9719포트에서 절대 dist경로로 검사했다. 비활성 포스터의 DOM박스는0이므로 동시 측정은 잘못된 큰차이를 만들었다. 다음 버튼으로 각각 활성화한 상태를 비교하는 방법으로 교정했다. 제품 파일은 변경할 필요가 없었다.

## 배포 및 복구

이 변경은 원본HTML/PDF,읽기 안내,대표 이미지,포스터 리소스 등록이다. main의 이전 정상 기준은30ae68aa32bfc81de2c678d2dc95f6106b52bb9d. 배포 실패 시 해당 Vercel 배포로 되돌리거나 이 콘텐츠 등록 커밋을 revert한다. 기존 실험 포스터와 AI 읽기 파일럿 주소는 영향받지 않는다.

정확한 연구 근거:
- AS016: research:rr-9d024df632d9a2ccc892b1065cad252b:82ca6f0c8655403beeaa77afa9dbe5a50a5000f00f95d57b58e11e1aa7fbf769
- AS016 검사 보정: research:rr-9d024df632d9a2ccc892b1065cad252b:6213dc358dcdf2ae9e4a01abf9356a2440f3dd14806b328b65561ea0e4a0e38d
- PS07: research:rr-ebcdf3fe5e952f1797668a6df93ec1ac:b88de35440326ec12cb6f9a507aaa4cfdefec88ee9489cfec598abe50cf3d944

