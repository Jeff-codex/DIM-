# DIM SEO/GEO Public Article Audit

Date: `2026-03-30`
Source of truth:
- Production D1 published rows via `wrangler d1 execute --remote`
- Static export artifacts under `apps/web/out/articles/*.html`

## Evidence notes

- Current public article count is `15`.
- `analysisMeta` coverage is `14 / 15`.
- The only currently published article without the CMS-style `analysisMeta` layer is `everyonepr`.
- `primary_entity` and `target_query` are not encoded as structured fields in the current schema.
  - They still require manual editorial mapping.
  - This is a schema gap, not a missing lookup.

## Priority summary

1. `everyonepr`
   - Missing `analysisMeta`
   - Missing market/player scope field
   - Missing source links list
   - Still has `publishedAt` / `updatedAt`
2. All other currently published articles
   - Already include market/player scope, source links, and update timestamps
   - Remaining work is editorial mapping for `primary_entity` and `target_query`

## Audit table

| slug | category | source_type | title | H1 | market/player evidence | source_links | updated_timestamp | primary_entity_mapping | target_query_mapping |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ai-platform-profit-pool` | `industry-analysis` | `internal_industry_analysis` | AI는 전문가를 지운 것이 아니라 전문가의 경계를 허물었다 | AI는 전문가를 지운 것이 아니라 전문가의 경계를 허물었다 | `1인 창업·AI 기반 소규모 창업·중소기업 AI 활용 시장` | `5` | `2026-03-30T04:17:49.039Z` | manual needed | manual needed |
| `korea-platform-profit-pool` | `startups` | `internal_industry_analysis` | 공유오피스의 위기 사실 끝난 것은 책상만 빌려주던 모델이다 | 공유오피스의 위기 사실 끝난 것은 책상만 빌려주던 모델이다 | `대한민국 공유오피스·플렉스오피스 시장` | `9` | `2026-03-30T04:00:51.426Z` | manual needed | manual needed |
| `thinking-machines-startup` | `startups` | `internal_industry_analysis` | Thinking Machines의 가치는 아직 제품이 아니라 연산 자원의 약속에서 나온다 | Thinking Machines의 가치는 아직 제품이 아니라 연산 자원의 약속에서 나온다 | `프런티어 AI 랩 시장` | `5` | `2026-03-28T02:36:03.329Z` | manual needed | manual needed |
| `korea-industry-structure` | `industry-analysis` | `internal_industry_analysis` | 중동 위기가 키우는 것은 유가가 아니라 한국 조선의 몸값이다 | 중동 위기가 키우는 것은 유가가 아니라 한국 조선의 몸값이다 | `대한민국 조선·정유·해운·에너지 운송 시장` | `9` | `2026-03-27T01:37:56.760Z` | manual needed | manual needed |
| `microsoft-korea-profit-pool` | `industry-analysis` | `internal_industry_analysis` | 딥테크의 미래는 기술이 아니라 첫 번째 대형 고객이 결정한다 | 딥테크의 미래는 기술이 아니라 첫 번째 대형 고객이 결정한다 | `대한민국·글로벌 딥테크 스타트업 시장` | `12` | `2026-03-27T01:16:40.561Z` | manual needed | manual needed |
| `korea-vclpm-a-profit-pool` | `industry-analysis` | `internal_industry_analysis` | 돈은 다시 돌기 시작했지만, 한국 VC의 출구는 아직 닫혀 있다 | 돈은 다시 돌기 시작했지만 한국 VC의 출구는 아직 닫혀 있다 | `대한민국 VC·LP·모태펀드·코스닥·세컨더리·M&A·컨티뉴에이션 펀드 시장` | `7` | `2026-03-27T00:56:31.176Z` | manual needed | manual needed |
| `daiso-beauty-profit-pool` | `industry-analysis` | `internal_industry_analysis` | 다이소 뷰티 열풍 중요한 것은 저가가 아니라 브랜드의 첫 경험이다 | 다이소 뷰티 열풍 중요한 것은 저가가 아니라 브랜드의 첫 경험이다 | `초저가 뷰티·입문 뷰티 시장` | `10` | `2026-03-26T22:24:36.550Z` | manual needed | manual needed |
| `xiaohongshu-china-operating-rights` | `industry-analysis` | `internal_industry_analysis` | 샤오홍슈 진출 열풍에서 읽어야 할 것은 바이럴이 아니라 중국 운영권이다 | 샤오홍슈 진출 열풍에서 읽어야 할 것은 바이럴이 아니라 중국 운영권이다 | `샤오홍슈·중국 진출·중국 소셜커머스 시장` | `11` | `2026-03-26T12:58:17.920Z` | manual needed | manual needed |
| `olive-young-entry-rights` | `industry-analysis` | `internal_industry_analysis` | 올리브영이 파는 것은 화장품이 아니라 K-뷰티의 입점권이다 | 올리브영이 파는 것은 화장품이 아니라 K-뷰티의 입점권이다 | `K-뷰티 유통·브랜드 인큐베이팅·글로벌 연결 시장` | `9` | `2026-03-26T12:36:32.410Z` | manual needed | manual needed |
| `korea-pr-search-asset` | `industry-analysis` | `internal_industry_analysis` | 국내 보도자료 송출에서 읽어야 할 것은 배포가 아니라 검색 자산화다 | 국내 보도자료 송출에서 읽어야 할 것은 배포가 아니라 검색 자산화다 | `대한민국 보도자료 송출·검색 노출 관리·SEO·GEO 시장` | `12` | `2026-03-26T12:01:01.246Z` | manual needed | manual needed |
| `retail-media-attention-monetization` | `industry-analysis` | `internal_industry_analysis` | 리테일 경쟁의 실체는 판매가 아니라 시선의 광고화다 | 리테일 경쟁의 실체는 판매가 아니라 시선의 광고화다 | `인스토어 리테일 미디어·오프라인 유통 광고 시장` | `6` | `2026-03-26T11:40:51.354Z` | manual needed | manual needed |
| `luxury-trusted-recommerce` | `industry-analysis` | `internal_industry_analysis` | 럭셔리 시장에서 읽어야 할 것은 신상품이 아니라 신뢰가 붙은 재유통이다 | 럭셔리 시장에서 읽어야 할 것은 신상품이 아니라 신뢰가 붙은 재유통이다 | `럭셔리 리세일·재유통 시장` | `8` | `2026-03-26T11:22:56.717Z` | manual needed | manual needed |
| `brand-marketing-authenticity-proof` | `industry-analysis` | `internal_industry_analysis` | 브랜드 마케팅 경쟁에서 읽어야 할 것은 생성 효율이 아니라 인간성의 인증이다 | 브랜드 마케팅 경쟁에서 읽어야 할 것은 생성 효율이 아니라 인간성의 인증이다 | `브랜드 마케팅·패션/뷰티 브랜딩 시장` | `4` | `2026-03-26T11:11:45.873Z` | manual needed | manual needed |
| `ai-browser-interface-power` | `industry-analysis` | `internal_industry_analysis` | AI 브라우저 경쟁에서 읽어야 할 것은 검색이 아니라 행동 인터페이스의 선점이다 | AI 브라우저 경쟁에서 읽어야 할 것은 검색이 아니라 행동 인터페이스의 선점이다 | `AI 브라우저·행동 인터페이스 시장` | `12` | `2026-03-26T11:04:10.060Z` | manual needed | manual needed |
| `everyonepr` | `startups` | `proposal_intake` | 모두의피알은 보도자료 유통 과정을 실무자의 운영 화면으로 옮기는 인프라다 | 모두의피알은 보도자료 유통 과정을 실무자의 운영 화면으로 옮기는 인프라다 | none | `0` | `2026-03-24T14:11:32.834Z` | manual needed | manual needed |

