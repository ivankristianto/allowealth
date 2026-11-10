# Allowealth MCP Server

Model Context Protocol (MCP) server that lets AI assistants (Claude Desktop, Claude Code, etc.) interact with your Allowealth financial data. Supports two transport modes:

- **stdio** — for local MCP clients running on the same machine
- **HTTP** — for remote access via the deployed web app

## Prerequisites

- [Bun](https://bun.sh/) 1.x installed
- A running Allowealth instance with a database
- Seeded MCP OAuth clients (`bun run aw db seed-oauth-clients`)

## Setup

### 1. Install dependencies

From the project root:

```bash
bun install
cd mcp-server && bun install && cd ..
```

### 2. Get an access token

The server accepts two kinds of token. Pick one.

| Token        | Where                     | Lifetime                         | Use for                                                   |
| ------------ | ------------------------- | -------------------------------- | --------------------------------------------------------- |
| OAuth token  | Security → Connected Apps | 24 hours, ends on sign-out       | Desktop assistants you sign in to interactively           |
| App password | Security → App Passwords  | 30, 90 or 365 days, or no expiry | Cron jobs, CI, headless agents that cannot open a browser |

#### App password

1. Sign in to Allowealth (creating one needs a sign-in from the last 15 minutes).
2. Open **Security → App Passwords** and click **Create**.
3. Name it, choose **Read only** or **Read and write**, and pick an expiry.
4. Copy the `aw_pat_...` token. It is shown once.

App passwords survive sign-out and password changes. They stop working when you revoke them, when they expire, when your account is deleted, or when you leave the workspace they were created in. Read-only tokens see and call only the read tools listed below.

#### OAuth token

1. Seed the built-in OAuth clients:

```bash
bun run aw db seed-oauth-clients
```

2. Start Allowealth and sign in.
3. Open **Security → Connected Apps**.
4. Click **Connect** for your client.
5. Approve the OAuth consent screen.
6. Copy the one-time access token shown on `/oauth/display-token`.

Use that token as `ALLOWEALTH_ACCESS_TOKEN` for stdio clients or as the Bearer token for HTTP clients.

### 3. Configure your MCP client

Choose the transport that fits your setup:

#### Option A: stdio (local)

Use this when the MCP client runs on the same machine as the Allowealth database.

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "allowealth": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/allowealth/apps/mcp/src/index.ts"],
      "env": {
        "ALLOWEALTH_ACCESS_TOKEN": "your_copied_access_token"
      }
    }
  }
}
```

**Claude Code:**

```json
{
  "mcpServers": {
    "allowealth": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/allowealth/apps/mcp/src/index.ts"],
      "env": {
        "ALLOWEALTH_ACCESS_TOKEN": "your_copied_access_token"
      }
    }
  }
}
```

#### Option B: HTTP (remote)

Use this when the Allowealth app is deployed (e.g., self-hosted with Docker) and you want to connect from any MCP client without local database access.

The HTTP endpoint is at `/api/mcp` on your deployed Allowealth instance.

**Claude Desktop / Claude Code (MCP clients with HTTP support):**

```json
{
  "mcpServers": {
    "allowealth": {
      "url": "https://your-allowealth-domain.com/api/mcp",
      "headers": {
        "Authorization": "Bearer your_copied_access_token"
      }
    }
  }
}
```

**Any HTTP client (manual testing with curl):**

```bash
# Initialize
curl -X POST https://your-allowealth-domain.com/api/mcp \
  -H "Authorization: Bearer your_copied_access_token" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# List tools
curl -X POST https://your-allowealth-domain.com/api/mcp \
  -H "Authorization: Bearer your_copied_access_token" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Call a tool
curl -X POST https://your-allowealth-domain.com/api/mcp \
  -H "Authorization: Bearer your_copied_access_token" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_dashboard","arguments":{}}}'
