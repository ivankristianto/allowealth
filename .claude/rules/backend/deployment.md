---
paths:
  - 'src/middleware/**/*.ts'
  - 'src/lib/**/*.ts'
  - 'astro.config.mjs'
---

# Cloudflare Workers Deployment

The project deploys to **Cloudflare Workers** (primary) and **Bun** (local dev).

## Runtime Compatibility

Any code imported by middleware MUST be Workers-compatible.

### Forbidden in Middleware-Imported Code

- ❌ `bun:sqlite` → Use `better-sqlite3` or database abstraction layer
- ❌ `bun:` protocol imports → Only use in API routes, CLI, or non-middleware contexts
- ❌ Native addons (e.g., `@node-rs/argon2`) → Use Web APIs or Workers-compatible alternatives
- ❌ Node-specific APIs → Use cross-runtime alternatives

### Detection

```bash
# Check for Bun-specific imports
grep -r "bun:" src/ --exclude-dir=node_modules

# If results appear in middleware-imported files, REFACTOR
```

### Correct Patterns

```typescript
// ✅ Middleware: Workers-compatible imports only
import Database from 'better-sqlite3'; // Works in both runtimes

// ✅ API routes: Can use Bun-specific APIs (local dev context)
import { Database } from 'bun:sqlite'; // OK in API routes

// ✅ CLI scripts: Can use Bun-specific APIs
import { $ } from 'bun';
```

## Password Hashing

```typescript
// ✅ Correct: Web Crypto API (PBKDF2-SHA256)
import { hashPassword, verifyPassword } from '@/lib/auth/password';

// Uses Web Crypto API - works in all runtimes

// ❌ Wrong: Native addon
import { hash, verify } from '@node-rs/argon2'; // Native addon, Workers incompatible
import { hash } from 'oslo/password'; // Depends on native argon2
```

**Rules:**

- ✅ **Use Web Crypto API (PBKDF2-SHA256)** for password hashing - works in all runtimes
- ❌ **Use oslo/argon2 or native addons** - not Workers-compatible
- ✅ **Trace dependency chains when builds fail** - e.g., oslo → @node-rs/argon2 → native addon

## Environment Variables

```typescript
// ✅ Correct: Use getEnv() for runtime secrets
import { getEnv } from '@/lib/env';

const dbUrl = getEnv('DATABASE_URL');
const apiKey = getEnv('API_KEY');

// ❌ Wrong: import.meta.env (build-time only on Workers)
const dbUrl = import.meta.env.DATABASE_URL; // Undefined in Workers runtime
```

**Rules:**

- ✅ **Use `getEnv()` for ALL runtime env vars on Workers** - `import.meta.env` only has build-time inlined values
- ✅ **Audit ALL `import.meta.env` usages when deploying to Workers** - categorize as: Vite built-in (safe), CLI-only (safe), runtime secret (needs `getEnv()`)
- ✅ **Set `runtimeEnv` from middleware on first request** - Workers secrets aren't available at module load
- ❌ **Mutate `import.meta.env` directly in tests** - use `setTestEnv()` to match the production code path

### Safe import.meta.env Usage

```typescript
// ✅ Safe: Vite built-in (inlined at build time)
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

// ✅ Safe: CLI-only (not used in Workers runtime)
if (import.meta.main) {
  console.log(import.meta.env.NODE_ENV);
}

// ❌ Unsafe: Runtime secret (needs getEnv())
const dbUrl = import.meta.env.DATABASE_URL; // Use getEnv() instead
```

## Database Connections

```typescript
// ✅ Correct: Fresh connections per request in Workers
export async function onRequest(context) {
  const db = createConnection(getEnv('DATABASE_URL'));
  // Use db...
  await db.close();
}

// ❌ Wrong: Singleton connections in Workers
const db = createConnection(process.env.DATABASE_URL); // Doesn't work in Workers
```

**Rules:**

- ✅ **Create fresh DB connections per request in Workers** - no singletons in edge runtime
- ✅ **Use Hyperdrive for Workers database connections** - provides local proxy with 0 overhead
- ❌ **Use Supabase transaction pooler with Hyperdrive** - use direct connection (port 5432)

## Serialization

```typescript
// ✅ Correct: Serialize Date objects explicitly
return {
  budget: {
    ...budget,
    createdAt: budget.createdAt.toISOString(),
  },
};

// ❌ Wrong: Return raw PostgreSQL Date objects
return { budget }; // Date objects can't JSON-serialize in Workers
```

**Rules:**

- ✅ **Serialize Date objects explicitly when returning from services** - PostgreSQL Date objects can't JSON-serialize in Workers

## Caching

```typescript
// ✅ Correct: Use CacheManager with tag-based invalidation
import { getCacheManager } from '@/lib/cache';

const cache = getCacheManager();

// Set with tags
await cache.set('budget:123', data, {
  ttl: 300,
  tags: ['budget:123', 'user:456'],
});

// Invalidate by tag
await cache.invalidateTags(['budget:123']);

// ❌ Wrong: Direct Redis or local-only cache
const redis = new Redis(process.env.REDIS_URL); // Doesn't work in Workers
```

**Rules:**

- ✅ **Use CacheManager + Tag-based drivers** - Upstash (prod), Memory (dev)
- ✅ **Handle cache errors gracefully** - fall back to database queries
- ✅ **Use tag-based cache invalidation** (`user:123`, `budget:123`) with configurable TTLs

## Logging

```typescript
// ✅ Correct: Structured consola loggers
import { logger } from '@/lib/logger';

logger.info('Budget created', { budgetId, userId });
logger.error('Failed to save', { error: error.message });

// ❌ Wrong: console.log
console.log('Budget created:', budgetId); // Unstructured
```

**Rules:**

- ✅ **Use structured consola loggers** - JSON on Workers, pretty in dev

## Content Security Policy

```typescript
// ❌ Wrong: unsafe-inline
'script-src': ["'self'", "'unsafe-inline'"],

// ✅ Correct: Inject nonces into Astro-generated scripts
'script-src': ["'self'", `'nonce-${nonce}'`],
```

**Rules:**

- ❌ **Use `script-src 'unsafe-inline'` for CSP** - inject nonces into Astro-generated scripts

## Common Deployment Issues

### Fetch Counter

```typescript
// ❌ Wrong: Assume fetch counter captures all subrequests
const count = context.env.FETCH_COUNT; // TCP sockets bypass this

// ✅ Correct: Understand limitations
// TCP sockets via nodejs_compat bypass fetch wrappers
// Use application-level monitoring instead
```

**Rules:**

- ❌ **Assume fetch counter captures all subrequests** - TCP sockets via nodejs_compat bypass fetch wrappers

### Database URL

```typescript
// ❌ Wrong: Change to sqlite fallback in prod config
const dbUrl = getEnv('DATABASE_URL') || 'sqlite:local.db'; // Never fallback in prod

// ✅ Correct: Fail fast if missing
const dbUrl = getEnv('DATABASE_URL'); // Throws if missing
```

**Rules:**

- ❌ **Change DATABASE_URL to sqlite fallback in prod config** - fail fast instead

## Deployment Checklist

Before deploying to Workers:

- [ ] Audit for `bun:` imports in middleware-imported code
- [ ] Replace native addons with Workers-compatible alternatives
- [ ] Audit `import.meta.env` usage (use `getEnv()` for runtime secrets)
- [ ] Test with `wrangler dev` locally
- [ ] Verify environment variables are set in Workers dashboard
- [ ] Check CSP headers are correct
- [ ] Verify Hyperdrive connection works
- [ ] Test cache fallback behavior
