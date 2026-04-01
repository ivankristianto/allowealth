# First-Run Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-run installer at `/installer` that auto-runs migrations and creates the first workspace + admin account when the database is empty.

**Architecture:** A new middleware (`installer`) sits between `database` and `perfDebug` in the chain. It detects missing migrations (via `__drizzle_migrations` table) and missing users (via Better Auth `user` table). When migrations are missing, it runs them inline. When no users exist, it redirects to `/installer`. The installer page presents a single form that POSTs to `/api/installer/setup`, which creates the workspace and admin account in a single transaction, bypassing Better Auth hooks.

**Tech Stack:** Astro 6, Bun/SQLite, Drizzle ORM, Valibot, DaisyUI v5, Better Auth tables (direct insert)

**Spec:** `docs/superpowers/specs/2026-03-25-first-run-installer-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/lib/installer/detection.ts` (create) | `isMigrationApplied()` and `hasUsers()` detection functions |
| `src/lib/installer/detection.test.ts` (create) | Unit tests for detection functions |
| `src/middleware/installer.ts` (create) | Middleware: auto-migrate, redirect logic |
| `src/__tests__/middleware/installer.test.ts` (create) | Unit tests for installer middleware |
| `src/pages/installer.astro` (create) | Installer form page using AuthLayout |
| `src/pages/api/installer/setup.ts` (create) | POST endpoint: validate, create workspace + admin |
| `src/__tests__/api/installer/setup.test.ts` (create) | Unit tests for setup endpoint |
| `src/middleware/index.ts` (modify) | Add `installer` to middleware sequence |
| `src/pages/login.astro` (modify) | Add `?installed=true` success banner |

---

### Task 1: Detection Functions

**Files:**
- Create: `src/lib/installer/detection.ts`
- Create: `src/lib/installer/detection.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/installer/detection.test.ts`:

```typescript
import { describe, expect, test, mock, beforeEach } from 'bun:test';
import { isMigrationApplied, hasUsers } from './detection';

// Mock db.get() which is used by Drizzle's sql tagged template via db.get(sql`...`)
const mockGet = mock(() => undefined as { count: number } | undefined);

const mockDb = {
  get: mockGet,
};

describe('isMigrationApplied', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  test('returns true when __drizzle_migrations table has rows', () => {
    mockGet.mockReturnValue({ count: 5 });
    expect(isMigrationApplied(mockDb as any)).toBe(true);
  });

  test('returns false when __drizzle_migrations table has zero rows', () => {
    mockGet.mockReturnValue({ count: 0 });
    expect(isMigrationApplied(mockDb as any)).toBe(false);
  });

  test('returns false when query throws (table does not exist)', () => {
    mockGet.mockImplementation(() => {
      throw new Error('no such table: __drizzle_migrations');
    });
    expect(isMigrationApplied(mockDb as any)).toBe(false);
  });
});

describe('hasUsers', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  test('returns true when user table has rows', () => {
    mockGet.mockReturnValue({ count: 1 });
    expect(hasUsers(mockDb as any)).toBe(true);
  });

  test('returns false when user table is empty', () => {
    mockGet.mockReturnValue({ count: 0 });
    expect(hasUsers(mockDb as any)).toBe(false);
  });

  test('returns false when query throws', () => {
    mockGet.mockImplementation(() => {
      throw new Error('no such table: user');
    });
    expect(hasUsers(mockDb as any)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/lib/installer/detection.test.ts`
Expected: FAIL — module `./detection` not found

- [ ] **Step 3: Write the detection functions**

Create `src/lib/installer/detection.ts`:

```typescript
/**
 * Installer Detection Functions
 *
 * Checks whether the database has been migrated and whether any users exist.
 * Used by the installer middleware to determine if the app needs first-run setup.
 */

import { sql } from 'drizzle-orm';
import type { Database } from '@/db';

/**
 * Check if Drizzle migrations have been applied.
 *
 * Queries the __drizzle_migrations table that Drizzle creates when running
 * migrations. Returns false if the table does not exist or has no rows.
 */
export function isMigrationApplied(db: Database): boolean {
  try {
    const row = db.get<{ count: number }>(
      sql`SELECT count(*) as count FROM __drizzle_migrations`
    );
    return row != null && row.count > 0;
  } catch {
    return false;
  }
}

/**
 * Check if any users exist in the Better Auth user table.
 *
 * Returns false if the table does not exist or has no rows.
 */
export function hasUsers(db: Database): boolean {
  try {
    const row = db.get<{ count: number }>(
      sql`SELECT count(*) as count FROM user`
    );
    return row != null && row.count > 0;
  } catch {
    return false;
  }
}
```

