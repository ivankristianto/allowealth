---
title: Deployment Guide
description: Deploy Allowealth with pre-flight checks, staged rollout, and post-release verification.
draft: false
head: []
sidebar:
  label: Deployment Guide
  order: 2
audience:
  - admin
  - developer
---

Use this checklist for controlled deployments.

## Pre-deployment

Run quality gates from the repository root:

```bash
bun run lint
bun run stylelint
bun run format
bun run typecheck
bun run test
bun run build
```

Validate documentation:

```bash
bun run docs:check
bun run docs:build
```

## Database preparation

1. Confirm target environment: `sqlite`, `d1`, or `d1-local`
2. Apply migrations before deploying code:
   ```bash
   bun run aw db migrate --target <environment>
   ```
3. Verify secrets and API keys are set in the target environment

## Rollout sequence

1. Deploy to staging
2. Run smoke tests:
   - Login and signup
   - Dashboard loads
   - Create a transaction
   - View budget updates
3. Deploy to production
4. Verify health endpoints and key pages load

## Post-deployment verification

Monitor for 30-60 minutes:

- Check error rates in logs
- Verify background jobs run
- Test email and MCP integrations
- Document the release with owner and rollback steps

## Rollback triggers

Rollback immediately if:

- Login/signup failure rate increases
- Critical API endpoints return 5xx
- Data integrity checks fail
- Dashboard or transaction write paths break

:::tip[💡 Tip]
Deploy schema and auth changes during low-traffic windows for safer rollbacks.
:::

See [Commands Reference](/reference/commands/) for exact syntax.
