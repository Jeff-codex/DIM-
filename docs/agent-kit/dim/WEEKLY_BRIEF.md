# DIM — WEEKLY BRIEF

## 현재 단계

- 내부 편집 시스템 설계 착수 단계
- 공개 매거진 면은 1차 정리 완료
- 이제 제안 intake, draft 생성, editorial approval 구조를 실제 시스템으로 연결해야 하는 단계

## 이번 주 가장 큰 병목 1개

- 공개 제품은 있으나, 제안 데이터를 안전하게 보관하고 draft-ready material로 바꾸는 내부 시스템이 아직 없다

## 이번 주 목표 3개

1. proposal intake와 admin IA, D1/R2/Queues 구조를 실제 구현 명세 수준으로 고정한다
2. `/submit`을 실제 intake API와 연결할 수 있는 schema와 contract를 정리한다
3. 내부 편집시스템이 SEO/AEO/GEO 품질을 깨지 않도록 provenance / evidence / approval gate를 설계한다

## 이번 주 반드시 만들어야 할 결과물

- [ ] 내부 편집 시스템 blueprint
- [ ] D1 schema 초안
- [ ] `/submit` API contract
- [ ] `/admin/inbox` / `proposal detail` / `draft editor` IA 명세
- [ ] proposal lifecycle / approval gate 정의
- [ ] 주요 결정 로그 업데이트

## 이번 주 확인할 상태값

- 제안 원본과 편집 결과가 분리 저장되는가
- intake schema가 현재 `/submit`과 자연스럽게 연결되는가
- AI가 draft-ready material을 만들고, publish 결정은 인간에게 남는가
- admin 첫 화면이 글쓰기보다 triage를 먼저 돕는가
- publication snapshot 구조가 현재 공개 사이트와 충돌하지 않는가
- 에이전트 검토 결과가 다음 수정 라운드의 입력으로 재투입되고 있는가

## 이번 주 의사결정 메모

- 결정 1:
- 결정 2:
- 보류 이슈:

## Codex 작업 시 유의사항

- 기본 IA를 다시 뒤엎지 말 것
- `DIM답게 좁히는 일`과 `새 기능 추가`를 분리할 것
- GEO를 별도 비법처럼 다루지 말고, SEO/AEO/GEO를 하나의 visibility system으로 볼 것
- 실도메인 배포는 사용자의 명시적 승인 전까지 보류할 것
- 기존 DIM 에이전트 세트를 우선 사용하고, 결과를 다음 수정 라운드의 입력으로 다시 연결할 것
