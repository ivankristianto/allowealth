# Database Upgrade Screen Design

**Issue:** ALL-65  
**Date:** 2026-03-24  
**Status:** Approved

## Summary

Add an admin-only `/upgrade` page that appears when the database schema is out of date. A `migrationGuard` middleware intercepts all requests when migrations are pending: super admins are redirected to `/upgrade` to trigger the migration; all other users receive an inline 503 maintenance page at their current URL. Once the admin runs the migration, normal access resumes.

## Motivation

Database migrations after a deployment currently require CLI access (`bun run db:migrate`), which is unavailable in containerized or managed hosting environments. This feature provides a web-based alternative for self-hosted Bun/SQLite deployments.

## Out of Scope

- Rollback functionality (use CLI)
- Automatic migration triggering without admin action
- Multiple database targeting
- Migration preview or dry-run mode
- Cloudflare D1 web-triggered migrations (returns 501; admins use CLI)

---

## Architecture

### Files Added or Modified

| File | Change |
|---|---|
| `src/db/migration-constants.ts` | New — exports `EXPECTED_MIGRATION_COUNT` (Workers-safe, no `bun:sqlite` import) |
| `src/db/migrate.ts` | No change to existing exports; constant moved to `migration-constants.ts` |
| `src/services/migration.service.ts` | New — `isMigrationPending()`, `runMigrations()` |
| `src/middleware/migration-guard.ts` | New — intercepts requests when migrations pending |
| `src/middleware/index.ts` | Insert `migrationGuard` between `csrf` and `routeGuard` |
| `src/pages/upgrade.astro` | New — admin upgrade UI |
| `src/pages/api/admin/upgrade/run.ts` | New — `POST` triggers migration |
| `src/pages/api/admin/upgrade/status.ts` | New — `GET` returns pending state |

### Middleware Chain

```
database → perfDebug → securityHeaders → authentication → csrf → migrationGuard → routeGuard
```

---

## Section 1: Migration Detection

### `EXPECTED_MIGRATION_COUNT` constant

**File:** `src/db/migration-constants.ts` (new, separate from `migrate.ts`)

```ts
export const EXPECTED_MIGRATION_COUNT = 2; // update when adding migrations
```

This constant is in its own file — **not** in `migrate.ts` — because `migrate.ts` imports `bun:sqlite` at the module level, which would break Cloudflare Workers if imported by the middleware chain. `migration-constants.ts` has zero runtime dependencies and is safe to import anywhere.

A `bun:test` unit test asserts this constant equals the actual `drizzle/sqlite/meta/_journal.json` entry count. Forgetting to update it causes a test failure. The constant approach is used rather than reading the journal file at runtime because the journal file may not be accessible in bundled Workers deployments.

### `MigrationService` (`src/services/migration.service.ts`)

**`isMigrationPending(db): Promise<boolean>`**

Queries `SELECT COUNT(*) FROM __drizzle_migrations` and compares against `EXPECTED_MIGRATION_COUNT` (imported from `src/db/migration-constants.ts`). Returns `true` if applied count is less than expected. If the table does not exist (fresh or corrupt DB), catches the error and returns `true` — treats a missing table as pending.

This method is Workers-safe: it only uses the Drizzle `db` instance passed in and the constant — no `bun:sqlite` import.

**`runMigrations(): Promise<{ success: boolean; error?: string }>`**

Calls `runSqliteMigrations()` for Bun deployments. Guards against Workers by checking `process.env.DEPLOY_TARGET` — when the value is `'cloudflare'`, `'vercel'`, or `'netlify'` (i.e., anything other than `'node'` or unset), returns `{ success: false, error: 'Use CLI for D1 migrations' }` (caller returns HTTP 501). This mirrors the existing `DEPLOY_TARGET` convention used in `astro.config.ts`.

---

## Section 2: `migrationGuard` Middleware

**File:** `src/middleware/migration-guard.ts`

### Passlist (always skip the check)

The following paths skip the migration pending check entirely (prefix match):

- `/upgrade`
- `/api/admin/upgrade/run` (explicit — must pass through during the upgrade)
- `/api/admin/upgrade/status` (explicit — must pass through during the upgrade)
- `/_astro/`
- `/favicon.ico`

### Logic

1. If the path is in the passlist, call `next()` immediately.
2. Call `MigrationService.isMigrationPending(db)`.
3. If **not pending**: call `next()`.
4. If **pending**:
   - `context.locals.user?.role === 'super_admin'` → `302 /upgrade`
   - All others (unauthenticated, `admin`, `member`) → return a 503 response with inline maintenance HTML

The null check on `context.locals.user` is explicit — unauthenticated users fall through to the 503 branch, not to an error.

### Maintenance HTML (503 response)

A minimal self-contained HTML page. Inline a `<style>` block with only the CSS needed (background color, centered layout, text color) using the app's CSS custom properties (e.g., `--color-base-100`, `--color-base-content`). No external stylesheets, no DaisyUI class dependencies, no JavaScript. Content:

- App name
- "Undergoing scheduled maintenance" heading
- "The application is being upgraded. Please check back shortly."

---

## Section 3: `/upgrade` Page

**File:** `src/pages/upgrade.astro`  
**Layout:** `BaseLayout` (no sidebar, no `AdminLayout`)

### Access control

If `context.locals.user?.role !== 'super_admin'`, redirect to `/login`. Defense-in-depth; `migrationGuard` handles normal enforcement.

### UI States

