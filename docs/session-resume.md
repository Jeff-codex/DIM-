# DIM Session Resume

## Current checkpoint

- Date: `2026-03-19`
- Branch: `main`
- Commit: `345b3da` (`docs: refine DIM operating kit`)
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

## Latest verified preview

- Alias: `https://refresh-preview-20260318.dim-preview.pages.dev`
- Snapshot: `https://22c4ac07.dim-preview.pages.dev`

## Guardrails

- Do not touch `Dliver`.
- Do not reuse or inspect other project resources unless the user explicitly asks.
- Keep secrets out of Git.
- Do not deploy to the real domain without explicit user approval in that turn.
- Real-domain deployment is intentionally deferred until the user declares the build complete.

## First actions for the next session

1. Read this file and `docs/deployment-checklist.md`.
2. If the task needs planning or prioritization, read `docs/agent-kit/README.md` and `docs/agent-kit/dim/WEEKLY_BRIEF.md`.
3. Check repository state with `git status --short`.
4. Confirm the current checkpoint is still `main` at or ahead of `345b3da`.
5. If code changed, run from `apps/web`:
   - `npm run lint`
   - `npm run build`
   - `npm run build:static`
6. If the user wants a review URL, run:
   - `npm run preview:deploy -- <branch-name>`
7. Verify:
   - `/`
   - `/articles`
   - `/articles/ai-work-tools-are-becoming-management-layers`
   - `/about`
   - `/submit`
8. Share only the verified external preview URL. Never hand off localhost.

## Most likely next product tasks

- DIM-specific copy and category polishing on top of the new magazine grammar
- Additional refinement of article detail pacing and transition feel after user review
- Submit page UX tightening before any real intake workflow is connected
- Final production QA before real-domain deployment
- Cloudflare Workers production deployment once the user signs off
