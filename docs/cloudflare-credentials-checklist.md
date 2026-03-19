# Cloudflare Credentials Checklist

Date: 2026-03-19

This document separates what DIM needs now from what is optional later.

## 1. Required now

These are enough to begin local setup, infrastructure binding, and deployment preparation.

### A. Cloudflare account metadata

Not secrets, but required:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID`
- zone/domain confirmation: `depthintelligence.kr`

### B. Primary Cloudflare API token

Recommended token name:

- `DIM_BOOTSTRAP`

Recommended scope:

- account: only the DIM Cloudflare account
- zone: only `depthintelligence.kr`

Recommended permissions:

- Account: `Account Settings` read
- Account: `Cloudflare Pages` edit/write
- Account: `Workers Scripts` edit/write
- Account: `Workers R2 Storage` edit/write
- Account: `D1` write/edit
- Account: `Queues` edit/write
- Account: `Turnstile` edit/write
- Account: `Zero Trust` edit/write

Add these only if the deployment path requires them:

- Zone: `Workers Routes` edit/write
- Zone: `DNS` edit/write

This single bootstrap token is the fastest option if one person is actively building both the public site and the editorial backend.

## 2. Recommended split tokens

If we want lower blast radius, use separate DIM-only tokens instead of one broad bootstrap token.

### A. Pages preview token

- token name: `DIM_PAGES`
- scope:
  - account: only the DIM Cloudflare account
- permissions:
  - Account: `Cloudflare Pages` edit/write
  - Account: `Account Settings` read

### B. Workers runtime token

- token name: `DIM_WORKERS`
- scope:
  - account: only the DIM Cloudflare account
  - zone: only `depthintelligence.kr`
- permissions:
  - Account: `Workers Scripts` edit/write
  - Zone: `Workers Routes` edit/write
  - Account: `Account Settings` read

### C. Storage and database token

- token name: `DIM_DATA`
- scope:
  - account: only the DIM Cloudflare account
- permissions:
  - Account: `Workers R2 Storage` edit/write
  - Account: `D1` write/edit
  - Account: `Queues` edit/write
  - Account: `Account Settings` read

### D. DNS token

- token name: `DIM_DNS_AUTOMATION`
- scope:
  - zone: only `depthintelligence.kr`
- permissions:
  - Zone: `DNS` edit/write

Use this only if DNS changes should be separated from runtime/deploy permissions.

### E. Access and Turnstile token

- token name: `DIM_SECURITY`
- scope:
  - account: only the DIM Cloudflare account
  - zone: only `depthintelligence.kr` if zone-scoped Access resources are used
- permissions:
  - Account: `Turnstile` edit/write
  - Account: `Zero Trust` edit/write
  - Zone: `Access: Apps and Policies` write
  - Zone: `Access: Service Tokens` write
  - Account: `Account Settings` read

Use this if Turnstile widgets, Cloudflare Access applications, or service tokens will be provisioned by API instead of manually in the dashboard.

## 3. Optional, issue only if needed

### A. R2 S3-compatible credentials

Only needed if DIM will access R2 from tools outside Wrangler/Workers, such as:

- bulk media migration
- AWS SDK / S3 SDK direct uploads
- rclone / backup tooling

If needed, issue:

- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Recommended permission:

- bucket-scoped `Object Read & Write`

### B. DNS automation token

Only needed if we want to create or edit DNS records by API instead of manually in the dashboard.

Recommended token name:

- `DIM_DNS_AUTOMATION`

Recommended scope:

- zone: only `depthintelligence.kr`

Recommended permission:

- Zone: `DNS` edit/write

### C. Read-only audit token

Only needed if we later automate health checks or account inspection without deployment rights.

Recommended permission examples:

- Account: `Account Settings` read
- Account: `D1` read
- Account: `Cloudflare Pages` read

## 4. Internal editorial system additions

When DIM moves from public preview work into real proposal intake and the internal editorial system, these Cloudflare resources will need matching permissions:

- `Cloudflare Pages` write
  - review preview deployment and cleanup
- `Workers Scripts` write
  - runtime and `/admin` deployment
- `Workers Routes` write
  - production routing on `depthintelligence.kr`
- `Workers R2 Storage` write
  - public assets bucket
  - separate intake bucket for raw proposal files
- `D1` write
  - proposals
  - workflow events
  - drafts
  - publications
- `Queues` write
  - normalization
  - AI enrichment
  - draft generation
- `DNS` write
  - only if route/domain changes are automated

## 5. Do not issue

Avoid these unless there is a specific later reason:

- Global API Key
- account-wide broad admin token for unrelated projects
- R2 credentials with access to all buckets
- shared token reused across unrelated projects

## 6. Notes

- If DIM is deployed on `Pages`, include `Cloudflare Pages` write/edit.
- If DIM is deployed on `Workers` with a route on `depthintelligence.kr`, include `Workers Routes` write/edit.
- If DIM uses R2 only through Worker bindings and Wrangler, separate S3 credentials are not required.
- D1 write-level permission must be explicitly granted for database writes. Do not use read-only D1 permission for setup work.
- Keep DIM tokens DIM-only. Do not reuse tokens that can touch unrelated projects.
- The currently configured DIM deployment tokens do not authenticate against Turnstile or Access API surfaces. A dedicated security token with the permissions above is required before Turnstile and Access provisioning can be automated.
