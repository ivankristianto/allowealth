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

### For Docker option

- [Docker Engine 24+](https://docs.docker.com/engine/install/)
- [Docker Compose v2](https://docs.docker.com/compose/install/)

## Option 1: Local Development

### Step 1: Bootstrap the project

```bash
cp .env.example .env
./scripts/setup.sh
```

This script installs dependencies, creates the database schema, and seeds demo data.

### Step 2: Start the dev server

```bash
bun run dev
```

Open the URL shown in your terminal (usually `http://localhost:4321`).

### Step 3: Sign in

Use the demo account:

- **Email:** `demo@example.com`
- **Password:** `demo123`

### Step 4: Complete a workflow

1. Open **Dashboard**
2. Create a transaction
3. Open **Budget** and check the updated totals
4. Open **Reports** and verify the transaction appears

Your local environment is ready.

## Option 2: Docker (Alternative)

Use Docker if you prefer a containerized setup or want to test production-like deployment locally.

### Start the Docker stack

```bash
bun run docker:start
```

On first run, this command:

1. Creates `.env` from `docker/.env.example`
2. Generates required secrets automatically
3. Exits so you can edit `.env` with your OAuth and Turnstile credentials

After editing `.env`, run the command again to start the containers.

### Seed demo data

```bash
bun run docker:seed
```

This seeds the database with 6 months of sample transactions.

### Stop the Docker stack

```bash
bun run docker:stop
```

See [Self-Host](/self-host/) for full Docker deployment details, including environment variables, backups, and reverse proxy configuration.

## Next steps

- Read [Core Concepts](/core-concepts/) to understand workspaces and roles
- Follow [End User Onboarding](/end-users/onboarding/) for daily workflows
- See [Developer Setup](/developers/setup-and-deployment/) for contribution guidelines
