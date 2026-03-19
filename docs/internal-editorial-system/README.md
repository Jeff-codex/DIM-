# DIM Internal Editorial System Blueprint

## 목적

이 문서는 DIM의 다음 단계인 `내부 편집 시스템` 구축 기준점이다.

현재 공개 제품은 아래 흐름을 이미 보여주고 있다.

- 프로젝트 제출
- 편집 및 해석
- 콘텐츠 발행

하지만 지금은 공개 페이지와 MDX 발행면만 있고, 실제로 제안을 받아 정리하고 초안화하고 승인하는 내부 시스템은 없다.

따라서 내부 시스템의 목적은 단순한 CMS가 아니다.

- 제출 원본을 안전하게 보관하고
- 링크/이미지/텍스트를 구조화하고
- AI가 draft-ready material로 정리하고
- 편집자가 최종 판단과 발행을 잠그는
- `intake-first editorial pipeline`을 만드는 것이 목적이다

## DIM 기준 핵심 원칙

1. DIM은 뉴스룸이 아니다.
2. 제안은 그대로 실리지 않는다.
3. 원본 제출과 편집 결과는 절대 섞지 않는다.
4. AI는 자동 발행이 아니라 자동 초안화를 맡는다.
5. publish/no-publish 판단은 인간 편집자가 잠근다.
6. 공개 사이트는 publication snapshot만 읽는다.
7. SEO/AEO/GEO 품질은 intake 단계부터 설계한다.

## 현재 공개 제품과의 연결

현재 공개 페이지 기준으로 내부 시스템은 아래 입력을 받아야 한다.

- 프로젝트명 / 브랜드명
- 담당자명
- 이메일
- 웹사이트 또는 링크
- 한 줄 소개
- 무엇을 하는 서비스 / 제품인가
- 왜 지금 중요한가
- 현재 단계
- 주요 사용자 또는 시장
- 참고 링크 / 이미지 / 자료

이 입력 구조는 앞으로도 유지한다.
즉, 내부 시스템은 현재 `/submit`의 schema를 확장하는 방향으로 간다.

## 권장 기술 구조

- `D1`
  - source of truth
  - 제안, 엔터티, 드래프트, 상태 이력, 발행 기록 저장
- `R2`
  - 제출 이미지, PDF, 캡처, 참고 자료, 생성된 cover/snapshot 저장
- `Queues`
  - 정규화, 엔터티 추출, AI 초안 생성 같은 비동기 작업 오케스트레이션
- `KV`
  - autosave, 최근 상태 캐시, feature flag 같은 보조 저장소
- `AI Provider`
  - Workers AI 또는 외부 모델을 어댑터 뒤로 숨김

## 내부 시스템의 최소 페이지 IA

- `/admin`
  - 오늘 볼 일, stale queue, publish-ready item
- `/admin/inbox`
  - 새 제안 inbox
- `/admin/proposals/[id]`
  - 제안 원본 + 정규화 데이터 + 판단 패널
- `/admin/triage`
  - 빠른 분류와 배정
- `/admin/drafts/[id]`
  - 실제 피처 편집
- `/admin/calendar`
  - 발행 스케줄
- `/admin/entities`
  - 브랜드/서비스/주제 정규화

## 가장 중요한 분리

절대 같은 화면에서 다루면 안 되는 것:

- `제안 검토`
- `기사 작성`

먼저 필요한 것은 “좋은 글을 쓰는 화면”이 아니라,
“이 제안이 DIM 기준에 맞는가”를 빠르게 판단하는 화면이다.

## 구축 단계

### Phase 0

- 현재 `/submit`를 서버에 연결
- D1에 proposal 저장
- R2에 자료 업로드 저장
- 내부 inbox 최소 버전 구축

### Phase 1

- triage / assignment / needs_info / reject까지 가능한 admin
- completeness score
- duplicate/entity hint

### Phase 2

- AI enrichment
- entity extraction
- title/dek/outline/answer block draft
- editorial draft 생성

### Phase 3

- publication snapshot
- 공개 발행 연결
- SEO/AEO/GEO QA checklist 내장

### Phase 4

- entity hub
- topic cluster
- update reminders
- stale fact recheck

## 함께 봐야 할 문서

- [D1 schema draft](./D1_SCHEMA_DRAFT.sql)
- [Admin IA spec](./ADMIN_IA_SPEC.md)
- [Submit API contract](./SUBMIT_API_CONTRACT.md)

## 한 줄 결론

DIM 내부 시스템은 CMS가 아니라,
`제안 원본 -> 구조화 -> AI 초안 -> 편집 판단 -> 발행`
으로 이어지는 편집 운영 시스템이어야 한다.