**Note:** These use Drizzle's `sql` tagged template with `db.get()` for raw SQL queries that need to handle non-existent tables. `BunSQLiteDatabase` exposes `.get()` for single-row raw queries. The try/catch handles the case where tables don't exist yet (SQLite throws "no such table"). At implementation time, verify that `db.get(sql`...`)` works on the `BunSQLiteDatabase` type — if not, access the underlying raw `bun:sqlite` Database via the driver's `_raw` property.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/lib/installer/detection.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/installer/detection.ts src/lib/installer/detection.test.ts
git commit -m "feat(installer): add migration and user detection functions"
```

---

### Task 2: Installer Middleware

**Files:**
- Create: `src/middleware/installer.ts`
- Create: `src/__tests__/middleware/installer.test.ts`
- Modify: `src/middleware/index.ts`

**References:**
- `src/middleware/route-guard.ts` — pattern for middleware handler
- `src/__tests__/middleware/route-guard.test.ts` — pattern for middleware tests
- `src/db/migrate.ts` — `runSqliteMigrations()` function
- `src/db/index.ts` — `resetDb()` function

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/middleware/installer.test.ts`. Use the same `createMockContext` pattern from `route-guard.test.ts`:

```typescript
import { describe, expect, test, mock, beforeEach } from 'bun:test';
import type { APIContext } from 'astro';

// Mock detection functions
const mockIsMigrationApplied = mock(() => true);
const mockHasUsers = mock(() => true);
const mockRunSqliteMigrations = mock(() => {});
const mockResetDb = mock(() => {});

// Mock modules before importing the middleware
mock.module('@/lib/installer/detection', () => ({
  isMigrationApplied: mockIsMigrationApplied,
  hasUsers: mockHasUsers,
}));

mock.module('@/db/migrate', () => ({
  runSqliteMigrations: mockRunSqliteMigrations,
}));

mock.module('@/db', () => ({
  getDb: () => ({}),
  resetDb: mockResetDb,
}));

// Import after mocks
const { installerGuard } = await import('@/middleware/installer');

function createMockContext(pathname: string): APIContext {
  return {
    locals: {},
    request: new Request(`http://localhost${pathname}`),
    url: new URL(`http://localhost${pathname}`),
    redirect: (path: string, status = 302) =>
      new Response(null, { status, headers: { Location: path } }),
  } as unknown as APIContext;
}

const next = mock(() => Promise.resolve(new Response('OK')));

