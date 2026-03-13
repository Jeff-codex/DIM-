# Kickoff Baseline

## Objective

Rebuild DIM from a clean slate with a controlled repository, explicit infra assumptions, and no dependency on the deleted legacy project.

## Confirmed inputs

- Project root: `C:\Users\DIM(depthintelligencemagazine)`
- Git remote: `https://github.com/Jeff-codex/DIM-.git`
- Production domain: `https://depthintelligence.kr/`
- Infra provider: Cloudflare
- Chosen application stack: `Next.js 16 + TypeScript + Cloudflare Workers`

## Guardrails

- Do not reuse deleted project artifacts unless they are intentionally reintroduced later.
- Do not touch unrelated projects, especially `Dliver`.
- Keep secrets out of Git and store them in Cloudflare/project secret stores.

## Recommended starting sequence

1. Build the public web surface first in `apps/web`.
2. Keep deployment on `Cloudflare Workers`, not Pages, for the primary app runtime.
3. Confirm Cloudflare data services:
   - `D1` for relational data
   - `R2` for media assets if uploads are needed
   - `KV` only for cache/session-like lightweight state
4. Define the first milestone:
   - landing page
   - article model
   - admin authentication
   - deployment pipeline

## Minimum milestone recommendation

The safest first milestone is:

1. launch a branded public shell on the real domain
2. wire staging and production environments
3. prove database connectivity
4. add one vertical slice such as article listing/detail

## Current checkpoint

As of `2026-03-13`, the repository has moved beyond the initial bootstrap:

1. the public web app exists in `apps/web`
2. the current site is a Korean-first editorial intelligence magazine draft
3. review previews are deployed through the `dim-preview` Pages project
4. production runtime remains `Cloudflare Workers`
5. the next-session restart order is tracked in `docs/session-resume.md`
