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
4. Verify successful responses for:
   - `/`
   - `/articles`
   - `/articles/everyonepr`
   - `/about`
   - `/submit`
   - if the task touched article routing, also verify at least:
     - one current canonical article slug returns `200`
     - one legacy/alias article slug returns `308` to canonical
   - if editorial runtime is part of the task, only run:
     - `npm run smoke:editorial-runtime -- --base-url=https://dim-web-editorial_preview.depthintelligence.workers.dev`
     after confirming that the target env intentionally allows submit without Turnstile
   - if production hardening is part of the task, use the candidate runtime instead of the stale legacy worker:
     - `npm run preview:production-candidate`
     - `npm run smoke:production-candidate`
     - treat article-detail checks on candidate as a separate data-readiness step if published rows have not been mirrored there yet
5. Share only the verified external URL.
6. If resuming from the current checkpoint, the latest known-good review preview is:
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
   - about page
   - submit page
   - `/api/public-config/submit`
   - `/admin/inbox` under Cloudflare Access
   - if bot or GEO policy changed, also verify:
     - `/robots.txt`
     - `/sitemap.xml`
9. If the real domain is part of the task, verify `depthintelligence.kr` after the Cloudflare deployment completes.

## Notes

- Review previews use the `dim-preview` Pages project.
- Keep Pages review links clean. Old experimental preview aliases should be deleted once a new canonical review alias is confirmed.
- Production runtime is Cloudflare Workers, not Pages.
- Real production deploy is split-token:
  - worker service deploy uses `CLOUDFLARE_WORKERS_TOKEN`
  - route reconcile uses `CLOUDFLARE_SECURITY_TOKEN`
- `dim-web.depthintelligence.workers.dev` is a deprecated legacy worker and must not be used as the hardening baseline.
- Use `dim-web-production_candidate.depthintelligence.workers.dev` for pre-production hardening until the user explicitly approves the real-domain deployment.
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
  - candidate currently validates shell routes but may not contain published article rows; when article routing changes, article-detail parity on candidate must be treated as a separate data-readiness check.
- Follow-up hardening item:
  - production smoke should eventually sample multiple canonical/alias article pairs, not just a single detail route.
- Follow-up hardening item:
  - `smoke:editorial-runtime` currently expects an unprotected submit path and fails on Turnstile-protected candidate/prod environments; do not use it there until the script or env policy is updated.
