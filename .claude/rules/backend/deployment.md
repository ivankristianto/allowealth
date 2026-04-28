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

- ❌ `bun:sqlite` → Only use in API routes, CLI, or non-middleware contexts
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
// ✅ Middleware: Workers-compatible imports only (no SQLite drivers)
// Database middleware skips SQLite lifecycle management

// ✅ API routes: Can use Bun-specific APIs (local dev context)
import { Database } from 'bun:sqlite'; // OK in API routes

// ✅ CLI scripts: Can use Bun-specific APIs
import { $ } from 'bun';
```

## Password Hashing

The factory in `src/lib/auth/password-hasher.ts` selects per runtime:

- **Bun** (Docker, local dev): Argon2id via `Bun.password` — native, memory-hard
- **Cloudflare Workers / Node**: PBKDF2-SHA256 via Web Crypto — runs in the
  Workers C++ runtime, no JS-CPU pressure

Hashes do not migrate between deployment targets. Argon2id cannot run on
Workers: `WebAssembly.compile()` is blocked by the embedder, and pure-JS
Argon2id exceeds the 10ms per-request CPU budget. An Argon2id hash on a
Workers deployment indicates a misconfigured seed; the facade logs a
warning and returns false rather than failing silently.

```typescript
// ✅ Correct: use the facade — runtime-appropriate algorithm is automatic
import { hashPassword, verifyPassword } from '@/lib/auth/password';

// ❌ Wrong: native addons or runtime-WASM crypto libraries
import { hash, verify } from '@node-rs/argon2'; // native, Workers-incompatible
import { argon2id } from 'hash-wasm'; // runtime WASM compile, blocked on Workers
```

### Seeding for a Workers-targeted DB

The seeder runs on Bun, so by default it would produce Argon2id hashes
that Workers cannot verify. Force PBKDF2 hashing with the
`PASSWORD_HASHER` env var:

```bash
# Default: Argon2id (for Docker / Bun deployments)
bun run aw seed:demo

# Workers-targeted: PBKDF2
PASSWORD_HASHER=pbkdf2 bun run aw seed:demo
```

`PASSWORD_HASHER=argon2id` is the explicit form of the default and errors
on non-Bun runtimes. Unset means runtime detection.

**Rules:**

- ✅ **Use the `hashPassword`/`verifyPassword` facade** — never call the underlying hasher classes directly outside `password.ts`
- ✅ **Set `PASSWORD_HASHER=pbkdf2` when seeding for a Workers DB** — otherwise the Argon2id hashes the seeder writes will not verify on Workers
- ❌ **Use `oslo/argon2`, `hash-wasm`, `@noble/hashes/argon2`, or any other runtime-WASM crypto on Workers** — they all fail with `Wasm code generation disallowed by embedder` or hit the per-request CPU limit

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
- ✅ **Use D1 for Workers database access** - native binding, no external TCP layer
- ❌ **Add external PostgreSQL connection layers to Workers** - production uses D1

## Serialization

```typescript
// ✅ Correct: Serialize Date objects explicitly
return {
  budget: {
    ...budget,
    createdAt: budget.createdAt.toISOString(),
  },
};

// ❌ Wrong: Return raw Date objects without serialization
return { budget }; // Date objects can't JSON-serialize in Workers
```

**Rules:**

- ✅ **Serialize Date objects explicitly when returning from services** - keep cross-runtime responses stable

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

Astro 6 can generate hash-based CSP for SSR pages with `security: { csp: true }`. This repo still has a nonce middleware in `src/middleware/security-headers.ts` that overwrites the response header, so that middleware is the runtime source of truth today. Static Pages output still needs its own static CSP strategy; it cannot depend on per-request nonces.

```typescript
// Astro 6 native hash-based CSP (config-driven)
'script-src': ["'self'", "'sha256-...'"],

// Current runtime policy (middleware wins)
'script-src': ["'self'", `'nonce-${nonce}'`],
```

**Rules:**

- ✅ **Use `security: { csp: true }` for Astro 6 SSR pages** - it hashes Astro-generated scripts and styles
- ✅ **Keep nonce middleware until the SSR app no longer needs it** - response headers from middleware take precedence
- ❌ **Use `script-src 'unsafe-inline'` for CSP** - prefer hashes or nonces, not unsafe inline

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

## Cloudflare D1

```typescript
// ✅ Correct: Static import for D1 driver
import { drizzle } from 'drizzle-orm/d1';

