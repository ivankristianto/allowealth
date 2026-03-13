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
- `DEMO_MODE=true` is set in the Cloudflare Workers environment (via CF dashboard or `wrangler.toml` vars) — not committed to the repo.

### 2. Demo Banner Component

**File:** `src/components/atoms/DemoBanner.astro`

Renders a full-width warning alert bar only when demo mode is active. Returns early (no output) otherwise.

- Uses DaisyUI `alert alert-warning` with `rounded-none` to span the full viewport width.
- Text: "This is a demo environment. All data resets daily."
- `role="alert"` for accessibility.
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

Steps:
1. Resolve target via `resolveTarget(args)` (same pattern as `aw db` commands).
2. Run `db empty` to wipe all data while preserving schema.
3. Run `db seed` to reseed with demo data.
4. Log success.

For D1 targets, both `empty` and `seed` already support the D1 driver through the `resolveTarget` mechanism and `D1_ENABLED` env flag.

### 6. GitHub Actions Workflow

**File:** `.github/workflows/demo-reset.yml`

Triggers:
- `schedule`: daily at `00:00 UTC` (configurable via cron expression in the workflow file)
- `workflow_dispatch`: for manual resets

Steps:
1. `actions/checkout`
2. `oven-sh/setup-bun` — install Bun
3. `bun install` — install dependencies (includes Wrangler)
4. `bun run aw demo reset --target d1`

Required GitHub secrets:
- `CLOUDFLARE_API_TOKEN` — Wrangler uses this to authenticate with Cloudflare
- `CLOUDFLARE_ACCOUNT_ID` — identifies the CF account

The `aw demo reset` command invokes Wrangler internally through the existing `exec` utility (`execFileSync`), which picks up `CLOUDFLARE_API_TOKEN` from the environment automatically.

---

## Data Flow

```
DEMO_MODE=true (CF env var)
        │
        ▼
  isDemoMode()          ←── called at SSR render time in MainLayout + affected pages
        │
   ┌────┴────┐
   │         │
Banner     UI gate
(MainLayout)  (settings / security / profile pages)
```

```
GitHub Actions (cron: daily)
        │
        ▼
bun run aw demo reset --target d1
        │
   ┌────┴──────────────┐
   │                   │
aw db empty          aw db seed
(wipe D1 data)    (reseed D1 data)
```

---

## Environment Variable

| Variable | Value | Where set |
|---|---|---|
| `DEMO_MODE` | `true` | Cloudflare Workers environment (CF dashboard or `wrangler.toml` `[vars]`) |

Not committed to the repository. Absent or any value other than `"true"` leaves demo mode off.

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
