# GitHub Issue: MCP Endpoint for Agent-Based Expense and Income Management

**Title:** `feat: MCP endpoint for agent-based expense and income management`

**Labels:** `enhancement`, `api`, `feature`

---

## Summary

Implement Model Context Protocol (MCP) endpoints to allow AI agents (particularly OpenClaw and similar tools) to connect and manage expenses and income transactions programmatically.

## Background

MCP (Model Context Protocol) is a standard for AI agents to interact with external systems. This feature will enable:
- AI assistants to record expenses/income on behalf of users
- Automated transaction logging from various sources
- Integration with tools like OpenClaw for conversational finance management

## High-Level Plan

### Phase 1: Authentication Infrastructure

**1.1 API Token System**
- Create `api_tokens` table for storing agent tokens
- Fields: `id`, `workspace_id`, `user_id`, `name`, `token_hash`, `scopes`, `last_used_at`, `expires_at`, `created_at`
- Token generation endpoint: `POST /api/settings/tokens`
- Token revocation endpoint: `DELETE /api/settings/tokens/:id`
- Token listing: `GET /api/settings/tokens`

**1.2 Token Authentication Middleware**
- Support `Authorization: Bearer <token>` header
- Validate token and extract workspace context
- Rate limiting per token (configurable, default: 100 req/min)
- Audit logging for all token-authenticated requests

### Phase 2: MCP Transaction Endpoints

**2.1 Core Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/mcp/transactions` | Create expense/income |
| `GET` | `/api/mcp/transactions` | List transactions (filtered) |
| `GET` | `/api/mcp/transactions/:id` | Get single transaction |
| `PUT` | `/api/mcp/transactions/:id` | Update transaction |
| `DELETE` | `/api/mcp/transactions/:id` | Delete transaction |

**2.2 Supporting Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/mcp/categories` | List available categories |
| `GET` | `/api/mcp/assets` | List available assets/accounts |
| `GET` | `/api/mcp/schema` | MCP schema discovery endpoint |

### Phase 3: MCP Protocol Compliance

**3.1 Schema Discovery**
- Implement `/api/mcp/schema` returning JSON Schema for all operations
- Include field descriptions, validation rules, and examples
- Support MCP tool discovery format

**3.2 Response Format**
```json
{
  "success": true,
  "data": {
    "transaction": { ... },
    "meta": {
      "created_via": "mcp",
      "agent_id": "openclaw-v1"
    }
  }
}
```

**3.3 Error Handling**
- Structured error responses with codes
- Actionable error messages for agents
- Retry guidance in headers

### Phase 4: Security & Audit

**4.1 Security Measures**
- Token scopes: `transactions:read`, `transactions:write`, `categories:read`, `assets:read`
- Per-token rate limiting
- IP allowlisting (optional)
- Token expiration (configurable, default: 90 days)

**4.2 Audit Trail**
- Log all MCP operations with token ID
- Track source agent identifier
- Enable workspace admins to view MCP activity

## Technical Architecture

### Database Schema Addition

```sql
-- api_tokens table
CREATE TABLE api_tokens (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  scopes TEXT NOT NULL, -- JSON array
  last_used_at INTEGER,
  expires_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deleted_at INTEGER
);

CREATE INDEX idx_api_tokens_workspace ON api_tokens(workspace_id);
CREATE INDEX idx_api_tokens_token_hash ON api_tokens(token_hash);
```

### File Structure

```
src/
├── pages/api/
│   ├── mcp/
│   │   ├── transactions.ts      # CRUD endpoints
│   │   ├── categories.ts        # Read-only categories
│   │   ├── assets.ts            # Read-only assets
│   │   └── schema.ts            # MCP schema discovery
│   └── settings/
│       └── tokens.ts            # Token management UI endpoint
├── services/
│   └── api-token.service.ts     # Token CRUD & validation
├── lib/
│   ├── mcp/
│   │   ├── auth.ts              # Token authentication
│   │   ├── rate-limit.ts        # Per-token rate limiting
│   │   └── schema.ts            # MCP schema definitions
│   └── validation/
│       └── api-tokens.ts        # Token validation schemas
└── db/schema/
    ├── sqlite/api-tokens.ts
    └── postgresql/api-tokens.ts
```

