# DIM Agent Kit

DIM 전용 운영 문서와 에이전트 프롬프트를 저장하는 폴더다.

이 폴더의 목적은 세 가지다.

1. 현재 DIM 상태를 기준으로 판단 기준을 통일한다
2. 병렬 에이전트 작업을 해도 브랜드/제품 방향이 흔들리지 않게 한다
3. 다음 세션에서 바로 이어서 쓸 수 있는 운영 문서를 repo 안에 보관한다

## 현재 소스 오브 트루스

- 운영 체크포인트: `docs/session-resume.md`
- 배포 규칙: `docs/deployment-checklist.md`
- 에이전트 운영 규칙: `docs/agent-kit/MASTER_OPERATING_RULES.md`
- DIM 전용 문서 묶음: `docs/agent-kit/dim/`

## 포함 파일

- `MASTER_OPERATING_RULES.md`
- `dim/NORTH_STAR.md`
- `dim/WEEKLY_BRIEF.md`
- `dim/BUILD_QUEUE.md`
- `dim/DECISION_LOG.md`
- `dim/MASTER_BRIEF_TEMPLATE.md`
- `dim/agents/*.md`

## 권장 사용 순서

1. `docs/session-resume.md`로 현재 체크포인트 확인
2. `docs/agent-kit/dim/WEEKLY_BRIEF.md`로 이번 주 병목 확인
3. `docs/agent-kit/dim/BUILD_QUEUE.md`로 실제 작업 우선순위 확인
4. 필요한 에이전트 프롬프트 2~3개만 골라 호출
5. 중요한 결정은 `docs/agent-kit/dim/DECISION_LOG.md`에 누적

## 현재 운영 단계

DIM은 현재 `기본 공개 버전 + 1차 매거진 리디자인 완료` 상태다.

- 홈과 `/articles`는 매거진형 아카이브 문법으로 재구성됨
- `/about`, `/submit`, `/articles/[slug]`도 같은 브랜드 시스템 안으로 정리됨
- `피처 제안 -> 편집 및 해석 -> 콘텐츠 발행` 흐름이 고정됨
- MDX 기반 운영, 대표 이미지, SEO JSON-LD, Pages preview / Workers production 분리까지 확보됨

즉, 이 키트는 더 이상 `아직 아무것도 없는 초기 설계용` 문서가 아니라,
`이미 1차 구현이 끝난 DIM을 어떻게 더 DIM답게 좁혀 갈지`에 맞춰 써야 한다.

## 동기화 원칙

- repo 안의 이 폴더를 DIM 전용 기준본으로 본다
- 외부 보관 폴더가 있다면 이 폴더 기준으로 다시 복사해 동기화한다
- `Dliver` 또는 다른 프로젝트 문서는 이 폴더에 섞지 않는다
