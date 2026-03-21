# DIM Editorial Draft Generator

OpenAI API 호출 전용 외부 서비스입니다.

Cloudflare Workers가 직접 OpenAI API를 호출할 수 없는 환경 제약을 우회하기 위해, DIM의 본찰력 기반 초안 생성만 별도 Node 런타임으로 분리합니다.

## Endpoints

- `GET /health`
- `GET /ready`
- `POST /v1/editorial/draft`
- `POST /v1/editorial/image-variants`
- `POST /generate-draft` (legacy alias)

## Required env

- `OPENAI_API_KEY`
- `OPENAI_PROJECT_ID` (optional)
- `DIM_GENERATOR_SHARED_SECRET`
- `OPENAI_SIGNAL_MODEL` (default `gpt-5-mini`)
- `OPENAI_DRAFT_MODEL` (default `gpt-5.4`)
- `PORT` (default `8788`)
- `DIM_GENERATOR_VERSION` (optional)
- `DIM_GENERATOR_SHARED_SECRET`

## Deployment notes

### Railway

- Root directory: `apps/editorial-generator`
- Start command: `npm start`
- Health check path: `/ready`

### Render

- Root directory: `apps/editorial-generator`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/ready`

## Local smoke

`apps/web/.env.local`에 preview 키를 넣은 상태라면 아래처럼 실행할 수 있습니다.

```powershell
cd C:\Users\DIM(depthintelligencemagazine)\apps\editorial-generator
npm run smoke -- --base-url=http://127.0.0.1:8788
```

이 스크립트는 generator의 `/health`와 `/ready`를 먼저 확인한 뒤, `EveryonePR`와 비슷한 구조의 샘플 proposal로 초안 생성 응답을 점검합니다.

## Recommended deploy target

- Railway
- Render
- Fly.io

DIM의 공개면과 편집 시스템은 계속 Cloudflare에 두고, 이 서비스만 외부 런타임에서 운영하는 구성을 권장합니다.

## Image variants

`POST /v1/editorial/image-variants`는 편집용 이미지 마스터와 파생본을 생성합니다.

- master: `1600 x 1200`
- card: `1200 x 900`
- detail: `1600 x 1000`

DIM의 편집시스템은 이 엔드포인트를 통해 원본 이미지 하나를 받아 카드/상세용 파생본까지 같이 저장합니다.
