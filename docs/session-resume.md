# DIM Session Resume

## Current checkpoint

- Date: `2026-03-20`
- Branch: `main`
- Commit: `d8f2791` (`docs: prepare DIM production hardening rounds`)
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
- `apps/editorial-generator` 외부 서비스가 추가됐고, 로컬에서 실제 OpenAI 호출과 본찰력 초안 생성 응답을 확인했다.
- Cloudflare runtime direct OpenAI path는 region restriction으로 fallback되므로, 실사용 고품질 초안 생성은 외부 generator 경유 구성을 기준으로 진행한다.

## Latest verified preview

- Canonical review alias: `https://review-current.dim-preview.pages.dev`
- Editorial runtime preview: `https://dim-web-editorial_preview.depthintelligence.workers.dev`
- Production-candidate runtime: `https://dim-web-production_candidate.depthintelligence.workers.dev`
- Deprecated legacy worker: `https://dim-web.depthintelligence.workers.dev` (do not use as a canonical review or hardening target)

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
2. Read `docs/production-hardening-rounds.md` before starting production hardening.
3. If the task needs planning or prioritization, read `docs/agent-kit/README.md` and `docs/agent-kit/dim/WEEKLY_BRIEF.md`.
4. Check repository state with `git status --short`.
5. Confirm the current checkpoint is still `main` at or ahead of `d8f2791`.
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
   - `/articles/ai-work-tools-are-becoming-management-layers`
   - `/about`
   - `/submit`
13. Share only the verified external preview URL. Never hand off localhost.

## Most likely next product tasks

- Production hardening rounds:
  - Cloudflare Access for `/admin`
  - Turnstile keys and production submit protection
  - production-candidate smoke for `submit -> inbox -> triage -> draft -> snapshot`
  - queue consumer hardening and job visibility
  - monitoring / alerting / failure visibility
- Real-domain deployment only after those rounds are signed off
