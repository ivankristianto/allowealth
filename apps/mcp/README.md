# Allowealth MCP Server

Model Context Protocol (MCP) server that lets AI assistants (Claude Desktop, Claude Code, etc.) interact with your Allowealth financial data. Supports two transport modes:

- **stdio** — for local MCP clients running on the same machine
- **HTTP** — for remote access via the deployed web app (Cloudflare Workers, Vercel, etc.)

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

### 2. Connect an MCP client

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

Use this when the Allowealth app is deployed (e.g., on Cloudflare Workers) and you want to connect from any MCP client without local database access.

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

| Tool                 | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `list_categories`    | List active budget categories, optionally filtered by type (expense/income) |
| `list_assets`        | List active assets (bank accounts, e-wallets, cash) with balances           |
| `list_transactions`  | List recent transactions with optional type, date range, and limit filters  |
| `add_expense`        | Create an expense transaction (category and asset names are fuzzy-matched)  |
| `add_income`         | Create an income transaction (category and asset names are fuzzy-matched)   |
| `get_budget_summary` | Get monthly budget overview with per-category breakdown and status          |
| `get_dashboard`      | Get combined financial snapshot: assets, income, expenses, budget health    |
| `get_asset_summary`  | Get asset totals grouped by currency and type                               |

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

- OAuth 2.0 is provided by the better-auth `mcp` plugin
- Tokens are stored in `oauthApplication`, `oauthAccessToken`, and `oauthConsent`
- Connected Apps only shows the access token once, on the token display page
- Revoked or expired tokens are checked on every tool call (stdio) and on cache miss (HTTP)
- HTTP auth results are cached for 5 minutes, and cache is invalidated immediately on revocation
- Only POST requests are accepted on the HTTP endpoint

## Running Manually (stdio)

```bash
# Development (uses .env)
bun run mcp:start

# Production (uses .env.production)
bun run mcp:start:prod
```

## Revoking Access

Go to **Security → Connected Apps** and click **Revoke** next to the client you want to disconnect.

Revoked tokens take effect immediately for both stdio (checked per tool call) and HTTP (cache invalidated on revocation).

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
  │ DB: singleton    │  │ Cache: CacheManager        │
  │ Transport: stdio │  │ Transport: JSON-RPC/HTTP   │
  └──────────────────┘  └───────────────────────────┘
```
