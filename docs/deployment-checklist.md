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
5. Share only the verified external URL.
6. If resuming from the current checkpoint, the latest known-good review preview is:
   - `https://home-copy-one-line-pass-2026.dim-preview.pages.dev`

## Production deployment checklist

Run from `apps/web`.

1. Confirm the user explicitly approved production deployment in the current turn.
2. Confirm the user considers the current design/content pass complete enough for the real domain.
3. Confirm no uncommitted work is being skipped by mistake.
4. Confirm env is available:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
5. Run:
   - `npm run lint`
   - `npm run build`
6. Deploy:
   - `npm run deploy`
7. Verify the production target after deployment:
   - home page
   - articles page
   - one article detail page
   - about page
   - submit page
8. If the real domain is part of the task, verify `depthintelligence.kr` after the Cloudflare deployment completes.

## Notes

- Review previews use the `dim-preview` Pages project.
- Production runtime is Cloudflare Workers, not Pages.
- Use verified external URLs only; do not share `localhost`.
- Current product rule: do not deploy to the real domain until final sign-off; preview first, then production.
