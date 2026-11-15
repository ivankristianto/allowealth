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
- **Consent + Token UX**: Users authorize clients on `/oauth/authorize`, which shows the client name, the redirect URI host and the requested scopes, then copy the one-time access token from `/oauth/display-token`.
- **Scopes (#479)**: each registry permission is an OAuth scope `allowealth:<permission>` (`src/lib/mcp-oauth-scopes.ts`), added to `MCP_OAUTH_SCOPES` and so advertised in `scopes_supported`. The consent page lists `openid`, `mcp` and any other non-permission scope as always included and each requested `allowealth:*` scope as a checkbox, ticked by default. `submitOAuthConsent` posts the granted set as the provider's `scope` field: every non-permission scope from the signed request plus the ticked permission scopes that request contained, so the form can only narrow it. Unticking every permission is refused, because the result would be a full-access token. The provider stores the granted set on `oauthAccessToken.scopes` and in `oauthConsent`; a later request for a scope outside the stored consent shows the consent page again. The Security page's connect buttons request every permission scope with `prompt=consent`, so connecting again is how a user changes permissions, and the connected apps list shows "Full access" or the granted permissions.
- **Token Checks**: `src/lib/mcp-auth.ts` looks each access token up in the database on every request. It accepts only live, unrevoked tokens that carry the `mcp` scope and were issued to a client in `MCP_OAUTH_CLIENTS`. There is no auth cache; revoke paths still call `invalidateMcpToken(id)`, which clears the `mcp-token:<id>` tag, so a cache added later stays correct.
- **Revocation**: Revoking a connected app deletes the token record (and its refresh token) and invalidates the cache tag for that token immediately. Ending the browser session that authorized a client (sign-out or session revocation) marks its tokens `revoked`, and `/api/mcp` rejects them.

### 2a. Authentication: App Passwords (#438)

OAuth needs a browser consent step and its access tokens last 24 hours, so cron jobs, CI and headless agents could not use MCP. App passwords fill that gap.

- **Token**: `aw_pat_` + 32 random bytes (base64url). The prefix lets secret scanners detect leaks. Only the SHA-256 hash (`hashOAuthToken`) and a non-secret hint (`aw_pat_xxxx`) are stored, in `mcp_app_passwords`.
- **Binding**: each row belongs to one user and the workspace they were in at creation. Verification rejects the token when the user is soft-deleted, has no workspace, or is now in a different workspace. Hard-deleting the user or workspace cascades.
- **Permissions (#476, #480)**: each row stores `permissions`, a JSON array of `resource:action` ids from `src/lib/permissions/registry.ts` or the wildcards `*` and `*:read`. `verify()` expands them against the current registry, so a wildcard covers permissions added later. Create and edit take either a preset `scope` (`read` stores `*:read`, `read-write` stores `*`) or a custom list of registry ids, never wildcards. Responses carry the stored `permissions` and a `preset` derived from them: `read` or `read-write` only for the exact wildcard, otherwise `custom`. The old `scope` column was dropped in migration 0010. Every REST allowlist rule and MCP tool names the permission it needs (`GET /api/openapi.json`, `GET /api/app-password/self` and the `get_token_info` tool are open to any valid token); `tests/architecture/permission-registry.test.ts` fails when one is missing. REST enforces these permissions: a request without the one its rule names gets 403 `APP_PASSWORD_PERMISSION_MISSING` with the permission in `error.details.permission`.
- **Self-discovery (#481)**: `GET /api/app-password/self` and the MCP tool `get_token_info` return the token's name, preset, expanded permissions, expiry and rate limit, both built by `describeAppPasswordToken`. Over MCP the rate limit comes from the transport in `ToolContext.rateLimit`: 60 a minute over HTTP, `null` over stdio, which applies none. OAuth tokens get `kind: "oauth"` and their permissions; `McpAuthContext.kind` tells the two apart. Each allowlisted OpenAPI operation carries `x-required-permission` (`any` for the two open routes), and an architecture test ties it to the allowlist. `GET /api/openapi.json` filters the bundled document per request for an app password, keeping only the operations the allowlist lets that token call; sessions get the whole document.
- **MCP permissions**: both transports check the same permissions. `tools/list` returns only the tools whose permissions the token holds, all of them for a tool mapped to several (`get_dashboard`), and `tools/call` refuses the rest with an `isError` result naming the missing permissions. A tool missing from `TOOL_PERMISSIONS` is refused to every token. For OAuth tokens `validateMcpToken` maps `allowealth:*` scopes to permissions: any such scope limits the token to exactly those permissions (unknown ones grant nothing), while a token with `mcp` and no `allowealth:*` scope, issued before scopes existed or to a client that asked only for `mcp`, keeps every permission.
- **Tool annotations**: derived from `TOOL_PERMISSIONS`. A tool whose permissions are all reads sets `readOnlyHint: true`. Any other tool sets `readOnlyHint: false` and an explicit `destructiveHint`, since clients assume a write without one is destructive: `false` when every write permission is a `:create` or `:confirm`, `true` when any can update, delete or edit (`recurring:write`).
- **Limit**: 5 per user. Users who had more before the limit dropped from 20 keep them, but cannot create another until they are below 5.
- **Expiry**: 30, 90 or 365 days, or none when explicitly chosen.
- **Dispatch**: `validateMcpToken` sends `aw_pat_` tokens to `McpAppPasswordService.verify` before the OAuth lookup, and they never fall through to it.
- **Lifecycle**: created, edited and revoked on Security → App Passwords (`/api/user/app-passwords`). Creating or editing needs a session created in the last 15 minutes. Editing changes the name or permissions without rotating the token. Verification is not cached, so the change applies on the next request; editing still invalidates the token's cache tag, as revoking does, so a later cache stays correct. Create, edit and revoke are written to the audit log. App passwords survive sign-out and password changes and must be revoked individually. Deactivating or deleting the user deletes them in the same transaction as the soft delete, so reactivation does not restore them.
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
- `get_token_info`: What the calling token may do, open to every token.

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
