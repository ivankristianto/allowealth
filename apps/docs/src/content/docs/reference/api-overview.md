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

- `/api/auth/*`: Better Auth catch-all routes for sign-in, sign-out, session, password reset, OAuth, plus the remaining app-owned email verification endpoint
- `/api/transactions/*`: CRUD, bulk actions, template helpers
- `/api/budgets/*` and `/api/budget/*`: budget management and analytics
- `/api/accounts/*`: account CRUD, transfer, close/reopen
- `/api/reports/*`: report and drilldown views
- `/api/workspace/*`: workspace settings, members, invitations
- `/api/admin/*`: operational diagnostics and admin dashboards
- `/api/mcp`: MCP HTTP transport endpoint. Accepts an OAuth access token or an app password (`aw_pat_...`) as a Bearer token
- `/api/user/app-passwords`: list, create and revoke app passwords (session auth, creation needs a sign-in from the last 15 minutes)
- `/api/openapi.json`: the bundled OpenAPI document, whole for a session, only the token's own operations for an app password
- `/api/app-password/self`: describes the calling app password (name, permissions, expiry, rate limit)

## Authentication

Browser requests use the Better Auth session cookie, and state-changing calls also need the `X-CSRF-Token` header.

Scripts and AI agents can send an app password instead: `Authorization: Bearer aw_pat_...`. It works on an allowlist of routes only, each route and method needs one `resource:action` permission (a `read` preset holds every `:read` one, `read-write` holds them all), and Bearer requests skip CSRF and ignore cookies. See [Connect an AI agent over REST](/reference/ai-agent-rest/) for the route list, the permissions and examples.

## Implementation pattern

Most route handlers follow this sequence:

1. Read authenticated state from middleware-backed `Astro.locals`.
2. Parse and validate request input.
3. Call service-layer method in `src/services`.
4. Return JSON or HTML fragment response.

For auth routes, Better Auth owns the primary endpoint surface through `src/pages/api/auth/[...all].ts`.

## Contract source of truth

- Primary spec file: `openapi.yml`
- Served bundled at runtime: `GET /api/openapi.json`
- Related docs: `openapi/README.md`

:::tip[💡 Tip]
When endpoint response shape changes, update OpenAPI artifacts in the same PR to avoid client drift.
:::