```

### 4. Verify

**stdio:** Restart your MCP client. The server logs to stderr on startup:

```
Allowealth MCP server started (workspace: a1b2c3d4...)
```

**HTTP:** Send an `initialize` request (see curl example above). You should receive a JSON-RPC response with server info.

## Available Tools

| Tool                  | Access | Description                                                                  |
| --------------------- | ------ | ---------------------------------------------------------------------------- |
| `list_categories`     | Read   | List active budget categories, optionally filtered by type (expense/income)  |
| `list_accounts`       | Read   | List active accounts (bank accounts, e-wallets, cash) with balances          |
| `list_transactions`   | Read   | List recent transactions with optional type, date range, and limit filters   |
| `add_expense`         | Write  | Create an expense transaction (category and account names are fuzzy-matched) |
| `add_income`          | Write  | Create an income transaction (category and account names are fuzzy-matched)  |
| `get_budget_summary`  | Read   | Get monthly budget overview with per-category breakdown and status           |
| `get_dashboard`       | Read   | Get combined financial snapshot: accounts, income, expenses, budget health   |
| `get_account_summary` | Read   | Get account totals grouped by currency and type                              |

Read-only app passwords cannot see or call Write tools. A tool added later stays off-limits to read-only tokens until it is added to `READ_ONLY_TOOLS` in `src/tools/index.ts`.

## Usage Examples

Once connected, you can ask your AI assistant things like:

- "Show my budget for this month"
- "How much did I spend on food?"
- "Add an expense of 50,000 IDR for lunch at Cash"
- "List my recent transactions"
- "What's my total assets?"
- "Show my dashboard"

The AI will call the appropriate tools automatically. Category and asset names are fuzzy-matched, so "food" will match "Food & Drinks" and "bca" will match "BCA Digital".

## Security

- OAuth 2.1 is provided by `@better-auth/oauth-provider` (Better Auth 1.7)
- Clients, tokens and consents are stored in `oauthClient`, `oauthAccessToken`, `oauthRefreshToken` and `oauthConsent`; token values are stored hashed
- Signing out of Allowealth revokes the OAuth tokens issued under that browser session
- App passwords live in `mcp_app_passwords`, stored as a SHA-256 hash with a non-secret `aw_pat_xxxx` hint. The `aw_pat_` prefix lets secret scanners spot leaked tokens
- Both token types are shown once
- Every HTTP request and every stdio tool call re-checks the token against the database, so revocation, expiry and account deletion take effect on the next call
- Rate limiting is 60 requests per minute per token, keyed on the token's id
- Creating and revoking an app password is recorded in Security → Recent Activity
- Only POST requests are accepted on the HTTP endpoint

## Running Manually (stdio)

```bash
# Development (uses .env)
bun run mcp:start

# Production (uses .env.production)
bun run mcp:start:prod
```

## Revoking Access

Go to **Security → Connected Apps** and click **Revoke** next to the client you want to disconnect, or to **Security → App Passwords** and click **Revoke** next to the token.

Revoked tokens stop working on the next HTTP request or stdio tool call.

## Architecture

Both transports share the same tool handlers via dependency injection (`ToolContext`):

```
Tool Layer (shared)
  registerTools() / handleToolCall(name, args, ctx)
  ├── transactions.ts
  ├── budget.ts
  ├── assets.ts
  └── dashboard.ts
       │
  ┌────┴────────────┐  ┌──────────────────────────┐
  │ stdio entry      │  │ HTTP entry                │
  │ apps/mcp/        │  │ src/pages/api/mcp.ts      │
  │ src/index.ts     │  │                           │
  │                  │  │ Auth: Bearer token         │
  │ Auth: env var    │  │ DB: per-request (MW)       │
  │ DB: singleton    │  │ Rate limit: per token id   │
  │ Transport: stdio │  │ Transport: JSON-RPC/HTTP   │
  └──────────────────┘  └───────────────────────────┘
```
