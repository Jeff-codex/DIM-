# DIM Deployment Checklist

## Scope guardrail

- DIM only
- Never touch `Dliver`

## Review preview checklist

Run from `apps/web`.

1. Confirm env is available:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
2. Build checks:
   - `npm run lint`
   - `npm run build`
   - `npm run build:static`
3. Deploy review preview:
   - `npm run preview:deploy -- <branch-name>`
4. Verify Pages static review responses for:
   - `/`
   - `/articles`
   - `/about`
   - `/submit`
   - treat this as shell/archive review only
   - do not use Pages static preview to sign off article-detail canonical/alias parity
5. If the task touched article routing, slug logic, sitemap, or canonical policy, run the Workers candidate flow separately:
   - `npm run preview:production-candidate`
   - `npm run smoke:production-candidate`
   - `preview:production-candidate` already runs `candidate:sync-public-state`, so candidate should contain mirrored published rows, active alias rows, and public cover assets before the smoke begins
   - verify at least one current canonical article slug returns `200`
   - verify at least one legacy/alias article slug returns `308` to canonical
   - record this as `production_candidate` evidence, not as Pages preview evidence
   - if candidate sync fails, report article-detail parity as `blocked on candidate sync` rather than inferred
6. If editorial runtime is part of the task, only run:
   - `npm run smoke:editorial-runtime -- --base-url=https://dim-web-editorial_preview.depthintelligence.workers.dev`
   after confirming that the target env intentionally allows submit without Turnstile
7. Reporting requirements for review work:
   - report Pages static preview and Workers `production_candidate` separately
   - report article-detail canonical/alias parity separately from shell route checks
   - if canonical/alias parity was not run, say whether it was `not needed`, `blocked by candidate data`, or `failed`
   - if slug/canonical/sitemap behavior changed, add a production follow-up note for Search Console after the real deploy
8. Share only the verified external URL.
9. If resuming from the current checkpoint, the latest known-good review targets are:
   - canonical review alias: `https://review-current.dim-preview.pages.dev`
   - editorial runtime preview: `https://dim-web-editorial_preview.depthintelligence.workers.dev`
   - production-candidate runtime: `https://dim-web-production_candidate.depthintelligence.workers.dev`
   - do not use `https://dim-web.depthintelligence.workers.dev`; treat it as a deprecated legacy worker only

## Production deployment checklist

Run from `apps/web`.

1. Confirm the user explicitly approved production deployment in the current turn.
2. Confirm the user considers the current design/content pass complete enough for the real domain.
3. Confirm no uncommitted work is being skipped by mistake.
4. Confirm env is available:
   - `CLOUDFLARE_WORKERS_TOKEN`
   - `CLOUDFLARE_SECURITY_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - optional `CLOUDFLARE_ZONE_ID`
   - if `CLOUDFLARE_ZONE_ID` is not set, `CLOUDFLARE_SECURITY_TOKEN` must include:
     - `Zone: Workers Routes Write`
     - `Zone: Zone Read`
5. Confirm production hardening prerequisites:
   - `TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
   - Cloudflare Access app and policy for `/admin`
   - optional admin allowlist env:
     - `EDITORIAL_ADMIN_ALLOWED_EMAILS`
     - `EDITORIAL_ADMIN_ALLOWED_DOMAIN`
   - production hardening rounds in `docs/production-hardening-rounds.md` are complete
   - current Access app for `/admin/*`:
     - `7e4befa3-020c-4142-967a-73fa3d543127`
6. Run:
   - `npm run lint`
   - `npm run build`
7. Deploy:
   - `npm run deploy`
8. Verify the production target after deployment:
   - `npm run smoke:production-runtime`
   - home page
   - articles page
   - one article detail page
   - one alias/legacy article slug redirect if slug logic changed
   - prefer more than one canonical/alias article pair once the authoritative source is available
   - about page
   - submit page
   - `/api/public-config/submit`
   - `/admin/inbox` under Cloudflare Access
   - if bot or GEO policy changed, also verify:
     - `/robots.txt`
     - `/sitemap.xml`
9. Search follow-up gate after production deploy:
   - if canonical/alias behavior changed, queue URL Inspection for the changed canonical and alias targets in Google Search Console
   - if sitemap output changed, re-submit or refresh the sitemap in Search Console
   - record the Search Console step separately from HTTP smoke so deploy success and indexing follow-up are not conflated
10. If the real domain is part of the task, verify `depthintelligence.kr` after the Cloudflare deployment completes.

## Reporting contract

- Always report `Pages preview`, `production_candidate`, and `live production` separately.
- `Pages preview` covers static shell/archive review, not runtime-backed article-detail alias parity.
- `production_candidate` is the pre-production gate for article-detail canonical/alias parity.
- `live production` is the only place to close host canonicalization, robots, sitemap, and Search Console follow-up.
- Do not mark the routing work complete unless the report explicitly states:
  - which environment proved shell/archive behavior
  - which environment proved canonical/alias article-detail behavior
  - whether Search Console follow-up is required, completed, or intentionally pending

## Notes

- Review previews use the `dim-preview` Pages project.
- Keep Pages review links clean. Old experimental preview aliases should be deleted once a new canonical review alias is confirmed.
- Production runtime is Cloudflare Workers, not Pages.
- Real production deploy is split-token:
  - worker service deploy uses `CLOUDFLARE_WORKERS_TOKEN`
  - route reconcile uses `CLOUDFLARE_SECURITY_TOKEN`
- `dim-web.depthintelligence.workers.dev` is a deprecated legacy worker and must not be used as the hardening baseline.
- Use `dim-web-production_candidate.depthintelligence.workers.dev` for pre-production hardening until the user explicitly approves the real-domain deployment.
- Use `production_candidate`, not Pages static preview, for article-detail canonical/alias parity sign-off.
- Use verified external URLs only; do not share `localhost`.
- Current product rule: do not deploy to the real domain until final sign-off; preview first, then production.
- Current live production SEO/GEO baseline:
  - host canonicalization is enforced to `https://depthintelligence.kr`
  - app-authored `robots.txt` is permissive again because Cloudflare managed robots is disabled
  - current canonical/alias article verification pair:
    - canonical: `/articles/ai-browser-interface-power`
    - alias redirect: `/articles/ai`
- The remaining post-preview work is production hardening, not additional public IA change, unless the user explicitly reopens design work.
- Follow-up hardening item:
  - if future article-detail parity regresses on candidate, treat candidate sync state and runtime routing state as separate failure domains in the report.
- Follow-up hardening item:
  - production smoke should eventually sample multiple canonical/alias article pairs, not just a single detail route.
- Follow-up hardening item:
  - canonical/alias deploy reports should include the required Search Console follow-up state, even when the HTTP verification already passed.
- Follow-up hardening item:
  - `smoke:editorial-runtime` currently expects an unprotected submit path and fails on Turnstile-protected candidate/prod environments; do not use it there until the script or env policy is updated.
