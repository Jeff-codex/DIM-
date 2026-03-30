# DIM SEO/GEO Rewrite Queue

Date: `2026-03-30`
Status:
- evidence-backed editorial rewrite queue
- derived from current public article audit only
- does not change CMS or public code by itself

## Evidence sources

- [seo-geo-public-article-audit.md](C:\Users\DIM(depthintelligencemagazine)\docs\seo-geo-public-article-audit.md)
- [seo-geo-manual-mapping-sheet.md](C:\Users\DIM(depthintelligencemagazine)\docs\seo-geo-manual-mapping-sheet.md)

## Queue rules

- A row belongs in the rewrite queue only when at least one of these is true:
  - `analysisMeta` is missing or materially weak
  - `slug`, `title`, `H1`, and `primary_entity` do not converge on one search intent
  - market/player evidence does not stabilize the thesis into one main entity
  - source links or update timestamp are missing enough to weaken trust signals
- Rows marked `locked` in the mapping sheet stay out of the rewrite queue unless new evidence appears.

## Active queue

### 1. `microsoft-korea-profit-pool`

- Current status:
  - `rewrite-needed`
- Evidence:
  - title: `딥테크의 미래는 기술이 아니라 첫 번째 대형 고객이 결정한다`
  - market evidence: `대한민국·글로벌 딥테크 스타트업 시장`
  - mapping sheet primary entity: `글로벌 딥테크 스타트업 시장`
  - mapping sheet target query: `딥테크 첫 고객`
- Why it is in queue:
  - the public title and market evidence point to a thesis about deeptech demand and first customers
  - the slug surface still points to a different entity focus
- Editorial decision needed:
  - either align slug and search intent to the current thesis
  - or re-anchor title/H1/entity framing to match the existing slug

## Deferred queue

### 1. `everyonepr`

- Current status:
  - `rewrite-needed`
  - `deferred by user instruction`
- Evidence:
  - source type: `proposal_intake`
  - `analysisMeta`: absent
  - market/player evidence: none
  - source links: `0`
- Why it would normally rank first:
  - it is the weakest public article in the audit on trust-layer completeness
  - it lacks the CMS-style market/player, source-link, and editorial-method layer found in the other `14 / 15` rows
- Why it is not active now:
  - user explicitly asked to skip the `everyonepr` backfill in this phase

## Watchlist only

- All remaining `13` published articles
- Reason:
  - they are `locked` in the mapping sheet
  - current evidence does not justify rewrite queue placement

## Immediate takeaways

- The active rewrite queue is currently one row wide: `microsoft-korea-profit-pool`.
- `everyonepr` remains the strongest deferred cleanup candidate, but not an active task in this phase.
- Everything else should stay in observation mode unless new evidence appears.
