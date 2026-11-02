> 정책 6.0.0 우선: [웹 배포 용량 규약](STORAGE-CONTRACT.md)을 적용한다. PDF·ZIP은 보관용이며 웹 게시 필수 조건이 아니다. 웹 파생본은 R2 자산 링크를 사용하고 web-dist만 배포한다. 아래 기존 PDF·바이트 보존 규칙은 원본 보관·선택적 인쇄 작업에 한정한다.

# 자동 감지·한영 검토·사용자 확인 게시 규약 · 5.1.0

## 공용 폰트 자동 재사용 · 6.6.0 / 2026-11-02

모든 새 자료·HTML·수정 업로드는 `npm run upload:prepare`를 사용한다. 폰트 정본은 `content/font-cdn.json`이며 공개 주소는 `https://achmage-fonts.laguna821-c08.workers.dev`의 바이트 해시 고정 URL이다. 같은 해시는 재사용하고 새 폰트만 라이선스와 함께 등록·배포·응답 검증한다. 웹 CSS·preload·내장 폰트·상대 경로 모두 같은 공용 주소로 연결한다.

일반 CI/Vercel의 `release:verify`는 업로드하지 않는다. 미등록 폰트, 검증 영수증 불일치, web-dist의 폰트 바이너리·내장 폰트는 실패해야 한다. `assets:sync`만 실행하고 게시하거나 검사를 건너뛰지 않는다. 원본 HTML·폰트 파일·엔진 pin·노트·기존 서체 선택은 보존한다. 사이트 UI의 SameTone Full 1.000 가변 굵기100–900도 유지한다.

이는 폰트 전달 기본값이다. 운영 게시 여부는 아래 상시 게시 위임을 따른다.

## 상시 게시 위임 · 2026-11-02

사이트 소유자가 “막히먄 사이트 규약 고쳐 내 사이트인데 내 집인데 내가 불편하면 안되지 / 업로드도 굳이 왜 내허락 일일히 받는거야? / 이건 당장 규약 고쳐”라고 지시했다(2026-11-02T14:05:18.666Z, 세션 d84382cc-a386-4a0d-a01c-033cca6a0604). 이 지시가 2026-10-13의 버전별 확인 규칙을 대신한다.

- 에이전트는 업로드마다 사용자 확인을 묻지 않는다. 검토(release review)가 통과하고 현재 digest/reviewHash에 결합된 버전은 바로 게시한다.
- `validation/publication-approval.json`의 decision은 위 원문·세션·시각에 authorization `publish-when-verified`, requestScope `standing-owner-delegation`을 기록하고, 검토 완료 뒤의 boundAt으로 현재 digest/reviewHash에 결합한다. 소유자 발언을 검토 이후 발언으로 꾸미지 않는다.
- 검토·한영·용량·폰트·노트·기존 URL 보존 검사, `release:verify`, `approval:check`, 원격 변경 절차는 면제하지 않는다. 검사가 실패하면 게시하지 않고 원인을 보고한다.
- 게시 뒤 변경 요약·운영 확인 결과·미검증 항목을 보고한다.
- 소유자가 다시 확인을 받으라고 하면 `publication-approval.ts`의 standingOwnerDelegation 조항을 지워 버전별 확인으로 되돌린다.

## 자동으로 시작하는 범위

이 저장소의 모든 push와 PR에서 경로 필터 없이 검사와 확인 요청서를 생성한다. 자료·메뉴·설명·이미지·서체·번역·빌드 규약 변경도 대상이다. 에이전트는 사용자가 포트폴리오에 자료를 올리거나 수정하라고 요청하면 이 절차를 자동 적용한다. 사용자가 규약을 다시 언급할 필요가 없다.

PC의 임의 폴더·Dropbox 전체를 상시 감시하는 기능은 아니다. 저장소 밖 자료는 명시적으로 등록한 뒤 처리한다. 폴더 전체를 자동 공개하거나 타인 자료를 임의로 등록하지 않는다. 로컬 파일 변경은 `npm run upload:prepare`에서, 원격 변경은 GitHub push/PR에서 감지한다.

## 확인 전 자동 준비

