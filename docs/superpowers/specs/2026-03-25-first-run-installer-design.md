# First-Run Installer Design (ALL-64)

## Summary

A web-based installer at `/installer` that runs automatically when the application has no users. It runs database migrations, then presents a form to create the first workspace and admin account. Once complete, it redirects to `/login` and becomes inaccessible.

**Runtime scope:** Bun/SQLite only (non-D1).

## Detection & Middleware

A new `installer` middleware runs after `database` and before all other middleware in the chain:

```
database → installer → perfDebug → securityHeaders → authentication → csrf → routeGuard
```

### Detection logic

The middleware runs two checks on every request:

1. **`isMigrationApplied()`** — queries `SELECT count(*) FROM __drizzle_migrations`. If the table does not exist (query throws) or has fewer rows than expected, migrations have not been fully applied.
2. **`hasUsers()`** — queries `SELECT count(*) FROM user LIMIT 1` (Better Auth's `user` table). Returns `true` if at least one user exists.

### Behavior

| Migrations applied? | Users exist? | Current path | Action |
|---------------------|-------------|--------------|--------|
| No | — | any | Run `runSqliteMigrations()`, then redirect to `/installer` |
| Yes | No | not `/installer` | Redirect to `/installer` |
| Yes | No | `/installer` or `/api/installer/*` | Allow through (skip remaining middleware) |
| Yes | Yes | `/installer` | Redirect to `/login` |
| Yes | Yes | any other | Allow through (normal flow) |

### Route exclusions

The middleware skips these paths entirely (no detection queries):

- `/installer` and `/api/installer/setup` (installer routes)
- `/_astro/`, `/favicon.svg`, and other static assets
- `/api/auth/*` (Better Auth internals)

### Performance

After initial setup, both checks are cheap single-row queries. An in-memory flag can skip the checks entirely after the first successful check within a process lifetime.

### Auto-migration

When `isMigrationApplied()` returns `false`, the middleware calls `runSqliteMigrations()` from `src/db/migrate.ts` inline. This runs once on the first request and is idempotent — Drizzle's migrator skips already-applied migrations.

## Installer Page (`/installer`)

Single Astro page using `AuthLayout` for consistent styling with login/signup pages.

### Form fields

| Field | Type | Validation |
|-------|------|------------|
| Workspace name | text | Required, 1–255 chars |
| Your name | text | Required |
| Email | email | Required, valid email format |
| Password | password | Required, min 12 chars |
| Confirm password | password | Required, must match password |

### Submit button

"Complete Setup"

### Server-side guard

The page frontmatter checks if users already exist. If so, redirects to `/login` (defense in depth).

### Client-side behavior

Minimal JS handles:
- Password match validation before submit
- Form submission via `fetch` to `POST /api/installer/setup`
- On success: redirect to `/login?installed=true`
- On error: inline error message display

## API Endpoint (`POST /api/installer/setup`)

Single API route that creates the workspace and admin account. No authentication required.

### Request body

```json
{
  "workspaceName": "string",
  "name": "string",
  "email": "string",
  "password": "string"
}
```

### Validation

Valibot schema: all fields required, valid email format, password min 12 chars.

### Guard

Checks user count before inserting. Returns 409 Conflict if users already exist.

### Steps (single transaction)

1. Hash password with `hashPassword()` from `@/lib/auth/password`
2. Generate IDs with `nanoid`
3. Insert into Better Auth `user` table (id, name, email, emailVerified: true)
4. Insert into Better Auth `account` table (credential type, hashed password)
5. Insert into `workspaces` table (id, name, status: 'active')
6. Insert into domain `users` table (id, workspace_id, email, name, role: 'admin', email_verified_at: now)
7. Seed default categories via `AccountCategoryService.seedDefaultCategories()`

### Responses

| Status | Condition |
|--------|-----------|
| 201 | Setup complete |
| 400 | Validation error |
| 409 | Already installed (users exist) |

### Why bypass Better Auth

The installer inserts directly into Better Auth's tables instead of using its signup hooks. This avoids initializing the auth framework before any user exists and sidesteps signup-mode checks (`SIGNUP_MODE=invite_only` would block the first user).

## Login Page Change

When the `?installed=true` query param is present, the login page shows a success banner: "Setup complete! Sign in with your admin account."

## Security

- **Idempotent:** The setup endpoint checks user count before inserting — duplicate requests return 409.
- **No CSRF:** No session exists to protect during installation.
- **Password hashing:** PBKDF2-SHA256 via Web Crypto API (existing `hashPassword()`).
- **Dead after setup:** Once the first user exists, the middleware redirects all `/installer` requests to `/login`. The installer page and API become unreachable.
- **No rate limiting:** The endpoint is one-shot. Once a user exists, it returns 409.

## File Changes

### New files

| File | Purpose |
|------|---------|
| `src/middleware/installer.ts` | Detection, auto-migrate, redirect logic |
| `src/pages/installer.astro` | Installer form page |
| `src/pages/api/installer/setup.ts` | Setup API endpoint |

### Modified files

| File | Change |
|------|--------|
| `src/middleware/index.ts` | Add `installer` to middleware sequence after `database` |
| `src/pages/login.astro` | Add `installed=true` success banner |

## Out of Scope

- D1/Cloudflare Workers runtime support
- Email verification during install
- OAuth/social login during install
- Multi-workspace setup
- CAPTCHA on installer form
- Subsequent workspace creation (existing admin panel)
