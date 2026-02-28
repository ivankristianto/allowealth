---
title: Core Concepts
description: The mental model for how Allowealth organizes users, data, and workflows.
draft: false
head: []
sidebar:
  label: Core Concepts
  order: 2
audience:
  - user
  - admin
  - developer
---

Before you dive into guides, this page gives you the model behind the product.

## Workspaces are the top-level boundary

A **workspace** is an isolated financial environment.

- Every transaction, budget, account, and member belongs to one workspace.
- Users are assigned a role inside that workspace.
- Workspace defaults (currency, week start, formatting) drive reporting behavior.

:::caution[⚠️ Caution]
Deleting a workspace removes associated data permanently. Treat workspace deletion as a destructive operation.
:::

## Roles

- **Member**: Tracks daily finances and uses standard product features.
- **Admin**: Manages workspace settings, invitations, and operations.
- **Super Admin**: Platform-level controls across workspaces (internal/ops use).

## Feature domains

Allowealth revolves around a few core domains:

- **Transactions**: income/expense records, import/export, bulk operations
- **Budgets**: category planning, history, variance tracking
- **Accounts**: balances, transfers, history, account categories
- **Reports and Forecast**: trend analysis and projection views
- **Security and Access**: authentication, MFA, API keys

## System layers (for developers)

Code follows a consistent path:

1. **UI** in [`src/pages`](/reference/architecture/)
2. **Service logic** in `src/services`
3. **API endpoints** in `src/pages/api`
4. **CLI commands** in `src/cli`

This keeps behavior reusable across browser, API, and automation paths.

## Documentation flow

- Need task walkthroughs? Go to **Guides**.
- Need exact command syntax? Go to [Reference](/reference/commands/).
- Need endpoint coverage? Go to [API Overview](/reference/api-overview/).
