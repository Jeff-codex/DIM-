# DIM SEO/GEO Remediation Checklist

## Scope

- DIM only
- Public SEO/GEO remediation only
- Protect CMS integrity first

## Hard boundaries

- Allowed in Batch 1:
  - public route rendering
  - metadata
  - structured data
  - public smoke coverage
- Forbidden in Batch 1:
  - `app/admin/*`
  - `lib/server/editorial-v2/*`
  - D1 schema or migrations
  - draft save/publish routes
  - CMS write paths
- Production-only infra changes:
  - Cloudflare Redirect Rules
  - Cloudflare crawler policy changes
  - real-domain deploy
  - only after explicit user approval in that turn

## Policy decisions locked

- GEO target: allow AI Search and AI crawlers
- `서비스 분석`:
  - remove from public descriptive copy unless a real taxonomy/landing is introduced later
- Author model:
  - `DIM 편집부 = Organization`
- `sameAs`:
  - keep empty unless a verified official public channel exists
- Editorial policy:
  - absorb into `/about` in Batch 1

## Batch 1

### 1. Checklist doc

- Create and keep this document updated during execution
- Keep changes sequential and phase-gated

### 2. Public metadata and schema

- `/articles`
  - add `CollectionPage`
  - add `BreadcrumbList`
  - add `ItemList`
- Article detail
  - add `BreadcrumbList`
  - set `dateModified = analysisMeta.lastUpdatedAt ?? publishedAt`
  - emit `Organization` author for `DIM 편집부`
- `/about`
  - add explicit `openGraph`
  - add explicit `twitter`
  - add `AboutPage` or `WebPage` JSON-LD
  - absorb editorial policy copy
  - fix taxonomy-count wording
- Site description cleanup
  - remove `서비스 분석` from public copy where it conflicts with current taxonomy

### 3. SEO smoke coverage

- Extend smoke checks for:
  - `/articles` JSON-LD presence
  - `/about` OG title consistency
  - canonical presence
  - alias redirect remains one-hop
- Keep CMS safety smoke as a separate required gate

## Batch 2

### 1. Cloudflare canonicalization

- Apply redirect rules for:
  - `http://depthintelligence.kr/*`
  - `http://www.depthintelligence.kr/*`
  - `https://www.depthintelligence.kr/*`
- Redirect target:
  - `https://depthintelligence.kr/$1`
- Verify:
  - each variant returns `301` or `308`
  - final destination returns `200`

### 2. GEO crawler policy

- Reconcile Cloudflare-managed crawler policy with GEO goal
- Verify live `robots.txt` matches intended policy

## Batch 3

### 1. Legacy content backfill plan

- Build audit sheet for all public article URLs:
  - slug
  - title
  - H1
  - primary entity
  - target query
  - source links present or absent
  - update timestamp present or absent
- Prioritize weak legacy articles first

### 2. Editorial operating checklist

- Require for new or updated articles:
  - primary entity
  - 핵심 답변
  - 핵심 판단
  - 시장/플레이어
  - source links
  - last updated timestamp

## Verification gates

### Gate 1. Code

- Run from `apps/web`
- `npm run lint`
- `npm run build`
- `npm run build:static`

### Gate 2. Public route verification

- `/`
- `/articles`
- `/articles/startups`
- `/about`
- `/submit`
- one article detail route
- one alias redirect route
- `/robots.txt`
- `/sitemap.xml`
- `/rss.xml`

### Gate 3. Schema verification

- home
- `/articles`
- category landing
- article detail
- `/about`

### Gate 4. CMS safety

- `npm run smoke:editorial-runtime -- --base-url=https://dim-web-editorial_preview.depthintelligence.workers.dev`

### Gate 5. Production-only

- real-domain changes only after explicit user approval
- verify host/protocol canonicalization on production
- verify no admin or API regressions

## Execution notes

- Batch 1 may be implemented and verified before any production-only infra change
- Batch 2 is gated because it changes live edge behavior
- Batch 3 is operational and content-heavy, not part of the first public code patch