describe('installer middleware', () => {
  beforeEach(() => {
    mockIsMigrationApplied.mockReset().mockReturnValue(true);
    mockHasUsers.mockReset().mockReturnValue(true);
    mockRunSqliteMigrations.mockReset();
    mockResetDb.mockReset();
    next.mockClear();
  });

  test('passes through when migrations applied and users exist', async () => {
    const ctx = createMockContext('/dashboard');
    await installerGuard(ctx, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('skips static assets', async () => {
    mockHasUsers.mockReturnValue(false);
    mockIsMigrationApplied.mockReturnValue(false);
    const ctx = createMockContext('/_astro/main.js');
    await installerGuard(ctx, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(mockIsMigrationApplied).not.toHaveBeenCalled();
  });

  test('runs migrations when not applied, then redirects to /installer', async () => {
    mockIsMigrationApplied.mockReturnValue(false);
    mockHasUsers.mockReturnValue(false);
    const ctx = createMockContext('/');
    const response = await installerGuard(ctx, next);
    expect(mockRunSqliteMigrations).toHaveBeenCalledTimes(1);
    expect(mockResetDb).toHaveBeenCalledTimes(1);
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).headers.get('Location')).toBe('/installer');
  });

  test('redirects to /installer when no users exist', async () => {
    mockHasUsers.mockReturnValue(false);
    const ctx = createMockContext('/login');
    const response = await installerGuard(ctx, next);
    expect((response as Response).headers.get('Location')).toBe('/installer');
  });

  test('allows /installer through when no users exist', async () => {
    mockHasUsers.mockReturnValue(false);
    const ctx = createMockContext('/installer');
    await installerGuard(ctx, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('allows /api/installer/setup through when no users exist', async () => {
    mockHasUsers.mockReturnValue(false);
    const ctx = createMockContext('/api/installer/setup');
    await installerGuard(ctx, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('redirects /installer to /login when users exist', async () => {
    const ctx = createMockContext('/installer');
    const response = await installerGuard(ctx, next);
    expect((response as Response).headers.get('Location')).toBe('/login');
  });

  test('returns 500 when migration fails', async () => {
    mockIsMigrationApplied.mockReturnValue(false);
    mockRunSqliteMigrations.mockImplementation(() => {
      throw new Error('permission denied');
    });
    const ctx = createMockContext('/');
    const response = await installerGuard(ctx, next);
    expect((response as Response).status).toBe(500);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/__tests__/middleware/installer.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the installer middleware**

Create `src/middleware/installer.ts`:

```typescript
/**
 * Installer Middleware
 *
 * Detects whether the app needs first-run setup:
 * 1. If migrations not applied — runs them automatically, redirects to /installer
 * 2. If no users exist — redirects to /installer
 * 3. If users exist and path is /installer — redirects to /login
 * 4. Otherwise — passes through to next middleware
 *
 * Must run after database middleware and before authentication.
 */

import type { MiddlewareHandler } from 'astro';
import { isMigrationApplied, hasUsers } from '@/lib/installer/detection';
import { getDb, resetDb } from '@/db';

/** Paths that skip detection entirely */
const STATIC_PREFIXES = ['/_astro/', '/favicon'] as const;

/** Paths allowed through when no users exist */
const INSTALLER_PATHS = ['/installer', '/api/installer/'] as const;

/** In-memory flag — once users are confirmed, skip detection for this process */
let setupComplete = false;

export const installerGuard: MiddlewareHandler = async (context, next) => {
  const { pathname } = context.url;

  // Skip static assets
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return next();
  }

  // Fast path: if we already confirmed setup is complete this process, skip checks
  if (setupComplete) {
    // Still redirect /installer to /login
    if (pathname === '/installer' || pathname.startsWith('/api/installer/')) {
      return context.redirect('/login', 302);
    }
    return next();
  }

  const db = getDb();

  // Step 1: Check migrations
  if (!isMigrationApplied(db)) {
    try {
      const { runSqliteMigrations } = await import('@/db/migrate');
      runSqliteMigrations();
      resetDb();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return new Response(
        `<html><body><h1>Migration Failed</h1><pre>${message}</pre><p>Fix the issue and reload.</p></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }
  }

  // Step 2: Check users (re-acquire db after potential migration + reset)
  const currentDb = getDb();
  if (!hasUsers(currentDb)) {
    // Allow installer routes through
    if (INSTALLER_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
      return next();
    }
    return context.redirect('/installer', 302);
  }

  // Setup is complete — set flag and redirect away from installer
  setupComplete = true;

  if (pathname === '/installer' || pathname.startsWith('/api/installer/')) {
    return context.redirect('/login', 302);
  }

  return next();
};

/**
 * Reset the in-memory setup flag. Used for testing.
 */
export function resetInstallerFlag(): void {
  setupComplete = false;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/__tests__/middleware/installer.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Wire into middleware chain**

Modify `src/middleware/index.ts` — add `installer` import and insert after `database`:

```typescript
import { installerGuard } from './installer';

export const onRequest = sequence(
  database,
  installerGuard,
  perfDebug,
  securityHeaders,
  authentication,
  csrf,
  routeGuard
);
```

- [ ] **Step 6: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add src/middleware/installer.ts src/__tests__/middleware/installer.test.ts src/middleware/index.ts
git commit -m "feat(installer): add installer middleware with auto-migration"
```

---

### Task 3: Setup API Endpoint

**Files:**
- Create: `src/pages/api/installer/setup.ts`
- Create: `src/__tests__/api/installer/setup.test.ts`

**References:**
- `src/db/schema/sqlite/better-auth.ts` — `user` and `account` table schemas
- `src/db/schema/sqlite/workspaces.ts` — `workspaces` table
- `src/db/schema/sqlite/users.ts` — domain `users` table
- `src/services/auth.service.ts:92-143` — `createWorkspaceOwner()` for reference
- `src/lib/auth/password.ts` — `hashPassword()`
- `src/services/account-category.service.ts:302` — `seedDefaultCategories()`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/api/installer/setup.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test';
import * as v from 'valibot';

/**
 * Test the validation schema for the installer setup endpoint.
 * Integration testing of the full endpoint (DB inserts) is covered by E2E tests.
 */

// Inline the schema here to test it independently
const installerSetupSchema = v.object({
  workspaceName: v.pipe(
    v.string(),
    v.minLength(1, 'Workspace name is required'),
    v.maxLength(255, 'Workspace name must be less than 255 characters')
  ),
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  email: v.pipe(v.string(), v.email('Invalid email address')),
  password: v.pipe(
    v.string(),
    v.minLength(12, 'Password must be at least 12 characters')
  ),
});

describe('installer setup validation', () => {
  test('accepts valid input', () => {
    const result = v.safeParse(installerSetupSchema, {
      workspaceName: 'My Workspace',
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'securepassword123',
    });
    expect(result.success).toBe(true);
  });

  test('rejects empty workspace name', () => {
    const result = v.safeParse(installerSetupSchema, {
      workspaceName: '',
      name: 'Admin',
      email: 'admin@example.com',
      password: 'securepassword123',
    });
    expect(result.success).toBe(false);
  });

  test('rejects invalid email', () => {
    const result = v.safeParse(installerSetupSchema, {
      workspaceName: 'Workspace',
      name: 'Admin',
      email: 'not-an-email',
      password: 'securepassword123',
    });
    expect(result.success).toBe(false);
  });

  test('rejects short password', () => {
    const result = v.safeParse(installerSetupSchema, {
      workspaceName: 'Workspace',
      name: 'Admin',
      email: 'admin@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  test('rejects missing fields', () => {
    const result = v.safeParse(installerSetupSchema, {});
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `bun test src/__tests__/api/installer/setup.test.ts`
Expected: All 5 tests PASS (these test the validation schema only, not the endpoint)

- [ ] **Step 3: Write the setup endpoint**

Create `src/pages/api/installer/setup.ts`:

```typescript
/**
 * Installer Setup API Endpoint
 *
 * POST /api/installer/setup
 *
 * Creates the first workspace and admin account. Bypasses Better Auth hooks
 * to avoid signup-mode restrictions. Only works when no users exist.
 */

import type { APIRoute } from 'astro';
import * as v from 'valibot';
import { nanoid } from 'nanoid';
import { db, getActiveSchema, runTransaction } from '@/db';
import { hashPassword } from '@/lib/auth/password';
import { AccountCategoryService } from '@/services/account-category.service';
import { hasUsers } from '@/lib/installer/detection';
import { getDb } from '@/db';

const installerSetupSchema = v.object({
  workspaceName: v.pipe(
    v.string(),
    v.minLength(1, 'Workspace name is required'),
    v.maxLength(255, 'Workspace name must be less than 255 characters')
  ),
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  email: v.pipe(v.string(), v.email('Invalid email address')),
  password: v.pipe(
    v.string(),
    v.minLength(12, 'Password must be at least 12 characters')
  ),
});

export const POST: APIRoute = async ({ request }) => {
  // Guard: already installed
  if (hasUsers(getDb())) {
    return new Response(
      JSON.stringify({ error: 'Setup already complete' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const result = v.safeParse(installerSetupSchema, body);
  if (!result.success) {
    const firstIssue = result.issues[0];
    return new Response(
      JSON.stringify({ error: firstIssue.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { workspaceName, name, email, password } = result.output;
  const schema = getActiveSchema();

  try {
    const userId = nanoid();
    const workspaceId = nanoid();
    const accountId = nanoid();
    const passwordHash = await hashPassword(password);
    const now = new Date();

    await runTransaction(db, async (tx) => {
      // 1. Better Auth user table
      await tx.insert(schema.user).values({
        id: userId,
        name: name.trim(),
        email: email.toLowerCase(),
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      });

      // 2. Better Auth account table (credential provider)
      await tx.insert(schema.account).values({
        id: accountId,
        accountId: userId,
        providerId: 'credential',
        userId: userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });

      // 3. Workspace
      await tx.insert(schema.workspaces).values({
        id: workspaceId,
        name: workspaceName.trim(),
        status: 'active',
        created_at: now,
        updated_at: now,
      });

      // 4. Domain user
      await tx.insert(schema.users).values({
        id: userId,
        workspace_id: workspaceId,
        email: email.toLowerCase(),
        password_hash: null,
        name: name.trim(),
        role: 'admin',
        email_verified_at: now,
        deleted_at: null,
        created_at: now,
        updated_at: now,
      });
    });

    // 5. Seed default categories (outside transaction — idempotent)
    const categoryService = new AccountCategoryService(db);
    await categoryService.seedDefaultCategories(workspaceId, userId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Setup failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

**Implementation note:** The `hasUsers()` function expects the raw Drizzle `Database` type for raw SQL queries. At implementation time, verify whether `getDb()` returns an object that supports `.all()` for raw queries. If not, use `sql` tagged template: `` db.select({ count: sql<number>`count(*) as count` }).from(schema.user) `` instead. The key contract is: check user count, return 409 if non-zero.

- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/installer/setup.ts src/__tests__/api/installer/setup.test.ts
git commit -m "feat(installer): add setup API endpoint with validation"
```

---

### Task 4: Installer Page

**Files:**
- Create: `src/pages/installer.astro`

**References:**
- `src/layouts/AuthLayout.astro` — layout to reuse
- `src/pages/signup.astro` — form structure and styling patterns
- `src/components/atoms/Input.astro` — input component
- `src/components/atoms/PasswordField.astro` — password input with show/hide
- `src/components/atoms/Button.astro` — button component
- `src/components/atoms/ErrorMessage.astro` — error display
- `src/components/molecules/FormField.astro` — form field wrapper

- [ ] **Step 1: Create the installer page**

Create `src/pages/installer.astro`. Use `AuthLayout` and existing form atoms. The client script uses `textContent` for error display (no innerHTML with untrusted content):

```astro
---
/**
 * Installer Page
 *
 * First-run setup form. Creates the initial workspace and admin account.
 * Only accessible when no users exist in the database.
 */

import AuthLayout from '../layouts/AuthLayout.astro';
import Input from '../components/atoms/Input.astro';
import PasswordField from '../components/atoms/PasswordField.astro';
import Button from '../components/atoms/Button.astro';
import FormField from '../components/molecules/FormField.astro';
import { Server } from '@lucide/astro';
import { hasUsers } from '@/lib/installer/detection';
import { getDb } from '@/db';

// Server-side guard: redirect if already set up
if (hasUsers(getDb())) {
  return Astro.redirect('/login', 302);
}
---

<AuthLayout title="allowealth - Setup">
  <div class="card bg-base-100 shadow-2xl border border-base-300">
    <div class="card-body p-8">
      <div class="flex flex-col items-center gap-2 mb-6">
        <div class="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
          <Server size={24} class="text-accent stroke-current" aria-hidden="true" />
        </div>
        <h2 class="text-2xl font-bold text-center">Initial Setup</h2>
        <p class="text-sm text-base-content/60 text-center">
          Create your workspace and admin account to get started.
        </p>
      </div>

      <div id="installer-error" role="alert" aria-live="polite" aria-atomic="true"></div>

      <form id="installer-form" novalidate>
        <fieldset class="space-y-4">
          <legend class="sr-only">Workspace and Admin Account Setup</legend>

          <FormField label="Workspace Name" required>
            <Input
              type="text"
              name="workspaceName"
              placeholder="My Workspace"
              required
              maxlength={255}
              autocomplete="organization"
            />
          </FormField>

          <div class="divider text-base-content/40 text-xs uppercase tracking-widest my-2">
            Admin Account
          </div>

          <FormField label="Full Name" required>
            <Input
              type="text"
              name="name"
              placeholder="Your full name"
              required
              autocomplete="name"
            />
          </FormField>

          <FormField label="Email" required>
            <Input
              type="email"
              name="email"
              placeholder="admin@example.com"
              required
              autocomplete="email"
            />
          </FormField>

          <FormField label="Password" required>
            <PasswordField
              name="password"
              placeholder="Min 12 characters"
              required
              minlength={12}
              autocomplete="new-password"
            />
          </FormField>

          <FormField label="Confirm Password" required>
            <PasswordField
              name="confirmPassword"
              placeholder="Confirm your password"
              required
              minlength={12}
              autocomplete="new-password"
            />
          </FormField>

          <Button type="submit" class="btn-accent w-full mt-2" id="installer-submit">
            Complete Setup
          </Button>
        </fieldset>
      </form>
    </div>
  </div>
</AuthLayout>
```

The client script goes in a separate file per project conventions. Create `src/pages/installer.client.ts`:

```typescript
/**
 * Installer page client script
 *
 * Handles form submission, password validation, and error display.
 */

const form = document.getElementById('installer-form') as HTMLFormElement;
const errorContainer = document.getElementById('installer-error') as HTMLDivElement;
const submitBtn = document.getElementById('installer-submit') as HTMLButtonElement;

function showError(message: string): void {
  errorContainer.textContent = '';
  const alert = document.createElement('div');
  alert.className = 'alert alert-error mb-4';
  const span = document.createElement('span');
  span.textContent = message;
  alert.appendChild(span);
  errorContainer.appendChild(alert);
}

function clearError(): void {
  errorContainer.textContent = '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const formData = new FormData(form);
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (password !== confirmPassword) {
    showError('Passwords do not match.');
    return;
  }

  submitBtn.setAttribute('disabled', 'true');
  submitBtn.classList.add('loading');

  try {
    const response = await fetch('/api/installer/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceName: formData.get('workspaceName'),
        name: formData.get('name'),
        email: formData.get('email'),
        password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      window.location.href = '/login?installed=true';
    } else {
      showError(data.error || 'Setup failed. Please try again.');
    }
  } catch {
    showError('Network error. Please try again.');
  } finally {
    submitBtn.removeAttribute('disabled');
    submitBtn.classList.remove('loading');
  }
});
```

Then add the script tag to the bottom of `installer.astro`:

```astro
<script src="./installer.client.ts"></script>
```

**Implementation notes:**
- Check whether `PasswordField`, `Input`, `Button`, `FormField` props match what's used above. Read each component's `Props` interface at implementation time and adjust attribute names.
- Per project convention (`002-interactive-pages.md`), client scripts go in `.client.ts` files. Verify this pattern is used elsewhere and follow the same import style.
- Error display uses DOM methods (`createElement`, `textContent`) instead of `innerHTML` to prevent XSS.

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/installer.astro src/pages/installer.client.ts
git commit -m "feat(installer): add installer page with setup form"
```

---

### Task 5: Login Page Banner

**Files:**
- Modify: `src/pages/login.astro:46-68`

**References:**
- `src/pages/login.astro` — existing banner pattern

- [ ] **Step 1: Add the installed=true banner**

In `src/pages/login.astro`, after the existing query param extraction (around line 17), add:

```typescript
const installed = url.searchParams.get('installed');
```

Then in the banner logic block (around line 66-68, after the `emailChanged` check), add:

```typescript
} else if (installed === 'true') {
  bannerMessage = 'Setup complete! Sign in with your admin account.';
  bannerType = 'success';
}
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/login.astro
git commit -m "feat(installer): add setup-complete banner to login page"
```

---

### Task 6: Quality Gates & Manual Verification

- [ ] **Step 1: Run all quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: All pass with 0 errors

- [ ] **Step 2: Run unit tests**

```bash
bun test src/lib/installer/detection.test.ts src/__tests__/middleware/installer.test.ts src/__tests__/api/installer/setup.test.ts
```

Expected: All tests pass

- [ ] **Step 3: Run full test suite**

```bash
bun run test
```

Expected: No regressions

- [ ] **Step 4: Manual verification**

Delete the local dev database to simulate a fresh install:

```bash
rm -f db/.dev.db
```

Start the dev server:

```bash
bun --bun run dev
```

Verify:
1. Opening `http://localhost:4321` redirects to `/installer`
2. The installer form renders with all fields
3. Submitting the form creates workspace + admin and redirects to `/login?installed=true`
4. Login page shows "Setup complete!" banner
5. Signing in with the created credentials works
6. Visiting `/installer` after setup redirects to `/login`

- [ ] **Step 5: Commit any fixes from verification**

```bash
git add -A
git commit -m "fix(installer): address issues found during manual verification"
```

(Skip if no fixes needed)

- [ ] **Step 6: Re-create dev database for normal development**

```bash
bun run db:migrate
bun run db:seed  # if a seed command exists
```
