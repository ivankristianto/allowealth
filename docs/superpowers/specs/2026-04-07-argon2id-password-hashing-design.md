# Argon2id Password Hashing for Bun Runtime

**Linear:** ALL-69
**Status:** Approved
**Date:** 2026-04-07

## Summary

Add Argon2id password hashing via `Bun.password` for Bun runtime environments (Docker, local dev). Keep PBKDF2-SHA256 as the fallback for Cloudflare Workers. Use a Strategy pattern to select the strongest available algorithm per deployment target.

## Motivation

The app uses PBKDF2-SHA256 (100K iterations, Web Crypto API) across all runtimes. PBKDF2 is secure and NIST-approved, but it is not memory-hard -- GPU attackers can run many parallel attempts cheaply. Argon2id (Password Hashing Competition winner, OWASP recommended) is both memory-hard and side-channel resistant.

Bun provides native Argon2id via `Bun.password.hash()` / `Bun.password.verify()` -- hardware-accelerated with zero dependencies. Docker deployments on Bun should use the strongest available algorithm.

## Architecture

### Strategy Pattern with Hasher Interface

```
src/lib/auth/
├── password.ts            # Public API (thin facade, same exports)
├── password-hasher.ts     # PasswordHasher interface + factory
├── password-argon2id.ts   # Argon2idHasher implementation
├── password-pbkdf2.ts     # Pbkdf2Hasher (extracted from current password.ts)
```

### Interface

```ts
interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}
```

### Factory

`createPasswordHasher()` in `password-hasher.ts` detects the runtime once at module load:

```ts
const isBunRuntime = typeof globalThis.Bun !== 'undefined';
```

Returns `Argon2idHasher` on Bun, `Pbkdf2Hasher` on Workers. The result is cached as a module-level singleton.

## Hashing Behavior

### Argon2idHasher

Wraps `Bun.password.hash(password)` with Bun defaults:
- Algorithm: Argon2id
- Memory: 65536 KiB (64 MiB)
- Time cost: 2 iterations
- Parallelism: 1

Output format (PHC): `$argon2id$v=19$m=65536,t=2,p=1$<salt>$<hash>`

Verification delegates to `Bun.password.verify(password, hash)`, which handles constant-time comparison internally.

### Pbkdf2Hasher

Extracted from current `password.ts` with no behavioral changes:
- Algorithm: PBKDF2-SHA256 via Web Crypto API
- Iterations: 100,000
- Salt: 16 bytes (128 bits)
- Hash: 32 bytes (256 bits)
- Manual constant-time XOR comparison

Output format: `$pbkdf2-sha256$iterations$base64salt$base64hash`

Helper functions (`bufferToBase64`, `base64ToBuffer`, `generateSalt`, `deriveKey`) move into this file as private functions.

## Verification Dispatch

`verifyPassword()` in `password.ts` inspects the hash prefix to select the correct verifier:

| Hash prefix | Verifier |
|---|---|
| `$argon2id$` | `Argon2idHasher.verify()` (requires Bun) |
| `$pbkdf2-sha256$` | `Pbkdf2Hasher.verify()` (works everywhere) |

This means:
- **Bun runtime:** New passwords get Argon2id. Verification handles both formats.
- **Workers runtime:** New passwords get PBKDF2. Verification handles only PBKDF2.

### Edge case: Argon2id hash on Workers

If an Argon2id-hashed password reaches a Workers deployment, `verifyPassword()` sees the `$argon2id$` prefix and returns `false`. This is acceptable: the ticket scopes Workers as PBKDF2-only, and a single deployment runs one runtime.

## Public API

`password.ts` continues to export the same two functions with identical signatures:

```ts
export async function hashPassword(password: string): Promise<string>;
export async function verifyPassword(password: string, hash: string): Promise<boolean>;
```

Password length validation (12-character minimum) stays in `hashPassword()` before delegation. The hashers do not re-validate.

## Consumer Impact

Zero import changes. All consumers call `hashPassword()` / `verifyPassword()` from `@/lib/auth/password.ts`:

- `src/lib/auth/server.ts` -- Better Auth config
- `src/services/user.service.ts` -- password change flow
- `src/pages/api/installer/setup.ts` -- first-run setup
- `src/db/seed/domains/users.ts` -- seeder
- `src/db/seed/domains/stress.ts` -- stress seed
- `src/db/seed/bulk.ts` -- bulk seed

Seeders run on Bun, so they automatically use Argon2id. Password change re-hashes with the runtime-appropriate algorithm. Both acceptance criteria are satisfied with no code changes to consumers.

## Testing

### Unit tests per hasher

- `password-argon2id.test.ts` -- hash produces `$argon2id$` prefix, verify round-trips, rejects wrong passwords.
- `password-pbkdf2.test.ts` -- hash produces `$pbkdf2-sha256$` prefix, verify round-trips, constant-time comparison.

### Integration tests for the public API

- `password.test.ts` -- `hashPassword()` produces expected format for current runtime. `verifyPassword()` handles both hash formats (hardcoded PBKDF2 hash + freshly generated Argon2id hash). Edge cases: empty password, short password, malformed hash, unknown prefix returns `false`.

### No E2E changes

The auth flow is unchanged from the user's perspective. Existing Playwright tests cover login and password change implicitly.

## ADR Update

Update `.claude/CLAUDE.md` quick reference from:

> **Password Hashing**: PBKDF2-SHA256 (Web Crypto API) -- Not oslo/argon2 (native addon) -- Reason: Cross-runtime compatibility

To:

> **Password Hashing**: Argon2id (Bun.password, Bun runtime) / PBKDF2-SHA256 (Web Crypto API, Workers fallback) -- Not oslo/argon2 (native addon) -- Reason: Strongest available KDF per deployment target

## Out of Scope

- Automatic re-hashing of existing passwords on login (follow-up)
- Migrating Cloudflare Workers to Argon2id (blocked by Web Crypto API)
- WASM-based Argon2id on Workers (likely same CPU limit as scrypt)
- Configurable Argon2id parameters (Bun defaults exceed OWASP minimum)
