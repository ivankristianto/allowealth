# Logger Abstraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace ad-hoc `console.log/warn/error` calls with a structured logger that outputs JSON for Cloudflare Workers Logs, supports log levels, tagged contexts, and is cross-runtime compatible.

**Architecture:** A thin logger module (`src/lib/logger.ts`) wraps `consola/core` with a JSON reporter for production and pretty output for development. Each module creates a tagged child logger (e.g., `logger.withTag('database')`). The existing `[ServiceName]` bracket convention maps directly to consola tags. Cloudflare Workers Logs (native) captures all `console.*` output and auto-indexes JSON fields — no transport configuration needed. Also enable Workers Logs in `wrangler.toml` via `[observability]`.

**Tech Stack:** consola (UnJS), Cloudflare Workers Logs, Astro middleware

---

## Prerequisites (Manual — User Must Do)

1. **Enable Workers Logs** by adding `[observability]` to `wrangler.toml` (Task 1 handles this)
2. **Workers Paid plan** is already in use (required for Hyperdrive, already active)

---

### Task 1: Add consola Dependency and Enable Workers Logs

**Files:**

- Modify: `package.json`
- Modify: `wrangler.toml`

**Step 1: Install consola**

Run: `cd /Users/ivan/Works/AI/expenses && bun add consola`
Expected: consola added to dependencies in package.json

**Step 2: Enable Workers Logs observability**

Add to the end of `wrangler.toml`:

```toml
# Workers Logs — captures all console.* output, auto-indexes JSON fields
# https://developers.cloudflare.com/workers/observability/logs/workers-logs/
[observability]
enabled = true
head_sampling_rate = 1
```

**Step 3: Verify install**

Run: `cd /Users/ivan/Works/AI/expenses && bun run typecheck 2>&1 | tail -5`
Expected: No new errors

**Step 4: Commit**

```bash
git add package.json bun.lock wrangler.toml
git commit -m "feat: add consola logger dependency and enable Workers Logs"
```

---

### Task 2: Create Logger Module with Tests

**Files:**

- Create: `src/lib/logger.ts`
- Create: `src/lib/logger.test.ts`

**Step 1: Write the failing tests**

Create `src/lib/logger.test.ts`:

```typescript
import { describe, expect, test, beforeEach, afterEach, spyOn } from 'bun:test';

describe('logger', () => {
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let consoleWarnSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('createLogger returns logger with standard methods', async () => {
    const { createLogger } = await import('./logger');
    const log = createLogger('test');
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
    expect(typeof log.debug).toBe('function');
  });

  test('createLogger tag appears in output', async () => {
    const { createLogger } = await import('./logger');
    const log = createLogger('database');
    log.info('connection established');
    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls[0]?.[0];
    // Output should contain the tag
    expect(output).toContain('database');
    expect(output).toContain('connection established');
  });

  test('error level calls console.error', async () => {
    const { createLogger } = await import('./logger');
    const log = createLogger('auth');
    log.error('login failed');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  test('warn level calls console.warn', async () => {
    const { createLogger } = await import('./logger');
    const log = createLogger('cache');
    log.warn('fallback to memory');
    expect(consoleWarnSpy).toHaveBeenCalled();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/ivan/Works/AI/expenses && bun test src/lib/logger.test.ts`
Expected: FAIL — `./logger` module doesn't exist

**Step 3: Create the logger module**

Create `src/lib/logger.ts`:

