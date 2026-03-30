# DIM SEO/GEO Manual Mapping Sheet

Date: `2026-03-30`
Status:
- evidence-backed proposed mapping sheet
- not yet encoded in schema
- not yet applied to CMS or public code

## Evidence sources

- [seo-geo-public-article-audit.md](C:\Users\DIM(depthintelligencemagazine)\docs\seo-geo-public-article-audit.md)
- production D1 published rows
- public article detail title/H1/excerpt
- `market/player evidence` where present

## Status meanings

- `locked`
  - title, H1, excerpt, and market evidence point to one main entity and one main query
- `rewrite-needed`
  - a provisional mapping can be suggested, but slug/title/H1/entity alignment is not clean enough to treat as stable

## Mapping sheet

| slug | category | proposed_primary_entity | proposed_target_query | mapping_status | evidence note |
| --- | --- | --- | --- | --- | --- |
| `ai-platform-profit-pool` | `industry-analysis` | `AI 기반 소규모 창업·솔로 파운더 시장` | `1인 창업 AI 도구` | `locked` | title and market both point to AI-enabled solo/small-scale entrepreneurship |
| `korea-platform-profit-pool` | `startups` | `한국 공유오피스 시장` | `한국 공유오피스 시장` | `locked` | title, excerpt, and market all converge on the Korean shared-office market |
| `thinking-machines-startup` | `startups` | `Thinking Machines Lab` | `Thinking Machines Lab 프런티어 AI 랩` | `locked` | company and frontier-lab framing are explicit in title, excerpt, and market |
| `korea-industry-structure` | `industry-analysis` | `한국 조선업` | `한국 조선업 구조` | `locked` | title centers Korean shipbuilding despite broader energy-shipping context |
| `microsoft-korea-profit-pool` | `industry-analysis` | `글로벌 딥테크 스타트업 시장` | `딥테크 첫 고객` | `rewrite-needed` | title points to a thesis about deeptech demand, but slug suggests a different entity focus |
| `korea-vclpm-a-profit-pool` | `industry-analysis` | `한국 VC 출구 시장` | `한국 VC 출구 전략` | `locked` | title, excerpt, and market all point to exit bottlenecks in Korean VC |
| `daiso-beauty-profit-pool` | `industry-analysis` | `다이소 뷰티` | `다이소 뷰티 입문` | `locked` | title and market both center Daiso Beauty as the entry point entity |
| `xiaohongshu-china-operating-rights` | `industry-analysis` | `샤오홍슈 운영권` | `샤오홍슈 중국 운영권` | `locked` | title and market clearly focus on Xiaohongshu operating control in China |
| `olive-young-entry-rights` | `industry-analysis` | `올리브영 입점권` | `올리브영 입점권` | `locked` | title, excerpt, and market all center Olive Young as a gatekeeping entity |
| `korea-pr-search-asset` | `industry-analysis` | `보도자료 검색 자산화 시장` | `보도자료 검색 자산화` | `locked` | title and market both point to PR distribution as search asset creation |
| `retail-media-attention-monetization` | `industry-analysis` | `리테일 미디어·오프라인 유통 광고화 시장` | `리테일 미디어 광고화` | `locked` | title and market both center retail-media monetization of in-store attention |
| `luxury-trusted-recommerce` | `industry-analysis` | `럭셔리 재유통 시장` | `럭셔리 리세일 신뢰` | `locked` | title and market both center trusted luxury recommerce rather than one company |
| `brand-marketing-authenticity-proof` | `industry-analysis` | `브랜드 인간성 인증 시장` | `브랜드 인간성 인증` | `locked` | title and market both point to authenticity-proof as the main market thesis |
| `ai-browser-interface-power` | `industry-analysis` | `AI 브라우저·행동 인터페이스 시장` | `AI 브라우저 인터페이스` | `locked` | title, excerpt, and market all point to AI browser behavior-interface competition |
| `everyonepr` | `startups` | `모두의피알` | `셀프 PR 운영 인프라` | `rewrite-needed` | title and excerpt support the entity, but market/source-link backfill is still deferred by user instruction |

## Immediate takeaways

- Most current public pages can already be mapped without changing code.
- The only clearly deferred row is `everyonepr`.
- The clearest slug/title mismatch risk remains `microsoft-korea-profit-pool`.

