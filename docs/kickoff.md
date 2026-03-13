# Kickoff Baseline

## Objective

Rebuild DIM from a clean slate with a controlled repository, explicit infra assumptions, and no dependency on the deleted legacy project.

## Confirmed inputs

- Project root: `C:\Users\DIM(depthintelligencemagazine)`
- Git remote: `https://github.com/Jeff-codex/DIM-.git`
- Production domain: `https://depthintelligence.kr/`
- Infra provider: Cloudflare

## Guardrails

- Do not reuse deleted project artifacts unless they are intentionally reintroduced later.
- Do not touch unrelated projects, especially `Dliver`.
- Keep secrets out of Git and store them in Cloudflare/project secret stores.

## Recommended starting sequence

1. Decide the first shipped surface area:
   - public site only
   - public site plus admin
   - API-first
2. Lock the web stack:
   - `Astro + Cloudflare` if editorial/content delivery is the priority
   - `Next.js + Cloudflare` if application-style interactivity is the priority
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