```typescript
/**
 * Structured Logger
 *
 * Wraps consola to provide tagged, leveled logging that outputs
 * structured JSON in production (for Cloudflare Workers Logs)
 * and pretty-printed output in development.
 *
 * Usage:
 *   import { createLogger } from '@/lib/logger';
 *   const log = createLogger('database');
 *   log.info('connection established');
 *   log.error('query failed', error);
 *
 * Workers Logs automatically captures console.* output and
 * indexes JSON fields for querying in the Cloudflare dashboard.
 */

import { createConsola, type LogObject } from 'consola/core';

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development';

/**
 * JSON reporter for production — outputs structured JSON that
 * Cloudflare Workers Logs auto-indexes for querying.
 */
const jsonReporter = {
  log(logObj: LogObject) {
    const entry: Record<string, unknown> = {
      level: logObj.type,
      tag: logObj.tag || undefined,
      message: logObj.args.map(String).join(' '),
      timestamp: new Date().toISOString(),
    };

    // Clean undefined values
    Object.keys(entry).forEach((k) => entry[k] === undefined && delete entry[k]);

    const json = JSON.stringify(entry);

    // Route to appropriate console method so Workers Logs captures severity
    switch (logObj.type) {
      case 'error':
      case 'fatal':
        console.error(json);
        break;
      case 'warn':
        console.warn(json);
        break;
      default:
        console.log(json);
    }
  },
};

/**
 * Pretty reporter for development — human-readable bracket-prefixed output.
 * Matches the existing [ServiceName] convention used across the codebase.
 */
const prettyReporter = {
  log(logObj: LogObject) {
    const prefix = logObj.tag ? `[${logObj.tag}]` : '';
    const message = logObj.args.map(String).join(' ');
    const output = prefix ? `${prefix} ${message}` : message;

    switch (logObj.type) {
      case 'error':
      case 'fatal':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
      case 'trace':
        console.log(output);
        break;
      default:
        console.log(output);
    }
  },
};

/**
 * Base consola instance with environment-appropriate reporter.
 */
const baseLogger = createConsola({
  reporters: [isDev ? prettyReporter : jsonReporter],
  level: isDev ? 4 : 3, // debug in dev, info in prod
});

/**
 * Create a tagged logger for a specific module/service.
 *
 * @param tag - Module identifier (e.g., 'database', 'auth', 'cache')
 * @returns A consola instance with the tag set
 *
 * @example
 * const log = createLogger('database');
 * log.info('dialect=postgresql hyperdrive=true');
 * log.error('connection failed', error);
 */
export function createLogger(tag: string) {
  return baseLogger.withTag(tag);
}

/**
 * Root logger instance (no tag) for one-off logging.
 * Prefer createLogger('tag') for module-specific logging.
 */
export const logger = baseLogger;
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/ivan/Works/AI/expenses && bun test src/lib/logger.test.ts`
Expected: ALL PASS (4 tests)

**Step 5: Commit**

```bash
git add src/lib/logger.ts src/lib/logger.test.ts
git commit -m "feat: add structured logger module with consola"
```

---

### Task 3: Migrate Database Middleware Logging

**Files:**

- Modify: `src/middleware/database.ts`

**Step 1: Replace console.log calls with logger**

Replace the diagnostic logging in `src/middleware/database.ts`:

```typescript
import type { MiddlewareHandler } from 'astro';
import { prepareForRequest, closeDatabase, getDatabaseConfig } from '@/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('database');

export const database: MiddlewareHandler = async (_context, next) => {
  const config = getDatabaseConfig();

  log.info(
    `dialect=${config.dialect}` +
      ` url=${config.url ? config.url.replace(/\/\/.*@/, '//***@') : 'MISSING'}` +
      ` supabase=${config.isSupabase}` +
      ` hyperdrive=${config.isHyperdrive}`
  );

  // Diagnostic: count fetch() calls to identify subrequest sources
  let fetchCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
    fetchCount++;
    const url =
      typeof args[0] === 'string'
        ? args[0]
        : args[0] instanceof Request
          ? args[0].url
          : String(args[0]);
    log.debug(`fetch #${fetchCount}: ${url.substring(0, 120)}`);
    return originalFetch(...args);
  }) as typeof fetch;

  if (config.dialect !== 'postgresql') {
    globalThis.fetch = originalFetch;
    return next();
  }

  prepareForRequest();

  try {
    return await next();
  } finally {
    log.info(`total fetch subrequests: ${fetchCount}`);
    globalThis.fetch = originalFetch;
    await closeDatabase();
  }
};
```

**Step 2: Verify typecheck**

Run: `cd /Users/ivan/Works/AI/expenses && bun run typecheck 2>&1 | tail -5`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/middleware/database.ts
git commit -m "refactor: migrate database middleware to structured logger"
```

---

### Task 4: Migrate PostgreSQL Driver Logging

**Files:**

