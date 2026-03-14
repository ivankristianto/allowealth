# Design: MCP Server OAuth 2.0 Authentication (ALL-45)

**Date:** 2026-03-14
**Status:** Draft
**Linear:** [ALL-45](https://linear.app/allowealth/issue/ALL-45)

---

## Problem

The MCP server authenticates using API keys — custom tokens stored as PBKDF2-SHA256 hashes. Users must generate keys manually, copy them into client config, and manage revocation themselves. This system is bespoke, non-standard, and requires custom infrastructure (generation, hashing, caching, revocation).

OAuth 2.0 is the industry standard for delegated access. MCP clients (Claude Desktop, ChatGPT, Agent CLI, and others) expect to authenticate via OAuth. Adopting it eliminates the custom API key system entirely and makes Allowealth compatible with any standards-compliant MCP client.

---

## Goals

- Allowealth becomes an OAuth 2.0 provider using better-auth's `mcp` plugin.
- MCP clients authenticate with OAuth access tokens instead of API keys.
- The API key system is removed completely: tables, services, CLI commands, and UI.
- The MCP package moves from `./mcp-server/` to `./apps/mcp/`.

---

## Out of Scope

- Admin approval for OAuth client registration (auto-approve; clients are pre-seeded).
- Fine-grained OAuth scopes (single `mcp` scope covers all MCP access).
- Rate limiting per OAuth client.
- Cloudflare Worker Route configuration for `*.allowealth.io/mcp` (separate deployment task).

---

## Architecture

### Directory Move

The standalone MCP package moves from `./mcp-server/` to `./apps/mcp/`. The `apps/` directory already exists. Internal structure is unchanged. After the move:

- `apps/mcp/tsconfig.json` path alias updates from `../src/*` to `../../src/*`
- Root `tsconfig.json` updates `@mcp-server/*` alias from `["mcp-server/src/*"]` to `["apps/mcp/src/*"]`
- Root `tsconfig.json` updates `include` from `"mcp-server/src/**/*"` to `"apps/mcp/src/**/*"`

### Dual Transport

The MCP server supports two transports:

| Transport | Entry point | Auth source |
|---|---|---|
| stdio | `apps/mcp/src/index.ts` | `ALLOWEALTH_ACCESS_TOKEN` env var |
| HTTP | `src/pages/api/mcp.ts` | `Authorization: Bearer <token>` header |

Both transports validate tokens through `src/lib/mcp-auth.ts`, a shared module that queries the `oauthAccessToken` table directly via D1/SQLite. No HTTP round-trip to any introspection endpoint — direct DB lookup by the unique `accessToken` field, with expiry check against `accessTokenExpiresAt`. The existing `CacheManager` caches valid results for 5 minutes, invalidated on revocation.

### Deployment

The HTTP MCP endpoint (`src/pages/api/mcp.ts`) serves at `/api/mcp` on the main app domain. A Cloudflare Worker Route will later map `*.allowealth.io/mcp` to this endpoint — that configuration is a separate task and requires no code changes. The `*.allowealth.io` pattern must be added to better-auth's `trustedOrigins`.

---

## OAuth Provider

### Plugin

Add the `mcp` plugin (from `better-auth/plugins/mcp`) to `src/lib/auth/server.ts`. This plugin wraps `oidcProvider` and adds MCP-specific OAuth metadata endpoints. It requires a `loginPage` option pointing to the app's sign-in page.

The plugin exposes these endpoints (under the `/api/auth` base path):

```
GET  /api/auth/oauth2/authorize     — authorization request; redirects to consent page
POST /api/auth/oauth2/consent       — user approve/deny; issues authorization code
POST /api/auth/oauth2/token         — authorization code → access token exchange
GET  /.well-known/openid-configuration — OIDC metadata (for MCP client discovery)
GET  /.well-known/oauth-protected-resource — MCP protected resource metadata
```

### Well-Known Clients

Allowealth ships with pre-seeded OAuth clients. Users never manage client credentials — they pick a client from the UI and authorize it. The seeder upserts rows into the `oauthApplication` table at `bun run db:seed`.

| client_id | Display name | type |
|---|---|---|
| `mcp-claude-desktop` | Claude Desktop | `native` |
| `mcp-openai` | ChatGPT | `web` |
| `mcp-generic` | Generic MCP Client | `public` |

### Scopes

A single `mcp` scope grants full MCP tool access. No fine-grained scopes for now.

### Token Lifetime

- Access tokens: 24 hours (configurable via env var)
- Refresh tokens: 90 days (configurable via env var)

---

## Token Validation

`src/lib/mcp-auth.ts` exports:

```ts
export interface McpAuthContext {
  workspaceId: string;
  userId: string;
  tokenId: string;
}

export async function validateMcpToken(token: string): Promise<McpAuthContext | null>
```

The function queries the `oauthAccessToken` table by the unique `accessToken` field (plain string — direct equality lookup, no hashing), checks `accessTokenExpiresAt`, resolves `workspaceId` from the user record, and returns the auth context or `null`. Results cache for 5 minutes via `CacheManager` with tag-based invalidation on revocation.

Both MCP transports call `validateMcpToken`. The `ToolContext` interface updates `apiKeyId` to `tokenId`. Tool handler _logic_ needs no changes — handlers reference only `workspaceId` and `userId` — but the type definitions in `apps/mcp/src/tools/types.ts` and `apps/mcp/src/auth.ts` must be updated.

---

## Database

### Remove

- `src/db/schema/sqlite/api-keys.ts` — deleted
- `apiKeys` references in `src/db/schema/sqlite/relations.ts` and `src/db/schema/sqlite/index.ts`

No migration is needed. The app is not live; the schema rebuilds from scratch via `bun run db:push`.

### Add (initial schema)

Three new Drizzle schema files added directly to `src/db/schema/sqlite/`, mirroring better-auth's `oidcProvider` schema:

| File | Model | Purpose |
|---|---|---|
| `oauth-applications.ts` | `oauthApplication` | Registered MCP clients |
| `oauth-access-tokens.ts` | `oauthAccessToken` | Access + refresh tokens (combined) |
| `oauth-consents.ts` | `oauthConsent` | Per-user per-client consent records |

Authorization codes are stored ephemerally in secondary storage (Redis/memory), not in the database — no schema file needed for them.

The `oauthAccessToken` table combines access and refresh tokens in a single row with `accessToken`, `refreshToken`, `accessTokenExpiresAt`, and `refreshTokenExpiresAt` fields.

---

## UI

### Security Page

Remove:
- `SecurityApiKeysCard.astro`
- `GenerateApiKeyModal.astro`
- `MCPSetupInstructionsModal.astro`
- `src/components/partials/SecurityApiKeysListPartial.astro`

Add:
- `SecurityConnectedAppsCard.astro` — lists OAuth clients the user has authorized, with authorized date, last used, and a Revoke button per entry.

### Consent Screen (`src/pages/oauth/authorize.astro`)

better-auth redirects to this page when an MCP client initiates an OAuth flow. The URL contains a `consent_code` query parameter from the plugin.

The page shows:
- Which application is requesting access
- What access it will have (hardcoded list matching the `mcp` scope)
- Approve and Deny actions

On approval, the page POSTs `{ accept: true, consent_code }` to `POST /api/auth/oauth2/consent`. The plugin issues an authorization code and redirects to the client's redirect URI. On denial, the page POSTs `{ accept: false, consent_code }` and the plugin redirects with `error=access_denied`.

### Token Display Page (`src/pages/oauth/display-token.astro`)

For stdio clients that cannot intercept OAuth redirects automatically, each pre-seeded native client registers `{base_url}/oauth/display-token` as its redirect URI. After the user approves on the consent screen, the authorization code arrives at this page. The page exchanges the code for an access token at `POST /api/auth/oauth2/token` using the client credentials, then displays the token once for the user to copy. No token is stored in the page or URL.

### User Flow (stdio clients)

1. User visits Security → Connected Apps.
2. Clicks "Connect" next to a pre-registered client (e.g., Claude Desktop).
3. Allowealth redirects to the consent screen at `/api/auth/oauth2/authorize?client_id=mcp-claude-desktop&redirect_uri={base_url}/oauth/display-token&...`.
4. User approves on the consent screen.
5. Plugin redirects to `/oauth/display-token?code=...`; the page exchanges the code and displays the access token.
6. User copies the token into the client config as `ALLOWEALTH_ACCESS_TOKEN`.

`MCPSetupInstructionsModal` is dropped. The Connected Apps card includes inline setup instructions for each client type.

---

## Removal Checklist

| Item | Action |
|---|---|
| `src/services/api-key.service.ts` | Delete |
| `src/services/api-key.service.test.ts` | Delete |
| `src/services/api-key.service.cache.test.ts` | Delete |
| `src/db/schema/sqlite/api-keys.ts` | Delete |
| `src/pages/api/user/api-keys.ts` | Delete (replaced by OAuth revoke endpoint) |
| `SecurityApiKeysCard.astro` | Delete |
| `GenerateApiKeyModal.astro` | Delete |
| `MCPSetupInstructionsModal.astro` | Delete |
| `src/components/partials/SecurityApiKeysListPartial.astro` | Delete |
| `src/services/index.ts` | Remove `ApiKeyService` import, instantiation, and re-export |
| `src/cli/commands/admin.ts` | Remove `create-api-key` subcommand |
| `src/db/empty.ts` | Remove `schema.apiKeys`; add new OAuth tables |
| `src/lib/cache/tags.ts` | Remove `API_KEYS` tag |
| `src/lib/cache/keys.ts` | Remove `apiKey()` helper |
| `src/db/schema/sqlite/index.ts` | Remove `export * from './api-keys'`; add OAuth table exports |
| `src/db/setup.sql` | Remove `api_keys` DDL; add OAuth table DDL |
| `apps/mcp/src/auth.ts` | Rewrite: read `ALLOWEALTH_ACCESS_TOKEN`, call `validateMcpToken` |
| `apps/mcp/src/tools/types.ts` | Rename `apiKeyId` → `tokenId` in `AuthContext` |
| `src/pages/api/mcp.ts` | Replace `ApiKeyService.validateCached` with `validateMcpToken` |
| `COMMANDS.md` | Remove `create-api-key` entry; add OAuth/MCP connect commands |
| `README.md` | Update MCP setup section to describe OAuth flow |
| `apps/mcp/README.md` | Update setup instructions for OAuth flow |
| `apps/docs/src/content/docs/admins/onboarding.md` | Remove `create-api-key` reference |
| `docs/architecture/010-mcp-server-architecture.md` | Update to reflect OAuth |

---

## Implementation Order

Following the project's UI → Service → API → CLI → Seeder convention:

1. **Directory move** — `mcp-server/` → `apps/mcp/`; update `tsconfig.json` path aliases
2. **Schema** — Add OAuth tables (`oauth-applications.ts`, `oauth-access-tokens.ts`, `oauth-consents.ts`); remove `api-keys.ts`; run `db:push`
3. **Service** — Add `src/lib/mcp-auth.ts` (`validateMcpToken`)
4. **Plugin** — Add `mcp` plugin to `src/lib/auth/server.ts` with `loginPage` and `trustedOrigins` including `*.allowealth.io`
5. **Seeder** — Upsert well-known clients into `oauthApplication` in `db:seed`
6. **HTTP endpoint** — Update `src/pages/api/mcp.ts` to use `validateMcpToken`
7. **Stdio entry** — Rewrite `apps/mcp/src/auth.ts` for OAuth token
8. **UI** — Consent screen (`src/pages/oauth/authorize.astro`) + token display page (`src/pages/oauth/display-token.astro`) + `SecurityConnectedAppsCard.astro`; remove API key UI
9. **Cleanup** — Delete `ApiKeyService`, `api-keys.ts`, `api-keys.ts` API route, dead cache keys, CLI subcommand, update `src/services/index.ts`, `src/db/empty.ts`
10. **Docs** — Update ADR 010
