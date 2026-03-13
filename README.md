# DIM

Fresh-start repository for the new DIM project.

## Current baseline

- Local workspace reset completed on 2026-03-13.
- No legacy project files or previous Git metadata were present in this folder.
- Git remote is connected to `https://github.com/Jeff-codex/DIM-.git`.
- Infra assumptions: `depthintelligence.kr` with Cloudflare for DNS, hosting, and database-related services.
- Scope guardrail: do not touch other projects, especially `Dliver`.

## Repository purpose

This repository currently holds the clean bootstrap material needed before app implementation starts:

- reset audit and kickoff documents
- Cloudflare setup checklist
- environment variable baseline
- folder structure for future app and infra code

## Initial structure

- `docs/`: reset audit, kickoff plan, Cloudflare setup checklist
- `apps/`: future application code
- `infra/`: future infrastructure config

## Recommended next build step

Choose the first implementation target and lock the stack:

1. content-focused public web app
2. admin/editor tooling
3. API and data model

Once that is fixed, scaffold the actual runtime stack under `apps/`.
