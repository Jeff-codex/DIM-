# DIM Agent Notes

## Resume Trigger

If the user sends exactly `DIM` or asks to resume DIM work, do this before anything else:

1. Read `docs/session-resume.md`.
2. Read `docs/deployment-checklist.md`.
3. Read `apps/web/README.md` if the task involves preview or deployment.
4. Reply with the current checkpoint, the next recommended actions, and whether production deployment is ready.

## Guardrails

- Never touch `Dliver` or any non-DIM project.
- Keep all work scoped to this repository and DIM Cloudflare resources only.
- Do not deploy to the real domain unless the user explicitly requests it.
- Before sharing any preview URL, verify that `/`, `/articles`, `/about`, `/submit`, and one article detail route return successful responses.
- Do not hand off `localhost` or other local-only URLs as review links.
- Use the existing DIM subagents first and keep work recursive.
- Do not create new agents unless the user explicitly asks for additional delegation or the existing DIM agent set is clearly insufficient.
- Treat agent collaboration as a standing loop: assign, review, integrate, and feed the result back into the next improvement pass.

## Build And Preview Defaults

- App path: `apps/web`
- Review preview flow: `npm run preview:deploy -- <branch-name>`
- Production runtime flow: `npm run deploy`
- Required env for Cloudflare review/prod deploy: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

## Resume Intent

The current public product framing is:

- `프로젝트 제출 -> 편집 및 해석 -> 콘텐츠 발행`
- DIM is an editorial intelligence magazine, not a newsroom and not a tip line.
- Public-facing Korean wording should stay direct, editorial, and easy to scan.
- DIM work should continue as a recursive improvement loop with the existing agent set whenever possible.

## Bonchallyeok

DIM식 해석은 `본찰력`이라는 고유의 비즈니스 분석 철학에 기반한다.

- DIM은 무엇이 나왔는지보다 무엇이 바뀌는지를 먼저 본다.
- DIM은 기능 설명보다 구조 변화와 운영 맥락을 먼저 드러낸다.
- DIM의 판단문은 요약이 아니라 왜 지금 중요한지에 대한 편집 결론이어야 한다.
- DIM은 원문을 옮기지 않고, 비교 지점과 맥락을 더해 읽을 이유를 만든다.
- 자동 초안 생성, 편집 검토, 최종 발행 판단은 모두 본찰력 기준을 따라야 한다.
