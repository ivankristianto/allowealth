# ADR 010: MCP Server Architecture

## Status

Accepted

## Context

To enable AI assistants (Claude, Gemini, etc.) to securely interact with Allowealth on behalf of users, we need to provide a standardized interface. The Model Context Protocol (MCP) is the industry standard for this purpose.

Key use cases include:

- Logging transactions from natural language or receipt images.
- Querying financial stats, budget status, and asset balances.
- Providing a "headless" way to interact with the application.

The solution must work both locally (for desktop extensions like Claude Desktop) and remotely (for cloud-based AI assistants), while maintaining strict security and performance.

## Decision

Implement a hybrid MCP Server that supports both **stdio** (local) and **HTTP** (remote) transports with shared tool logic.

### 1. Dual-Transport Architecture

- **stdio entry point (`mcp-server/`)**: A standalone TypeScript package for local execution via CLI/desktop apps.
- **HTTP entry point (`/api/mcp`)**: An Astro API route within the main application, enabling access via Cloudflare Workers without requiring long-lived stateful sessions.
- **Shared Tools**: Tool handlers are defined in a shared layer and receive service instances via **Dependency Injection (ToolContext)**. This ensures consistency between transports and maximizes code reuse.

### 2. Authentication: API Key System

- **Per-User/Workspace Keys**: Users can generate multiple named API keys (e.g., "Claude Desktop").
- **Security**: Keys are stored as PBKDF2-SHA256 hashes in the `api_keys` table.
- **Optimization**: To avoid expensive hashing on every request, validation results are cached in the `CacheManager` (Upstash/Memory) with a 5-minute TTL.
- **Soft Revocation**: Revoking a key invalidates its cache entry via tag-based invalidation (`apikey:{prefix}`).

### 3. Tool Design Principles

- **Fuzzy Matching**: AI clients provide natural names for categories and assets. The server performs fuzzy matching (Exact → Substring → Levenshtein) to resolve these to database IDs, keeping the client interface natural and resilient to typos.
- **Stateless HTTP**: The HTTP transport operates in a stateless mode (request/response), which is a perfect fit for Cloudflare Workers' execution model.
- **Write Safety**: Tools support adding data (`add_expense`, `add_income`) but do not support deletion, preventing accidental data loss via AI interactions.

### 4. Technical Specifications

**Included Tools:**

- `add_expense` / `add_income`: Create transactions with fuzzy-matched metadata.
- `list_categories` / `list_assets`: Explore available classification options.
- `get_budget_summary`: Current month's financial health.
- `get_asset_summary` / `get_dashboard`: Snapshot of total financial position.

**HTTP Authentication Header:**
`Authorization: Bearer aw_...`

## Consequences

### Positive

- **Security**: API keys provide a secure, revokable way for external agents to access user data.
- **Portability**: Allowealth data becomes accessible to any AI that supports the MCP standard.
- **Maintainability**: Reuses 90%+ of existing services; no duplication of game logic.
- **Observability**: Routes through standard middleware (logging, metrics).

### Negative

- **Stateless Limitation**: MCP features requiring persistent sessions (like SSE or complex multi-step notifications) are not supported on the HTTP transport.
- **Key Management**: Requires a new surface area for API key lifecycle management (CLI first, then UI).

## Future Considerations

- UI-based API key management in user settings.
- Rate limiting per API key.
- Audit logs specifically for MCP-driven actions.

## References

- **MCP Protocol**: [Model Context Protocol](https://modelcontextprotocol.io)
- **Design Document**: `docs/done/2026-02-04-mcp-server-design.md`
- **Implementation**: `mcp-server/` and `src/pages/api/mcp.ts`
