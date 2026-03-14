# Allowealth MCP Server

Model Context Protocol (MCP) server that lets AI assistants (Claude Desktop, Claude Code, etc.) interact with your Allowealth financial data. Supports two transport modes:

- **stdio** — for local MCP clients running on the same machine
- **HTTP** — for remote access via the deployed web app (Cloudflare Workers, Vercel, etc.)

## Prerequisites

- [Bun](https://bun.sh/) 1.x installed
- A running Allowealth instance with a database
- An API key (created via CLI or Settings > Security in the web app)

## Setup

### 1. Install dependencies

From the project root:

```bash
bun install
cd mcp-server && bun install && cd ..
```

### 2. Create an API key

**Option A: Via CLI**

```bash
bun run cli:list-workspaces
bun run cli:create-api-key -- \
  --workspace-id <your-workspace-id> \
  --user-id <your-user-id> \
  --name "Claude Desktop"
```

**Option B: Via web UI**

Go to **Settings > Security > API Keys** and click **Generate New Key**.

Save the displayed key — it is shown only once.

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
      "args": ["run", "/absolute/path/to/allowealth/mcp-server/src/index.ts"],
      "env": {
        "ALLOWEALTH_API_KEY": "aw_your_api_key_here"
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
      "args": ["run", "/absolute/path/to/allowealth/mcp-server/src/index.ts"],
      "env": {
        "ALLOWEALTH_API_KEY": "aw_your_api_key_here"
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
        "Authorization": "Bearer aw_your_api_key_here"
      }
    }
  }
}
```

**Any HTTP client (manual testing with curl):**

```bash
# Initialize
curl -X POST https://your-allowealth-domain.com/api/mcp \
  -H "Authorization: Bearer aw_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# List tools
curl -X POST https://your-allowealth-domain.com/api/mcp \
  -H "Authorization: Bearer aw_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Call a tool
curl -X POST https://your-allowealth-domain.com/api/mcp \
  -H "Authorization: Bearer aw_your_api_key_here" \
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

- API keys are hashed with PBKDF2-SHA256 (100k iterations) before storage
- Keys are verified with constant-time comparison
- Revoked or expired keys are checked on every tool call (stdio) and on cache miss (HTTP)
- HTTP auth results are cached for 5 minutes to avoid PBKDF2 on every request; cache is invalidated immediately on key revocation
- The plain key is shown only once at creation time
- Only POST requests are accepted on the HTTP endpoint

## Running Manually (stdio)

```bash
# Development (uses .env)
bun run mcp:start

# Production (uses .env.production)
bun run mcp:start:prod
```

## Revoking an API Key

**Via web UI:** Go to **Settings > Security > API Keys** and click the revoke button next to the key.

**Via CLI:** Currently done via database. Future CLI support planned.

Revoked keys take effect immediately for both stdio (checked per tool call) and HTTP (cache invalidated on revocation).

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
  │ mcp-server/      │  │ src/pages/api/mcp.ts      │
  │ src/index.ts     │  │                           │
  │                  │  │ Auth: Bearer token         │
  │ Auth: env var    │  │ DB: per-request (MW)       │
  │ DB: singleton    │  │ Cache: CacheManager        │
  │ Transport: stdio │  │ Transport: JSON-RPC/HTTP   │
  └──────────────────┘  └───────────────────────────┘
```
