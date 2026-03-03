# CLI Categories Design

**Date:** 2026-03-04  
**Scope:** Add missing CLI subcommands for `categories` (budget categories) and `account-categories` (asset/account categories).

## Problem

The CLI currently exposes CRUD for `transactions`, `accounts`, and `budgets`, but it does not expose category CRUD for budget categories or account categories. Backend services and API routes already support these resources, so the gap is CLI parity.

## Goals

- Add top-level commands:
  - `aw categories`
  - `aw account-categories`
- Provide CRUD subcommands for both resources:
  - `create`, `get`, `list`, `update`, `delete`
- Follow existing CLI architecture conventions:
  - shared args from `commonArgs`
  - `resolveTarget` before execution
  - lazy service imports
  - `createOutput` writer support (`--json` and human mode)
  - destructive confirmation on delete (`DELETE` or `--yes`)

## Non-Goals

- No alias commands for these resources in this iteration.
- No changes to API/service/domain behavior.
- No additional `accounts`/`budgets` subcommands beyond category coverage.

## Command Design

### `aw categories`

- `create`
  - required: `--workspace-id`, `--user-id`, `--name`, `--type`
  - optional: `--description`, `--icon`, `--color`
- `get`
  - required: `--workspace-id`, `--id`
- `list`
  - required: `--workspace-id`
  - optional: `--type`, `--is-active`
- `update`
  - required: `--workspace-id`, `--id`
  - optional mutable fields: `--name`, `--type`, `--description`, `--icon`, `--color`, `--is-active`
  - reject empty payload
- `delete`
  - required: `--workspace-id`, `--id`
  - destructive confirmation

### `aw account-categories`

- `create`
  - required: `--workspace-id`, `--user-id`, `--name`, `--is-liability`
  - optional: `--description`, `--sort-order`
- `get`
  - required: `--workspace-id`, `--id`
- `list`
  - required: `--workspace-id`
  - optional: `--is-liability`, `--is-system`
- `update`
  - required: `--workspace-id`, `--id`
  - optional mutable fields: `--name`, `--description`, `--is-liability`, `--sort-order`
  - reject empty payload
- `delete`
  - required: `--workspace-id`, `--id`
  - destructive confirmation

## Data Flow

Each command execution path:

1. Parse args with citty.
2. Resolve target backend (`sqlite`, `d1`, `d1-local`, `postgres`).
3. Lazy-load DB + service.
4. Map CLI args to service payload/filter shapes.
5. Execute service method.
6. Emit output via shared output writer.

Service mapping:

- `categories` -> `CategoryService`
- `account-categories` -> `AccountCategoryService`

## Files

- Create:
  - `src/cli/commands/categories.ts`
  - `src/cli/commands/account-categories.ts`
  - `src/cli/commands/categories.test.ts`
  - `src/cli/commands/account-categories.test.ts`
- Modify:
  - `src/cli/index.ts`
  - `COMMANDS.md`

## Validation & Tests

- Unit tests for command mapping and behavior (consistent with existing command tests):
  - target resolution called in each run path
  - payload/filter mapping correctness
  - empty-update rejection
  - shared args present on all leaf subcommands
- Verification commands:
  - targeted command tests
  - `bun run typecheck`
  - `bun run build`

## Risks

- Arg naming consistency risk (`is-active`/`is-system`/`is-liability`).
- Optional field normalization for `description` and `sort-order` should defer to service validation.

## Decision

Proceed with minimal parity (no aliases) to close the CLI gap quickly with low risk and high consistency.
