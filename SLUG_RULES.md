# DIM Slug Rules

DIM 기사 slug는 제목의 문장을 그대로 옮기는 값이 아니라, 검색과 공유에서 오래 쓰일 수 있는 주제 신호다.

## 목적

- URL만 봐도 무엇에 관한 글인지 대략 이해 가능해야 한다.
- 제목이 바뀌어도 canonical URL 자산은 오래 유지될 수 있어야 한다.
- 검색엔진과 사용자 모두에게 약하지만 분명한 주제 신호를 줘야 한다.
- 임시 URL, 숫자 꼬리표 URL, 의미 없는 단어 URL은 허용하지 않는다.
- DIM의 산업 구조 해석 문법에 맞게 `시장/플레이어 + 구조 변화` 중심으로 압축한다.

## 형식 규칙

- slug는 영문 소문자만 사용한다.
- 단어 구분은 하이픈(`-`)만 사용한다.
- 공백, 언더스코어, 특수문자, 연속 하이픈을 금지한다.
- 가능하면 3~5단어로 구성한다.
- 2단어 이하는 강한 맥락이 있을 때만 예외적으로 허용한다.
- 6단어를 초과하면 과도하게 길다고 보고 더 압축한다.

## 의미 규칙

slug는 아래 요소 중 최소 2개, 가능하면 3개를 포함해야 한다.

- 플레이어/브랜드/시장/국가
- 산업/카테고리
- 구조 변화/경쟁 축/지배 모델/욕망 이동/유통 변화/이익 풀 변화

예:

- `daiso-beauty-desire-shift`
- `korea-pr-search-visibility`
- `ai-distribution-power`
- `xiaohongshu-brand-barrier`

## DIM 문법 규칙

DIM은 표면 묘사보다 본질 재정의를 우선한다. slug도 단순 소재명보다 구조 변화가 반영되어야 한다.

권장 구조어 예시:

- `desire-shift`
- `profit-pool`
- `distribution-war`
- `platform-power`
- `trust-gap`
- `margin-game`
- `channel-shift`
- `demand-fragmentation`
- `visibility`
- `search-asset`
- `brand-barrier`
- `retail-reset`
- `luxury-reset`
- `commerce-shift`

## 제목 복붙 금지

기사 제목을 장문으로 번역해 slug로 옮기지 않는다.

나쁜 방식:

- `what-matters-in-daiso-beauty-is-not-price-but-desire-shift`

좋은 방식:

- `daiso-beauty-desire-shift`

## 중복 처리 규칙

이미 같은 slug가 존재할 경우 숫자를 덧붙여 회피하지 않는다.

금지:

- `feature-2`
- `daiso-beauty-shift-2`
- `article-3`

허용 원칙:

- 구조어, 시장어, 경쟁 축을 보강해서 의미적으로 구분한다.

예:

- `daiso-beauty-desire-shift`
- `daiso-beauty-channel-shift`
- `daiso-beauty-profit-pool`

## 브랜드/고유명사 처리 규칙

브랜드명, 서비스명, 플랫폼명, 국가명은 가능한 한 일반적으로 인식 가능한 로마자 표기를 사용한다.

예:

- `다이소 -> daiso`
- `샤오홍슈 -> xiaohongshu`
- `모두의피알 -> everyonepr`
- `네이버 -> naver`
- `쿠팡 -> coupang`
- `한국/국내 -> korea`

무의미한 한 글자 축약은 금지한다.

## 범용 단어 남용 금지

다음 단어는 slug의 핵심 축으로 단독 사용하지 않는다.

- `feature`
- `article`
- `post`
- `story`
- `insight`
- `analysis`
- `new`
- `draft`
- `untitled`
- `page`
- `admin`
- `home`
- `index`

## 너무 넓은 단어 금지

의미가 지나치게 넓어 한 페이지를 설명하지 못하는 slug는 거부한다.

예:

- `ai`
- `beauty`
- `retail`
- `media`
- `search`
- `trend`

이 경우 구조어 또는 맥락어를 추가해야 한다.

예:

- `ai-search-power`
- `beauty-channel-shift`
- `retail-margin-game`

## 검증 규칙

아래 중 하나라도 해당하면 `revise` 또는 `reject` 판정을 내린다.

- 1단어 slug
- 2단어 slug지만 강한 주제 신호가 없음
- 6단어 초과
- 주제가 무엇인지 URL만 봐서는 알 수 없음
- 구조 변화 신호가 없음
- 대문자, 공백, 특수문자, 언더스코어 포함
- 숫자 꼬리표, 날짜형 나열, 임시 slug 흔적
- existing slug 또는 alias와 충돌

## 금칙 패턴

정확 금지어:

- `feature`
- `article`
- `post`
- `new`
- `test`
- `temp`
- `draft`
- `untitled`
- `home`
- `index`
- `page`
- `admin`
- `k`
- `a`
- `b`
- `c`
- `ai`
- `seo`
- `pr`

패턴 금지:

- `^feature-\d+$`
- `^article-\d+$`
- `^post-\d+$`
- `^untitled-\d+$`
- `^[a-z]$`
- `^.+-\d+$`
- `^\d+$`
- `^test.*$`
- `^temp.*$`
- `^draft.*$`

## 스코어링 기준

- `90-100`: pass
- `75-89`: pass 또는 revise
- `50-74`: revise
- `0-49`: reject

가산 요소:

- 주제 명확성
- 구조 변화 반영
- 3~5단어 압축
- 브랜드/시장/카테고리 식별 가능
- existing slug와 비충돌

감점 요소:

- 지나치게 짧음
- 지나치게 넓음
- 숫자 꼬리표
- 임시 흔적
- 제목과 무관
- 구조 의미 없음

## Redirect 규칙

- current slug가 부적절하고 recommended slug가 다르면 `old -> new` 영구 redirect를 남긴다.
- canonical source는 언제나 `feature_entry.slug` 하나만 유지한다.
- alias는 redirect/history 전용이며 public canonical로 노출하지 않는다.
