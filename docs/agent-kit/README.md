# DIM Agent Kit

이 폴더는 DIM 프로젝트 전용 운영 문서와 에이전트 프롬프트를 repo 안에 동기화한 사본이다.

목적은 세 가지다.

1. 현재 DIM의 실제 구현 상태를 기준으로 판단한다
2. Codex 작업을 매번 처음부터 설명하지 않게 만든다
3. 철학 문서가 아니라 바로 실행 가능한 운영 키트로 유지한다

## 현재 기준 전제

- DIM은 뉴스룸이 아니다
- DIM은 제보 플랫폼이 아니다
- 현재 공개 프레이밍은 `프로젝트 제출 -> 편집 및 해석 -> 콘텐츠 발행`
- 공개 라우트는 `/`, `/articles`, `/articles/[slug]`, `/about`, `/submit`
- Home과 `/articles`는 9works 문법을 번역한 매거진 구조를 공유한다
- review preview는 Cloudflare Pages `dim-preview`
- production runtime은 Cloudflare Workers
- 실도메인 배포는 최종 사인오프 전까지 보류
- `Dliver` 및 다른 프로젝트는 절대 건드리지 않는다

## 폴더 구성

- `MASTER_OPERATING_RULES.md`
- `dim/NORTH_STAR.md`
- `dim/WEEKLY_BRIEF.md`
- `dim/BUILD_QUEUE.md`
- `dim/DECISION_LOG.md`
- `dim/MASTER_BRIEF_TEMPLATE.md`
- `dim/agents/*.md`

## 권장 사용 순서

1. `docs/session-resume.md`와 현재 git 상태를 먼저 본다
2. `dim/WEEKLY_BRIEF.md`에서 이번 주 병목과 목표를 확인한다
3. 필요한 에이전트 2~3개만 먼저 호출한다
4. 마지막에 `세린_MO-1.md`로 우선순위를 압축한다
5. 실제 구현 후 `dim/DECISION_LOG.md`와 `dim/BUILD_QUEUE.md`를 갱신한다

## 이 키트가 다루는 질문

- 지금 DIM의 가장 큰 권위 병목은 무엇인가
- 화면/카피/아카이브를 어디까지 고쳐야 하는가
- 피처 제안을 어떤 운영 구조로 받을 것인가
- 어떤 작업이 지금 단계에 맞고 무엇을 미뤄야 하는가
- 검색/권위/재방문 구조를 어떻게 키울 것인가

## 유지 원칙

- DIM의 실제 구현 상태보다 앞서가는 문서를 만들지 않는다
- 템플릿만 있고 상태값이 비어 있는 문서는 방치하지 않는다
- 공개 언어와 내부 운영 언어를 구분하되, 제품 방향은 서로 어긋나지 않게 유지한다
- 에이전트는 아이디어 확장기가 아니라 실행 압축기여야 한다
