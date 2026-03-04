---
title: Getting Started
description: Run Allowealth locally in 10 minutes.
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

Run Allowealth locally in four steps.

## Prerequisites

- Bun 1.x
- Git access to this repository

## Step 1: Install dependencies

```bash
bun install
cp .env.example .env
bun run db:reset
```

This creates the database schema and seeds demo data.

## Step 2: Start the dev server

```bash
bun run dev
```

Open the URL shown in your terminal (usually `http://localhost:4321`).

## Step 3: Sign in

Use the demo account:

- **Email:** `demo@example.com`
- **Password:** `demo123`

## Step 4: Complete a workflow

1. Open **Dashboard**
2. Create a transaction
3. Open **Budget** and check the updated totals
4. Open **Reports** and verify the transaction appears

Your local environment is ready.

## Next steps

- Read [Core Concepts](/core-concepts/) to understand workspaces and roles
- Follow [End User Onboarding](/end-users/onboarding/) for daily workflows
- See [Developer Setup](/developers/local-development/) for contribution guidelines