### Request Flow

```
Agent Request
     │
     ▼
┌─────────────────┐
│ Token Validation │
│ (Bearer token)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Rate Limiting    │
│ (per token)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Scope Validation │
│ (permissions)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Transaction      │
│ Service (reuse)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Audit Logging    │
└────────┬────────┘
         │
         ▼
    Response
```

## Example Usage

### Create Expense via MCP

```bash
curl -X POST https://app.allowealth.com/api/mcp/transactions \
  -H "Authorization: Bearer alw_xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -H "X-Agent-Id: openclaw-v1" \
  -d '{
    "type": "expense",
    "amount": "50000",
    "currency": "IDR",
    "category_id": "cat_groceries",
    "asset_id": "ast_main_wallet",
    "transaction_date": "2026-02-03",
    "description": "Weekly groceries from supermarket"
  }'
```

### MCP Tool Definition (for agents)

```json
{
  "name": "record_expense",
  "description": "Record an expense transaction in Allowealth",
  "parameters": {
    "type": "object",
    "properties": {
      "amount": {
        "type": "string",
        "description": "Transaction amount as string (e.g., '50000')"
      },
      "currency": {
        "type": "string",
        "enum": ["IDR", "USD"],
        "description": "Currency code"
      },
      "category": {
        "type": "string",
        "description": "Category name or ID"
      },
      "asset": {
        "type": "string",
        "description": "Asset/account name or ID"
      },
      "date": {
        "type": "string",
        "format": "date",
        "description": "Transaction date (YYYY-MM-DD)"
      },
      "description": {
        "type": "string",
        "description": "Optional transaction description"
      }
    },
    "required": ["amount", "currency", "category", "asset"]
  }
}
```

## Acceptance Criteria

### Must Have (MVP)
- [ ] API token generation and management
- [ ] Token-based authentication for MCP endpoints
- [ ] `POST /api/mcp/transactions` - Create expense/income
- [ ] `GET /api/mcp/transactions` - List with filtering
- [ ] `GET /api/mcp/categories` - List categories
- [ ] `GET /api/mcp/assets` - List assets
- [ ] Rate limiting (100 req/min per token)
- [ ] OpenAPI documentation for MCP endpoints
- [ ] Basic audit logging

### Should Have
- [ ] Token scopes for granular permissions
- [ ] `PUT/DELETE /api/mcp/transactions/:id`
- [ ] MCP schema discovery endpoint
- [ ] Token expiration management
- [ ] Settings UI for token management

### Nice to Have
- [ ] IP allowlisting
- [ ] Webhook notifications for MCP operations
- [ ] Bulk transaction creation
- [ ] Natural language category/asset matching

## Security Considerations

1. **Token Storage**: Hash tokens with SHA-256 before storage
2. **Token Format**: Use prefix `alw_` for easy identification
3. **Rate Limiting**: Prevent abuse with per-token limits
4. **Audit Trail**: Log all operations for accountability
5. **Scope Restrictions**: Minimize permissions by default
6. **HTTPS Only**: Reject non-HTTPS requests in production

## Dependencies

- Existing `TransactionService` (reuse)
- Existing validation schemas (extend)
- Existing error handling patterns (reuse)

## Related

- OpenClaw integration documentation (TBD)
- MCP Protocol specification: https://modelcontextprotocol.io/

---

_This feature enables AI-powered expense tracking, making Allowealth accessible through conversational interfaces and automated workflows._

---

## To Create This Issue

Run this command from your local machine (with `gh` CLI authenticated):

```bash
gh issue create --repo ivankristianto/allowealth \
  --title "feat: MCP endpoint for agent-based expense and income management" \
  --body-file docs/issues/mcp-endpoint-feature.md \
  --label "enhancement"
```

Or create it manually at: https://github.com/ivankristianto/allowealth/issues/new