1. 기존 공개 원본을 보존하고 새 작업을 명시적으로 등록한다.
2. 한국어와 영어의 제목·설명·본문·대체 텍스트·검색·메타데이터·대응 경로를 함께 준비한다. 완전한 읽기에는 양언어 텍스트·Markdown·PDF가 필요하다. 번역 누락, 오래된 PDF, 끊어진 링크는 게시 불가다.
3. 웹 UI·본문은 **Achmage SameTone 1.000 Full**, 가변 굵기100–900을 사용한다. 공식 WOFF2 경로·SHA256과 연결을 검사한다. 원본 슬라이드·포스터·영상·로고 및 승인된 HanMark PDF 프로필은 보존한다. 폰트나 언어를 예외로 바꾸려면 그 변경을 확인서에 명시해 별도 확인받는다.
4. 기존 화면·읽기·PDF 계약에 따른 검토를 완료한다. `npm run upload:prepare`로 변경 파일, 한영 URL, 서체, 검토 상태, 입력 해시가 담긴 요청서를 만든다. 실패 시 요청서에 미완료 상태를 표시한다. GitHub Actions의 Summary와 `portfolio-upload-request` 아티팩트에서도 확인한다.
5. 상시 게시 위임(위 절)이 유효하면 확인을 묻지 않고 게시한 뒤 변경 요약·한영 결과·검토 결과·미검증 항목을 보고한다. 위임이 철회된 경우에만 사용자에게 이 버전의 게시 여부를 한 번 확인하며, 대답이 없거나 불명확하면 배포하지 않는다. 인증 보호된 미리보기를 확인했다고 주장하지 않는다.

## 확인 후 자동 실행

상시 게시 위임이 유효하면 그 원문을 decision에 쓰고, 위임이 철회된 경우에는 명시적 사용자 답변을 받은 에이전트가 `validation/publication-approval.json`에 version1, status approved, scope portfolio-production, 현재 policyVersion/digest/reviewHash 및 decision(by:user, quote:사용자 원문, sessionId:실제 세션ID, at:확인 시각)를 기록한다. 생성 스크립트가 승인을 자동 채우지 않는다. 요청서 준비나 이 규약 자체의 존재는 승인이 아니다.

`npm run approval:check`를 통과한 동일 파일·검토만 main으로 반영하고 Vercel에 배포한다. 사용자에게 같은 승인 재질문을 하지 않는다. 배포 성공 후 실제 한영 페이지·폰트·다운로드·기존 URL을 검증하고 결과를 보고한다. `validation/published-baseline.json`은 성공한 운영판의 커밋·sourceFiles로 갱신한다.

소스 또는 검토 결과가 바뀌면 digest/reviewHash가 달라져 승인이 무효가 된다. 다시 검토한 뒤 상시 위임으로 새 digest에 결합하고, 위임이 철회된 경우에는 변경분을 다시 보여주고 새 확인을 받는다. 거절·보류 시 승인 파일을 제거하거나 status를 revoked로 바꾸고 운영판을 유지한다. 자동으로 재승인하거나 승인 오류를 피하려고 검사를 제거하지 않는다.

Vercel production 빌드는 `publication-approval.ts`에서 현재 승인 없음을 차단한다. preview와 일반 CI 검증은 승인 전에도 가능하다. 이는 사용자 확인을 추적하고 우발적 게시를 막는 운영 장치이며, 저장소 관리자/에이전트의 고의적인 코드·승인 기록 위조까지 막는 외부 보안 서명은 아니다. 상시 알림이나 독립적인 GitHub 승인자 강제는 별도 서비스 설정 없이 제공한다고 주장하지 않는다.

근거: 사용자 결정 `decision-0271c276b9742d50a151514502df3b530e421af639afce2fda6bafbb5ceb170b`; 기존 구현 R-002 `research:rr-e2bb36868eb49f6f5030e99718feddd2:55d90254e0698c5e5456b24a82533cee45819e9e8c1e1603cae40cb1d7a1e70e`.

## Pele 전체 공개의 명시적 실행 위임 · 2026-10-22
이번 세션의 사용자는 “게시 확인 굳이 물어보지 말고 공개까지 하라고” 지시했고, 뒤이어 전체 사례를 Vercel 안에서 로그인 없이 공개하도록 구체적으로 수정했다. 이 요청에만 `pele-complete-public-migration` 위임을 기록한다. 실제 사용자 발언 시각과 검토 결과를 결합한 `boundAt`을 구분하며, 사용자 발언을 검토 이후 발언으로 꾸미지 않는다. 동일한 정책·현재 digest·reviewHash와 통과한 검토는 그대로 필수다. 다른 작업·세션에 포괄 승인을 적용하지 않는다.

## 연구 갤러리 연결 계획의 실행 위임 · 2026-10-24
사용자는 「Pele Atlas 개편 — 대표 14종과 공개 연구 갤러리 연결」의 공개·검증·게시 절차를 포함한 계획에 “Implement the proposed plan.”으로 실행을 지시했다. 이 요청은 기존 104개 사례 이관과 구분해 `researchers-public-gateway`로 기록한다. 실제 요청 시각은 2026-10-24T02:41:50Z이며, 해당 세션·실행 요청 turn·계획 turn을 함께 검증한다. 검토 완료 뒤 현재 digest/reviewHash에 연결하는 boundAt은 사용자 발언 시각과 별개다. 새 페이지의 검토·기존 기능 보존·언어·용량·원격 검증은 면제하지 않으며 다른 작업에 재사용하지 않는다.
