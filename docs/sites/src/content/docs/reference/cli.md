---
title: CLI Reference
description: Use the `aw` CLI for workspace, database, admin, MCP, and deploy operations.
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

Many commands accept `--target`:

- `sqlite` (default local)
- `d1` (remote Cloudflare D1)
- `d1-local` (local D1 emulation)
- `postgres` (PostgreSQL)

Examples:

```bash
bun run aw db migrate --target sqlite
bun run aw db migrate --target d1
bun run aw workspace create --target postgres --name "Ops" --email admin@example.com
```

## Common command groups

- `workspace`: create, list, delete
- `db`: migrate, generate, push, seed, reset, empty
- `admin`: super-admin + API key + credential operations
- `mcp`: start MCP server
- `deploy`: cloudflare/vercel/netlify deployment helpers

:::note[📝 Note]
Prefer CLI commands for repeatable operational workflows. Keep one-off scripts out of `scripts/` when an `aw` subcommand exists.
:::
