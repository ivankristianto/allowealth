# MCP Server for Allowealth

**Date:** 2026-02-04
**Status:** Design

## Purpose

Expose Allowealth's expense tracking, budget, and asset data via MCP (Model Context Protocol) so personal AI assistants (Claude, Gemini, ChatGPT, etc.) can log transactions and query financial stats on the user's behalf.

**Primary use case:** User takes a photo of a receipt, the AI client parses it, and submits the expense via MCP tools.

## Key Decisions

| Decision         | Choice                                 | Rationale                                                     |
| ---------------- | -------------------------------------- | ------------------------------------------------------------- |
| Authentication   | API key per user                       | Portable across MCP clients, easy to revoke                   |
| Transport        | stdio (local) + HTTP (remote)          | stdio for local clients, HTTP for Workers/remote access       |
| HTTP mode        | Stateless (no MCP sessions)            | Natural fit for Workers; tools are request/response           |
| HTTP integration | Astro API route in main app            | Reuses middleware stack, Hyperdrive, and deployment pipeline  |
| Tool DI          | ToolContext parameter injection        | Enables shared tools across stdio and HTTP entry points       |
| Auth caching     | Existing CacheManager (Upstash/Memory) | Avoids PBKDF2 per-request; reuses production cache infra      |
| Receipt parsing  | AI client handles it                   | Clients already excel at OCR; keeps server simple             |
| Tool scope       | Standard (read + write, no delete)     | Enough for logging and querying; prevents accidental deletion |
| Name resolution  | Fuzzy matching on category/asset names | AI can use natural names without needing exact IDs            |

## Architecture

The MCP server supports two transports that share the same tool logic via dependency injection:

- **stdio** — for local MCP clients (Claude Desktop, Claude Code). Runs as a standalone process via `mcp-server/src/index.ts`.
- **HTTP** — for remote access via Cloudflare Workers. Runs as an Astro API route at `/api/mcp` inside the main app.

Both transports call the same tool handlers with a `ToolContext` parameter containing auth info and service instances.

```
expenses/
├── src/                         # Existing web app
│   ├── pages/api/mcp.ts         # HTTP MCP endpoint (Astro API route)
│   └── services/                # Existing services (shared)
├── mcp-server/                  # Standalone MCP package (stdio)
│   ├── src/
│   │   ├── index.ts             # stdio entry point
│   │   ├── auth.ts              # API key validation (env var)
│   │   ├── context.ts           # Service factory: createServices(db)
│   │   └── tools/               # Shared tool definitions
│   │       ├── types.ts         # ToolContext interface
│   │       ├── index.ts         # registerTools() + handleToolCall()
│   │       ├── transactions.ts
│   │       ├── budget.ts
│   │       ├── assets.ts
│   │       └── dashboard.ts
│   ├── package.json
│   └── tsconfig.json
├── src/db/                      # Existing DB layer (shared)
└── src/lib/cache/               # Existing cache (used for API key auth)
```

```
┌─────────────────────────────────────────────────────┐
│                   Tool Layer                         │
│  registerTools() / handleToolCall(name, args, ctx)   │
│  (mcp-server/src/tools/*)                            │
└──────────────┬──────────────────────┬────────────────┘
               │                      │
    ┌──────────▼──────────┐  ┌────────▼──────────────────┐
    │  stdio entry         │  │  HTTP entry                │
    │  mcp-server/         │  │  src/pages/api/mcp.ts      │
    │  src/index.ts        │  │                            │
    │                      │  │  Auth: Bearer token         │
    │  Auth: env var       │  │  DB: per-request (MW)       │
    │  DB: singleton       │  │  Cache: CacheManager        │
    │  Transport: stdio    │  │  Transport: JSON-RPC/HTTP   │
    └──────────────────────┘  └────────────────────────────┘
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

## HTTP Transport Design

### Overview

The HTTP transport exposes MCP tools via a single Astro API route (`/api/mcp`) that handles MCP JSON-RPC 2.0 messages over HTTP POST. It runs inside the main app and deploys to Cloudflare Workers alongside everything else.

**Mode:** Stateless — no MCP session management (`Mcp-Session-Id` not used). Every request is independent: authenticate, process, respond. This is the natural fit for Workers (no state between requests).

### ToolContext (Dependency Injection)

Tool handlers are refactored to accept a `ToolContext` parameter instead of importing module-level singletons:

```typescript
// mcp-server/src/tools/types.ts
interface ToolContext {
  auth: {
    workspaceId: string;
    userId: string;
    apiKeyId: string;
  };
  services: {
    transaction: TransactionService;
    budget: BudgetService;
    asset: AssetService;
    dashboard: DashboardService;
    category: CategoryService;
  };
}
```

All handler signatures change from:

```typescript
handleListCategories(args); // reads singletons
```

to:

```typescript
handleListCategories(args, ctx); // receives injected context
```

The stdio entry point constructs `ToolContext` once on startup from its singletons. The HTTP entry point constructs it fresh per-request from the middleware-provided DB.

### Authentication

HTTP requests authenticate via `Authorization: Bearer aw_xxx` header.

PBKDF2 validation is expensive (~100ms), so results are cached using the existing `CacheManager` infrastructure (Upstash in production, Memory in dev):

```typescript
const CACHE_TTL = 300; // 5 minutes

