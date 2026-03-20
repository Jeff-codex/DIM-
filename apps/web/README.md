# DIM Web

Public-facing DIM application built with `Next.js 16`, `TypeScript`, and the Cloudflare OpenNext adapter for `Workers`.

## Scripts

- `npm run dev`: local Next.js development server
- `npm run lint`: ESLint
- `npm run build`: standard Next.js build for Workers
- `npm run build:static`: static export build for review deployments
- `npm run preview`: Worker-accurate local preview using OpenNext + Wrangler
- `npm run preview:deploy -- <branch-name>`: deploy a review preview to the `dim-preview` Pages project
- `npm run preview:editorial-runtime`: deploy the preview editorial runtime to Workers
- `npm run preview:production-candidate`: deploy the production-candidate hardening runtime to Workers
- `npm run deploy`: production deploy using split tokens
  - `CLOUDFLARE_WORKERS_TOKEN` for worker service deploy
  - `CLOUDFLARE_SECURITY_TOKEN` for route reconcile
  - optional `CLOUDFLARE_ZONE_ID` to skip zone lookup
- `npm run smoke:production-candidate`: verify the production-candidate runtime public routes, submit protection, and `/admin` blocked state
- `npm run smoke:production-runtime`: verify the real production runtime public routes, submit protection, and `/admin` Access redirect
- `npm run cf-typegen`: regenerate Worker binding types
- `npm run cf-typegen:editorial-preview`: regenerate Worker binding types including preview-only editorial bindings

`npm run preview:deploy` requires both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the shell environment.

## Key files

- `wrangler.jsonc`: Cloudflare Workers runtime configuration
- `open-next.config.ts`: OpenNext adapter configuration
- `cloudflare-env.d.ts`: generated binding types
- `content/articles/*.mdx`: public article source files
- `content/authors.ts`, `content/categories.ts`, `content/tags.ts`: editorial registries

## Notes

- This app is isolated to the DIM repository and must not be wired to `Dliver` resources by mistake.
- Review previews and real runtime deployment are intentionally split so Pages uploads do not interfere with Workers production settings.
- MVP content is driven by local MDX, not D1 or a CMS.
- Preview-only editorial infrastructure bindings live under the Wrangler environment `editorial_preview`.
- Production hardening should use the separate Wrangler environment `production_candidate` until the real domain is explicitly approved for deployment.
- Real production deploy is intentionally split into:
  - worker service deploy
  - real-domain route reconcile
  so the current token split does not block release.
- Treat `dim-web.depthintelligence.workers.dev` as a deprecated legacy worker. Do not use it as a review or hardening target.
