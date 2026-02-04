# MCP Server for Allowealth

**Date:** 2026-02-04
**Status:** Design

## Purpose

Expose Allowealth's expense tracking, budget, and asset data via MCP (Model Context Protocol) so personal AI assistants (Claude, Gemini, ChatGPT, etc.) can log transactions and query financial stats on the user's behalf.

**Primary use case:** User takes a photo of a receipt, the AI client parses it, and submits the expense via MCP tools.

## Key Decisions

| Decision        | Choice                                 | Rationale                                                     |
| --------------- | -------------------------------------- | ------------------------------------------------------------- |
| Authentication  | API key per user                       | Portable across MCP clients, easy to revoke                   |
| Transport       | stdio only                             | Standard for local MCP clients, simplest to build             |
| Receipt parsing | AI client handles it                   | Clients already excel at OCR; keeps server simple             |
| Tool scope      | Standard (read + write, no delete)     | Enough for logging and querying; prevents accidental deletion |
| Name resolution | Fuzzy matching on category/asset names | AI can use natural names without needing exact IDs            |

## Architecture

The MCP server is a standalone package inside the repo that imports the existing service layer directly (no HTTP calls to the web app). It shares the same SQLite database file.

```
expenses/
├── src/                    # Existing web app
├── mcp-server/             # New MCP server package
│   ├── src/
│   │   ├── index.ts        # Entry point (stdio transport)
│   │   ├── auth.ts         # API key validation
│   │   ├── context.ts      # Workspace/user context from API key
│   │   └── tools/          # MCP tool definitions
│   │       ├── transactions.ts
│   │       ├── budget.ts
│   │       ├── assets.ts
│   │       └── dashboard.ts
│   ├── package.json
│   └── tsconfig.json
├── src/services/           # Existing services (shared)
└── src/db/                 # Existing DB layer (shared)
```

## API Key System

### Database Table

New `api_keys` table in the existing database:

```
api_keys
├── id: string (PK, nanoid)
├── workspace_id: string (FK → workspaces)
├── user_id: string (FK → users)
├── name: string              # e.g. "Claude Desktop", "Gemini"
├── key_hash: string          # PBKDF2-SHA256 hash of the key
├── key_prefix: string        # First 8 chars for display (e.g. "aw_a1b2...")
├── last_used_at: timestamp | null
├── expires_at: timestamp | null
├── created_at: timestamp
└── deleted_at: timestamp | null   # Soft delete = revoke
```

### Key Format

Keys use the prefix `aw_` followed by 32 random characters: `aw_<32 random alphanumeric chars>`.

### Key Generation

Phase 1: CLI command only (no UI).

```bash
bun run cli api-key:create --name "Claude Desktop"
# Output: aw_xK9mP2... (shown once, store it safely)
```

Settings page UI can be added later.

### Validation Flow

1. MCP server receives tool call
2. Reads `ALLOWEALTH_API_KEY` from environment
3. Hashes the key with PBKDF2-SHA256
4. Looks up matching `key_hash` in `api_keys` table (where `deleted_at IS NULL`)
5. Resolves `workspace_id` and `user_id` from the matching row
6. Updates `last_used_at`
7. Proceeds with the tool call using resolved context

## MCP Tools

### Write Tools

#### `add_expense`

Create an expense transaction.

```typescript
// Input
{
  amount: number,           // Required
  currency: "IDR" | "USD",  // Required
  category_name: string,    // Fuzzy matched against active expense categories
  asset_name: string,       // Fuzzy matched against active assets
  date?: string,            // ISO date (YYYY-MM-DD), defaults to today
  description?: string      // Optional note
}

// Success response
{
  id: "tx_abc123",
  type: "expense",
  amount: "50000",
  currency: "IDR",
  category: "Food & Drinks",
  asset: "GoPay",
  date: "2026-02-04",
  description: "Coffee at Starbucks"
}

// Error response (no category match)
{
  error: "No matching category found for 'Fod & Drnks'",
  available_categories: ["Food & Drinks", "Transport", "Shopping", ...]
}
```

#### `add_income`

Create an income transaction. Same schema as `add_expense` but matches against income categories.

### Read Tools

#### `list_categories`

Returns all active categories grouped by type.

```typescript
// Input
{
  type?: "expense" | "income"  // Optional filter
}

// Response
{
  categories: [
    { name: "Food & Drinks", type: "expense", icon: "utensils" },
    { name: "Transport", type: "expense", icon: "car" },
    { name: "Salary", type: "income", icon: "banknote" },
    ...
  ]
}
```

#### `list_assets`

Returns all active assets.

```typescript
// Input: none

// Response
{
  assets: [
    { name: "BCA", type: "bank_account", currency: "IDR", balance: "5000000" },
    { name: "GoPay", type: "e_wallet", currency: "IDR", balance: "250000" },
    { name: "Cash", type: "cash", currency: "IDR", balance: "500000" },
    ...
  ]
}
```

#### `list_transactions`

Returns recent transactions with optional filters.

