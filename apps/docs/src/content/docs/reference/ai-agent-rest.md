---
title: Connect an AI agent over REST
description: Let a script or AI agent call the Allowealth REST API with an app password.
draft: false
head: []
sidebar:
  label: AI Agents over REST
  order: 4
audience:
  - developer
  - user
---

An app password lets a program you run, such as a personal AI agent or a cron job, call the REST API without a browser session. The agent does its own reasoning and sends plain HTTP requests. Nothing extra runs on the server.

App passwords only reach the routes listed below. Everything else answers `403`.

## Create an app password

1. Open **Security** and find **App Passwords**
2. Click **Create**, give it a name you will recognize, and pick the access:
   - **Read only** for an agent that only reports
   - **Read and write** for an agent that also adds expenses, adds scheduled items or marks bills paid
   - **Custom** to tick exactly the permissions the agent needs, listed below
3. Pick an expiry and click **Create**
4. Copy the token. It starts with `aw_pat_` and is shown once

To change a token's name or access later, click **Edit** next to it. The token stays the same and the change applies from its next request. See [Profile and Security](/end-users/profile-security/#app-passwords) for revoking and storing tokens.

## Send it with every request

```http
Authorization: Bearer aw_pat_your_token_here
Content-Type: application/json
```

- The token decides who you are. Cookies on the same request are ignored.
- No CSRF header is needed for Bearer requests.
- Responses use the usual envelope: `{ "success": true, "data": ... }` or `{ "success": false, "error": { "message", "code", "details" } }`.

The examples below assume:

```bash
export ALLOWEALTH_URL="https://your-instance.example"
export ALLOWEALTH_TOKEN="aw_pat_your_token_here"
export WORKSPACE_TZ="Asia/Jakarta" # the workspace time zone, see below
```

## Access: presets and custom permissions

Every route and method below needs one permission, named `resource:action`. `HEAD` needs the same one as `GET`, and `/api/openapi.json` and `/api/app-password/self` need none. A token gets its permissions in one of two ways.

**Presets** cover the common cases and keep covering permissions added in later releases:

| Preset       | Stored as    | Grants                                        |
| ------------ | ------------ | --------------------------------------------- |
| `read`       | `["*:read"]` | Every `:read` permission, so `GET` and `HEAD` |
| `read-write` | `["*"]`      | Every permission                              |

**Custom** tokens hold exactly the permissions you pick and nothing added later:

| Permission            | Allows                                                         |
| --------------------- | -------------------------------------------------------------- |
| `transactions:read`   | List and view transactions and their edit history              |
| `transactions:create` | Record new expenses and income                                 |
| `transactions:update` | Change existing transactions                                   |
| `transactions:delete` | Delete transactions                                            |
| `budgets:read`        | View budgets, budget history and category spending trends      |
| `recurring:read`      | View recurring bills, upcoming occurrences, calendar and stats |
| `recurring:write`     | Create and edit recurring bills                                |
| `recurring:confirm`   | Confirm a due occurrence, which records its transaction        |
| `accounts:read`       | View accounts, balances and account totals                     |
| `categories:read`     | View budget categories and account categories                  |
| `settings:read`       | View workspace settings such as currency and time zone         |
| `forecast:read`       | View the cash flow forecast                                    |
| `reports:read`        | View expense, income, member and category reports              |

The app password API reports each token's `permissions` as stored and a `preset` of `read`, `read-write` or `custom`. A custom list is still `custom` when it happens to name every permission, because it will not pick up new ones. When creating or editing a token through `POST /api/user/app-passwords` or `PATCH /api/user/app-passwords/{id}`, send either `scope` (a preset) or `permissions` (a non-empty list from the table, no wildcards), never both. Those routes need a browser session; an app password cannot manage app passwords.

## Allowed routes

