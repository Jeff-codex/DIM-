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
