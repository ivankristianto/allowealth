---
title: Getting Started
description: Quick Start for running Allowealth locally and completing your first workflow.
draft: false
head: []
sidebar:
  label: Getting Started
  order: 1
audience:
  - user
  - admin
  - developer
---

You can get Allowealth running locally in under 10 minutes.

## Prerequisites

- Bun 1.x installed
- Access to this repository
- A local shell (`zsh`, `bash`, or similar)

## 1. Install and seed

```bash
bun install
cp .env.example .env
bun run db:reset
```

:::tip[💡 Tip]
`bun run db:reset` creates schema + demo data so you can explore the app immediately.
:::

## 2. Start the app

```bash
bun run dev
```

Open the app at the local URL printed by Astro (usually `http://localhost:4321`).

## 3. Sign in with demo credentials

Use the seeded demo account:

- **Email:** `demo@example.com`
- **Password:** `demo123`

:::note[📝 Note]
Some E2E flows use a different account (`demo@example.com` / `demo123456789`). Use whichever your local seed currently provides.
:::

## 4. Complete a Hello World workflow

1. Open **Dashboard**.
2. Create one new transaction.
3. Visit **Budget** and confirm totals update.
4. Visit **Reports** to verify the transaction appears.

You now have a full local loop working.

## Next steps

- Learn the app model in [Core Concepts](/core-concepts/).
- Follow [End User Onboarding](/end-users/onboarding/) for day-to-day usage.
- Follow [Developer Local Setup](/developers/local-development/) for implementation workflows.
