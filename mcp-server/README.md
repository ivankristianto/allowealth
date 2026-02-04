# Allowealth MCP Server

Model Context Protocol (MCP) server that lets AI assistants (Claude Desktop, etc.) interact with your Allowealth financial data via stdio transport.

## Prerequisites

- [Bun](https://bun.sh/) 1.x installed
- A running Allowealth instance with a database
- An API key (created via CLI)

## Setup

### 1. Install dependencies

From the project root:

```bash
bun install
cd mcp-server && bun install && cd ..
```

### 2. Create an API key

You need the workspace ID and user ID. List existing workspaces first:

```bash
bun run cli:list-workspaces
```

Then create an API key:

```bash
bun run cli:create-api-key -- \
  --workspace-id <your-workspace-id> \
  --user-id <your-user-id> \
  --name "Claude Desktop"
```

Save the displayed key — it is shown only once.

### 3. Configure your MCP client

#### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

#### Claude Code

Add to your Claude Code MCP settings:

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

### 4. Verify

Restart your MCP client. The server logs to stderr on startup:

```
Allowealth MCP server started (workspace: <your-workspace-id>)
```

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
- Revoked or expired keys are checked on every tool call
- The plain key is shown only once at creation time

## Running Manually

```bash
# Development (uses .env)
bun run mcp:start

# Production (uses .env.production)
bun run mcp:start:prod
```

## Revoking an API Key

Currently done via database. Future CLI support planned.
