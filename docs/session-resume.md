# DIM Session Resume

## Current checkpoint

- Date: `2026-03-19`
- Branch: `main`
- Commit: `a2cb002` (`feat: harden DIM editorial intake workflow`)
- Remote: `origin -> https://github.com/Jeff-codex/DIM-.git`
- Public app: `apps/web`
- Runtime target: `Cloudflare Workers`
- Review preview target: `Cloudflare Pages` project `dim-preview`

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

## Latest verified preview

- Canonical review alias: `https://review-current.dim-preview.pages.dev`
- Editorial runtime preview: `https://dim-web-editorial_preview.depthintelligence.workers.dev`

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
5. Confirm the current checkpoint is still `main` at or ahead of `a2cb002`.
6. Reuse the existing DIM agents first and continue from the latest integrated findings rather than starting fresh.
7. If code changed, run from `apps/web`:
   - `npm run lint`
   - `npm run build`
   - `npm run build:static`
8. If the user wants a review URL, run:
   - `npm run preview:deploy -- <branch-name>`
9. For editorial runtime work, verify:
   - `npm run smoke:editorial-runtime -- --base-url=https://dim-web-editorial_preview.depthintelligence.workers.dev`
10. Verify public review paths:
   - `/`
   - `/articles`
   - `/articles/ai-work-tools-are-becoming-management-layers`
   - `/about`
   - `/submit`
11. Share only the verified external preview URL. Never hand off localhost.

## Most likely next product tasks

- Production hardening rounds:
  - Cloudflare Access for `/admin`
  - Turnstile keys and production submit protection
  - production smoke for `submit -> inbox -> triage -> draft -> snapshot`
  - queue consumer hardening and job visibility
  - monitoring / alerting / failure visibility
- Real-domain deployment only after those rounds are signed off
