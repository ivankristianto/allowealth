# Demo Mode Design

**Issue:** ALL-38
**Date:** 2026-03-13
**Status:** Approved

## Summary

Add an environment-controlled demo mode that displays a persistent alert bar on every page and restricts account management actions in the UI. A GitHub Actions workflow resets all data daily by running the CLI against the production D1 database.

## Goals

- Communicate clearly to users that they are in a temporary demo environment.
- Prevent demo users from making persistent changes to account management settings.
- Keep the demo environment fresh with automatic daily resets — no manual maintenance.

## Out of Scope

- Per-user demo accounts or demo-specific roles.
- API-level enforcement of restrictions (UI-only gating is sufficient).
- Partial data resets or preservation of any settings across resets.

---

## Architecture

### 1. Demo Mode Utility

**File:** `src/lib/demo-mode.ts`

A single exported function that reads the `DEMO_MODE` environment variable using the existing `getEnv` utility:

```ts
import { getEnv } from '@/lib/env';

export function isDemoMode(): boolean {
  return getEnv('DEMO_MODE') === 'true';
}
```

- No new middleware. `getEnv` already resolves Cloudflare Workers runtime env, `process.env`, and `import.meta.env` in priority order.
- `DEMO_MODE=true` is set in the Cloudflare Workers environment (via CF dashboard or `wrangler.toml` `[vars]`) — not committed to the repo.
- **`isDemoMode()` must only be called at request time** — inside Astro frontmatter or API route handlers, after middleware has populated the Workers runtime env. Never at module load time (e.g., as a top-level constant outside a request handler), or it will return `false` on Cloudflare Workers where `runtimeEnv` is not yet set.

### 2. Demo Banner Component

**File:** `src/components/atoms/DemoBanner.astro`

Renders a full-width warning alert bar only when demo mode is active. Returns early (no output) otherwise.

- Uses DaisyUI `alert alert-warning` with `rounded-none` to span the full viewport width.
- Text: "This is a demo environment. All data resets daily."
- `role="alert"` for accessibility.
- The banner is **static** (not fixed/sticky). It flows before the `<Header>` in the DOM.
- No client-side JavaScript.

### 3. MainLayout Integration

**File:** `src/layouts/MainLayout.astro`

`DemoBanner` is inserted as the first child of the drawer content `<div>`, above the `<Header>`. This ensures the banner appears on every protected page with zero per-page changes.

```astro
<div class="drawer-content flex flex-col ...">
  <DemoBanner />
  <Header ... />
  <slot />
</div>
```

The banner is static and flows with the page. If the `<Header>` is sticky, verify during implementation that the `<main>` top-padding (`pt-28` / `pt-40`) still accounts for the banner height, and adjust as needed.

### 4. UI Restrictions

All restrictions use Astro conditional rendering (`{!demoMode && <Component />}`). Elements are absent from the DOM — not just visually hidden. A short notice ("Some settings are disabled in demo mode.") replaces hidden elements so users understand why they are missing.

Each page reads `isDemoMode()` in its frontmatter:

```ts
const demoMode = isDemoMode();
```

#### `/settings`

| Element | Behavior in demo mode |
|---|---|
| "Invite Member" button | Hidden |
| Pending invitations list | Hidden |
| Empty-state invitations message | Hidden |

#### `/security`

| Element | Behavior in demo mode |
|---|---|
| `<SecurityMfaCard>` | Hidden entirely |
| `<SecuritySessionsCard>` | Hidden entirely |

#### `/profile`

| Element | Behavior in demo mode |
|---|---|
| Password change form | Hidden |
| Profile edit form | Hidden |

### 5. CLI Command

**File:** `src/cli/commands/demo.ts`
**Registered in:** `src/cli/index.ts`

New `aw demo` top-level command with a `reset` subcommand:

```
bun run aw demo reset [--target sqlite|d1|d1-local]
```

Implementation steps:

1. Resolve target via `resolveTarget(args)` — same pattern as `aw db` commands.
2. Use the project's `exec` helper (`src/cli/lib/exec.ts`, wraps `execFileSync`) to run `src/db/empty.ts` via Bun, wiping all data while preserving schema. `AW_TARGET` and `D1_ENABLED` are inherited by the subprocess via `process.env`.
3. Use the same `exec` helper to run `src/db/seed/index.ts --months=3` via Bun, reseeding with demo data. Three months of data is the appropriate volume for a demo environment.
4. Log success.