// ✅ Correct: Dedicated binding storage
let d1Binding: D1Database | null = null;
export function setD1Binding(binding: D1Database) {
  d1Binding = binding;
}
export function getD1Binding() {
  return d1Binding;
}

// ❌ Wrong: Smuggle through env bag
setRuntimeEnv({ D1: binding }); // D1 is an object, env expects strings
```

**Rules:**

- ✅ **Use static import for `drizzle-orm/d1`** - `drizzle()` is synchronous, dynamic `import()` adds unnecessary async complexity
- ❌ **Use async proxy patterns to bridge sync/async DB interfaces** - Proxy that wraps every property as an async function breaks `db.query.table.findFirst()` chains
- ✅ **Store D1 binding in dedicated module-level variable** - not in the string-typed env API (`Record<string, string>`)
- ❌ **Smuggle objects through `setRuntimeEnv()` env bag** - D1 binding is an object, env API expects strings; use dedicated `setD1Binding()`/`getD1Binding()`
- ✅ **Enable transactions for D1 in `runTransaction()`** - D1 runs in multi-isolate Workers, not single-writer local SQLite
- ❌ **Assume D1 has same concurrency model as local SQLite** - local SQLite has single-writer WAL; D1 is multi-isolate, needs transactions
- ✅ **Call `prepareForRequest()` for D1 in database middleware** - reset `dbInstance` per-request even though D1 has no TCP connections
- ✅ **Suppress `DATABASE_URL` warning when D1 is enabled** - D1 doesn't use DATABASE_URL; check `isD1` before calling `getDatabaseUrl()`

## Wrangler Configuration

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

- ❌ **Use wildcards (`/*`) or paths in Custom Domain routes** - Custom Domains only accept bare domain names
- ✅ **Use bare domain in `custom_domain` routes**

## CI/CD — Generated wrangler.toml

`wrangler.toml` is **gitignored** (contains user-specific config like `database_id`). The deploy workflow generates it at runtime from GitHub secrets and variables.

### Required GitHub Secrets

| Secret                 | Description                 |
| ---------------------- | --------------------------- |
| `CLOUDFLARE_API_TOKEN` | Wrangler deploy token       |
| `D1_DATABASE_ID`       | Cloudflare D1 database UUID |

### Required GitHub Variables

| Variable        | Default                          | Description                                 |
| --------------- | -------------------------------- | ------------------------------------------- |
| `PUBLIC_URL`    | `https://allowealth.workers.dev` | Public base URL                             |
| `CUSTOM_DOMAIN` | _(empty)_                        | Custom domain (optional, adds `[[routes]]`) |

### Generated Structure

```toml
name = "allowealth"
main = "dist/_worker.js/index.js"
compatibility_date = "2026-02-01"
compatibility_flags = ["nodejs_compat", "disable_nodejs_process_v2"]

[assets]
directory = "./dist"
binding = "ASSETS"

[vars]
NODE_ENV = "production"
PUBLIC_URL = "https://your-domain.io"
SIGNUP_MODE = "invite_only"
CACHE_DRIVER = "upstash"
# ... other vars

[[d1_databases]]
binding = "DB"
database_name = "allowealth-db"
database_id = "<D1_DATABASE_ID secret>"

# Added only when CUSTOM_DOMAIN variable is set:
routes = [{ pattern = "your-domain.io", custom_domain = true }]
```

**Rules:**

- ✅ **Generate `wrangler.toml` in CI from secrets/variables** - never commit it; it's gitignored to allow open-source forkers to configure their own deployment
- ✅ **Use `D1_DATABASE_ID` as a GitHub secret** - UUID is user-specific and must not be in source
- ✅ **Use `PUBLIC_URL` and `CUSTOM_DOMAIN` as GitHub variables** - not secrets, safe to be non-sensitive
- ✅ **Conditionally append `[[routes]]` only when `CUSTOM_DOMAIN` is set** - workers.dev subdomain needs no routes block
- ❌ **Commit `wrangler.toml` to the repo** - it's gitignored by design

## Deployment Checklist

Before deploying to Workers:

- [ ] Audit for `bun:` imports in middleware-imported code
- [ ] Replace native addons with Workers-compatible alternatives
- [ ] Audit `import.meta.env` usage (use `getEnv()` for runtime secrets)
- [ ] Test with `wrangler dev` locally
- [ ] Verify environment variables are set in Workers dashboard
- [ ] Check CSP headers are correct
- [ ] Verify D1 binding works
- [ ] Test cache fallback behavior
