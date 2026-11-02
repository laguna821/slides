# HTML 슬라이드 공용 폰트 적용 — Claude 전달문

Cloudflare 공용 폰트가 준비됐습니다. 2026-11-02 폰트 8개와 CSS·라이선스를 공개 HTTP로 검증했습니다. 원본 SHA256·크기, font/woff2, CORS *, 1년 immutable 캐시를 확인했습니다.

현재 작업하는 HTML에서 내장 base64 SameTone과 중복 로컬 폰트 파일 참조를 아래 공용 자산으로 바꿔 주세요. 보관 원본은 유지하고 웹 게시 파생본에서 교체하세요. 기존 발표 엔진/버전, 본문, 발표자 노트, 글자 굵기와 줄바꿈은 보존해 주세요. 다른 서체를 쓰는 부분은 SameTone으로 임의 교체하지 마세요.

```html
<link rel="stylesheet" href="https://achmage-fonts.laguna821-c08.workers.dev/css/sametone/1.000/0399e9ab5a130798424abd431acec9859ba8a3c1b7584cac271c05902fcf98a9.css">
<style>
  body { font-family: 'Achmage SameTone', sans-serif; }
</style>
```

SameTone Full 1.000, 가변 굵기 100–900입니다. 기존 CSS가 `SameTone` 등의 별칭을 쓰면 font-family 참조를 일관되게 바꾸거나 아래 동일 바이너리 주소를 기존 @font-face의 src에 넣으세요. CSS 링크 방식과 별도의 동일 폰트 @font-face를 중복 적용하지 마세요.

SameTone WOFF2:
https://achmage-fonts.laguna821-c08.workers.dev/fonts/5ddc1264367dc547619dbae3f16df530cb74209f8d43808e86268d8cf9406d16.woff2

기존 Pretendard Variable을 유지해야 하는 부분의 WOFF2:
https://achmage-fonts.laguna821-c08.workers.dev/fonts/9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4.woff2

공용 베이스: https://achmage-fonts.laguna821-c08.workers.dev

정적 배포물에 해당 폰트 바이너리/base64가 남지 않는지, 한글·영문과 100/400/700/900 굵기, 폰트 네트워크 요청·중복 다운로드·줄바꿈을 확인한 뒤 이전/이후 HTML 크기를 보고해 주세요. 온라인 공용 자산 방식이므로 필요하면 별도의 오프라인 원본을 보존하세요.
