# ALL-71 Phase A Design: Security Hardening for MCP, CSV Exports, and Dev Reset Endpoint

## Summary

This spec defines Phase A remediations for ticket `ALL-71` focused on immediate risk reduction:

1. Block MCP access for soft-deleted users.
2. Revoke MCP OAuth tokens when a user is deactivated.
3. Add strict abuse controls to `/api/mcp` (rate limit + request size bound).
4. Neutralize CSV formula injection in transaction and budget exports.
5. Restrict the DEV-only rate-limit reset endpoint to local development hosts.

This phase intentionally excludes token-at-rest migration and keeps changes surgical in existing code paths.

## Scope

### In Scope

- `src/lib/mcp-auth.ts`
- `src/pages/api/mcp.ts`
- `src/services/transaction.service.ts`
- `src/services/budget.service.ts`
- `src/services/super-admin.service.ts` and/or deactivation call path
- `src/pages/api/auth/e2e-reset-rate-limits.ts`
- Unit/API tests for each behavior

### Out of Scope

- Encrypting or hashing OAuth access/refresh tokens at rest.
- Reworking global auth architecture.
- Broad refactors beyond required security controls.

## Decisions Captured From Brainstorming

- MCP rate limit: `60 requests/minute` per token (strict).
- MCP request body cap: `64 KB` max.
- CSV hardening strategy: prefix dangerous formula-leading values with `'`.
- DEV reset endpoint allowlist: loopback hosts plus `*.local`.
- Deactivation behavior: revoke MCP tokens on deactivation.

## Design

### 1) MCP Auth: Deny Soft-Deleted Users

Current behavior validates token existence/expiry and workspace membership but does not reject soft-deleted users.

#### Change

Update `validateMcpToken()` lookup path in `src/lib/mcp-auth.ts` to include user status:

- Token is valid only if `users.deleted_at IS NULL`.
- If `deleted_at` is set, return `null` exactly as other invalid-token cases.

#### Rationale

Returning `null` preserves current public behavior (`401`) and prevents deactivated users from accessing `/api/mcp` with previously issued tokens.

### 2) User Deactivation: Revoke MCP Tokens Immediately

Current deactivation sets `users.deleted_at` but does not revoke existing OAuth MCP tokens.

#### Change

In the user deactivation flow (service-owned path):

- Query OAuth access tokens owned by deactivated user.
- Delete those token rows.
- Invalidate related MCP token cache tags for each token id (`mcp-token:<tokenId>`).
- Optionally invalidate `MCP_TOKENS` tag as defense-in-depth when bulk deleting.

#### Rationale

This closes the time window where cached decisions or still-valid token rows could continue to grant access.

### 3) `/api/mcp` Abuse Controls

Current `/api/mcp` endpoint has no explicit endpoint-specific rate limit or body-size guard.

#### Change

Apply strict, endpoint-local guards in `src/pages/api/mcp.ts`:

- Rate limit: `60 req/min` per token identity.
- Request size cap: `64 KB`.

#### Rate Limit Details

- Key basis: bearer-token hash + endpoint path.
- On exceed: return `429` with standard rate-limit headers.

#### Request Size Details

- Early reject with `413` when `Content-Length` is present and exceeds `65536` bytes.
- If `Content-Length` is absent or unreliable, enforce the same cap using parsed payload size fallback (serialized byte length).
- Keep existing JSON-RPC validation semantics for malformed JSON or missing method.

#### Rationale

This limits brute-force/abuse throughput and constrains parser/resource load from oversized payloads.

### 4) CSV Formula Injection Hardening

Current CSV export serialization escapes commas/quotes/newlines but does not neutralize spreadsheet formula injection prefixes.

#### Change

Before CSV quoting/escaping in both export paths:

- `src/services/transaction.service.ts` `exportToCSV()`
- `src/services/budget.service.ts` `exportToCSV()`

Apply a shared normalization rule:

- For any cell value whose first non-empty character is `=`, `+`, `-`, or `@`, prefix with `'`.

Then run existing quote/newline/comma escaping.

#### Rationale

Spreadsheet apps treat these prefixes as formulas. Prefixing with `'` neutralizes execution while preserving visible value and export usability.

### 5) DEV Reset Endpoint Host Restriction

Current `POST /api/auth/e2e-reset-rate-limits` is guarded by `import.meta.env.DEV` only.

#### Change

Keep the DEV check and add request-host allowlist:

Allowed hosts:

- `localhost`
- `127.0.0.1`
- `::1`
- Any hostname ending in `.local`

All other hosts are denied (`403` in DEV). Non-DEV remains unavailable (`404`).

#### Rationale

Prevents accidental exposure/abuse when DEV builds run on non-local network contexts.

## Data Flow and Error Behavior

### `/api/mcp`

- Missing bearer token -> `401`.
- Invalid/expired/deleted-user token -> `401`.
- Rate-limit violation -> `429` + rate-limit headers.
- Body too large -> `413`.
- Invalid JSON -> `400`.
- Missing JSON-RPC method -> `400`.

### User Deactivation

- Deactivate user (`deleted_at` set).
- Revoke MCP OAuth tokens for that user.
- Invalidate token cache entries.
- Subsequent `/api/mcp` calls fail auth.

### CSV Exports

- Export format unchanged except dangerous formula-leading cells are prefixed with `'`.
- Existing CSV escaping behavior remains.

## Testing Strategy

### Unit Tests

- `src/lib/mcp-auth.test.ts`
  - Add case: valid token + `deleted_at` user -> auth returns `null`.

- CSV export tests
  - Add/extend tests for transaction and budget export:
    - values starting with `= + - @` are prefixed with `'`.
    - quoting/escaping still works for commas, quotes, newlines.

- Deactivation service/API tests
  - Confirm token rows removed for deactivated user.
  - Confirm MCP cache invalidation calls happen.

- `e2e-reset-rate-limits` route tests
  - DEV + allowed hosts succeed.
  - DEV + disallowed host denied.
  - non-DEV returns `404`.

### API Tests

- `/api/mcp`
  - Returns `429` when exceeding `60/min` for same token.
  - Returns `413` for payloads > `64 KB`.
  - Continues to serve valid JSON-RPC calls under limits.

## Risks and Mitigations

- Risk: overblocking local dev reset endpoint.
  - Mitigation: explicit allowlist includes loopback and `.local` hostnames used in this repo.

- Risk: CSV behavior differences for consumers expecting raw leading symbols.
  - Mitigation: only dangerous formula-leading values are changed; behavior is documented in tests.

- Risk: deactivation flow partial failure (user deactivated, token cleanup error).
  - Mitigation: perform revocation in same service flow with explicit error handling and test coverage.

## Acceptance Criteria

- Soft-deleted users cannot authenticate to `/api/mcp`.
- Deactivating a user revokes their MCP OAuth tokens and invalidates MCP token cache entries.
- `/api/mcp` enforces `60 req/min` per token and `64 KB` body-size maximum.
- CSV exports neutralize formula-leading values via `'` prefix.
- DEV reset endpoint allows only loopback and `*.local`, and remains unavailable outside DEV.

