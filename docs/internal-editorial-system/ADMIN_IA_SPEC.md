# DIM Admin IA Spec

## 목적

이 문서는 DIM 내부 편집시스템의 관리자 / 편집자 화면 구조를 정의한다.

가장 중요한 전제는 아래다.

- `제안 검토`와 `기사 작성`은 같은 화면에 섞지 않는다
- 첫 화면은 글쓰기보다 `판단`이 먼저여야 한다
- 편집자는 원본, 정규화 데이터, AI 초안, 최종 발행본을 서로 다른 층으로 봐야 한다

## 전체 IA

- `/admin`
- `/admin/inbox`
- `/admin/triage`
- `/admin/proposals/[id]`
- `/admin/drafts`
- `/admin/drafts/[id]`
- `/admin/calendar`
- `/admin/entities`
- `/admin/settings`

## 1. `/admin`

### 역할

운영 대시보드.
오늘 처리할 일과 병목만 보여준다.

### 보여야 하는 것

- 오늘 들어온 제안 수
- triage 대기 수
- `needs_info` 대기 수
- fact check 대기 수
- publish-ready 수
- stale item 수
- 오늘/이번 주 예정 발행

### 피해야 하는 것

- 긴 제출 리스트를 첫 화면에 다 보여주기
- draft editor를 대시보드 첫 화면에 붙이기

## 2. `/admin/inbox`

### 역할

새 제안 inbox.
가장 중요한 운영 화면.

### 기본 레이아웃

- 상단:
  - 상태 필터
  - 우선순위 필터
  - 카테고리 필터
  - SLA 경고 토글
- 본문:
  - row 기반 inbox

### row 한 줄에 보여야 하는 것

- 프로젝트명 / 브랜드명
- 한 줄 소개
- 왜 지금 중요한가
- 공식 URL 존재 여부
- 자료 유무
- completeness score
- 중복 가능성
- 추천 output type
- 접수 시간

### 키보드 우선 액션

- `J / K`: 다음/이전 row
- `E`: 상세 열기
- `A`: 초안 전환
- `S`: 보류
- `R`: 반려
- `I`: 추가 정보 요청

## 3. `/admin/triage`

### 역할

빠른 분류 전용 큐.

### 화면 규칙

- 카드보다 row가 우선
- 한 화면에 더 많이 보여야 함
- 마우스보다 키보드 중심

### 빠른 결정 액션

- 적합
- 정보 보강 필요
- 다른 편집자에게 배정
- 반려

### triage 기준

- 무엇을 하는가
- 왜 지금 중요한가
- 공식 링크가 있는가
- DIM 피처로 전환 가능한가
- 기존 피처와 중복되는가

## 4. `/admin/proposals/[id]`

### 역할

제안 원본 검토 화면.
판단 전용 화면이다.

### 추천 3단 레이아웃

- 왼쪽 rail
  - 상태
  - owner
  - priority
  - SLA
  - 빠른 액션
- 메인 컬럼
  - 무엇인가
  - 왜 지금 중요한가
  - 공식 링크 / 참고 자료
  - 원본 제출 내용
- 오른쪽 rail
  - 정규화 데이터
  - 추출 엔터티
  - 유사 기존 피처
  - 추천 output type
  - AI draft readiness

### 가장 먼저 보여야 하는 블록

1. 프로젝트가 무엇인지
2. 왜 지금 중요한지
3. 공식 링크
4. 제출 자료 completeness
5. 기존 피처와의 관계

## 5. `/admin/drafts`

### 역할

기사 제작 상태 목록.

### 그룹

- draft
- needs review
- fact check
- seo review
- approved
- scheduled

### row에 보여야 하는 것

- 제목 후보
- output type
- 담당 편집자
- 마지막 수정 시각
- publish readiness
- blocking issue

## 6. `/admin/drafts/[id]`

### 역할

실제 피처 편집 화면.

### 추천 레이아웃

- 상단 고정 메타바
  - status
  - category
  - slug
  - canonical
  - cover
  - publish controls
- 중앙
  - title
  - dek
  - interpretive frame
  - answer block
  - evidence block
  - body editor
- 오른쪽 rail
  - 원본 제안
  - 공식 링크
  - fact gaps
  - related features
  - AI artifacts

### 중요한 규칙

- 원본 제출은 read-only
- AI 결과는 편집 결과와 구분
- 변경 이력은 version 단위로 저장

## 7. `/admin/calendar`

### 역할

발행 일정 관리.

### 보여야 하는 것

- 날짜별 scheduled item
- category balance
- draft readiness
- cover 준비 상태
- metadata QA 상태

## 8. `/admin/entities`

### 역할

브랜드/서비스/주제 정규화와 중복 방지.

### 보여야 하는 것

- canonical name
- alias
- official URL
- 연결된 proposal 수
- 연결된 publication 수
- 마지막 업데이트 시각

## 화면 공통 규칙

### 1. 판단과 작성 분리

- proposal screen은 판단 중심
- draft screen은 제작 중심

### 2. 원본 / 정규화 / AI / 최종본 분리

네 층을 혼합해서 보여주면 안 된다.

- raw submission
- normalized data
- AI derived artifacts
- approved editorial content

### 3. 신뢰 신호

편집자는 언제나 아래를 먼저 봐야 한다.

- 공식 링크
- 제출 시점
- 검증 상태
- 중복 여부
- 관련 기존 피처

### 4. throughput 우선

admin은 public UI처럼 매거진스럽기보다 빨라야 한다.

- row 중심
- dense mode 가능
- keyboard shortcut
- sticky action rail

## 처음 구현할 최소 화면

1. `/admin/inbox`
2. `/admin/proposals/[id]`
3. `/admin/drafts/[id]`

이 3개가 먼저 있어야 실제 운영이 돈다.
