# DIM SEO/GEO Editorial Operations Checklist

Date: `2026-03-30`
Scope:
- New or updated public articles
- Public read layer requirements only
- No CMS write-path change in this document

## Evidence basis

Public article detail render currently reads the following fields in [apps/web/app/articles/[slug]/page.tsx](C:\Users\DIM(depthintelligencemagazine)\apps\web\app\articles\[slug]\page.tsx):

- identity/display
  - `slug`
  - `title`
  - `displayTitle`
  - `displayTitleLines`
  - `excerpt`
  - `interpretiveFrame`
  - `coverImage`
- classification
  - `category.name`
  - `category.slug`
  - `author.name`
- body
  - `bodyHtml`
- publish/meta
  - `publishedAt`
  - `coverImage`
  - `author`
  - `category`
- optional `analysisMeta`
  - `market`
  - `photoSource`
  - `sourceLinks`
  - `firstPublishedAt`
  - `lastUpdatedAt`

`analysisMeta` shape is defined in [apps/web/content/types.ts](C:\Users\DIM(depthintelligencemagazine)\apps\web\content\types.ts).

## Required for every new or updated article

1. Core article fields
   - canonical slug fixed
   - title fixed
   - H1 fixed
   - excerpt fixed
   - interpretive frame fixed
   - category fixed
   - author fixed
   - cover image fixed
   - body completed
2. Public trust layer
   - `핵심 답변` present
   - `핵심 판단` present
   - at least one authoritative source or an explicit reason why no source can be linked
   - update timestamp recorded
3. Editorial SEO/GEO layer
   - market/player scope stated
   - primary entity mapped manually
   - target query mapped manually
   - canonical title and slug checked for query intent alignment

## Required for CMS-style completeness

If the article is meant to meet the current CMS-style public standard, it should include all `analysisMeta` fields:

- `market`
  - used for `다루는 시장/플레이어`
- `photoSource`
  - used when a cover image source needs attribution
- `sourceLinks`
  - used for `참고 링크`
- `firstPublishedAt`
  - used in the public update block
- `lastUpdatedAt`
  - used in the public update block and `dateModified`

## Current backfill exception

Current evidence from [apps/web/out/articles/everyonepr.html](C:\Users\DIM(depthintelligencemagazine)\apps\web\out\articles\everyonepr.html):

- present
  - `핵심 답변`
  - `핵심 판단`
  - body
  - article schema
  - breadcrumb schema
  - published timestamp
- absent
  - `다루는 시장/플레이어`
  - `작성 기준`
  - `최초 발행 / 최종 업데이트`
  - `참고 링크`

This means `everyonepr` is the current content-ops backfill priority.

## Editorial review order

1. Check if the article already has CMS-style `analysisMeta`
2. If not, backfill `market`, `sourceLinks`, `firstPublishedAt`, `lastUpdatedAt`
3. Confirm the title/H1 still match the intended query after backfill
4. Record `primary_entity` and `target_query` in the manual mapping worksheet
5. Re-check the public page for:
   - article schema
   - breadcrumb schema
   - update block
   - source link block

## Definition of done

- Public page shows the same trust layer as current CMS-style articles
- `dateModified` aligns with the last update timestamp
- source links are visible on the page
- market/player context is visible on the page
- the article is present in the manual entity/query mapping sheet

