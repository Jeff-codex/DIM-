# DIM Production Hardening Rounds

This checklist is the next-phase work after preview editorial workflow is already working.

Hardening target classification:

- Public review: `https://review-current.dim-preview.pages.dev`
- Editorial preview runtime: `https://dim-web-editorial_preview.depthintelligence.workers.dev`
- Production-candidate runtime: `https://dim-web-production_candidate.depthintelligence.workers.dev`
- Deprecated legacy worker: `https://dim-web.depthintelligence.workers.dev`
  - do not use this legacy worker as the canonical hardening target

Current preview flow already verified:

- `/submit`
- `/api/proposals`
- `/admin/inbox`
- `triage -> in_review`
- `/admin/drafts/[proposalId]`
- `/admin/drafts/[proposalId]/preview`
- `/admin/drafts/[proposalId]/snapshot`

The remaining work before real-domain deployment is to harden the production runtime.

## Round 1: Admin Access Lock

- Create and apply Cloudflare Access protection for `/admin/*`
- Keep `EDITORIAL_PREVIEW_BYPASS` preview-only
- Ensure production requires `cf-access-authenticated-user-email`
- Optionally enforce:
  - `EDITORIAL_ADMIN_ALLOWED_EMAILS`
  - `EDITORIAL_ADMIN_ALLOWED_DOMAIN`
- Verify:
  - preview `/admin` still opens in editorial preview
  - prod `/admin` blocks without Access

Current status:

- Code gate is implemented in `apps/web/lib/server/editorial/admin.ts` and `apps/web/app/admin/layout.tsx`
- Cloudflare Access organization is enabled
- Access app created for `depthintelligence.kr/admin/*`
  - app id: `7e4befa3-020c-4142-967a-73fa3d543127`
- Allow policy created:
  - email: `magazine@depthintelligence.kr`
  - email domain: `depthintelligence.kr`
- Remaining verification:
  - candidate currently returns an app-level blocked panel on `/admin/*`
  - real domain currently redirects `/admin/*` to Cloudflare Access login
  - final production sign-off should confirm the intended protection behavior after the real production runtime is healthy

## Round 2: Submit Protection In Production

- Set production:
  - `TURNSTILE_SITE_KEY`
  - `TURNSTILE_SECRET_KEY`
- Confirm `/api/public-config/submit` returns production Turnstile config
- Confirm `/api/proposals` enforces:
  - Turnstile
  - rate limit
  - attachment count / size / type policy
- Keep public-facing errors short and non-technical

Current status:

- Production Turnstile widget created
  - name: `DIM production submit`
- site key is provisioned in `apps/web/wrangler.jsonc`
- production-candidate runtime now rejects:
  - no token -> `400 turnstile_required`
  - fake token -> `400 turnstile_failed`
- Remaining work:
  - keep production secret storage in sync with the real production runtime
  - confirm the real production runtime exposes the correct public submit config after the next real deploy

## Round 3: Proposal Write Hardening

- Confirm proposal write path is safe under repeated submission
- Recheck:
  - `dedupe_key`
  - partial upload cleanup
  - idempotent handling of repeated submit attempts
- Confirm D1 and R2 do not drift when a submit fails mid-flight

## Round 4: Queue Consumer Hardening

- Extend queue consumer beyond skeleton handling
- Cover at least:
  - `proposal.received`
  - `proposal.normalize.requested`
  - `proposal.entity_extract.requested`
- Persist job visibility and failure state in D1
- Decide retry / duplicate / poison-message handling

## Round 5: Draft Handoff Discipline

- Keep draft creation gated behind `in_review`
- Preserve separation between:
  - proposal source
  - saved proposal draft
  - editorial draft
  - publication snapshot
- Verify no route can jump directly from proposal to snapshot without valid draft state

## Round 6: Publication Snapshot Hardening

- Confirm snapshot is append-only or deliberately versioned
- Confirm snapshot stores:
  - slug
  - canonical
  - title
  - excerpt
  - category
  - body
  - source proposal timestamp
  - source draft timestamp
- Confirm snapshot is read-only from public render perspective

## Round 7: Production Smoke

- Add or run full smoke against the production-candidate runtime first:
  - submit
  - inbox
  - triage
  - draft
  - preview
  - snapshot
- Only after candidate smoke is clean should the same checks be repeated against the real production runtime
- Verify duplicate submit handling
- Verify unauthorized `/admin` is blocked
- Verify public pages still render normally

Recommended commands:

- `npm run smoke:production-candidate`
- `npm run smoke:production-runtime`

Current note:

- `production-candidate` is the active hardening baseline
- `depthintelligence.kr` is now healthy after route reconcile and passes production smoke
- repeatable real production deploy should use the split-token workflow:
  - `CLOUDFLARE_WORKERS_TOKEN` for service deploy
  - `CLOUDFLARE_SECURITY_TOKEN` for route reconcile

## Round 8: Monitoring And Failure Visibility

- Add minimum operational visibility for:
  - submit failures
  - Turnstile failures
  - D1 write failures
  - R2 upload failures
  - queue failures
  - Access denials where useful
- Decide where failures are surfaced:
  - D1 workflow events
  - worker logs
  - dashboard or alert destination

## Round 9: Final Production Readiness Review

- Re-run:
  - `npm run lint`
  - `npm run build`
  - `npm run build:static`
- Re-run production runtime smoke
- Confirm preview/prod bindings are fully separated
- Confirm no public `/submit` copy leaks internal workflow terms
- Only after explicit user approval:
  - `npm run deploy`
  - verify `depthintelligence.kr`

## Notes

- Public Pages preview and editorial runtime preview are intentionally separate
- Do not deploy real domain before these rounds are signed off
- If production hardening reveals copy/UI regressions on `/submit`, fix public wording before deployment
