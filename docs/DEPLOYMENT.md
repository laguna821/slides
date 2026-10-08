# 배포와 복구

기존 Vercel `laguna821s-projects/slides` 프로젝트와 GitHub `laguna821/slides`를 사용합니다. 새 프로젝트나 유료 서비스를 만들지 않습니다.

## 배포 설정

- Framework: Astro
- Install: `npm ci`
- Build: `npm run build`
- Output: `dist`
- Production branch: `main`
- Root directory: 저장소 루트
- 필요한 환경변수: 없음

설정은 `vercel.json`과 잠금 파일로 관리합니다. 빌드 전에 자료 검증과 색인 생성이 실행되고, 생성 후 기존 HTML 해시·로컬 링크·공개 정책이 검사됩니다. 정적 사이트이므로 별도 서버 어댑터가 없습니다.

## 출시 순서

1. 브랜치에서 작업하고 `npm test`, `npm run check`, `npm run build`를 통과합니다.
2. 브랜치를 push하여 Vercel Preview의 Ready 상태와 URL을 확인합니다.
3. 미리보기에서 홈 → 검색 → 읽기, 원래 발표 URL, 모션 → 구간 재생·복사, 테마·모바일을 확인합니다.
4. 검증한 커밋을 `main`에 반영합니다. Vercel Production의 새 배포가 Ready인지 확인합니다.
5. `https://achmage-slides.vercel.app/`와 기존 HTML의 응답·해시, 대표 흐름을 확인합니다.

## 되돌리기

출시 전에 이전 Ready 배포의 URL·커밋을 기록합니다. Vercel 프로젝트의 Deployments에서 정상 Production 배포를 열고 Rollback/Promote 메뉴로 운영 별칭을 이전 배포로 되돌릴 수 있습니다. 메뉴 이름·권한은 현재 Vercel 화면에서 확인합니다. 이번 작업에서는 실제 롤백을 실행해 운영 상태를 되돌리지는 않습니다.

지속 가능한 코드 복구는 배포를 만든 커밋을 `git revert <commit>`으로 되돌린 새 커밋을 `main`에 push합니다. `git reset --hard`나 강제 push로 공용 이력을 지우지 않습니다. 콘텐츠 변경과 사이트 코드 변경이 나뉘어 있으면 필요한 커밋만 되돌립니다. 복구 후 홈·기존 발표·검색을 다시 확인합니다.

기존 기준 커밋: `99e2c547b7f12c184b0ed8de0f6eca6ec8774e38`. 이 기준은 홈페이지가 없는 발표 HTML 전용 상태입니다. 웹사이트 기능을 포함한 첫 정상 배포 SHA/URL은 `docs/VALIDATION.md` 및 작업 기록에서 확인합니다.

## 도메인과 미디어

첫 출시는 현재 vercel.app 주소를 사용합니다. 도메인은 이후 결정합니다. 구매처는 소유/갱신, Cloudflare는 DNS 네임서버, Vercel은 사이트 제공을 맡습니다. 연결할 때 기존 메일 등 DNS 기록을 보존하고 Vercel이 실제로 안내하는 값을 적용합니다. 임의의 DNS 값을 추정하지 않습니다.

현재 MP4는 이미 공개된 주소를 재사용합니다. 필요하면 별도 Cloudflare R2와 미디어 도메인으로 옮기고 기존 버전 참조를 유지합니다. r2.dev 주소를 새 운영용 CDN으로 채택하지 않습니다.

공식 안내: [Astro/Vercel](https://docs.astro.build/en/guides/deploy/vercel/), [Vercel domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain), [Cloudflare DNS](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/), [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/).
