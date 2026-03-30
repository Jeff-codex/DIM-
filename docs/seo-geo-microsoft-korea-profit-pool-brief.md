# DIM SEO/GEO Rewrite Brief: `microsoft-korea-profit-pool`

Date: `2026-03-30`
Status:
- evidence-backed rewrite brief
- no code change
- no CMS write
- no preview or production content mutation yet

## Scope

- Target row:
  - `microsoft-korea-profit-pool`
- Goal:
  - resolve the public search-intent mismatch between `slug` and the rest of the article signals

## Evidence sources

- [seo-geo-public-article-audit.md](C:\Users\DIM(depthintelligencemagazine)\docs\seo-geo-public-article-audit.md)
- [seo-geo-manual-mapping-sheet.md](C:\Users\DIM(depthintelligencemagazine)\docs\seo-geo-manual-mapping-sheet.md)
- static export artifact:
  - [microsoft-korea-profit-pool.html](C:\Users\DIM(depthintelligencemagazine)\apps\web\out\articles\microsoft-korea-profit-pool.html)

## Current public signals

- Current slug:
  - `microsoft-korea-profit-pool`
- Current title/H1:
  - `딥테크의 미래는 기술이 아니라 첫 번째 대형 고객이 결정한다`
- Current meta description:
  - `지금 VC 업계에서 딥테크는 가장 뜨거운 단어 중 하나다. 하지만 시장은 이미 딥테크를 “어려운 기술 스타트업”이라는 낭만으로 보지 않는다. 글로벌 자금은 AI 인프라, 방산, 바이오처럼 기술 자체보다 먼저 큰 구매자와 자본의 인내가 붙는 영역으로 몰리고 있다. 그래서 딥테크 전망의 본체는 기술 진보가 아니라, 누가 먼저 그 기술을 대규모로 사주고 오래 버틸 수 있게 해주느냐에 있다.`
- Current market evidence from audit:
  - `대한민국·글로벌 딥테크 스타트업 시장`
- Current mapping proposal:
  - primary entity: `글로벌 딥테크 스타트업 시장`
  - target query: `딥테크 첫 고객`

## Body-level evidence

The current `h2` structure also converges on the same thesis:

- `전 세계가 딥테크를 말하지만, 실제로 돈이 몰리는 곳은 이미 정해져 있다`
- `AI 인프라가 뜨는 이유는 모델의 아름다움이 아니라 고객의 지갑 크기다`
- `방산 딥테크가 뜨는 이유도 결국 같은 구조다`
- `바이오도 결국 플랫폼보다 구매자 구조가 강한 곳으로 돈이 간다`
- `한국은 딥테크를 키우고 있지만, 아직은 시장보다 정책의 언어가 더 강하다`
- `그래서 앞으로 VC가 봐야 할 것은 기술 난이도가 아니라 고객 구조다`

## Confirmed problem

- The article body, title, meta description, market evidence, and proposed mapping all align to a thesis about:
  - `딥테크의 첫 고객 구조`
  - `대형 구매자 / 고객 구조`
  - `글로벌 딥테크 스타트업 시장`
- Only the current slug remains out of line with that thesis.
- This makes the slug the clearest mismatch point, not the article body.

## Safe options

### Option 1. Align the slug to the current thesis

- Keep:
  - current title
  - current H1
  - current body thesis
  - current primary entity direction
- Change:
  - slug only
- Why this is safer:
  - the existing public article already converges on one search intent
  - rewrite scope stays narrow
  - the authoritative path remains the current on-page content
- SEO tradeoff:
  - redirect and canonical cleanup will be needed if the live URL changes

### Option 2. Preserve the slug and rewrite the article around `Microsoft Korea`

- Keep:
  - current slug
- Change:
  - title
  - H1
  - entity framing
  - likely parts of the body
- Why this is weaker:
  - the current article does not read like a Microsoft Korea-centered piece
  - rewrite scope becomes much larger
  - current public evidence does not support this as the authoritative path

## Recommended direction

- Recommend `Option 1`.
- Editorially, the current public article already behaves like a `딥테크 첫 고객` thesis piece.
- The cleanest fix is to align the slug to the article, not to force the article back toward the current slug.

## What can be done now

- Allowed now:
  - keep this row in the active rewrite queue
  - use this brief as the editorial decision memo
  - defer implementation until an actual rewrite or URL-change round is approved
- Not meaningful yet:
  - preview/candidate DB verification
  - production content mutation
- Reason:
  - there is no new edited variant to verify yet
  - current result is a documentation-stage decision, not a code or CMS write operation

## Immediate takeaway

- `microsoft-korea-profit-pool` remains the single active rewrite row.
- The current article’s authoritative path is the `딥테크 첫 고객` thesis, not the present slug surface.
