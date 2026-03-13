# DIM

Fresh-start repository for the new DIM project.

## Current baseline

- Local workspace reset completed on 2026-03-13.
- No legacy project files or previous Git metadata were present in this folder.
- Git remote is connected to `https://github.com/Jeff-codex/DIM-.git`.
- Infra assumptions: `depthintelligence.kr` with Cloudflare for DNS, hosting, and database-related services.
- Application stack decision: `Next.js 16 + TypeScript + Cloudflare Workers`.
- Scope guardrail: do not touch other projects, especially `Dliver`.

## Repository purpose

This repository currently holds the clean bootstrap material plus the first application scaffold:

- reset audit and kickoff documents
- Cloudflare setup checklist
- environment variable baseline
- `apps/web` starter for the public web application
- folder structure for future app and infra code

## Initial structure

- `docs/`: reset audit, kickoff plan, Cloudflare setup checklist
- `apps/`: future application code
- `infra/`: future infrastructure config

## Resume docs

- `docs/session-resume.md`: next-session checkpoint and restart order
- `docs/deployment-checklist.md`: review preview and production deployment checklist

## Current implementation target

The active starting point is:

1. public web app in `apps/web`
2. Cloudflare Workers deployment path
3. future D1 and R2 integration for DIM-specific data and assets
