---
title: Commands Reference
description: Frequently used commands for app development, docs, database, testing, and deployment.
draft: false
head: []
sidebar:
  label: Commands
  order: 1
audience:
  - developer
  - admin
---

This page is the quick command map. For the full command catalog, see `COMMANDS.md` in the repository root.

## App and docs

```bash
bun run dev
bun run build
bun run preview

bun run docs:dev
bun run docs:check
bun run docs:build
bun run docs:preview
```

## Quality gates

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

## Database

```bash
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:seed
bun run db:reset
bun run db:empty
```

## Tests

```bash
bun run test
bun run test:watch
bun run test:coverage

bun run test:e2e
bun run test:e2e:ui
bun run test:e2e:headed
```

## CLI entrypoint

```bash
bun run aw --help
bun run aw workspace list
bun run aw db migrate --target d1
```

## CLI resource commands

```bash
bun run aw transactions create|get|list|update|delete
bun run aw accounts     create|get|list|update|delete
bun run aw budgets      create|get|list|update|delete
```

## CLI alias commands

```bash
bun run aw tx  add|show|ls|edit|rm
bun run aw acc add|show|ls|edit|rm
bun run aw bdg set|show|ls|edit|rm
```

## CLI global options

```bash
# target selection on leaf commands
bun run aw budgets list --workspace-id <id> --month 3 --year 2026 --target d1
bun run aw budgets list --workspace-id <id> --month 3 --year 2026 -t d1-local

# script-friendly output
bun run aw transactions list --workspace-id <id> --json

# destructive operations: pass --yes/-y to skip interactive confirmation
bun run aw tx rm --workspace-id <id> --id <id> --user-id <id> --yes
```

:::caution[⚠️ Caution]
Do not run destructive DB commands (`db:empty`, forced deletes) against production targets without explicit approval.
:::
