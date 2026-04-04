# DIM Session Resume

## Current checkpoint

- Date: `2026-04-04`
- Branch: `main`
- Commit: `working tree ahead of fc32238`
- Remote: `origin -> https://github.com/Jeff-codex/DIM-.git`
- Remote branch state: `origin/main` synced with local `main`
- Public app: `apps/web`
- Runtime target: `Cloudflare Workers`
- Review preview target: `Cloudflare Pages` project `dim-preview`
- Real production deploy now uses split tokens:
  - `CLOUDFLARE_WORKERS_TOKEN` for service deploy
  - `CLOUDFLARE_SECURITY_TOKEN` for route reconcile

## What is already implemented

- DIM public site has been reworked into a more uniform magazine system inspired by the 9works reference grammar.
- Core routes remain:
  - `/`
  - `/articles`
  - `/articles/[slug]`
  - `/about`
  - `/submit`
- Home and `/articles` now share the same top-level reading structure:
  - dark magazine intro
  - centered category channel bar
  - uniform archive-style card grid
- Home and `/articles` currently hide `시장 신호` in the channel bar and center the remaining three categories.
- Article list cards are flattened to image + title + short excerpt with minimal/no list metadata.
- `/about` and `/submit` were reworked into the same black/white magazine tone instead of stacked document cards.
- `피처 제안` page rhythm was simplified so the explanatory side reads in fewer chapters and the form stands as one clear intake block.
- Internal page transitions now use a mirrored fade-out / fade-in approach that is closer to the 9works reference than the earlier overlay/blur attempts.
- SEO groundwork remains in place:
  - `Organization` JSON-LD at the app level
  - `Article` JSON-LD on article detail pages
  - article intros strengthened with clearer brand/service references
- Review preview workflow and Workers production workflow remain intentionally separated.
- DIM-only operational agent kit is now synced and refined inside the repo under `docs/agent-kit`.
- Preview editorial workflow now exists end-to-end on Workers:
  - `/submit`
  - `/api/proposals`
  - `/admin/inbox`
  - `triage -> in_review`
  - `/admin/drafts/[proposalId]`
  - `/admin/drafts/[proposalId]/preview`
  - `/admin/drafts/[proposalId]/snapshot`
- Preview editorial infrastructure is now provisioned:
  - D1: `dim-editorial-preview`
  - R2: `dim-intake-preview`
  - Queue: `dim-editorial-preview`
- Production editorial infrastructure baseline is also provisioned:
  - D1: `dim-editorial-prod`
  - R2: `dim-intake-prod`
  - Queue: `dim-editorial-prod`
- `시장 신호` category has been fully removed from the public/category data model.
- Public `/submit` wording no longer exposes `runtime`, `preview`, `inbox ID`, `원문 보관`, or `상태 이력`.
- Runtime smoke now covers:
  - submit
  - inbox
  - triage
  - draft preview
  - publication snapshot
- Real domain `depthintelligence.kr` is now serving the current production runtime and passes production smoke.
- DIM의 해석 철학은 `본찰력`으로 고정됐다. 이후 편집 판단과 자동 초안 생성은 모두 `무엇이 나왔나`보다 `무엇이 바뀌나`, 기능보다 구조 변화와 운영 맥락을 먼저 읽는 기준을 따른다.
- 공개 페이지와 편집 시스템은 같은 정보를 다뤄도 서로 다른 문법으로 설계한다.
- AI 초안은 실제 전문 에디터가 1차 편집을 마친 듯한 품질을 목표로 한다.
- 소비자용 제출 문구를 초안 본문에 기계적으로 복사하지 않는다.
- `무엇이 바뀌었나`, `어떤 구조를 봐야 하나`, `왜 지금 중요한가`, `누구에게 먼저 보이는가`는 생성 규칙이지, 그대로 제목이나 섹션명이 아니다.
- `apps/editorial-generator` 외부 서비스가 추가됐고, 로컬에서 실제 OpenAI 호출과 본찰력 초안 생성 응답을 확인했다.
- 외부 generator는 `/ready`, `/v1/editorial/draft`, `railway.json`, `render.yaml`, `npm run smoke`까지 준비됐고, 남은 것은 외부 호스팅 URL과 shared secret를 Cloudflare runtime에 연결하는 단계다.
- Cloudflare runtime direct OpenAI path는 region restriction으로 fallback되므로, 실사용 고품질 초안 생성은 외부 generator 경유 구성을 기준으로 진행한다.
- public SEO/GEO work now includes:
  - static category landing routes
    - `/articles/startups`
    - `/articles/product-launches`
    - `/articles/industry-analysis`
  - category-specific metadata and landing intro copy
  - sitemap entries for the category landings
  - structured data for home and category landing pages
