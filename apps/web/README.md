# DIM Web

Public-facing DIM application built with `Next.js 16`, `TypeScript`, and the Cloudflare OpenNext adapter for `Workers`.

## Scripts

- `npm run dev`: local Next.js development server
- `npm run lint`: ESLint
- `npm run build`: standard Next.js build for Workers
- `npm run build:static`: static export build for review deployments
- `npm run preview`: Worker-accurate local preview using OpenNext + Wrangler
- `npm run preview:deploy -- <branch-name>`: deploy a review preview to the `dim-preview` Pages project
- `npm run deploy`: build and deploy to Cloudflare Workers
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
- Preview-only editorial infrastructure bindings live under the Wrangler environment `editorial_preview`. Keep them isolated from the default production runtime until the internal editorial system is ready.