- Modify: `src/db/drivers/postgres.ts`

**Step 1: Replace console.error with logger**

In `src/db/drivers/postgres.ts`, add import and replace the error log:

```typescript
import { createLogger } from '@/lib/logger';

const log = createLogger('postgresql');
```

Replace line 67 (`console.error(...)`) with:

```typescript
log.error('error closing existing connection during URL switch:', error);
```

**Step 2: Verify typecheck**

Run: `cd /Users/ivan/Works/AI/expenses && bun run typecheck 2>&1 | tail -5`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/db/drivers/postgres.ts
git commit -m "refactor: migrate postgres driver to structured logger"
```

---

### Task 5: Migrate Database Config Warning

**Files:**

- Modify: `src/db/config.ts`

**Step 1: Replace console.warn with logger**

In `src/db/config.ts`, find the `getDatabaseUrl()` function warning about missing DATABASE_URL.

Add import:

```typescript
import { createLogger } from '@/lib/logger';

const log = createLogger('database');
```

Replace the `console.warn('[DATABASE] WARNING: ...')` with:

```typescript
log.warn('DATABASE_URL not found, falling back to SQLite:', defaultUrl);
```

**Step 2: Run existing config tests**

Run: `cd /Users/ivan/Works/AI/expenses && bun test src/db/config.test.ts`
Expected: ALL PASS (14 tests)

**Step 3: Commit**

```bash
git add src/db/config.ts
git commit -m "refactor: migrate database config to structured logger"
```

---

### Task 6: Migrate Auth Service Logging

**Files:**

- Modify: `src/services/auth.service.ts`

**Step 1: Replace console.error with logger**

In `src/services/auth.service.ts`, add import:

```typescript
import { createLogger } from '@/lib/logger';

const log = createLogger('auth');
```

Replace line 385 (`console.error('[login] DB error details:', details)`) with:

```typescript
log.error('DB error details:', details);
```

**Step 2: Verify typecheck**

Run: `cd /Users/ivan/Works/AI/expenses && bun run typecheck 2>&1 | tail -5`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/services/auth.service.ts
git commit -m "refactor: migrate auth service to structured logger"
```

---

### Task 7: Migrate Cache and Service Logging

**Files:**

- Modify: `src/lib/cache/cache-manager.ts`
- Modify: `src/lib/cache/drivers/upstash.ts`
- Modify: `src/services/transaction.service.ts`

**Step 1: Migrate cache-manager.ts**

Add import and replace `console.warn('[Cache]...')`:

```typescript
import { createLogger } from '@/lib/logger';
const log = createLogger('cache');
```

Replace `console.warn(...)` calls with `log.warn(...)`, removing the `[Cache]` prefix (the tag handles it).

**Step 2: Migrate upstash.ts**

Add import and replace `console.warn('[Cache]...')`:

```typescript
import { createLogger } from '@/lib/logger';
const log = createLogger('cache:upstash');
```

Replace `console.warn(...)` calls with `log.warn(...)`.

**Step 3: Migrate transaction.service.ts**

Add import:

```typescript
import { createLogger } from '@/lib/logger';
const log = createLogger('transaction');
```

Replace `console.warn('[TransactionService]...')` calls with `log.warn(...)`.

**Step 4: Verify typecheck**

Run: `cd /Users/ivan/Works/AI/expenses && bun run typecheck 2>&1 | tail -5`
Expected: No new errors

**Step 5: Commit**

```bash
git add src/lib/cache/cache-manager.ts src/lib/cache/drivers/upstash.ts src/services/transaction.service.ts
git commit -m "refactor: migrate cache and transaction service to structured logger"
```

---

### Task 8: Migrate Email and Remaining Service Logging

**Files:**

- Modify: `src/services/email/email.service.ts`
- Modify: `src/services/password-reset.service.ts`
- Modify: `src/services/workspace-invitation.service.ts`

**Step 1: Migrate email.service.ts**

```typescript
import { createLogger } from '@/lib/logger';
const log = createLogger('email');
```

Replace `console.warn('[Email]...')` and `console.error('[Email]...')` calls.

**Step 2: Migrate password-reset.service.ts**