- public archive UX now includes:
  - editorial index-style category tabs on home and `/articles`
  - local filter search bar on `/articles` and category landing pages
  - grayscale/black hover-active treatment aligned to DIM brand mood
- favicon/app icons were replaced with DIM logo-based assets.
- Live production is now deployed through commit `fc32238` (`Restore generated-path lint ignores`).
  - `apps/web/eslint.config.mjs` again ignores generated paths:
    - `.wrangler/**`
    - `tmp/**`
    - `dist/**`
    - `coverage/**`
  - `npm run lint`
  - `npm run build`
  - `npm run build:static`
    all pass again from `apps/web`
- Production article detail outage caused by article route param sealing was fixed.
  - production canonical article routes now return `200`
  - old weak slugs now return `308` to canonical slugs
  - production smoke passes again after the hotfix
- SEO/GEO public remediation batch is now live on production:
  - `/articles` now emits `CollectionPage + BreadcrumbList + ItemList`
  - article detail pages emit `BreadcrumbList`
  - article schema now uses `dateModified = lastUpdatedAt ?? publishedAt`
  - `DIM 편집부` is represented as `Organization` in article schema
  - `/about` now carries stronger OG/Twitter metadata and editorial-policy copy
- Host and protocol canonicalization is now enforced live:
  - `http://depthintelligence.kr/*` -> `https://depthintelligence.kr/*`
  - `http://www.depthintelligence.kr/*` -> `https://depthintelligence.kr/*`
  - `https://www.depthintelligence.kr/*` -> `https://depthintelligence.kr/*`
- Cloudflare managed robots override has been turned off, so live `robots.txt` is again app-authored and permissive:
  - `User-Agent: *`
  - `Allow: /`
- Production slug migration for the Microsoft deeptech article is complete:
  - canonical slug: `/articles/deeptech-korea-first-customer`
  - alias redirect: `/articles/microsoft-korea-profit-pool` -> `308` -> canonical
  - sitemap and RSS now reference the canonical slug
- Route reconcile was reverified with a valid `CLOUDFLARE_SECURITY_TOKEN`; production routes remain:
  - `depthintelligence.kr/* -> dim-web`
  - `www.depthintelligence.kr/* -> dim-web`
- `/articles` archive contract is now aligned to `DIM 피처 아카이브` across page copy, metadata, and structured data.
- Category archive zero-state handling is now split between:
  - category has no published articles
  - search query returned no matches
- Low-volume categories now keep the current archive visible and can point readers back to the full archive instead of behaving like empty shelves.
- Published slug governance now uses a shared read path:
  - canonical source of truth: `feature_entry.slug`
  - alias source of truth: `feature_slug_alias.alias_slug`
  - runtime resolution, slug audit, slug backfill, and smoke inventory all read through the same published slug mapping query
- Publish flows now preserve the previous canonical slug as an active alias in the same write transaction when the canonical slug changes.
- `production_candidate` public-state mirroring now exists:
  - script: `npm run candidate:sync-public-state`
  - mirrored data: published `feature_entry`, current `feature_revision`, active `feature_slug_alias`, public cover `asset_variant`, linked `asset_family`, linked `internal_analysis_brief`, and referenced R2 objects
- `smoke:production-candidate` now loads canonical/alias samples from the authoritative published slug inventory instead of hardcoded slugs.
- approved first-wave selective slug replacement file now exists:
  - `docs/slug-backfill-wave1-2026-04-04.json`
  - wave 1 scope:
    - `korea-ai-profit-pool` -> `korea-defense-tech-procurement`
    - `beauty-korea-profit-pool` -> `k-beauty-fragrance-export`
    - `ai-platform-profit-pool` -> `ai-expert-boundaries`
    - `korea-platform-profit-pool` -> `korea-shared-office-model`
    - `korea-vclpm-a-profit-pool` -> `korea-vc-exit-liquidity`

## Latest verified preview

- Canonical review alias: `https://review-current.dim-preview.pages.dev`
- Editorial runtime preview: `https://dim-web-editorial_preview.depthintelligence.workers.dev`
- Production-candidate runtime: `https://dim-web-production_candidate.depthintelligence.workers.dev`
- Deprecated legacy worker: `https://dim-web.depthintelligence.workers.dev` (do not use as a canonical review or hardening target)
- Reporting rule:
  - report Pages static preview, editorial preview runtime, production-candidate runtime, and live production separately
  - do not treat Pages static preview as evidence for article-detail canonical/alias parity
  - article-detail canonical/alias parity belongs to `production_candidate` first, then live production
- Latest production-candidate shell/asset review reverified on `2026-04-04`:
  - `/`
  - `/articles`
  - `/about`
  - `/submit`
  - `/favicon.ico`
  - `/icon.png`
  - `/apple-icon.png`
  - `/robots.txt`
  - `/sitemap.xml`
