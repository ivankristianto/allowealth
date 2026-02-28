---
title: API Overview
description: Route map and patterns for Allowealth HTTP APIs.
draft: false
head: []
sidebar:
  label: API Overview
  order: 3
audience:
  - developer
---

API endpoints live in `src/pages/api/` and follow file-based routing.

## Route groups

- `/api/auth/*`: login/signup/session verification flows
- `/api/transactions/*`: CRUD, bulk actions, template helpers
- `/api/budgets/*` and `/api/budget/*`: budget management and analytics
- `/api/accounts/*`: account CRUD, transfer, close/reopen
- `/api/reports/*`: report and drilldown views
- `/api/workspace/*`: workspace settings, members, invitations
- `/api/admin/*`: operational diagnostics and admin dashboards
- `/api/mcp`: MCP HTTP transport endpoint

## Implementation pattern

Most route handlers follow this sequence:

1. Validate authentication/session.
2. Parse and validate request input.
3. Call service-layer method in `src/services`.
4. Return JSON or HTML fragment response.

## Contract source of truth

- Primary spec file: `openapi.yml`
- Related docs: `openapi/README.md`

:::tip[💡 Tip]
When endpoint response shape changes, update OpenAPI artifacts in the same PR to avoid client drift.
:::
