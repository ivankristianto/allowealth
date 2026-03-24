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
| `src/db/migrate.ts` | Export `EXPECTED_MIGRATION_COUNT` constant |
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

`src/db/migrate.ts` exports:

```ts
export const EXPECTED_MIGRATION_COUNT = 2; // update when adding migrations
```

A `bun:test` unit test asserts this constant equals the actual `_journal.json` entry count. Forgetting to update it causes a test failure.

### `MigrationService` (`src/services/migration.service.ts`)

**`isMigrationPending(db): Promise<boolean>`**

Queries `SELECT COUNT(*) FROM __drizzle_migrations` and compares against `EXPECTED_MIGRATION_COUNT`. Returns `true` if applied count is less than expected. If the table does not exist (fresh or corrupt DB), catches the error and returns `true` — treats a missing table as pending.

**`runMigrations(): Promise<{ success: boolean; error?: string }>`**

Calls `runSqliteMigrations()` for Bun deployments. Guards against Workers via `DEPLOY_TARGET` check. Returns `{ success: false, error: 'Use CLI for D1 migrations' }` for non-Bun targets (caller returns HTTP 501).

---

## Section 2: `migrationGuard` Middleware

**File:** `src/middleware/migration-guard.ts`

### Passlist (always skip the check)

- `/upgrade`
- `/_astro/`
- `/favicon.*`

### Logic

1. If the path is in the passlist, call `next()` immediately.
2. Call `MigrationService.isMigrationPending(db)`.
3. If **not pending**: call `next()`.
4. If **pending**:
   - User is `super_admin` → `302 /upgrade`
   - All others → return a 503 response with inline maintenance HTML

### Maintenance HTML (503 response)

A minimal self-contained page using `BaseLayout` styling tokens. Content:

- App name
- "Undergoing scheduled maintenance" heading
- "The application is being upgraded. Please check back shortly."
- No DaisyUI component dependencies

---

## Section 3: `/upgrade` Page

**File:** `src/pages/upgrade.astro`  
**Layout:** `BaseLayout` (no sidebar, no `AdminLayout`)

### Access control

If `context.locals.user?.role !== 'super_admin'`, redirect to `/login`. Defense-in-depth; `migrationGuard` handles normal enforcement.

### UI States

| State | Trigger | Content |
|---|---|---|
| **Idle** | Page load, migration pending | "Database upgrade required" heading, description, "Run Upgrade" button |
| **Running** | After button click | Spinner, "Running migrations…", button disabled |
| **Success** | API returns `{ success: true }` | Green checkmark, "Upgrade complete", countdown to `/admin` redirect (3 s) |
| **Error** | API returns `{ success: false }` | Red alert, error message, collapsible `<pre>` with SQL details, "Retry" button |

On page load, the client calls `GET /api/admin/upgrade/status`. If `pending: false`, the page shows a "Nothing to upgrade" state and offers a link to `/admin`. If a migration is already in progress (e.g., the admin refreshed mid-run), the page enters the Running state and resumes polling.

### Polling

During the Running state, the client polls `GET /api/admin/upgrade/status` every 2 seconds. When `pending: false` is returned, the page transitions to Success and redirects after 3 seconds.

---

## Section 4: API Endpoints

### `POST /api/admin/upgrade/run`

**Auth:** `requireSuperAdmin`

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

**Auth:** `requireSuperAdmin`

**Response:**
```json
{ "pending": true, "applied": 1, "expected": 2 }
```

---

## Section 5: Error Handling

| Scenario | Behavior |
|---|---|
| Migration fails mid-run | API catches throw, returns `{ success: false, error: e.message }`. Drizzle records only completed migrations; retry applies remaining. UI shows collapsible error details with a Retry button. |
| `__drizzle_migrations` table missing | `isMigrationPending()` catches query error, returns `true`. Migrations will create the table on first run. |
| D1/Workers deployment | `POST /api/admin/upgrade/run` returns 501. UI displays CLI instructions. Maintenance block remains until admin applies migrations via CLI and the `__drizzle_migrations` count catches up. |
| Concurrent upgrade attempts | Idempotent — Drizzle skips already-applied migrations. No locking required. |
| Non-super-admin reaches `/upgrade` directly | Page redirects to `/login`. |

---

## Section 6: Testing

### Unit tests

- `EXPECTED_MIGRATION_COUNT` matches `_journal.json` entry count (enforces constant stays current)
- `MigrationService.isMigrationPending()`:
  - Returns `false` when applied count equals expected
  - Returns `true` when applied count is less than expected
  - Returns `true` when `__drizzle_migrations` table does not exist
- `migrationGuard`:
  - Calls `next()` when not pending
  - Redirects super admin to `/upgrade` when pending
  - Returns 503 for unauthenticated user when pending
  - Returns 503 for `admin`/`member` role when pending
  - Skips check for passlist paths (`/upgrade`, `/_astro/`, `/favicon.*`)

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
/upgrade loads → GET /api/admin/upgrade/status → { pending: true }
Admin clicks "Run Upgrade" → POST /api/admin/upgrade/run → runSqliteMigrations()
Poll → GET /api/admin/upgrade/status → { pending: false }
Success state → 3 s → redirect /admin
```

### Migrations pending — non-admin

```
Request → migrationGuard → 503 inline maintenance HTML (URL unchanged)
(Admin completes upgrade elsewhere)
User refreshes → migrationGuard (not pending) → next() → normal page
```
