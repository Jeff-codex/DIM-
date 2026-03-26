# DIM Session Resume

## Current checkpoint

- Date: `2026-03-24`
- Branch: `main`
- Commit: `a5157de` (`refactor: polish DIM public archive navigation`)
- Remote: `origin -> https://github.com/Jeff-codex/DIM-.git`
- Public app: `apps/web`
- Runtime target: `Cloudflare Workers`
- Review preview target: `Cloudflare Pages` project `dim-preview`
- Real production deploy now uses split tokens:
  - `CLOUDFLARE_WORKERS_TOKEN` for service deploy
  - `CLOUDFLARE_SECURITY_TOKEN` for route reconcile

## What is already implemented

- DIM public site has been reworked into a more uniform magazine system inspired by the 9works reference grammar.
- Core routes remain:
  - `/`
  - `/articles`
  - `/articles/[slug]`
  - `/about`
  - `/submit`
- Home and `/articles` now share the same top-level reading structure:
  - dark magazine intro
  - centered category channel bar
  - uniform archive-style card grid
- Home and `/articles` currently hide `시장 신호` in the channel bar and center the remaining three categories.
- Article list cards are flattened to image + title + short excerpt with minimal/no list metadata.
- `/about` and `/submit` were reworked into the same black/white magazine tone instead of stacked document cards.
- `피처 제안` page rhythm was simplified so the explanatory side reads in fewer chapters and the form stands as one clear intake block.
- Internal page transitions now use a mirrored fade-out / fade-in approach that is closer to the 9works reference than the earlier overlay/blur attempts.
- SEO groundwork remains in place:
  - `Organization` JSON-LD at the app level
  - `Article` JSON-LD on article detail pages
  - article intros strengthened with clearer brand/service references
- Review preview workflow and Workers production workflow remain intentionally separated.
- DIM-only operational agent kit is now synced and refined inside the repo under `docs/agent-kit`.
- Preview editorial workflow now exists end-to-end on Workers:
  - `/submit`
  - `/api/proposals`
  - `/admin/inbox`
  - `triage -> in_review`
  - `/admin/drafts/[proposalId]`
  - `/admin/drafts/[proposalId]/preview`
  - `/admin/drafts/[proposalId]/snapshot`
- Preview editorial infrastructure is now provisioned:
  - D1: `dim-editorial-preview`
  - R2: `dim-intake-preview`
  - Queue: `dim-editorial-preview`
- Production editorial infrastructure baseline is also provisioned:
  - D1: `dim-editorial-prod`
  - R2: `dim-intake-prod`
  - Queue: `dim-editorial-prod`
- `시장 신호` category has been fully removed from the public/category data model.
- Public `/submit` wording no longer exposes `runtime`, `preview`, `inbox ID`, `원문 보관`, or `상태 이력`.
- Runtime smoke now covers:
  - submit
  - inbox
  - triage
  - draft preview
  - publication snapshot
- Real domain `depthintelligence.kr` is now serving the current production runtime and passes production smoke.
- DIM의 해석 철학은 `본찰력`으로 고정됐다. 이후 편집 판단과 자동 초안 생성은 모두 `무엇이 나왔나`보다 `무엇이 바뀌나`, 기능보다 구조 변화와 운영 맥락을 먼저 읽는 기준을 따른다.
- 공개 페이지와 편집 시스템은 같은 정보를 다뤄도 서로 다른 문법으로 설계한다.
- AI 초안은 실제 전문 에디터가 1차 편집을 마친 듯한 품질을 목표로 한다.
- 소비자용 제출 문구를 초안 본문에 기계적으로 복사하지 않는다.
- `무엇이 바뀌었나`, `어떤 구조를 봐야 하나`, `왜 지금 중요한가`, `누구에게 먼저 보이는가`는 생성 규칙이지, 그대로 제목이나 섹션명이 아니다.
- `apps/editorial-generator` 외부 서비스가 추가됐고, 로컬에서 실제 OpenAI 호출과 본찰력 초안 생성 응답을 확인했다.
- 외부 generator는 `/ready`, `/v1/editorial/draft`, `railway.json`, `render.yaml`, `npm run smoke`까지 준비됐고, 남은 것은 외부 호스팅 URL과 shared secret를 Cloudflare runtime에 연결하는 단계다.
- Cloudflare runtime direct OpenAI path는 region restriction으로 fallback되므로, 실사용 고품질 초안 생성은 외부 generator 경유 구성을 기준으로 진행한다.
- public SEO/GEO work now includes:
  - static category landing routes
    - `/articles/startups`
    - `/articles/product-launches`
    - `/articles/industry-analysis`
  - category-specific metadata and landing intro copy
  - sitemap entries for the category landings
  - structured data for home and category landing pages
