# DIM SEO/GEO Batch 2 Runbook

Date: `2026-03-30`
Scope:
- Cloudflare edge canonicalization
- AI crawler policy reconciliation
- No app code change required for the first pass

## Current verified state

### Canonical host drift

Verified live responses:

- `http://depthintelligence.kr/` -> `200`
- `https://www.depthintelligence.kr/` -> `200`
- `http://www.depthintelligence.kr/` -> `200`

This means host/protocol canonicalization is still incomplete at the edge.

### Live robots policy

Verified live `https://depthintelligence.kr/robots.txt` currently includes:

- `Content-Signal: search=yes,ai-train=no`
- `User-agent: GPTBot` -> `Disallow: /`
- `User-agent: ClaudeBot` -> `Disallow: /`
- `User-agent: Google-Extended` -> `Disallow: /`
- `User-agent: meta-externalagent` -> `Disallow: /`
- `User-agent: Applebot-Extended` -> `Disallow: /`
- `User-agent: CCBot` -> `Disallow: /`
- `User-agent: Bytespider` -> `Disallow: /`

This is not aligned with the locked policy decision:

- GEO target: allow AI Search and AI crawlers

## Authoritative app-side source

- Canonical host source: [site.ts](C:\Users\DIM(depthintelligencemagazine)\apps\web\lib\site.ts)
- App metadata base and app-wide SEO shell: [layout.tsx](C:\Users\DIM(depthintelligencemagazine)\apps\web\app\layout.tsx)
- App-generated robots baseline: [robots.ts](C:\Users\DIM(depthintelligencemagazine)\apps\web\app\robots.ts)
- Runtime routing config: [wrangler.jsonc](C:\Users\DIM(depthintelligencemagazine)\apps\web\wrangler.jsonc)

## Execution order

1. Add Cloudflare Redirect Rules
2. Reconcile Cloudflare-managed crawler policy
3. Re-verify live routes and robots output
4. Only then extend production smoke to assert host/protocol redirects

## Cloudflare canonicalization steps

Target canonical host:

- `https://depthintelligence.kr`

Required redirects:

- `http://depthintelligence.kr/*` -> `https://depthintelligence.kr/$1`
- `https://www.depthintelligence.kr/*` -> `https://depthintelligence.kr/$1`
- `http://www.depthintelligence.kr/*` -> `https://depthintelligence.kr/$1`

Expected result after change:

- every variant returns `301` or `308`
- final canonical URL returns `200`
- public metadata remains unchanged because the app already emits canonical apex URLs

## AI crawler policy steps

1. Open the Cloudflare-managed robots / crawler control for `depthintelligence.kr`
2. Remove the explicit `Disallow: /` rules for AI retrieval/search crawlers
3. Keep any restriction that is only about training if the final business rule still wants `ai-train=no`
4. Re-fetch live `robots.txt` and confirm:
   - AI retrieval/search crawlers are no longer blocked
   - `Host` remains `https://depthintelligence.kr`
   - `Sitemap` remains `https://depthintelligence.kr/sitemap.xml`

## Verification checklist

Run after live changes:

1. Verify redirects
   - `http://depthintelligence.kr/`
   - `https://www.depthintelligence.kr/`
   - `http://www.depthintelligence.kr/`
2. Verify public routes
   - `/`
   - `/articles`
   - `/articles/startups`
   - `/about`
   - `/submit`
   - one canonical article detail route
   - one alias route if alias logic changed
3. Verify `robots.txt`
4. Verify `sitemap.xml`
5. Re-run production smoke
   - then add host/protocol redirect assertions into [smoke-production-hardening.mjs](C:\Users\DIM(depthintelligencemagazine)\apps\web\scripts\smoke-production-hardening.mjs)

## Reporting rule

- Report Pages preview, `production_candidate`, and live production separately
- Do not use Pages static preview as evidence for article-detail canonical/alias parity
- Use `production_candidate` for pre-production canonical/alias article-detail validation
- if candidate parity fails, distinguish `candidate sync/data issue` from `runtime routing issue`
- Host redirect verification is production-only
- Robots policy verification is production-only
- Search Console follow-up is production-only and should be reported separately from HTTP smoke
- Do not call the change complete until both live HTTP behavior and live `robots.txt` match the policy
