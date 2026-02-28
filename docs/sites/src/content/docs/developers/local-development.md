---
title: Developer Local Development
description: Set up Allowealth for daily development with Bun, seeded data, and docs tooling.
draft: false
head: []
sidebar:
  label: Local Development
  order: 1
audience:
  - developer
---

This is the fastest way to get productive in the codebase.

## Prerequisites

- Bun 1.x
- Git
- Optional: Playwright dependencies for E2E work

## 1. Install and bootstrap

```bash
bun install
cp .env.example .env
bun run db:reset
```

## 2. Start app and docs

```bash
bun run dev
bun run docs:dev
```

- App: local Astro server (from root)
- Docs: local Starlight server (from `docs/sites` via root script)

## 3. Run quality gates before pushing

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

## 4. Verify tests for changed areas

```bash
bun run test
bun run test:e2e
```

:::note[📝 Note]
If you only changed docs content, run `bun run docs:check` and `bun run docs:build` at minimum.
:::

## Hello World code change

Try a simple local edit:

1. Open a page in `src/pages/` (for example, `src/pages/dashboard.astro`).
2. Change visible text.
3. Refresh browser and verify change.
4. Revert or commit your update.

Next, learn the implementation sequence in [Developer Feature Workflow](/developers/feature-workflow/).
