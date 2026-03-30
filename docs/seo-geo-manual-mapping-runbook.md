# DIM SEO/GEO Manual Mapping Runbook

Date: `2026-03-30`
Purpose:
- Fill the schema gaps that are not yet encoded in the current article model
- Standardize `primary_entity` and `target_query` mapping for the current public corpus

## Source document

Use [seo-geo-public-article-audit.md](C:\Users\DIM(depthintelligencemagazine)\docs\seo-geo-public-article-audit.md) as the base sheet.

## What is still manual

The current schema does not store these as structured fields:

- `primary_entity`
- `target_query`

Do not guess them mechanically from the slug alone.

## Mapping order

1. Read the title and H1
2. Read the `market/player evidence` column from the audit sheet
3. Read the opening answer block on the public page
4. Lock one `primary_entity`
   - company
   - market
   - platform
   - operating layer
5. Lock one `target_query`
   - the single main search intent the page should own
6. Check whether title, H1, slug, and entity still point to the same intent
7. If they do not align, mark the row for editorial rewrite instead of forcing the mapping

## Mapping rules

- One page should own one main query
- One page should declare one main entity
- Secondary entities may appear in the body, but they should not replace the primary entity
- If the page mainly argues about a market structure rather than one company, the market may be the primary entity
- If a page mixes two equally strong intents, mark it as `rewrite-needed`

## Current recommended processing order

1. `everyonepr`
   - missing CMS-style trust layer
   - map `primary_entity` and `target_query` while backfilling metadata
2. `startups` articles
   - `korea-platform-profit-pool`
   - `thinking-machines-startup`
3. `industry-analysis` articles
   - process newest to oldest using the audit sheet order

## Output format

For each row, add:

- `primary_entity`
- `target_query`
- `mapping_status`
  - `locked`
  - `rewrite-needed`
  - `backfill-first`

## Completion rule

The manual mapping pass is complete only when:

- all public articles have `primary_entity`
- all public articles have `target_query`
- exception rows like `everyonepr` have moved from `backfill-first` to `locked` or `rewrite-needed`