```typescript
// Input
{
  type?: "expense" | "income" | "transfer",
  start_date?: string,      // ISO date
  end_date?: string,         // ISO date
  limit?: number             // Default: 20, max: 50
}

// Response
{
  transactions: [
    {
      id: "tx_abc123",
      type: "expense",
      amount: "50000",
      currency: "IDR",
      category: "Food & Drinks",
      asset: "GoPay",
      date: "2026-02-04",
      description: "Coffee"
    },
    ...
  ],
  total_count: 142
}
```

#### `get_budget_summary`

Current month's budget overview.

```typescript
// Input
{
  month?: number,            // Defaults to current month
  year?: number,             // Defaults to current year
  currency?: "IDR" | "USD"   // Defaults to IDR
}

// Response
{
  month: 2,
  year: 2026,
  currency: "IDR",
  total_budget: "5000000",
  total_spent: "2300000",
  total_remaining: "2700000",
  categories: [
    {
      name: "Food & Drinks",
      budget: "1500000",
      spent: "800000",
      remaining: "700000",
      status: "ok",
      percent_used: 53
    },
    {
      name: "Transport",
      budget: "500000",
      spent: "450000",
      remaining: "50000",
      status: "warning",
      percent_used: 90
    }
  ]
}
```

#### `get_asset_summary`

Asset totals by currency and type.

```typescript
// Input
{
  currency?: "IDR" | "USD"   // Optional filter
}

// Response
{
  by_currency: [
    { currency: "IDR", total: "15000000", count: 5 },
    { currency: "USD", total: "1200", count: 2 }
  ],
  by_type: [
    { type: "bank_account", currency: "IDR", total: "10000000", count: 2 },
    { type: "e_wallet", currency: "IDR", total: "3000000", count: 2 },
    { type: "cash", currency: "IDR", total: "2000000", count: 1 }
  ]
}
```

#### `get_dashboard`

Combined snapshot of current financial state.

```typescript
// Input
{
  month?: number,
  year?: number,
  currency?: "IDR" | "USD"
}

// Response
{
  month: 2,
  year: 2026,
  currency: "IDR",
  total_assets: "15000000",
  monthly_income: "8000000",
  monthly_expenses: "2300000",
  budget_health: {
    total_budget: "5000000",
    total_spent: "2300000",
    percent_used: 46,
    categories_warning: 1,
    categories_exceeded: 0
  },
  top_expenses: [
    { category: "Food & Drinks", amount: "800000" },
    { category: "Transport", amount: "450000" }
  ],
  recent_transactions: [
    { type: "expense", amount: "50000", category: "Food & Drinks", date: "2026-02-04" }
  ]
}
```

## Fuzzy Matching Strategy

For `category_name` and `asset_name` in write tools:

1. Exact match (case-insensitive)
2. Substring match (e.g. "food" matches "Food & Drinks")
3. Levenshtein distance with threshold (max distance = 3)
4. If no match found, return error with list of available options

This allows AI clients to use natural names from receipts without needing exact IDs.

## Client Configuration

### Environment Variables

| Variable             | Required | Description                                                               |
| -------------------- | -------- | ------------------------------------------------------------------------- |
| `ALLOWEALTH_API_KEY` | Yes      | API key for authentication                                                |
| `ALLOWEALTH_DB_PATH` | No       | Path to SQLite DB. Defaults to `./data/local.db` relative to project root |

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "allowealth": {
      "command": "bun",
      "args": ["run", "/path/to/allowealth/mcp-server/src/index.ts"],
      "env": {
        "ALLOWEALTH_API_KEY": "aw_...",
        "ALLOWEALTH_DB_PATH": "/path/to/allowealth/data/local.db"
      }
    }
  }
}
```

## Usage Examples

### Quick expense logging

```
User: "I just bought coffee for 35k"
AI:   → calls add_expense({ amount: 35000, currency: "IDR",
          category_name: "Food & Drinks", asset_name: "Cash",
          description: "Coffee" })
AI:   "Done! Logged 35,000 IDR expense under Food & Drinks."
```

### Receipt photo

```
User: [photo of restaurant receipt]
AI:   → reads receipt: Rp 250,000 at Sushi Tei, 2026-02-03
      → calls add_expense({ amount: 250000, currency: "IDR",
          category_name: "Food & Drinks", asset_name: "BCA",
          date: "2026-02-03", description: "Sushi Tei" })
AI:   "Logged! Rp 250,000 expense at Sushi Tei on Feb 3."
```

### Budget check

```
User: "How's my budget looking?"
AI:   → calls get_budget_summary()
AI:   "You've spent Rp 2.3M of your Rp 5M budget (46%).
        Transport is at 90% — only Rp 50K remaining."
```

## Implementation Phases

### Phase 1: Core MCP Server

1. Add `api_keys` table (schema + migration)
2. CLI command for API key generation
3. MCP server scaffolding (stdio transport, auth)
4. Implement all 8 tools
5. Manual testing with Claude Desktop

### Phase 2: Polish (future)

- Settings page UI for API key management
- HTTP transport for remote clients
- Rate limiting
- Audit logging of MCP actions

## Dependencies

- `@modelcontextprotocol/sdk` — MCP protocol implementation
- Existing project services (TransactionService, BudgetService, AssetService, DashboardService)
- Existing DB layer (Drizzle ORM + SQLite)