- Production-candidate article-detail parity is now reverified on `2026-04-04`:
  - candidate public-state sync succeeded before the smoke:
    - published rows: `21`
    - asset variants: `63`
    - active aliases: `8`
  - `npm run smoke:production-candidate` now passes with authoritative samples from candidate inventory
  - current candidate smoke sample:
    - canonical: `/articles/deeptech-korea-first-customer` -> `200`
    - alias: `/articles/microsoft-korea-profit-pool` -> `308` -> canonical
  - direct candidate asset verification also passed:
    - article detail HTML -> `200`
    - first `/api/editorial/assets/[assetId]` request -> `200`
- Production-candidate first-wave slug replacement was applied on `2026-04-04`:
  - `slug-backfill --env production_candidate --mode dry-run` returned all 5 mappings as `ready`
  - `slug-backfill --env production_candidate --mode apply` returned all 5 mappings as `applied`
  - candidate inventory now shows the new canonicals and preserves the old slugs as active aliases
  - candidate runtime verification now passes for all 5 pairs:
    - new canonical -> `200`
    - old slug -> `308` -> new canonical
    - `/articles` and `/sitemap.xml` emit only the new canonical slug
- `npm run smoke:editorial-runtime -- --base-url=https://dim-web-production_candidate.depthintelligence.workers.dev` currently fails by design mismatch:
  - `/api/proposals` returns `400`
  - error code: `turnstile_required`
  - the script assumes an unprotected submit path, so do not use it against candidate until the script or env policy is updated

## Latest verified production

- Live production was redeployed on `2026-04-03` at `fc32238`.
- `npm run smoke:production-runtime` passed after deployment.
- Verified live responses on `https://depthintelligence.kr`:
  - `/` -> `200`
  - `/articles` -> `200`
  - `/articles/startups` -> `200`
  - `/articles/product-launches` -> `200`
  - `/articles/industry-analysis` -> `200`
  - `/articles/ai-browser-interface-power` -> `200`
  - `/articles/ai` -> `308` -> `/articles/ai-browser-interface-power`
  - `/about` -> `200`
  - `/submit` -> `200`
  - `/api/public-config/submit` -> `200`
  - `/robots.txt` -> `200`
  - `/sitemap.xml` -> `200`
- Production reporting gate:
  - keep HTTP verification separate from Search Console follow-up
  - if canonical/alias or sitemap output changes in a future deploy, queue Search Console inspection/submission work explicitly instead of treating smoke success as indexing completion
- Live submit protection is confirmed:
  - no token -> `400 turnstile_required`
  - fake token -> `400 turnstile_failed`
- Live admin protection is confirmed:
  - `/admin/inbox` -> `302` to Cloudflare Access
- Live icon assets are confirmed:
  - `/favicon.ico` -> `200`
  - `/icon.png` -> `200`
  - `/apple-icon.png` -> `200`
  - SHA256 hashes match the local files under `apps/web/public`
- In the `2026-04-03` deploy shell, `CLOUDFLARE_SECURITY_TOKEN` was absent, so route reconcile was skipped.
  - live domain routing still remained correct after deployment
  - if a future release changes production route mappings, restore `CLOUDFLARE_SECURITY_TOKEN` before deploy instead of relying on the existing routes
- First-wave selective slug replacement is now live on production as of `2026-04-04`:
  - `slug-backfill --env production --mode dry-run` returned all 5 mappings as `ready`
  - `slug-backfill --env production --mode apply` returned all 5 mappings as `applied`
  - post-apply production inventory now shows the new canonicals and preserves the old slugs as active aliases
  - live verification passed for all 5 pairs:
    - new canonical -> `200`
    - old slug -> `308` -> new canonical
    - article canonical link matches the new canonical URL
    - `/articles` and `/sitemap.xml` expose only the new canonical slug
  - wave 1 live pairs:
    - `korea-ai-profit-pool` -> `korea-defense-tech-procurement`
    - `beauty-korea-profit-pool` -> `k-beauty-fragrance-export`
    - `ai-platform-profit-pool` -> `ai-expert-boundaries`
    - `korea-platform-profit-pool` -> `korea-shared-office-model`
    - `korea-vclpm-a-profit-pool` -> `korea-vc-exit-liquidity`
  - Search Console follow-up for these 5 old/new pairs is still pending as an operational step

## Guardrails

- Do not touch `Dliver`.
- Do not reuse or inspect other project resources unless the user explicitly asks.
- Keep secrets out of Git.
- Do not deploy to the real domain without explicit user approval in that turn.
- Real-domain deployment is intentionally deferred until the user declares the build complete.
- Continue DIM work with the existing subagent set whenever possible.
- Treat agent collaboration as recursive improvement: assign, review, integrate, and feed the result into the next pass.

