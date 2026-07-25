---
paths:
  - 'src/middleware/**/*.ts'
  - 'src/lib/**/*.ts'
  - 'astro.config.ts'
---

# Deployment

The SSR app builds with the `@astrojs/node` adapter (`mode: 'standalone'`) and
runs on **Bun**. There is a single build target: `bun run build`.

Cloudflare **Pages** still hosts the two static sites — `apps/docs` and
`apps/site`. Each has its own `wrangler.toml` and its own `wrangler`
dependency, deployed via `bun run docs:deploy` / `bun run landing:deploy` and
the `deploy-docs-site.yml` / `deploy-site.yml` workflows. Cloudflare
**Turnstile** is also still in use for CAPTCHA. Neither is affected by the
removal of the Workers SSR target.

## Password Hashing

Passwords are hashed with **Argon2id** via `Bun.password` — native and
memory-hard. The facade lives in `src/lib/auth/password.ts`.

```typescript
// ✅ Correct: use the facade
import { hashPassword, verifyPassword } from '@/lib/auth/password';

// ❌ Wrong: native addons or runtime-WASM crypto libraries
import { hash, verify } from '@node-rs/argon2';
import { argon2id } from 'hash-wasm';
```

**Rules:**

- ✅ **Use the `hashPassword`/`verifyPassword` facade** — never call the underlying hasher classes directly outside `password.ts`
- ❌ **Add a second hashing algorithm without a migration path** — existing hashes must stay verifiable

## Environment Variables

```typescript
// ✅ Correct: Use getEnv() for runtime secrets
import { getEnv } from '@/lib/env';

const dbUrl = getEnv('DATABASE_URL');
const apiKey = getEnv('API_KEY');

// ❌ Wrong: import.meta.env for runtime secrets (build-time only)
const dbUrl = import.meta.env.DATABASE_URL;
```

**Rules:**

- ✅ **Use `getEnv()` for runtime env vars** — it checks `process.env` then falls back to `import.meta.env`
- ❌ **Mutate `import.meta.env` directly in tests** — use `setTestEnv()` to match the production code path

### Safe import.meta.env Usage

```typescript
// ✅ Safe: Vite built-in (inlined at build time)
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

// ❌ Unsafe: Runtime secret (needs getEnv())
const dbUrl = import.meta.env.DATABASE_URL;
```

## Database Connections

```typescript
// ✅ Correct: go through getDb()
import { getDb } from '@/db';

const db = getDb(); // bun:sqlite, pragmas applied once per connection
```

**Rules:**

- ✅ **Go through `getDb()`** — it applies the WAL and cache pragmas
- ❌ **Add external PostgreSQL connection layers** — the app is SQLite-only

## Serialization

```typescript
// ✅ Correct: Serialize Date objects explicitly
return {
  budget: {
    ...budget,
    createdAt: budget.createdAt.toISOString(),
  },
};
```

**Rules:**

- ✅ **Serialize Date objects explicitly when returning from services** — keeps API responses stable

## Caching

```typescript
// ✅ Correct: Use CacheManager with tag-based invalidation
import { getCacheManager } from '@/lib/cache';

const cache = getCacheManager();

await cache.set('budget:123', data, {
  ttl: 300,
  tags: ['budget:123', 'user:456'],
});

await cache.invalidateTags(['budget:123']);
```

**Rules:**

- ✅ **Use CacheManager + Tag-based drivers** — Upstash (prod), Memory (dev)
- ✅ **Handle cache errors gracefully** — fall back to database queries
- ✅ **Use tag-based cache invalidation** (`user:123`, `budget:123`) with configurable TTLs

## Logging

```typescript
// ✅ Correct: Structured consola loggers
import { logger } from '@/lib/logger';

logger.info('Budget created', { budgetId, userId });
```

**Rules:**

- ✅ **Use structured consola loggers** — not `console.log`

## Content Security Policy

`astro.config.ts` sets `security: { csp: true }` (hash-based), but
`src/middleware/security-headers.ts` overwrites the response header with a
nonce-based policy, so that middleware is the runtime source of truth today.
See `TODO(ALL-62)` in that file for the migration path.

Static Pages output needs its own static CSP strategy — it cannot depend on
per-request nonces.

**Rules:**

- ✅ **Keep nonce middleware until the SSR app no longer needs it** — response headers from middleware take precedence
- ❌ **Use `script-src 'unsafe-inline'` for CSP** — prefer hashes or nonces

## Database URL

```typescript
// ❌ Wrong: silent sqlite fallback in prod config
const dbUrl = getEnv('DATABASE_URL') || 'sqlite:local.db';

// ✅ Correct: fail fast if missing
const dbUrl = requireEnv('DATABASE_URL');
```

**Rules:**

- ❌ **Add a silent DATABASE_URL fallback for production** — fail fast instead

## Cloudflare Pages (apps/docs, apps/site)

```toml
# ✅ Correct: Bare domain for custom domains
[[routes]]
pattern = "example.io"
custom_domain = true

# ❌ Wrong: Wildcards or paths in custom domain routes
[[routes]]
pattern = "example.io/*"
custom_domain = true
```

**Rules:**

- ❌ **Use wildcards (`/*`) or paths in Custom Domain routes** — Custom Domains only accept bare domain names
- ✅ **Use bare domain in `custom_domain` routes**
- ✅ **Keep `apps/docs` and `apps/site` wrangler config and deploy scripts intact** — they are the deploy path for the two live static sites

## Deployment Checklist

Before deploying:

- [ ] Audit `import.meta.env` usage (use `getEnv()` for runtime secrets)
- [ ] Verify environment variables are set in the target environment
- [ ] Check CSP headers are correct
- [ ] Test cache fallback behavior