async function validateWithCache(apiKey: string, db: IDatabase): Promise<AuthContext | null> {
  const keyHash = simpleHash(apiKey); // hash of full key (not prefix)
  const prefix = apiKey.slice(0, 8);
  const cacheKey = `cache:apikey:${keyHash}`;
  const cache = getCacheManager();

  // 1. Try cache
  const cached = await cache.get<AuthContext>(cacheKey);
  if (cached) return cached;

  // 2. Cache miss — full PBKDF2 validation
  const service = new ApiKeyService(db);
  const result = await service.validate(apiKey);
  if (!result) return null;

  // 3. Store in cache with prefix tag for invalidation on revoke
  await cache.set(cacheKey, result, {
    ttl: CACHE_TTL,
    tags: [`apikey:${prefix}`],
  });

  return result;
}
```

The cache key uses a hash of the full API key (preventing prefix-collision auth bypass), while the tag uses the prefix (enabling invalidation on revocation without the full key). When a key is revoked, invalidate with tag `apikey:{prefix}`.

### MCP Message Dispatch

The endpoint handles standard MCP JSON-RPC methods:

| Method       | Response                                                           |
| ------------ | ------------------------------------------------------------------ |
| `initialize` | Server info + capabilities                                         |
| `tools/list` | All 8 tool definitions                                             |
| `tools/call` | Dispatches to shared handler via `handleToolCall(name, args, ctx)` |
| Other        | JSON-RPC error (-32601 Method not found)                           |

Notifications (`notifications/initialized`, `ping`) are accepted and ignored (return 202).

### API Route

```typescript
// src/pages/api/mcp.ts
export const POST: APIRoute = async (context) => {
  // 1. Extract & validate API key (with cache)
  // 2. Build ToolContext with per-request DB from middleware
  // 3. Parse JSON-RPC body, dispatch to MCP handler
  // 4. Return JSON-RPC response
};

// Reject non-POST methods (no SSE in stateless mode)
export const ALL: APIRoute = () => new Response(null, { status: 405 });
```

The route participates in the existing middleware stack automatically:

- `runtimeEnv` — sets Hyperdrive connection string
- `database` — manages per-request DB lifecycle
- `securityHeaders` — adds security headers

It bypasses `authentication` (Lucia sessions) and `csrf` since it uses API key auth.

### Client Configuration (HTTP)

```json
{
  "mcpServers": {
    "allowealth": {
      "url": "https://allowealth.com/api/mcp",
      "headers": {
        "Authorization": "Bearer aw_..."
      }
    }
  }
}
```

### File Changes

**New files:**

- `mcp-server/src/tools/types.ts` — ToolContext interface
- `src/pages/api/mcp.ts` — Astro API route

**Modified files (tool refactor):**

- `mcp-server/src/tools/index.ts` — handleToolCall accepts ToolContext
- `mcp-server/src/tools/transactions.ts` — handlers accept ctx
- `mcp-server/src/tools/assets.ts` — handlers accept ctx
- `mcp-server/src/tools/budget.ts` — handler accepts ctx
- `mcp-server/src/tools/dashboard.ts` — handlers accept ctx

**Modified files (context refactor):**

- `mcp-server/src/context.ts` — exports `createServices(db)` factory instead of singletons
- `mcp-server/src/index.ts` — constructs ToolContext from singletons

**Modified files (cache keys):**

- `src/lib/cache/keys.ts` — add `CacheKeys.apiKey(prefix)`
- `src/lib/cache/tags.ts` — add `CacheTags.API_KEYS`

## Implementation Phases

### Phase 1: Core MCP Server (stdio)

1. Add `api_keys` table (schema + migration)
2. API Key Service (generate, validate, revoke)
3. CLI command for API key generation
4. Fuzzy matching utility
5. MCP server scaffolding (stdio transport, auth)
6. Transaction + asset tools (list + add)
7. Budget + dashboard tools
8. Integration test & manual verification

### Phase 2: HTTP Transport

1. Refactor tools to accept `ToolContext` (dependency injection)
2. Refactor `context.ts` to `createServices(db)` factory
3. Update stdio entry point to construct and pass `ToolContext`
4. Add cache keys/tags for API key auth caching
5. Implement `src/pages/api/mcp.ts` (HTTP endpoint with JSON-RPC dispatch)
6. Bypass Lucia/CSRF middleware for `/api/mcp` route
7. Quality gates (lint, typecheck) and manual testing
8. Test with HTTP-capable MCP client

### Phase 3: Polish (future)

- Settings page UI for API key management
- Rate limiting
- Audit logging of MCP actions

## Dependencies

- `@modelcontextprotocol/sdk` — MCP protocol implementation
- Existing project services (TransactionService, BudgetService, AssetService, DashboardService)
- Existing DB layer (Drizzle ORM + SQLite/PostgreSQL)
- Existing CacheManager (Upstash/Memory) — for API key auth caching
