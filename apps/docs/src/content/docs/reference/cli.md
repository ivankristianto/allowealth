---
title: CLI Reference
description: Use the `aw` CLI for workspace, database, resource CRUD, admin, MCP, and deploy operations.
draft: false
head: []
sidebar:
  label: CLI
  order: 2
audience:
  - developer
  - admin
---

Allowealth exposes a single CLI entrypoint: `aw`.

## Help and discovery

```bash
bun run aw --help
bun run aw workspace --help
bun run aw db --help
```

## Target selection

Many commands accept `--target` (alias: `-t`):

- `sqlite` (default local)
- `d1` (remote Cloudflare D1)
- `d1-local` (local D1 emulation)

Examples:

```bash
bun run aw db migrate --target sqlite
bun run aw db migrate --target d1
bun run aw db migrate -t d1-local
bun run aw workspace create --target d1 --name "Ops" --email admin@example.com
```

## Common command groups

- `workspace`: create, list, delete
- `db`: migrate, generate, push, seed, reset, empty
- `recurring`: recurring templates and occurrence operations
- `admin`: super-admin and API key operations
- `mcp`: start MCP server
- `deploy`: cloudflare/vercel/netlify deployment helpers

## Global options expectations

- Keep `--target` / `-t` available on leaf subcommands to select `sqlite`, `d1`, or `d1-local`.
- Support `--json` on leaf subcommands for script/agent-friendly output.
- Require `--yes` (or interactive confirmation) for destructive CRUD/alias operations like `delete` / `rm`.
- Some destructive commands use command-specific confirmations instead (for example `workspace delete --force` or typed confirmation in `aw db drop`).

## Resource commands

```bash
bun run aw transactions create|get|list|update|delete
bun run aw accounts     create|get|list|update|delete
bun run aw budgets      create|get|list|update|delete
```

## Alias commands

```bash
bun run aw tx  add|show|ls|edit|rm
bun run aw acc add|show|ls|edit|rm
bun run aw bdg set|show|ls|edit|rm
```

:::note[📝 Note]
Prefer CLI commands for repeatable operational workflows. Keep one-off scripts out of `scripts/` when an `aw` subcommand exists.
:::
