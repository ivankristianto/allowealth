---
title: Admin Deployment Guide
description: Pre-deploy, rollout, and post-release checks for Allowealth environments.
draft: false
head: []
sidebar:
  label: Admin Deployment Guide
  order: 2
audience:
  - admin
  - developer
---

Use this checklist for controlled, repeatable releases.

## Pre-deployment checks

Run from repository root:

```bash
bun run lint
bun run stylelint
bun run format
bun run typecheck
bun run test
bun run build
```

Then validate docs app:

```bash
bun run docs:check
bun run docs:build
```

## Database and configuration

- Confirm target environment (`sqlite`, `d1`, `postgres`) is correct.
- Apply migrations before traffic cutover.
- Validate secrets and API keys are present.

## Rollout

Preferred order:

1. Deploy to staging/non-production target.
2. Execute smoke tests on login, dashboard, transactions, and budgets.
3. Deploy production.
4. Validate health endpoints and key pages.

## Post-release verification

- Review logs and error rates for 30-60 minutes.
- Confirm background jobs and integrations (email/MCP/API) remain healthy.
- Capture release notes with owner and rollback context.

:::tip[💡 Tip]
Use low-traffic windows for schema or auth changes. That gives you safer rollback options if behavior drifts.
:::

## Escalation criteria

Rollback or hotfix when any of these are true:

- Login/sign-up failure rate spikes
- Critical API endpoints return 5xx
- Data integrity checks fail
- Dashboard or transaction write paths regress

Pair this with [Reference: Commands](/reference/commands/) during release execution.