| State | Trigger | Content |
|---|---|---|
| **Idle** | Page load, `pending: true` | "Database upgrade required" heading, description, "Run Upgrade" button |
| **Running** | After button click | Spinner, "Running migrations…", button disabled |
| **Success** | POST resolves `{ success: true }` | Green checkmark, "Upgrade complete", countdown to `/admin` redirect (3 s) |
| **Error** | POST resolves `{ success: false }` | Red alert, error message, collapsible `<pre>` with SQL details, "Retry" button |
| **Up to date** | Page load, `pending: false` | "Nothing to upgrade" message, link to `/admin` |

On page load, the client calls `GET /api/admin/upgrade/status`. If `pending: false`, the page shows a "Nothing to upgrade" state and offers a link to `/admin`.

**Note on "in-progress" state:** `POST /api/admin/upgrade/run` is synchronous — it blocks until `runSqliteMigrations()` completes and returns. There is no true mid-run state visible to the client. If the admin refreshes the page while waiting for the POST response (before it resolves), the page reloads into the Idle state and they can click "Run Upgrade" again — which is safe since `runSqliteMigrations()` is idempotent. The Running state is purely client-side (from button click until POST resolves); no server-side "running" flag is needed.

### Polling

The Running state is client-side only (active while awaiting the `POST /api/admin/upgrade/run` response). When the POST resolves with `{ success: true }`, the page transitions to Success and redirects to `/admin` after 3 seconds. Polling `GET /api/admin/upgrade/status` is used only on page load to determine the initial state — not during the run itself.

---

## Section 4: API Endpoints

### `POST /api/admin/upgrade/run`

**Auth:** `requireSuperAdmin` — existing helper in `src/lib/auth/requireAuth.ts`. Returns 403 JSON if the user is not `super_admin`.

**CSRF:** The `/upgrade` page fetch must include the CSRF token. The existing CSRF middleware uses a cookie-to-header double-submit pattern; the client reads the `csrf-token` cookie and sends it as the `x-csrf-token` request header on the POST.

**Response — success:**
```json
{ "success": true }
```

**Response — migration error:**
```json
{ "success": false, "error": "<error message>" }
```

**Response — D1/Workers:**
```
HTTP 501
{ "success": false, "error": "CLI required", "message": "Run: bun run db:migrate" }
```

Calling this endpoint when already up to date is a no-op (Drizzle skips applied migrations). No locking needed for concurrent calls.

### `GET /api/admin/upgrade/status`

**Auth:** `requireSuperAdmin` — existing helper in `src/lib/auth/requireAuth.ts`.

**Response — pending:**
```json
{ "pending": true, "applied": 1, "expected": 2 }
```

**Response — up to date:**
```json
{ "pending": false, "applied": 2, "expected": 2 }
```

---

## Section 5: Error Handling

| Scenario | Behavior |
|---|---|
| Migration fails mid-run | API catches throw, returns `{ success: false, error: e.message }`. Drizzle's `bun-sqlite` migrator runs each migration file in its own transaction — completed files are recorded in `__drizzle_migrations` before the next file runs. A retry therefore applies only the remaining unrecorded migrations, not the entire set. UI shows collapsible error details with a Retry button. |
| `__drizzle_migrations` table missing | `isMigrationPending()` catches query error, returns `true`. Migrations will create the table on first run. |
| D1/Workers deployment | `POST /api/admin/upgrade/run` returns 501. UI displays CLI instructions. Maintenance block remains until admin applies migrations via CLI and the `__drizzle_migrations` count catches up. |
| Concurrent upgrade attempts | Idempotent — Drizzle skips already-applied migrations. No locking required. |
| Non-super-admin reaches `/upgrade` directly | Page redirects to `/login`. |

---

## Section 6: Testing

### Unit tests

- `EXPECTED_MIGRATION_COUNT` matches `drizzle/sqlite/meta/_journal.json` entry count (enforces constant stays current)
- `MigrationService.isMigrationPending()`:
  - Returns `false` when applied count equals expected
  - Returns `true` when applied count is less than expected
  - Returns `true` when `__drizzle_migrations` table does not exist
- `migrationGuard`:
  - Calls `next()` when not pending
  - Redirects super admin to `/upgrade` when pending
  - Returns 503 for unauthenticated user (`context.locals.user` is null) when pending
  - Returns 503 for `admin`/`member` role when pending
  - Skips check for passlist paths (`/upgrade`, `/api/admin/upgrade/run`, `/api/admin/upgrade/status`, `/_astro/`, `/favicon.ico`)

### Integration tests

- `POST /api/admin/upgrade/run` with a temp SQLite DB at an older migration state — verifies success response and that `__drizzle_migrations` count increases
- `GET /api/admin/upgrade/status` returns correct `pending`/`applied`/`expected` values

---

## Request Flow Diagrams

### Normal (no pending migrations)

```
Request → database → auth → migrationGuard (COUNT = expected → next()) → routeGuard → page
```

### Migrations pending — super admin

```
Request → migrationGuard → 302 /upgrade
/upgrade loads → GET /api/admin/upgrade/status → { pending: true } → Idle state
Admin clicks "Run Upgrade" → POST /api/admin/upgrade/run (blocks) → runSqliteMigrations()
POST resolves { success: true } → Success state → 3 s → redirect /admin
```

### Migrations pending — non-admin

```
Request → migrationGuard (pending, context.locals.user?.role ≠ 'super_admin') → 503 maintenance HTML (URL unchanged)
(Admin completes upgrade elsewhere)
User refreshes → migrationGuard (not pending) → next() → normal page
```
