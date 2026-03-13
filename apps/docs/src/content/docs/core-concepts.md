---
title: Core Concepts
description: How Allowealth organizes users, data, and features.
draft: false
head: []
sidebar:
  label: Core Concepts
  order: 3
audience:
  - user
  - admin
  - developer
---

Understand these concepts before scaling your workspace.

## Workspaces

A workspace is an isolated financial environment. All transactions, budgets, accounts, and members belong to one workspace. Workspace settings (currency, week start, formatting) control reporting behavior.

:::caution[⚠️ Caution]
Deleting a workspace deletes all associated data permanently.
:::

## Roles

| Role        | Permissions                               |
| ----------- | ----------------------------------------- |
| Member      | Track finances, use standard features     |
| Admin       | Manage workspace settings, invite members |
| Super Admin | Platform-level controls across workspaces |

## Feature domains

**Transactions**
Income and expense records with import, export, and bulk operations.

**Budgets**
Category planning with history and variance tracking.

**Accounts**
Balance tracking with transfers, history, and account categories.

**Reports and Forecast**
Trend analysis and future wealth projections.

**Security**
Authentication, MFA, and API key management.

## Code organization (developers)

Code flows through consistent layers:

1. **UI** in `src/pages/`
2. **Services** in `src/services/`
3. **API** in `src/pages/api/`
4. **CLI** in `src/cli/`

This structure keeps behavior consistent across browser, API, and automation paths.

## Where to go next

- **Guides**: Step-by-step walkthroughs
- [Commands](/reference/commands/): Exact syntax
- [API Overview](/reference/api-overview/): Endpoint documentation
