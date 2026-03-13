# DIM Session Resume

## Current checkpoint

- Date: `2026-03-13`
- Branch: `main`
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
- Review preview workflow and Workers production workflow are separated.
- Preview URL sharing rule is already established: verify first, then share.

## Latest verified preview

- Alias: `https://polish-editorial-v1.dim-preview.pages.dev`
- Snapshot: `https://f7b0d2fb.dim-preview.pages.dev`

## Guardrails

- Do not touch `Dliver`.
- Do not reuse or inspect other project resources unless the user explicitly asks.
- Keep secrets out of Git.
- Do not deploy to the real domain without explicit user approval in that turn.

## First actions for the next session

1. Read this file and `docs/deployment-checklist.md`.
2. Check repository state with `git status --short`.
3. If code changed, run from `apps/web`:
   - `npm run lint`
   - `npm run build`
   - `npm run build:static`
4. If the user wants a review URL, run:
   - `npm run preview:deploy -- <branch-name>`
5. Verify:
   - `/`
   - `/articles`
   - `/articles/ai-work-tools-are-becoming-management-layers`
   - `/about`
   - `/submit`

## Most likely next product tasks

- Final visual polish based on user review
- Submit page refinement and eventual real submission handling
- Final production QA before real-domain deployment
- Cloudflare Workers production deployment once the user signs off
