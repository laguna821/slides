# Achmage · 교육 · 발표 · 모션 스튜디오

안창현의 발표 포트폴리오, 교육 자료 아카이브, 모션 작품관입니다.

- 운영: https://achmage-slides.vercel.app/
- Astro + TypeScript 정적 사이트, GitHub `main` → 기존 Vercel `slides` 프로젝트
- 기존 발표 원본 `AI_reading_3week_pilot_20261008.html`의 URL과 바이트를 보존합니다.
- 첫 등록: 발표 1개, 모션 8개. 공개 기록에 근거해 선별작과 습작을 구분합니다.

## 개발

Node 22.12 이상(배포는 Vercel의 지원 LTS), npm을 사용합니다.

```sh
npm ci
npm run content:check
npm run dev
npm test
npm run check
npm run build
```

내용을 변경한 뒤 `content:check`를 실행하면 로컬 미리보기의 생성 데이터도 갱신됩니다. 생성된 JSON, `dist`, 검토 후보는 Git에서 제외합니다. 저장소에 비밀번호·개인 노트·초안 원문을 넣지 않습니다.

## 관리 문서

- [콘텐츠 등록·공개 정책·AI 관리 절차](docs/OPERATIONS.md)
- [배포·복구 안내](docs/DEPLOYMENT.md)
- [디자인 기준](docs/DESIGN.md), [브랜드 시안](https://achmage-slides.vercel.app/brand/)
- [검증 결과와 범위](docs/VALIDATION.md)
- [연구 근거와 발표 엔진 연결](docs/RESEARCH.md)
- [출처](docs/THIRD-PARTY.md), [이미지 기록](docs/asset-provenance.json)

웹 관리자, 회원가입, 업로드 서버, 검색 유료 서비스는 없습니다. 새 자료는 검토 후 명시적으로 등록합니다. 볼트 전체나 강의 폴더를 자동 공개하지 않습니다.