| Route                                                                     | Read | Write (needs the matching permission) |
| ------------------------------------------------------------------------- | ---- | ------------------------------------- |
| `/api/openapi.json`                                                       | GET  |                                       |
| `/api/app-password/self`                                                  | GET  |                                       |
| `/api/transactions`                                                       | GET  | POST                                  |
| `/api/transactions/{id}`                                                  | GET  | PUT, DELETE                           |
| `/api/transactions/{id}/history`                                          | GET  |                                       |
| `/api/budget/overview`, `/history`, `/category-trends`                    | GET  |                                       |
| `/api/budget/category/{id}/remaining`                                     | GET  |                                       |
| `/api/budgets`, `/api/budgets/{id}`                                       | GET  |                                       |
| `/api/recurring`                                                          | GET  | POST                                  |
| `/api/recurring/{id}`                                                     | GET  | PUT                                   |
| `/api/recurring/occurrences`                                              | GET  |                                       |
| `/api/recurring/occurrences/{id}/confirm`                                 |      | POST                                  |
| `/api/recurring/calendar`, `/forecast`, `/stats`                          | GET  |                                       |
| `/api/accounts`, `/api/accounts/{id}`                                     | GET  |                                       |
| `/api/categories`, `/api/categories/{id}`                                 | GET  |                                       |
| `/api/account-categories`, `/api/account-categories/{id}`                 | GET  |                                       |
| `/api/workspace/settings`                                                 | GET  |                                       |
| `/api/forecast`                                                           | GET  |                                       |
| `/api/reports`, `/expenses`, `/income`, `/members`, `/category-drilldown` | GET  |                                       |

Never reachable with an app password: sign-in and other `/api/auth/*` routes, `/api/admin/*`, `/api/user/*` (including app passwords themselves), `/api/security/*`, installer and onboarding routes, workspace members and invitations, bulk and import routes, and changes to workspace settings. `/api/mcp` keeps its own handler, described in [API Overview](/reference/api-overview/).

## Errors

| Status | Code                              | Meaning                                                                             |
| ------ | --------------------------------- | ----------------------------------------------------------------------------------- |
| 401    | `APP_PASSWORD_INVALID`            | Malformed, expired or revoked token, or a Bearer token that is not an app password  |
| 403    | `APP_PASSWORD_ROUTE_NOT_ALLOWED`  | The route or method is not on the list above                                        |
| 403    | `APP_PASSWORD_PERMISSION_MISSING` | The token lacks the permission the route needs, named in `error.details.permission` |
| 403    | `WORKSPACE_INACTIVE`              | The workspace was archived                                                          |
| 429    | `RATE_LIMIT_EXCEEDED`             | More than 60 requests in a minute for this token; wait for `Retry-After` seconds    |

## Check your own access first

An agent should know what it may do before it tries. Ask the API about the token itself:

```bash
curl -s "$ALLOWEALTH_URL/api/app-password/self" -H "Authorization: Bearer $ALLOWEALTH_TOKEN"
```

```json
{
  "success": true,
  "data": {
    "kind": "app_password",
    "id": "pat_V1StGXR8Z5jdHi6B",
    "name": "Expense logger",
    "preset": "custom",
    "permissions": ["transactions:create", "budgets:read"],
    "expires_at": "2027-02-12T09:30:00.000Z",
    "created_at": "2026-11-14T09:30:00.000Z",
    "rate_limit": { "limit": 60, "window_seconds": 60 }
  }
}
```

`permissions` is what the token can do right now, with presets expanded, so a `read` token lists every `:read` permission. `expires_at` is `null` for a token that never expires. The live request count stays in the `X-RateLimit-*` headers. Any valid app password may call this route, even one with no permissions.

A planning agent can stop here: if the task needs `transactions:create` and the list lacks it, ask the user for a token that has it instead of collecting `403`s. Over MCP, the `get_token_info` tool returns the same fields.

## Learn the API

Give the agent the schema next. Fetched with an app password, it lists only the operations that token may call, with their parameters, request bodies, enums and response shapes. Each operation names the permission it needs in `x-required-permission`:

```bash
curl -s "$ALLOWEALTH_URL/api/openapi.json" -H "Authorization: Bearer $ALLOWEALTH_TOKEN"
```

Most writes need IDs. Fetch them once and cache them:

