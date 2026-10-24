# Research gallery gateway

The existing `/talks/pele-atlas/` entry introduces **Achmage Pele for Researchers** with 14 static preview cards and 15 category links. The 922-case research gallery remains at https://achmage-mermaid-research.achmage2.chatgpt.site/. The portfolio does not copy its catalog, detail payloads or renderer. It needs no gallery JavaScript or iframe.

`content/pele-researchers.json` pins the public catalog revision, selected case IDs, source hashes and deep links. Every card opens a specific example; category chips open `?type=…`. The original `/pele/` collection, atlas explore pages and social-science materials retain their routes and source files.

Preview WebP files are made from the selected cases' actual SVGs with the existing SameTone font, isolated from gallery controls. Images use the existing R2 content-addressed asset workflow. `scripts/verify-researchers-gateway.ts` checks links, counts, asset registration, absence of copied gallery files and the 500,000-byte budget, including preview images, both generated HTML pages, dedicated CSS and metadata.

Validation evidence is kept under `validation/researchers-landing/`; the repository's release review and publication approval bind the reviewed source digest. Anonymous browser checks exercise every selected example, code copy, source download and category link. Windows clipboard comparisons normalize CRLF/LF only. Actual iPhone, VoiceOver and native document-app tests are separate and are not implied by browser viewport checks. This web publication does not promote the Pele skill to a stable release.

The current user approved the plan including publication in turn `01a16bc9-34c8-7823-a254-f42c816e2324`, following plan turn `01a16bc6-716a-7083-925c-4b79f5976ca3`. The narrowly scoped `researchers-public-gateway` approval records this request separately from the earlier 104-case public migration. No verification gate is removed.

Research: R-021 `research:rr-67713abf896212f7541b508f82d61a15:46b8ee7ebd3f90020a4f2de8a89a7db5e3e867feba9ef5682caffe4b4d2dda73`.
Baseline: R-019 `research:rr-35896acc02bb47712c41d58b545b6493:d0615ad1d2e9820aa1316c7367ea2b1179ea2ea7672990ac5bcda39252ac459e`.
