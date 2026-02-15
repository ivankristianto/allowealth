# Design: Remove better-sqlite3 Dependency

**Date:** 2026-02-14
**Issue:** #233
**Branch:** `remove-better-sqlite3`

## Background

`better-sqlite3` was introduced as a Node.js compatibility fallback for middleware-imported code paths, based on the belief that Astro middleware runs in Node.js context. Investigation shows this is not the case when using `bun run dev` — the entire process runs under Bun, so `detectRuntime()` always returns `'bun'` and the Node.js driver path is never exercised.

### Current State

| Location                            | Runtime              | Actually Used?                           |
| ----------------------------------- | -------------------- | ---------------------------------------- |
| `src/db/drivers/node.ts`            | Bun (`bun run dev`)  | No — always takes bun:sqlite path        |
| `src/db/index.ts` line 257-259      | Bun                  | No — same reason                         |
| `e2e/helpers/email-verification.ts` | Node.js (Playwright) | **Yes** — only real consumer             |
| `src/db/index.integration.test.ts`  | Bun (`bun test`)     | No — claims Node context but runs in Bun |
| `astro build` / `astro check`       | Bun                  | No — runs under Bun                      |

The **only runtime consumer** of `better-sqlite3` is the E2E email verification helper, which runs in Playwright's Node.js context.

## Approach

**Bun subprocess for E2E helpers:** Replace direct `better-sqlite3` usage in Playwright tests with a Bun subprocess that executes `bun:sqlite` queries and returns JSON via stdout.

## Design

### 1. DB Layer Simplification

**`src/db/index.ts`:**

- Remove `createNodeDriver` import and `BetterSQLite3Database` type import
- Remove runtime detection branching — always use `bun:sqlite` + `drizzle-orm/bun-sqlite`
- Simplify `Database` type: `BunSQLiteDatabase<typeof sqliteSchema>` only (remove union with BetterSQLite3Database)
- Remove `createRequire`-based dynamic loading for the Bun driver — use direct `bun:sqlite` import

**`src/db/driver.ts`:**

- Remove `Runtime` type and `detectRuntime()` function
- Update comments to remove better-sqlite3 references

**Delete:** `src/db/drivers/node.ts`

### 2. E2E Helper Replacement

**New file:** `e2e/helpers/db-query.ts`

- Bun script that accepts query type and params via CLI args
- Uses `bun:sqlite` directly (runs under Bun)
- Outputs JSON result to stdout
- Supports: `get-token`, `expire-token`, `is-verified`, `workspace-status`

**Refactored file:** `e2e/helpers/email-verification.ts`

- Replace `import Database from 'better-sqlite3'` with `execSync('bun run e2e/helpers/db-query.ts ...')`
- Each function calls the Bun subprocess and parses JSON result
- Subprocess overhead (~50-100ms) is negligible for E2E tests

### 3. Package Cleanup

- Remove `better-sqlite3` from `package.json` devDependencies
- Remove `@types/better-sqlite3` from `package.json` devDependencies
- Remove `'better-sqlite3'` from `astro.config.ts` SSR external list
- Run `bun install` to update lockfile

### 4. Integration Test Updates

**`src/db/index.integration.test.ts`:**

- Remove "Node.js context" test scenarios (never truly tested Node.js)
- Remove `importInNodeContext()` and `simulateMiddlewareImport()` helpers
- Keep CRUD, caching, schema, error handling, and type safety tests

### 5. Documentation Updates

| File                                                        | Change                                         |
| ----------------------------------------------------------- | ---------------------------------------------- |
| `.claude/CLAUDE.md`                                         | ADR table: `better-sqlite3` -> `bun:sqlite`    |
| `.claude/rules/workflow.md`                                 | Remove `bun:sqlite -> Use better-sqlite3` rule |
| `.claude/rules/backend/database.md`                         | Remove better-sqlite3 section                  |
| `.claude/rules/backend/deployment.md`                       | Remove better-sqlite3 reference                |
| `.claude/rules/learned-patterns.md`                         | Update transaction patterns                    |
| `.claude/memory/MEMORY.md`                                  | Update local DB reference                      |
| `docs/architecture/006-database-connection-architecture.md` | Simplify to bun:sqlite only                    |
| `docs/constitution.md`                                      | Remove better-sqlite3 reference                |

### 6. Verification Criteria

- `rg -n "better-sqlite3" src e2e scripts package.json` returns no runtime/test usage
- `package.json` and lockfile no longer include `better-sqlite3` or `@types/better-sqlite3`
- `bun run typecheck` passes
- `bun run test` passes
- `bun run build:cloudflare` passes
- E2E email verification helper works via Bun subprocess

## Out of Scope

- PostgreSQL/Hyperdrive production path (unchanged)
- Schema/migration dual-dialect behavior (unchanged)
- `drizzle-orm/bun-sqlite` and `drizzle-orm/better-sqlite3` as library dependencies of drizzle-orm itself (transitive, not our direct concern)