```typescript
import { createLogger } from '@/lib/logger';
const log = createLogger('password-reset');
```

Replace `console.error('[Password Reset]...')` calls.

**Step 3: Migrate workspace-invitation.service.ts**

```typescript
import { createLogger } from '@/lib/logger';
const log = createLogger('workspace-invitation');
```

Replace `console.error('[Workspace Invitation]...')` calls.

**Step 4: Verify typecheck**

Run: `cd /Users/ivan/Works/AI/expenses && bun run typecheck 2>&1 | tail -5`
Expected: No new errors

**Step 5: Commit**

```bash
git add src/services/email/email.service.ts src/services/password-reset.service.ts src/services/workspace-invitation.service.ts
git commit -m "refactor: migrate email and service logging to structured logger"
```

---

### Task 9: Integrate Error Logger with Structured Logger

**Files:**

- Modify: `src/lib/utils/error-logger.ts`

**Step 1: Update logError to use structured logger internally**

In `src/lib/utils/error-logger.ts`, replace the `console.error` call in `logError()` to use the structured logger:

```typescript
import { createLogger } from '@/lib/logger';

const log = createLogger('error');
```

Replace in `logError()` function:

```typescript
// Before:
console.error(logParts.join(' | '));

// After:
log.error(logParts.join(' | '));
```

This preserves the sanitization logic while routing through the structured logger.

**Step 2: Verify typecheck**

Run: `cd /Users/ivan/Works/AI/expenses && bun run typecheck 2>&1 | tail -5`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/lib/utils/error-logger.ts
git commit -m "refactor: route error-logger through structured logger"
```

---

### Task 10: Run Quality Gates and Final Verification

**Step 1: Run all quality gates**

```bash
cd /Users/ivan/Works/AI/expenses
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun test
```

Expected: All pass

**Step 2: Verify no remaining bare console.log in server code**

Run: `grep -rn "console\.\(log\|warn\|error\)" src/middleware/ src/services/ src/db/ src/lib/cache/ src/lib/utils/error-logger.ts --include="*.ts" | grep -v "node_modules" | grep -v ".test." | grep -v "logger.ts" | grep -v "console.provider.ts" | grep -v "seed.ts" | grep -v "empty.ts"`

Expected: No results (all server-side logging migrated). Client-side `.client.ts` files, CLI scripts (`seed.ts`, `empty.ts`, CLI files), and the console email provider are intentionally excluded.

**Step 3: Commit any formatting fixes**

```bash
git add -A
git commit -m "chore: formatting fixes from quality gates"
```

---

## Scope Boundaries

**In scope (server-side infrastructure):**

- Middleware logging (database, auth, etc.)
- Service logging (auth, cache, email, transactions)
- Database driver logging
- Error logger integration

**Out of scope (intentionally left as console.\*):**

- Client-side `.client.ts` files (run in browser, no consola needed)
- CLI scripts (`seed.ts`, `empty.ts`, `create-workspace.ts`, etc.) — user-facing terminal output
- Console email provider — intentionally formats visual email output
- Test files — test output conventions differ

## Architecture Summary

```
Before:
  console.log('[database] dialect=postgresql ...')     → ephemeral text
  console.error('[login] DB error details: ...')       → ephemeral text

After:
  log.info('dialect=postgresql ...')                    → {"level":"info","tag":"database","message":"...","timestamp":"..."}
  log.error('DB error details: ...')                   → {"level":"error","tag":"auth","message":"...","timestamp":"..."}
                                                        ↓
                                              Workers Logs (auto-indexed, queryable)
```

**Tag convention mapping:**

| Old Pattern                                | New Logger                              |
| ------------------------------------------ | --------------------------------------- |
| `console.log('[database] ...')`            | `createLogger('database').info(...)`    |
| `console.error('[login] ...')`             | `createLogger('auth').error(...)`       |
| `console.warn('[Cache] ...')`              | `createLogger('cache').warn(...)`       |
| `console.warn('[TransactionService] ...')` | `createLogger('transaction').warn(...)` |
| `console.warn('[Email] ...')`              | `createLogger('email').warn(...)`       |
| `console.error('[PostgreSQL] ...')`        | `createLogger('postgresql').error(...)` |
