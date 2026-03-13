# Cloudflare Setup Checklist

These items are outside the local repository and should be verified in the Cloudflare dashboard before implementation accelerates.

## DNS and domain

- Confirm `depthintelligence.kr` is on the intended Cloudflare account.
- Confirm nameservers are active and the zone status is healthy.
- Decide whether the root domain or `www` is the canonical host.
- Ensure redirect rules match the canonical host decision.

## Hosting

- Decide between Cloudflare Pages and Workers-based deployment.
- Connect the GitHub repository to the chosen Cloudflare project.
- Create at least `production` and `preview` environments.
- Define environment variables separately for preview and production.

## Database and storage

- Confirm whether the primary database is `D1`.
- Create or verify the first D1 database and record its ID.
- If media uploads are required, create an `R2` bucket and define naming rules.
- If edge cache/state is needed, decide whether `KV` is actually necessary.

## Security

- Store tokens and secrets in Cloudflare/GitHub secret stores only.
- Set SSL/TLS mode to `Full (strict)` when origin setup exists.
- Enable basic WAF, bot protection, and rate limiting before public launch.

## Deployment hygiene

- Separate preview from production bindings.
- Name resources clearly so DIM-specific resources are not confused with other projects.
- Avoid shared secrets or shared buckets with unrelated projects.