- public archive UX now includes:
  - editorial index-style category tabs on home and `/articles`
  - local filter search bar on `/articles` and category landing pages
  - grayscale/black hover-active treatment aligned to DIM brand mood
- favicon/app icons were replaced with DIM logo-based assets.

## Latest verified preview

- Canonical review alias: `https://review-current.dim-preview.pages.dev`
- Editorial runtime preview: `https://dim-web-editorial_preview.depthintelligence.workers.dev`
- Production-candidate runtime: `https://dim-web-production_candidate.depthintelligence.workers.dev`
- Deprecated legacy worker: `https://dim-web.depthintelligence.workers.dev` (do not use as a canonical review or hardening target)
- Latest production-candidate public review used for archive/navigation polish:
  - `/`
  - `/articles`
  - `/articles/startups`
  - `/articles/product-launches`
  - `/articles/industry-analysis`
  - `/articles/ai`

## Guardrails

- Do not touch `Dliver`.
- Do not reuse or inspect other project resources unless the user explicitly asks.
- Keep secrets out of Git.
- Do not deploy to the real domain without explicit user approval in that turn.
- Real-domain deployment is intentionally deferred until the user declares the build complete.
- Continue DIM work with the existing subagent set whenever possible.
- Treat agent collaboration as recursive improvement: assign, review, integrate, and feed the result into the next pass.

## First actions for the next session

1. Read this file and `docs/deployment-checklist.md`.
2. Read `docs/production-hardening-rounds.md` only if the task returns to infra hardening.
3. If the task needs planning or prioritization, read `docs/agent-kit/README.md` and `docs/agent-kit/dim/WEEKLY_BRIEF.md`.
4. Check repository state with `git status --short`.
5. Confirm the current checkpoint is still `main` at or ahead of `a5157de`.
6. Reuse the existing DIM agents first and continue from the latest integrated findings rather than starting fresh.
7. If code changed, run from `apps/web`:
   - `npm run lint`
   - `npm run build`
   - `npm run build:static`
8. If the user wants a review URL, run:
   - `npm run preview:deploy -- <branch-name>`
9. For editorial runtime work, verify:
   - `npm run smoke:editorial-runtime -- --base-url=https://dim-web-editorial_preview.depthintelligence.workers.dev`
10. For production hardening without the real domain, use:
   - `npm run preview:production-candidate`
   - `npm run smoke:editorial-runtime -- --base-url=https://dim-web-production_candidate.depthintelligence.workers.dev`
11. For real production deploy, confirm both split tokens are present:
   - `CLOUDFLARE_WORKERS_TOKEN`
   - `CLOUDFLARE_SECURITY_TOKEN`
   - optional `CLOUDFLARE_ZONE_ID`
12. Verify public review paths:
   - `/`
   - `/articles`
   - `/articles/ai`
   - `/about`
   - `/submit`
13. Share only the verified external preview URL. Never hand off localhost.

## Next queued product checklist

- Add a dedicated internal workflow for `산업 구조 분석` content that DIM produces in-house.
- Scope the new workflow as a separate CMS/editorial capability, not a public proposal intake path.
- Required product surface for the next round:
  - internal `산업 구조 분석` feature creation entry
  - structured editor flow for in-house analysis drafting
  - publish-room handoff for that internal content type
  - publication path that lands in the existing public `산업 구조 분석` category
- Keep the current external proposal workflow intact while adding the internal authoring path.

## Most likely next product tasks

- Internal `산업 구조 분석` authoring workflow in CMS/editorial system
- FAQ / structured-data follow-up for category landing pages if public SEO work resumes
- Further archive/search polish only after internal workflow requirements are clarified