```bash
curl -s "$ALLOWEALTH_URL/api/accounts" -H "Authorization: Bearer $ALLOWEALTH_TOKEN"
curl -s "$ALLOWEALTH_URL/api/categories" -H "Authorization: Bearer $ALLOWEALTH_TOKEN"
curl -s "$ALLOWEALTH_URL/api/workspace/settings" -H "Authorization: Bearer $ALLOWEALTH_TOKEN"
```

## Dates and the workspace time zone

"Today" and "this month" follow the workspace time zone, set under **Settings > General**. It decides the default month, which bills are due or overdue, and the latest date a transaction may carry. Read it from `data.settings.timezone` in `/api/workspace/settings` and send every date (`transaction_date`, `start_date`, `due_before`) as a calendar day in that zone. If the agent runs in another zone, compute today with the workspace zone, for example `TZ="$WORKSPACE_TZ" date +%F`.

## Examples

### 1. Add an expense

Amounts are strings with up to two decimals. `type` is `expense`, `income` or `transfer`.

```bash
curl -s -X POST "$ALLOWEALTH_URL/api/transactions" \
  -H "Authorization: Bearer $ALLOWEALTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "expense",
    "amount": "12.50",
    "currency": "USD",
    "category_id": "CATEGORY_ID",
    "account_id": "ACCOUNT_ID",
    "transaction_date": "2026-11-14",
    "description": "Lunch"
  }'
```

### 2. Check the budget

`month` is 1 to 12. Both parameters default to the current month.

```bash
curl -s "$ALLOWEALTH_URL/api/budget/overview?year=2026&month=11" \
  -H "Authorization: Bearer $ALLOWEALTH_TOKEN"
```

### 3. Add a scheduled expense or income

`frequency` is `weekly` or `monthly`. Monthly items need `day_of_month`.

```bash
curl -s -X POST "$ALLOWEALTH_URL/api/recurring" \
  -H "Authorization: Bearer $ALLOWEALTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Internet",
    "type": "expense",
    "amount": "40.00",
    "currency": "USD",
    "category_id": "CATEGORY_ID",
    "account_id": "ACCOUNT_ID",
    "frequency": "monthly",
    "day_of_month": 5,
    "start_date": "2026-12-05"
  }'
```

### 4. Summarize upcoming bills

`due_within=14d` returns pending items due from today through the next 14 days. The calendar and forecast give the month view and the projected totals.

```bash
curl -s "$ALLOWEALTH_URL/api/recurring/occurrences?status=pending&due_within=14d" \
  -H "Authorization: Bearer $ALLOWEALTH_TOKEN"
curl -s "$ALLOWEALTH_URL/api/recurring/calendar?year=2026&month=11" \
  -H "Authorization: Bearer $ALLOWEALTH_TOKEN"
```

### 5. List unpaid bills and mark one paid

Ask for every pending item due on or before today, across all months, in one call. Pass today's date in the workspace time zone as `due_before`. Always include `status=pending`: without it the endpoint returns confirmed and skipped items too.

```bash
curl -s "$ALLOWEALTH_URL/api/recurring/occurrences?status=pending&due_before=$(TZ="$WORKSPACE_TZ" date +%F)" \
  -H "Authorization: Bearer $ALLOWEALTH_TOKEN"
```

Confirming an occurrence records the payment as a transaction:

```bash
curl -s -X POST "$ALLOWEALTH_URL/api/recurring/occurrences/OCCURRENCE_ID/confirm" \
  -H "Authorization: Bearer $ALLOWEALTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "40.00",
    "transaction_date": "2026-11-05",
    "category_id": "CATEGORY_ID",
    "account_id": "ACCOUNT_ID"
  }'
```

## Keep it safe

- Give the agent a read-only token unless it needs to write
- Set an expiry, and revoke the token when you stop using the agent
- Keep the token in the agent machine's secret store, never in a repository
- **Last used** on the Security page shows when the token last made a request
- Every change the token makes appears in the Security page's Recent Activity as "via" its name, and **Activity** on the token's row lists only its events. A `403 APP_PASSWORD_PERMISSION_MISSING` is recorded there too, once per permission every 10 minutes
