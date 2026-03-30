# DIM SEO/GEO Public URL Mapping

Date: `2026-03-30`
Status:
- evidence-backed public URL mapping
- article rows are maintained separately in [seo-geo-manual-mapping-sheet.md](C:\Users\DIM(depthintelligencemagazine)\docs\seo-geo-manual-mapping-sheet.md)
- this document covers public non-article HTML routes from `sitemap.ts`

## Evidence sources

- [apps/web/app/sitemap.ts](C:\Users\DIM(depthintelligencemagazine)\apps\web\app\sitemap.ts)
- static export files under `apps/web/out/*.html`
- page title
- first `h1`
- meta description

## Scope rules

- Included:
  - `/`
  - `/articles`
  - category archive pages
  - `/about`
  - `/submit`
  - `/privacy`
  - `/proposal-terms`
- Excluded:
  - article detail routes
  - utility feeds and crawler files such as `/rss.xml`, `/robots.txt`, `/sitemap.xml`
  - admin routes

## Status meanings

- `locked`
  - title, H1, and description all converge on one broad entity and one public-facing query
- `broad`
  - the route is navigational or policy-oriented rather than a narrow search landing, but the current intent is still stable

## Mapping table

| url | title | H1 | proposed_primary_entity | proposed_target_query | mapping_status | evidence note |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | `비즈니스 구조 분석 매거진` | `스타트업·제품 출시·산업 구조를 비즈니스 구조 관점에서 분석하는 매거진` | `DIM` | `비즈니스 구조 분석 매거진` | `locked` | title, H1, and description all position DIM as the magazine-level entity |
| `/articles` | `비즈니스 구조 분석 피처 | DIM` | `비즈니스 구조 분석 피처` | `DIM 비즈니스 구조 분석 아카이브` | `비즈니스 구조 분석 피처` | `locked` | archive title, H1, and description all point to the main feature archive |
| `/articles/startups` | `스타트업 분석 | DIM` | `스타트업 분석` | `DIM 스타트업 분석 아카이브` | `스타트업 분석` | `locked` | title, H1, and description all converge on startup analysis |
| `/articles/product-launches` | `제품 출시 분석 | DIM` | `제품 출시 분석` | `DIM 제품 출시 분석 아카이브` | `제품 출시 분석` | `locked` | title, H1, and description all converge on product-launch analysis |
| `/articles/industry-analysis` | `산업 구조 분석 | DIM` | `산업 구조 분석` | `DIM 산업 구조 분석 아카이브` | `산업 구조 분석` | `locked` | title, H1, and description all converge on industry-structure analysis |
| `/about` | `소개 | DIM` | `DIM은 변화의 이유를 읽습니다` | `DIM 편집 원칙과 소개` | `DIM 소개` | `broad` | title is generic, but H1 and description clearly frame editorial method and identity |
| `/submit` | `피처 제안 | DIM` | `피처 제안` | `DIM 피처 제안` | `피처 제안` | `broad` | navigational route for submissions; title, H1, and description align on proposal intake |
| `/privacy` | `개인정보처리방침 | DIM` | `DIM의 개인정보처리방침` | `DIM 개인정보 처리방침` | `DIM 개인정보처리방침` | `broad` | policy page with stable legal intent, not a competitive editorial keyword target |
| `/proposal-terms` | `제출자료 처리조건 | DIM` | `피처 제안 제출자료 처리조건` | `DIM 제출자료 처리조건` | `DIM 제출자료 처리조건` | `broad` | policy page with stable legal/process intent, not a competitive editorial keyword target |

## Immediate takeaways

- The public non-article routes are more stable than the article corpus.
- The only intentionally broad rows are `/about`, `/submit`, and the two policy pages.
- No article-external route currently needs `rewrite-needed` status based on title/H1/description evidence alone.
