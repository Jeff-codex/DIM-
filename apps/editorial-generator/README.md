# DIM Editorial Draft Generator

OpenAI API 호출 전용 외부 서비스입니다.

Cloudflare Workers가 직접 OpenAI API를 호출할 수 없는 환경 제약을 우회하기 위해, DIM의 본찰력 기반 초안 생성만 별도 Node 런타임으로 분리합니다.

## Endpoints

- `GET /health`
- `POST /generate-draft`

## Required env

- `OPENAI_API_KEY`
- `OPENAI_PROJECT_ID` (optional)
- `DIM_GENERATOR_SHARED_SECRET`
- `OPENAI_SIGNAL_MODEL` (default `gpt-5.4-mini`)
- `OPENAI_DRAFT_MODEL` (default `gpt-5.4`)
- `PORT` (default `8788`)

## Recommended deploy target

- Railway
- Render
- Fly.io

DIM의 공개면과 편집 시스템은 계속 Cloudflare에 두고, 이 서비스만 외부 런타임에서 운영하는 구성을 권장합니다.
