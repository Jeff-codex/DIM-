# Cloudflare Credentials Checklist

Date: 2026-03-13

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
- Account: `Workers Scripts` edit/write
- Account: `Workers R2 Storage` edit/write
- Account: `D1` write/edit

Add these only if the deployment path requires them:

- Account: `Cloudflare Pages` edit/write
- Zone: `Workers Routes` edit/write

## 2. Optional, issue only if needed

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

## 3. Do not issue

Avoid these unless there is a specific later reason:

- Global API Key
- account-wide broad admin token for unrelated projects
- R2 credentials with access to all buckets
- shared token reused across unrelated projects

## 4. Notes

- If DIM is deployed on `Pages`, include `Cloudflare Pages` write/edit.
- If DIM is deployed on `Workers` with a route on `depthintelligence.kr`, include `Workers Routes` write/edit.
- If DIM uses R2 only through Worker bindings and Wrangler, separate S3 credentials are not required.
- D1 write-level permission must be explicitly granted for database writes. Do not use read-only D1 permission for setup work.
