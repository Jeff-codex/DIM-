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
   - `/articles/ai-work-tools-are-becoming-management-layers`
   - `/about`
   - `/submit`
   - if editorial runtime is part of the task, also run:
     - `npm run smoke:editorial-runtime -- --base-url=https://dim-web-editorial_preview.depthintelligence.workers.dev`
5. Share only the verified external URL.
6. If resuming from the current checkpoint, the latest known-good review preview is:
   - canonical review alias: `https://review-current.dim-preview.pages.dev`
   - editorial runtime preview: `https://dim-web-editorial_preview.depthintelligence.workers.dev`

## Production deployment checklist

Run from `apps/web`.

1. Confirm the user explicitly approved production deployment in the current turn.
2. Confirm the user considers the current design/content pass complete enough for the real domain.
3. Confirm no uncommitted work is being skipped by mistake.
4. Confirm env is available:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
5. Confirm production hardening prerequisites:
   - `TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
   - Cloudflare Access app and policy for `/admin`
   - optional admin allowlist env:
     - `EDITORIAL_ADMIN_ALLOWED_EMAILS`
     - `EDITORIAL_ADMIN_ALLOWED_DOMAIN`
   - production hardening rounds in `docs/production-hardening-rounds.md` are complete
6. Run:
   - `npm run lint`
   - `npm run build`
   - `npm run smoke:editorial-runtime -- --base-url=<prod-runtime-url>`
7. Deploy:
   - `npm run deploy`
8. Verify the production target after deployment:
   - home page
   - articles page
   - one article detail page
   - about page
   - submit page
   - `/api/public-config/submit`
   - `/admin/inbox` under Cloudflare Access
9. If the real domain is part of the task, verify `depthintelligence.kr` after the Cloudflare deployment completes.

## Notes

- Review previews use the `dim-preview` Pages project.
- Keep Pages review links clean. Old experimental preview aliases should be deleted once a new canonical review alias is confirmed.
- Production runtime is Cloudflare Workers, not Pages.
- Use verified external URLs only; do not share `localhost`.
- Current product rule: do not deploy to the real domain until final sign-off; preview first, then production.
- The remaining post-preview work is production hardening, not additional public IA change, unless the user explicitly reopens design work.
