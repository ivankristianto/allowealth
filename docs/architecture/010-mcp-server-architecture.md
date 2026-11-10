# ADR 010: MCP Server Architecture

## Status

Accepted

> **Note — 2026-10-24.** The Cloudflare Workers deployment this ADR refers to
> was removed; the app is now self-hosted on Bun. The decision still holds,
> and the Workers references below are historical context.

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

- **OAuth Provider**: Allowealth uses `@better-auth/oauth-provider` (Better Auth 1.7) to expose an OAuth 2.1 provider for MCP clients, with opaque access tokens (`disableJwtPlugin: true`). Endpoints live under `/api/auth/oauth2/*`.
- **Pre-seeded Clients**: `bun run aw db seed-oauth-clients` creates the well-known clients used by Claude Desktop, ChatGPT, and generic MCP clients. These are the only clients: `clientPrivileges` denies create, update and delete to every session, and dynamic registration (`/oauth2/register`) stays off.
- **Database Model**: OAuth state is stored in `oauthClient`, `oauthAccessToken`, `oauthRefreshToken`, `oauthConsent`, `oauthResource`, `oauthClientResource` and `oauthClientAssertion`. Token values are stored as SHA-256 hashes (`src/lib/auth/oauth-token-hash.ts`), shared by the provider and `src/lib/mcp-auth.ts`.
- **Consent + Token UX**: Users authorize clients on `/oauth/authorize`, which shows the client name and the redirect URI host, then copy the one-time access token from `/oauth/display-token`.
- **Token Checks**: `src/lib/mcp-auth.ts` looks each access token up in the database on every request. It accepts only live, unrevoked tokens that carry the `mcp` scope and were issued to a client in `MCP_OAUTH_CLIENTS`. There is no auth cache; revoke paths still call `invalidateMcpToken(id)`, which clears the `mcp-token:<id>` tag, so a cache added later stays correct.
- **Revocation**: Revoking a connected app deletes the token record (and its refresh token) and invalidates the cache tag for that token immediately. Ending the browser session that authorized a client (sign-out or session revocation) marks its tokens `revoked`, and `/api/mcp` rejects them.

### 2a. Authentication: App Passwords (#438)

OAuth needs a browser consent step and its access tokens last 24 hours, so cron jobs, CI and headless agents could not use MCP. App passwords fill that gap.

- **Token**: `aw_pat_` + 32 random bytes (base64url). The prefix lets secret scanners detect leaks. Only the SHA-256 hash (`hashOAuthToken`) and a non-secret hint (`aw_pat_xxxx`) are stored, in `mcp_app_passwords`.
- **Binding**: each row belongs to one user and the workspace they were in at creation. Verification rejects the token when the user is soft-deleted, has no workspace, or is now in a different workspace. Hard-deleting the user or workspace cascades.
- **Scope**: `read` or `read-write`. `handleToolCall` enforces it for both transports with an allowlist (`READ_ONLY_TOOLS`), so a new tool stays blocked for read-only tokens until it is listed. `tools/list` hides tools the token cannot call.
- **Expiry**: 30, 90 or 365 days, or none when explicitly chosen.
- **Dispatch**: `validateMcpToken` sends `aw_pat_` tokens to `McpAppPasswordService.verify` before the OAuth lookup, and they never fall through to it.
- **Lifecycle**: created and revoked on Security → App Passwords (`/api/user/app-passwords`). Creation needs a session created in the last 15 minutes. Create and revoke are written to the audit log. App passwords survive sign-out and password changes and must be revoked individually. Deactivating or deleting the user deletes them in the same transaction as the soft delete, so reactivation does not restore them.
- **Why not Better Auth's API key plugin**: in 1.7 it is a separate package (`@better-auth/api-key`), verification needs the Better Auth instance (the stdio server only has the database), its table hangs off Better Auth's `user` rather than `users`/workspaces, and its per-key limiter writes to the row on every request.

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
`Authorization: Bearer <oauth_access_token | aw_pat_app_password>`

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
- Audit logs specifically for MCP-driven actions.

## References

- **MCP Protocol**: [Model Context Protocol](https://modelcontextprotocol.io)
- **Design Document**: `docs/done/2026-02-04-mcp-server-design.md`
- **Implementation**: `apps/mcp/`, `src/pages/api/mcp.ts`, and `src/lib/mcp-auth.ts`
