# DIM Submit API Contract

## 목적

현재 공개 `/submit` 폼을 실제 intake backend에 연결하기 위한 계약 문서다.

이 API의 목적은 “즉시 공개”가 아니라 아래다.

- 원본 제출 보관
- 첨부 자료 저장
- 정규화 작업 시작
- 내부 inbox로 넘길 수 있는 proposal record 생성

## 설계 원칙

1. 원본 payload는 그대로 보존한다
2. 파일은 R2에 저장한다
3. proposal 생성과 파일 업로드는 하나의 intake 흐름으로 묶는다
4. 성공 응답은 publish 결과가 아니라 `proposal created`여야 한다
5. 공개 폼은 단순하고, 내부 시스템이 복잡성을 떠안는다

## Public Endpoints

### `POST /api/proposals`

공개 제출 엔드포인트.

#### Content-Type

- `multipart/form-data`

#### Form parts

- `payload`
  - JSON string
- `files[]`
  - optional
  - image, pdf, document

#### Payload shape

```json
{
  "schemaVersion": 1,
  "projectName": "DIM",
  "contactName": "홍길동",
  "email": "name@company.com",
  "website": "https://example.com",
  "summary": "한 줄 소개",
  "productDescription": "무엇을 하는 서비스인지",
  "whyNow": "왜 지금 중요한가",
  "stage": "launch",
  "market": "B2B SaaS 팀",
  "references": [
    "https://example.com/product",
    "https://example.com/pricing"
  ],
  "locale": "ko-KR"
}
```

#### Validation rules

- required
  - `projectName`
  - `summary`
  - `whyNow`
- recommended
  - `website`
  - `productDescription`
  - `stage`
  - `references`
- limits
  - `summary`: 200 chars
  - `productDescription`: 4000 chars
  - `whyNow`: 2000 chars
  - attachments: max count / mime whitelist / size cap

#### Success response

```json
{
  "ok": true,
  "proposalId": "prop_01...",
  "status": "received",
  "completenessScore": 78,
  "receivedAt": "2026-03-19T11:22:33.000Z"
}
```

#### Error response

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "projectName, summary, whyNow are required",
    "fields": ["projectName", "summary", "whyNow"]
  }
}
```

### `POST /api/proposals/drafts`

공개 폼의 초안 저장용.
현재 local-only 초안 저장을 서버 초안 저장으로 확장할 때 사용한다.

#### Payload

```json
{
  "draftId": "draft_optional",
  "payload": {
    "projectName": "DIM",
    "summary": "한 줄 소개",
    "whyNow": "왜 지금 중요한가"
  }
}
```

#### Success response

```json
{
  "ok": true,
  "draftId": "draft_01...",
  "savedAt": "2026-03-19T11:22:33.000Z"
}
```

### `GET /api/proposals/drafts/:draftId`

공개 제출 초안 복원용.

## Internal Endpoints

### `GET /api/admin/proposals`

쿼리 파라미터:

- `status`
- `owner`
- `priority`
- `q`
- `page`

응답에는 inbox row에 필요한 최소 정보만 포함한다.

### `GET /api/admin/proposals/:id`

proposal 상세.

반환해야 하는 레이어:

- raw submission
- normalized data
- links
- assets
- extracted entities
- assessment
- workflow history
- AI readiness summary

### `POST /api/admin/proposals/:id/triage`

가능한 액션:

- `assign`
- `needs_info`
- `reject`
- `create_draft`

예시:

```json
{
  "action": "create_draft",
  "reason": "런칭과 구조 변화가 함께 보임",
  "recommendedOutputType": "analysis_feature"
}
```

### `POST /api/admin/proposals/:id/request-info`

추가 정보 요청.

```json
{
  "message": "공식 제품 링크와 출시 시점을 추가로 보내 주세요"
}
```

### `POST /api/admin/drafts/:id/approve`

draft를 다음 상태로 넘긴다.

예시:

```json
{
  "nextState": "fact_check",
  "note": "제목 후보 2개 중 첫 번째로 진행"
}
```

### `POST /api/admin/drafts/:id/publish`

publication snapshot 생성 후 publish-ready 상태로 전환.

## Queue events

`POST /api/proposals` 성공 후 발생해야 하는 이벤트:

- `proposal.received`
- `proposal.normalize.requested`
- `proposal.asset_validation.requested`
- `proposal.entity_extract.requested`

추후 초안 생성 시:

- `proposal.classify.requested`
- `draft.outline.requested`
- `draft.generate.requested`

## 보안 / 운영 규칙

- 공개 API는 rate limit 필요
- 파일은 mime/type whitelist 필요
- 원본 payload는 audit 목적으로 보존
- 내부 API는 editor auth 필요
- publish 계열 API는 managing editor 이상만 허용

## 현재 `/submit`와의 매핑

현재 공개 폼 필드와 API 필드는 아래처럼 1:1 매핑한다.

- `projectName` -> 프로젝트명 / 브랜드명
- `contactName` -> 담당자명
- `email` -> 이메일
- `website` -> 웹사이트 또는 링크
- `summary` -> 한 줄 소개
- `productDescription` -> 무엇을 하는 서비스 / 제품인가
- `whyNow` -> 왜 지금 중요한가
- `stage` -> 현재 단계
- `market` -> 주요 사용자 또는 시장
- `references` -> 참고 링크 / 이미지 / 자료

## 한 줄 결론

DIM submit API는 `게시 API`가 아니라 `proposal intake API`여야 한다.
