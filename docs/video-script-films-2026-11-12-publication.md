# 영상 대본 스킬로 만든 모션 두 편(2026-11-12) · 게시 준비

상태: **검수 뒤 상시 게시 위임에 따라 게시**. 소유자가 2026-11-12 Aside 세션(qdesP9YH2BCvE6Oc, 08:10:01Z)에서 “웹사이트 규약에 따라서 에스프레소랑 노먼 도어 작품을 각각 등록하되, 이 두개는 각각 Pele for Researchers랑 생각이 맛이되다 대신 대표작으로 최신 업데이트 하면서 등록”하라고 요청했습니다. [게시 확인 규약](UPLOAD-CONTRACT.md)의 상시 게시 위임으로 현재 digest/reviewHash에 결합해 반영합니다. 공용 발표 엔진, 사이트 코드, 화면 규칙은 바뀌지 않았습니다.

## 등록한 작품

| 작품 | 한국어 | 영어 | 대표작 자리 |
|---|---|---|---|
| 노먼 도어 · 또 틀렸다, 그런데 누가? (90초, 한국어 화면 문장) | `/motion/norman-door/` | `/en/motion/norman-door/` (Norman Door · Wrong Again, but Who?) | 2번. 이전: 생각이 맛이 되다(meal) |
| 에스프레소는 크레마보다 오래되었다 (150초, 영어 화면 문장) | `/motion/espresso/` | `/en/motion/espresso/` (Espresso, Older Than Its Crema) | 3번. 이전: Achmage Pele for Researchers(pele-atlas) |

- 두 편 모두 kind `motion`, status `selected`, visibility `listed`, seo `index`, 등록일 2026-11-12입니다. 선별 이유(featuredReason)와 제작 방식(productionNote)을 적었습니다.
- 생각이 맛이 되다와 Achmage Pele for Researchers는 featuredOrder만 지웠습니다. 두 작품의 공개 상태와 상세 페이지는 그대로이며, 두 상세 페이지의 web-dist HTML은 운영판과 바이트까지 같습니다.
- 대본은 영상 대본 스킬(Achmage Video Script 1.0.0)로 쓰고, 영상은 Motion Art Director 4.1.0으로 만들었습니다. 스킬과 예제는 [laguna821/Achmage-Skills](https://github.com/laguna821/Achmage-Skills/tree/main/Video-Script)의 `Video-Script/`(커밋 ca29c81)에 있습니다.

## 영상, 포스터, 출처

- 영상: Achmage-Skills 커밋 ca29c81에 고정한 raw 주소입니다(노먼 도어 7,256,476바이트, 에스프레소 26,192,221바이트, 둘 다 1920×1080 30fps). 기존 모션 작품(meal, racing)과 같은 방식이며, raw 주소는 구간 요청(206)을 지원합니다.
- 포스터: 완성본의 실제 프레임입니다(노먼 도어 8.5초, 에스프레소 9.0초, 1280×720 JPG). 사이트 R2 자산으로 등록했습니다(sha256 `a739dbd1…`, `7e826113…`).
- 출처: 인용, 음악, 효과음, 실사 영상, 특허 도면의 출처와 조건은 각 예제의 `credits.md`에 있고, 상세 페이지의 출처 링크와 영상 크레딧이 그 파일을 가리킵니다. 에스프레소의 실사 영상 넷은 Pexels, 1884년 도면은 Wikimedia Commons(Public domain), 1903년 도면은 미국 특허 726,793입니다. 두 편의 음악은 Pixabay의 “Piano - Piano Music”(Pavel Bekirov)입니다.

## 영어 페이지

- 영어 문구 45개를 `content/i18n/en.json`에 더했습니다(제목, 요약, 제작 방식, 선별 이유, 대체 텍스트, 크레딧, 링크 이름, 생성되는 개수 문구).
- 에스프레소의 영어 제목은 대본 제목 “Espresso Is Older Than Its Crema” 대신 “Espresso, Older Than Its Crema”로 적었습니다. 대본 제목은 1280×620 첫 화면의 카드 폭(235px)보다 4px 길어 두 줄이 되고, 대표작 2×2가 화면 아래로 6px 넘쳤습니다. 노먼 도어의 영어 제목은 한국어 제목처럼 짧게 “Norman Door · Wrong Again, but Who?”로 적었습니다.
- 노먼 도어 영상의 화면 문장은 한국어입니다. 영어 페이지의 대체 텍스트에는 포스터 문장의 뜻을 영어로 적었습니다.

## 검증

- 전체 200개 경로 가운데 184개는 web-dist HTML이 운영 중인 게시본(a9248ee, 2026-11-09 배포)의 응답과 SHA-256까지 같아 그 게시본의 검수를 이어받았습니다(release-review.json의 retainedEvidence.unchangedRoutes).
- 바뀐 경로 16개(홈, 아카이브, Motion, 영상 목록의 한·영 8개와 새 상세·삽입 페이지 한·영 8개)를 375/768/1440 × 라이트/다크 = 96개 화면으로 실제 web-dist 미리보기에서 새로 측정했습니다. 가로 넘침, 깨진 이미지, 페이지 오류 모두 0건입니다.
- 아카이브 검색(한·영)의 결과, 빈 결과, 초기화를 실행했습니다. 바뀐 읽기 페이지는 없습니다.
- 홈 첫 화면: 1280×620, 1366×625, 1440×760, 1920×940, 2560×1290에서 한·영 모두 소개와 대표작 네 장이 스크롤 없이 들어갑니다.
- 화면 확인: 한국어 홈(1440 라이트), 영어 홈(1440 다크), 노먼 도어 상세(1440 라이트), 에스프레소 영어 상세(375 다크)를 스크린샷으로 보았습니다.
- 재생: 미리보기의 에스프레소 상세에서 Chromium이 raw 주소의 영상을 재생하고 100초 지점으로 이동했습니다(readyState 4, 1920×1080). 상세 페이지의 바깥 링크(GitHub Pages 예제, 스킬 폴더, credits, 제작 기록)는 모두 200을 돌려줍니다.
- 빌드 검사: 218개 HTML, 영어 정적 페이지 76쌍, 공용 SameTone 해시, 읽기 원문 보존, 영어 번역 누락 0.
- 검증하지 않은 것: 영상의 소리와 미감은 이 등록 작업에서 판정하지 않았습니다. 노먼 도어의 음악은 소유자가 세 판을 들어 보고 고른 것입니다.

기계·관측 기록: validation/release-review.json, validation/upload-request/.

## 게시 단계

소유자가 지시한 [상시 게시 위임](UPLOAD-CONTRACT.md)에 따라 검수를 통과해 현재 digest/reviewHash에 결합된 버전을 확인 요청 없이 main에 반영하고, Vercel 운영 화면을 확인한 뒤 결과를 보고합니다.
