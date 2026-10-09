# PS10 · 모바일 HTML의 공유 미리보기

정책2.4.0 / 스킬1.2.0-rc.5 / 종이 렌더러rc4 유지.

카카오톡 미리보기 미노출 보고를 조사했다. 기존 HTML에는 초기 OG가 있었으며 일반·카카오 User-Agent에서 HTML/PNG 모두200이었다. 실제 카카오 수집 IP 및 앱 캐시 성공까지 입증한 것은 아니다. 공식 metadata debugger는 로그인 화면으로 실제 카드 확인은 미완료다.

순환 생성 경로가 인쇄용 A2 세로 이미지를 OG로 재사용하고 4,325,472byte 내장 HTML을 게시하는 약점을 확인했다. 신규 경로는1200×600 RGB 공유 이미지·해시 파일명·초기 절대 OG와181,991byte 공개 HTML을 생성한다. 글꼴과PDF는 별도 파일로 제공한다. 오프라인HTML은4,325,904byte로 동일 본문과PDF를 계속 내장한다. 공개 파일은 명시적 해시 목록만 게시한다.

- Python27검사: 공개/오프라인 본문 일치, 정확한OG 크기, 게시 대상 URL 갱신, 파일 변조/허용목록 밖 자산 거절.
- 사이트33검사, build/check/content:check 통과. OG누락/늦은head가 파일 해시 갱신만으로 통과하지 않는 회귀검사 포함.
- Edge375(실측376)/768/1440px, 두 테마114화면. 가로 넘침·깨진 이미지0. 화면 밖 lazy이미지는 미로딩과 구분.
- 두 장×세 크기×두 테마12측정. 시트/제목/행사정보 위치 편차0px, 같은 배율/논리폭, 잘림0. 모바일 본문 가로점유율93.43%. 교차테마·동기화 프레임·읽기7블록·초점 복귀, 한글읽기 검색1건 확인.
- A2 PDF SHA256 d045085d18007bb253fd5829cb0c910398b5695e00625518a38d5d966c1630d7 보존. 종이 재편집 없음. 기존 단일포스터/발표파일 바이트 보존.
- 공유 이미지 실제 시각 확인. 카카오 실제 카드와 캐시 미검증. HTML256KiB/head64KiB/이미지1MiB는 프로젝트 자체 예산이며 공식 카카오 한도로 주장하지 않는다.

공식 근거: https://devtalk.kakao.com/t/scrap-url/116202 및 https://developers.kakao.com/docs/ko/tool/common .
설치·OS·EJ핵심8파일과 EJrc14관리1212파일을 해시 검증했다. EJ공식 실행9출력이 동일하고 공개준비7파일의 제목/OG/폰트 경로가 올바르다. EJ의 GitHub에는 시험 자료를 업로드하지 않았다. OS인제스트 완료; 기존 비관련 링크오류14/경고16은 보존하고 포스터범위0을 확인한 기존 범위예외를 기록했다. EJ업데이트백업 cfd3704ae65948be83449a534aaf8e47.
연구: research:rr-5107dcb3a351649bf07c26c031c27256:16d4f6f770594cb76d9bec724bd5889fcc1c8c483f6ef701a91dd2760a0eb698 .
복구 기준 main69a3679fbb680e34dfbbaaeffac369974fcda68b / VercelHuGUXB7ojcvHvzo8D2ZBwfJWgCqR. 변경revert 후동일 release검사/재배포. 후보/공개/설치 전사본은 관리작업공간 poster-ps10-before/public-before/install-backup에 보존.
