---
title: Commands Reference
description: Common commands for development, testing, and deployment.
draft: false
head: []
sidebar:
  label: Commands
  order: 1
audience:
  - developer
  - admin
---

Quick reference for common tasks.

## Development

```bash
bun run dev          # Start dev server
bun run build        # Build for production
bun run preview      # Preview production build

bun run docs:dev     # Start docs dev server
bun run docs:build   # Build docs
```

## Quality gates

Run before every commit:

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

## Database

```bash
bun run db:generate                  # Generate migration
bun run db:migrate                   # Apply migrations
bun run db:push                      # Push schema (dev only)
bun run db:seed                      # Seed demo data (3 months default)
bun run db:seed --months=6           # Seed 6 months of data
bun run db:seed --transactions=5000  # Add 5k extra transactions
bun run db:reset                     # Reset and seed
```

## Testing

```bash
bun run test              # Unit tests
bun run test:watch        # Watch mode
bun run test:e2e          # E2E tests
bun run test:e2e:ui       # E2E with UI
```

## CLI

```bash
bun run aw --help

# Workspace
bun run aw workspace create --name "Name" --email admin@example.com
bun run aw workspace list
bun run aw workspace invite --workspace-id <id> --email <email>

# Resources
bun run aw transactions create|get|list|update|delete
bun run aw accounts create|get|list|update|delete
bun run aw budgets create|get|list|update|delete

# Aliases
bun run aw tx add|show|ls|edit|rm
bun run aw acc add|show|ls|edit|rm
bun run aw bdg set|show|ls|edit|rm
```

## CLI options

```bash
# Target environment
bun run aw db migrate --target sqlite|d1|postgres

# JSON output
bun run aw transactions list --workspace-id <id> --json

# Skip confirmation
bun run aw tx rm --workspace-id <id> --id <id> --yes
```

:::caution[⚠️ Caution]
Do not run destructive commands (`db:empty`, forced deletes) against production without approval.
:::

See `COMMANDS.md` in the repository root for the full catalog.
