# Achmage Studio 운영 규약

정책 4.0.0부터 [웹 편집본 계약](docs/EDITORIAL-CONTRACT.md)을 우선 적용한다. 원문은 보관하고 웹·복사·Markdown·검색·HanMark PDF는 검토된 편집본으로 통일한다. 편집 대응표와 링크 영수증이 없거나 오래되면 게시를 차단한다.

새 자료·메뉴·화면 변경에는 [사이트 규약](docs/SITE-CONTRACT.md)을 적용한다. 사용자 지시가 우선한다.
읽기 등록·수정에는 [전체 원문 읽기 계약](docs/READER-CONTRACT.md)을 함께 적용한다. 요약을 전체 읽기로 대체하지 않는다. 기존 읽기 4건을 포함해 생성된 모든 화면을 소급 검사하고 reader 기능 영수증을 갱신한다.
정책3.2.0부터 읽기 목차와 테마 전환은 스크롤 중 같은 고정 도구줄에 유지한다. 모든 읽기의 처음·중간·끝 실측과 테마 동기화·위치 보존·키보드 검수를 readerNavigation에 기록한다. 새 게시물에도 동일하게 강제한다.

- 콘텐츠는 content/works.json, resources.json, media.json, usages.json에 명시적으로 등록한다. 폴더 전체 공개 금지. 타인 작품을 개인 포트폴리오로 자동 등록하지 않는다.
- 사용자에게 무엇인지·누구를 위한 것인지·무엇을 열어 볼 수 있는지 설명한다. 존재하지 않는 파일 버튼을 만들지 않는다.
- 업로드 전에 npm run content:check, build, check, test를 통과한다. 이어 모든 공개 상세 페이지와 공통 화면을 375/768/1440px, light/dark로 검토한다.
- validation/release-review.json은 실제 브라우저 결과로 작성한다. 검토하지 않은 결과를 passed로 만들지 않는다. 변경 후 digest를 다시 산출하고 npm run release:verify를 통과한다.
- 메뉴·컴포넌트·스키마 변경은 content/site-policy.json 버전을 올리고 기존 자료 전체를 소급 검사한다. 새 자료만 검사하고 끝내지 않는다.
- GitHub Actions와 Vercel buildCommand의 release:verify를 제거하거나 우회하지 않는다. 검토와 배포 버전이 같아야 한다.
- 포스터는 승인된 스킬/뷰어 버전과 packageSha256, 공개 파일별 해시를 기록한다. 이전 출력 버전을 보존한다.
- 기존 HTML/PDF의 본문·주소를 보존한다. 발표자 노트 평문·비밀번호·로컬 경로를 공개 데이터에 넣지 않는다.
- 검증 완료 변경의 GitHub/Vercel 배포는 사용자에게 이미 승인된 운영 범위다. 연구 기록에 정확한 revision, 배포/복구 정보를 남긴다.

## 읽기용 PDF (사이트 정책 3.1.0)

[HanMark 읽기용 PDF 계약](docs/PRINT-CONTRACT.md)을 적용한다. 모든 공개 읽기에 첫 쪽 제목·본문 통합 A4 2단 PDF가 필수다. `npm run print:generate`로 생성하고 원문·자산·조판 입력 해시와 실제 PDF 검증을 통과해야 게시할 수 있다. 변경 시 기존 읽기 전체에 소급 적용하며 발표 PDF·A2 포스터는 별도로 보존한다.
