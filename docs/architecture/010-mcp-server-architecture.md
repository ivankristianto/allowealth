# ADR 010: MCP Server Architecture

## Status

Accepted

## Context

To enable AI assistants (Claude, Gemini, etc.) to securely interact with Allowealth on behalf of users, we need to provide a standardized interface. The Model Context Protocol (MCP) is the industry standard for this purpose.

Key use cases include:

- Logging transactions from natural language or receipt images.
- Querying financial stats, budget status, and account balances.
- Providing a "headless" way to interact with the application.

The solution must work both locally (for desktop extensions like Claude Desktop) and remotely (for cloud-based AI assistants), while maintaining strict security and performance.

## Decision

Implement a hybrid MCP Server that supports both **stdio** (local) and **HTTP** (remote) transports with shared tool logic.

### 1. Dual-Transport Architecture

- **stdio entry point (`apps/mcp/`)**: A standalone TypeScript package for local execution via CLI and desktop apps.
- **HTTP entry point (`/api/mcp`)**: An Astro API route within the main application, enabling access via Cloudflare Workers without requiring long-lived stateful sessions.
- **Shared Tools**: Tool handlers are defined in a shared layer and receive service instances via **Dependency Injection (ToolContext)**. This ensures consistency between transports and maximizes code reuse.

### 2. Authentication: OAuth 2.0

- **OAuth Provider**: Allowealth uses the better-auth `mcp` plugin to expose an OAuth 2.0 provider for MCP clients.
- **Pre-seeded Clients**: `bun run aw db seed-oauth-clients` creates the well-known clients used by Claude Desktop, ChatGPT, and generic MCP clients.
- **Database Model**: OAuth state is stored in three tables: `oauthApplication`, `oauthAccessToken`, and `oauthConsent`.
- **Consent + Token UX**: Users authorize clients on `/oauth/authorize`, then copy the one-time access token from `/oauth/display-token`.
- **Optimization**: `src/lib/mcp-auth.ts` validates access tokens and caches successful lookups in the `CacheManager` for 5 minutes.
- **Revocation**: Revoking a connected app deletes the token record and invalidates the cache tag for that token immediately.

### 3. Tool Design Principles

- **Fuzzy Matching**: AI clients provide natural names for categories and accounts. The server performs fuzzy matching (Exact → Substring → Levenshtein) to resolve these to database IDs, keeping the client interface natural and resilient to typos.
- **Stateless HTTP**: The HTTP transport operates in a stateless mode (request/response), which is a perfect fit for Cloudflare Workers' execution model.
- **Write Safety**: Tools support adding data (`add_expense`, `add_income`) but do not support deletion, preventing accidental data loss via AI interactions.

### 4. Technical Specifications

**Included Tools:**

- `add_expense` / `add_income`: Create transactions with fuzzy-matched metadata.
- `list_categories` / `list_accounts`: Explore available classification options.
- `get_budget_summary`: Current month's financial health.
- `get_account_summary` / `get_dashboard`: Snapshot of total financial position.

**HTTP Authentication Header:**
`Authorization: Bearer <oauth_access_token>`

## Consequences

### Positive

- **Security**: OAuth access tokens provide a standard, revokable way for external agents to access user data.
- **Portability**: Allowealth data becomes accessible to any AI that supports the MCP standard.
- **Maintainability**: Reuses shared MCP tool handlers and centralizes token validation in `src/lib/mcp-auth.ts`.
- **Observability**: Routes through standard middleware (logging, metrics).

### Negative

- **Stateless Limitation**: MCP features requiring persistent sessions (like SSE or complex multi-step notifications) are not supported on the HTTP transport.
- **OAuth Surface Area**: Adds consent screens, client seeding, and token lifecycle management to the product.

## Future Considerations

- Refresh-token rotation and shorter-lived access tokens for remote clients.
- Rate limiting per OAuth client or token.
- Audit logs specifically for MCP-driven actions.

## References

- **MCP Protocol**: [Model Context Protocol](https://modelcontextprotocol.io)
- **Design Document**: `docs/done/2026-02-04-mcp-server-design.md`
- **Implementation**: `apps/mcp/`, `src/pages/api/mcp.ts`, and `src/lib/mcp-auth.ts`