## First actions for the next session

1. Read this file and `docs/deployment-checklist.md`.
2. Read `docs/production-hardening-rounds.md` only if the task returns to infra hardening.
3. If the task needs planning or prioritization, read `docs/agent-kit/README.md` and `docs/agent-kit/dim/WEEKLY_BRIEF.md`.
4. Check repository state with `git status --short`.
5. Confirm the current checkpoint is still `main` at or ahead of `fc32238`.
6. Reuse the existing DIM agents first and continue from the latest integrated findings rather than starting fresh.
7. If code changed, run from `apps/web`:
   - `npm run lint`
   - `npm run build`
   - `npm run build:static`
8. If the user wants a review URL, run:
   - `npm run preview:deploy -- <branch-name>`
9. For editorial runtime work, verify whether the target environment intentionally allows submit without Turnstile before using `npm run smoke:editorial-runtime`.
   - current evidence says `production_candidate` does not
   - use the dedicated editorial preview runtime only if its policy still matches the smoke script assumptions
10. For production hardening without the real domain, use:
   - `npm run preview:production-candidate`
   - `npm run smoke:production-candidate`
   - `preview:production-candidate` will first mirror published public state into candidate
   - use this runtime, not Pages static preview, for article-detail canonical/alias verification
   - if the sync step fails, report `blocked on candidate sync` rather than inferring parity from Pages preview
11. For real production deploy, confirm both split tokens are present:
   - `CLOUDFLARE_WORKERS_TOKEN`
   - `CLOUDFLARE_SECURITY_TOKEN`
   - optional `CLOUDFLARE_ZONE_ID`
   - if `CLOUDFLARE_ZONE_ID` is not set, `CLOUDFLARE_SECURITY_TOKEN` must also be able to read the zone
   - without `CLOUDFLARE_SECURITY_TOKEN`, service deploy can still succeed but route reconciliation will be skipped
12. Verify Pages review paths:
   - `/`
   - `/articles`
   - `/about`
   - `/submit`
13. Verify candidate/runtime article-detail paths separately:
   - `production_candidate` canonical article route
   - `production_candidate` alias route redirect
   - if candidate data is missing, report `blocked` and do not substitute Pages evidence
14. If production changed canonical/alias routing or sitemap output, add a Search Console follow-up item to the report.
15. If the next task is live rollout of the approved first-wave slug replacements:
   - do not re-apply wave 1 blindly; first confirm whether Search Console inspection has already been queued for the 5 changed pairs
   - only create a new wave file for additional slug changes after a fresh dry-run review
16. Share only the verified external preview URL. Never hand off localhost.
17. Next likely infra follow-ups:
   - tighten the slug recommendation generator so selective backfill suggestions are cleaner for broad/legacy slugs
   - decide whether `smoke:editorial-runtime` should support Turnstile-protected environments or remain preview-only on a bypassed env
   - expand production smoke to sample multiple canonical/alias article pairs from the authoritative mapping inventory

## Open hardening checklist

- [x] Seed or mirror published article rows into `production_candidate` so canonical/alias article detail routes can be verified before real-domain deploy.
- [x] Update smoke scripts so canonical and alias samples come from one authoritative source instead of stale hardcoded slugs.
- [x] Add report templates or checklist wording so Pages preview results and `production_candidate` canonical/alias results are always reported separately.
- [ ] Decide whether `smoke:editorial-runtime` should support Turnstile-protected environments or remain preview-only with an explicit bypass policy.
- [ ] Restore `CLOUDFLARE_SECURITY_TOKEN` availability for future releases that change production route mappings.
- [ ] Expand production smoke to cover more than one canonical/alias article pair once the authoritative source is settled.
- [x] Add Search Console follow-up to the production completion gate for canonical/alias or sitemap-changing releases.

## Next queued product checklist

- Add a dedicated internal workflow for `산업 구조 분석` content that DIM produces in-house.
- Scope the new workflow as a separate CMS/editorial capability, not a public proposal intake path.
- Required product surface for the next round:
  - internal `산업 구조 분석` feature creation entry
  - structured editor flow for in-house analysis drafting
  - publish-room handoff for that internal content type
  - publication path that lands in the existing public `산업 구조 분석` category
- Keep the current external proposal workflow intact while adding the internal authoring path.
- Expand `smoke:production-runtime` article coverage so canonical/alias article samples are broader and regressions are caught earlier.
- Seed or mirror published article rows into production-candidate so candidate review can verify article detail routes, not just shell routes.

## Most likely next product tasks

- Internal `산업 구조 분석` authoring workflow in CMS/editorial system
- FAQ / structured-data follow-up for category landing pages if public SEO work resumes
- Further archive/search polish only after internal workflow requirements are clarified