**Note on the seeder's production guard:** The seeder guards against running in production by checking `import.meta.env.MODE === 'production'`. When invoked via `bun run src/db/seed/index.ts` (as done here), `MODE` defaults to `'development'`, so the guard does not activate. This is intentional — the CLI is the authoritative mechanism for triggering resets, and requiring a separate `ALLOW_SEED=true` env var in CI would be redundant given that the workflow already requires Cloudflare credentials.

### 6. GitHub Actions Workflow

**File:** `.github/workflows/demo-reset.yml`

Triggers:
- `schedule`: daily at `00:00 UTC` (configurable via the cron expression in the workflow file)
- `workflow_dispatch`: for manual resets

Steps:
1. `actions/checkout`
2. `oven-sh/setup-bun` — install Bun
3. `bun install` — install dependencies (includes Wrangler)
4. `bun run aw demo reset --target d1`

Required GitHub secrets:
- `CLOUDFLARE_API_TOKEN` — Wrangler uses this to authenticate with Cloudflare
- `CLOUDFLARE_ACCOUNT_ID` — identifies the CF account

The `aw demo reset` command invokes Wrangler internally through the project's `exec` helper (`execFileSync`), which inherits `CLOUDFLARE_API_TOKEN` from the environment automatically. The D1 database binding is read from `wrangler.toml` (already committed to the repo), so no additional `CLOUDFLARE_DATABASE_ID` secret is required.

**Note on reset timing:** The reset runs at 00:00 UTC daily. The banner text says "data resets daily" without specifying a time, which is intentional — users see the banner regardless of their timezone and understand the environment is ephemeral.

---

## Data Flow

```
DEMO_MODE=true (CF env var)
        |
        v
  isDemoMode()          <-- called at SSR render time in MainLayout + affected pages
        |
   +----+----+
   |         |
Banner     UI gate
(MainLayout)  (settings / security / profile pages)
```

```
GitHub Actions (cron: daily at 00:00 UTC)
        |
        v
bun run aw demo reset --target d1
        |
   +----+-------------------------------+
   |                                   |
bun run src/db/empty.ts     bun run src/db/seed/index.ts --months=3
(wipe D1 data)              (reseed D1 with 3 months of demo data)
```

---

## Environment Variables

| Variable | Value | Where set |
|---|---|---|
| `DEMO_MODE` | `true` | Cloudflare Workers environment (CF dashboard or `wrangler.toml` `[vars]`) |
| `CLOUDFLARE_API_TOKEN` | (secret) | GitHub Actions secret |
| `CLOUDFLARE_ACCOUNT_ID` | (secret) | GitHub Actions secret |

`DEMO_MODE` is not committed to the repository. Absent or any value other than `"true"` leaves demo mode off.

---

## Implementation Order

Following the project's UI → Service → API → CLI → Seeder convention:

1. `src/lib/demo-mode.ts` — utility
2. `src/components/atoms/DemoBanner.astro` — banner component
3. `src/layouts/MainLayout.astro` — inject banner
4. `src/pages/settings/index.astro` — hide invite UI
5. `src/pages/security.astro` — hide MFA + sessions cards
6. `src/pages/profile.astro` — hide password + profile edit forms
7. `src/cli/commands/demo.ts` — `aw demo reset` command
8. `src/cli/index.ts` — register `demo` subcommand
9. `.github/workflows/demo-reset.yml` — scheduled workflow

---

## Acceptance Criteria

- [ ] Alert bar appears at the top of every page when `DEMO_MODE=true`
- [ ] Alert message indicates data resets daily
- [ ] "Invite Member" button and invitations section are absent from `/settings` in demo mode
- [ ] Password change and profile edit forms are absent from `/profile` in demo mode
- [ ] MFA setup/management card is absent from `/security` in demo mode
- [ ] Active sessions card is absent from `/security` in demo mode
- [ ] A "disabled in demo mode" notice replaces each hidden section
- [ ] All restrictions are absent when `DEMO_MODE` is unset or not `"true"`
- [ ] `bun run aw demo reset --target d1` wipes and reseeds D1 successfully
- [ ] GitHub Actions workflow runs on schedule and on manual dispatch
- [ ] Quality gates pass: lint, stylelint, format, typecheck
