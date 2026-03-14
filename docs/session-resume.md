# DIM Session Resume

## Current checkpoint

- Date: `2026-03-14`
- Branch: `main`
- Commit: `7e2788b` (`feat: refine DIM editorial presentation`)
- Remote: `origin -> https://github.com/Jeff-codex/DIM-.git`
- Public app: `apps/web`
- Runtime target: `Cloudflare Workers`
- Review preview target: `Cloudflare Pages` project `dim-preview`

## What is already implemented

- DIM public site is built as a Korean-first editorial intelligence magazine.
- Core routes are in place:
  - `/`
  - `/articles`
  - `/articles/[slug]`
  - `/about`
  - `/submit`
- Every published article has one representative image.
- Product framing is aligned to:
  - `프로젝트 제출`
  - `편집 및 해석`
  - `콘텐츠 발행`
- Home/feature card rhythm has been refined so the lead feature reads with stronger editorial priority.
- Public-facing Korean copy has been tightened and de-platformed away from newsroom/CMS wording.
- Home hero statement is currently:
  - `비즈니스 구조를 읽어주는 매거진`
- Review preview workflow and Workers production workflow are separated.
- Preview URL sharing rule is already established: verify first, then share.
- Current repository state is clean and pushed to `origin/main`.

## Latest verified preview

- Alias: `https://home-copy-one-line-pass-2026.dim-preview.pages.dev`
- Snapshot: `https://b9cdb06c.dim-preview.pages.dev`

## Guardrails

- Do not touch `Dliver`.
- Do not reuse or inspect other project resources unless the user explicitly asks.
- Keep secrets out of Git.
- Do not deploy to the real domain without explicit user approval in that turn.
- Real-domain deployment is intentionally deferred until the user declares the build complete.

## First actions for the next session

1. Read this file and `docs/deployment-checklist.md`.
2. Check repository state with `git status --short`.
3. Confirm the current checkpoint is still `main` at or ahead of `7e2788b`.
4. If code changed, run from `apps/web`:
   - `npm run lint`
   - `npm run build`
   - `npm run build:static`
5. If the user wants a review URL, run:
   - `npm run preview:deploy -- <branch-name>`
6. Verify:
   - `/`
   - `/articles`
   - `/articles/ai-work-tools-are-becoming-management-layers`
   - `/about`
   - `/submit`
7. Share only the verified external preview URL. Never hand off localhost.

## Most likely next product tasks

- Final visual polish based on user review
- Home/featured card refinement if the user wants stronger editorial dominance
- Submit page refinement and eventual real submission handling
- Final production QA before real-domain deployment
- Cloudflare Workers production deployment once the user signs off
