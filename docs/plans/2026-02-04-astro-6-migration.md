# Astro 6 Beta + Cloudflare Adapter v13 Migration Plan

## Overview

Upgrade from Astro 5.16.15 → 6.x-beta, @astrojs/cloudflare 12.6.12 → 13.x-beta. This fixes the AstroContainer `hrefRoot` bug natively and gives first-class Cloudflare Workers support (dev server runs real workerd).

## Phase 0: Branch Setup

1. Create feature branch `feat/astro-6-migration`
2. Verify all quality gates pass on current code

## Phase 1: Package Updates

**Files:** `package.json`, `bun.lock`, `patches/`

1. Delete `patches/astro@5.16.15.patch`
2. Remove `patchedDependencies` section from `package.json`
3. Update packages:
   ```
   astro                → 6.x-beta
   @astrojs/cloudflare  → 13.x-beta (devDep)
   @astrojs/node        → 10.x (Astro 6 compatible)
   @astrojs/check       → latest (devDep)
   @astrojs/ts-plugin   → latest (devDep)
   ```
4. `bun install` — verify lockfile resolves

**Verify:** No install errors, no peer dependency conflicts

## Phase 2: Astro Config Migration

**File:** `astro.config.ts`

1. Remove `platformProxy: { enabled: true }` from Cloudflare adapter config (no longer needed — dev now uses real workerd)
2. Keep `wasmModuleImports: true` (verify it still exists in v13 API)
3. Keep custom CSP middleware — defer built-in `security.csp` evaluation to a later PR
4. Review `vite.ssr.external` list for Vite 7 compatibility (Astro 6 uses Vite 7)

**Verify:** `bun run typecheck` passes

## Phase 3: Cloudflare Runtime Env Migration (CRITICAL)

### 3A. Update runtime-env middleware

**File:** `src/middleware/runtime-env.ts`

Replace `(context.locals as any).runtime.env` with dynamic `import('cloudflare:workers')`:

```typescript
export const runtimeEnv: MiddlewareHandler = async (context, next) => {
  try {
    const { env: cfEnv } = await import('cloudflare:workers');
    if (cfEnv) {
      const envRecord: Record<string, string | undefined> = {};
      for (const [key, value] of Object.entries(cfEnv)) {
        if (typeof value === 'string') {
          envRecord[key] = value;
        }
      }
      // Hyperdrive binding
      const hyperdrive = (cfEnv as any).HYPERDRIVE;
      if (hyperdrive?.connectionString) {
        envRecord.DATABASE_URL = hyperdrive.connectionString;
        envRecord.HYPERDRIVE_ENABLED = 'true';
      }
      setRuntimeEnv(envRecord);
    }
  } catch {
    // Not in Workers runtime (Node adapter) — getEnv() falls back to process.env / import.meta.env
  }
  return next();
};
```

**Why dynamic import in try/catch:** `cloudflare:workers` only exists in workerd. When using Node adapter (`DEPLOY_TARGET=node`), the import fails silently and `getEnv()` falls back gracefully.

### 3B. Update type declarations (optional)

**File:** `src/env.d.ts`

Add `cfContext` to `App.Locals` for future `waitUntil()` usage:

```typescript
cfContext?: ExecutionContext;
```

### 3C. No changes needed

These files use `getEnv()` and remain untouched:

- `src/lib/env.ts` — `setRuntimeEnv()` / `getEnv()` / `requireEnv()` stay the same
- `src/db/config.ts` — `getDatabaseUrl()` uses `getEnv('DATABASE_URL')`
- `src/db/drivers/postgres.ts` — connection lifecycle unchanged
- `src/middleware/database.ts` — per-request management unchanged
- `src/lib/auth/lucia.ts` — custom adapter unchanged

**Verify:** `bun run typecheck`, `bun run dev` starts with Node adapter, test env var access

## Phase 4: Wrangler Config Update

**File:** `wrangler.toml`

1. Change `main` field:
   ```toml
   # BEFORE
   main = "dist/_worker.js/index.js"
   # AFTER
   main = "@astrojs/cloudflare/entrypoints/server"
   ```
2. Review `compatibility_flags` — check if `disable_nodejs_process_v2` is still needed or should be replaced
3. Keep Hyperdrive, assets, vars sections unchanged

**Verify:** `bun run build:cloudflare` succeeds

## Phase 5: Container API Verification

**Files (8 endpoints — no code changes expected):**

- `src/pages/api/transactions/index.ts`
- `src/pages/api/budget/overview.ts`
- `src/pages/api/budget/history.ts`
- `src/pages/api/reports/index.ts`
- `src/pages/api/reports/category-drilldown.ts`
- `src/pages/api/reports/category-transactions.ts`
- `src/pages/api/asset-categories/index.ts`
- `src/pages/api/asset-categories/[id].ts`

All use `experimental_AstroContainer` which remains experimental in Astro 6. Import path unchanged.

**Critical:** The removed patch fixed `hrefRoot: import.meta.url` in Workers. If Astro 6 hasn't fixed this upstream, create a new patch for the Astro 6 version.

**Verify:** Deploy to Workers, test `?_render=html&_partial=all` on transactions endpoint

## Phase 6: Full Pipeline Verification

1. `bun run lint:fix` — ESLint
2. `bun run stylelint:fix` — Stylelint
3. `bun run format:fix` — Prettier
4. `bun run typecheck` — TypeScript
5. `bun run build` — Node build
6. `bun run build:cloudflare` — Workers build
7. `bun test` — Unit tests
8. `bun run test:e2e` — E2E tests (if applicable)
9. Deploy to Workers and smoke test all interactive pages (transactions, budget, reports, assets)

## Phase 7: Documentation Cleanup

- Update `CLAUDE.md` version references
- Update comments in `src/middleware/runtime-env.ts` and `src/lib/env.ts`
- Remove any references to `Astro.locals.runtime` pattern in docs

## Risk Mitigation

| Risk                                                   | Mitigation                                                |
| ------------------------------------------------------ | --------------------------------------------------------- |
| Container API `hrefRoot` still broken in Astro 6       | Test early in Phase 5; create new patch if needed         |
| `cloudflare:workers` dynamic import fails during build | try/catch handles gracefully; verify Vite tree-shakes     |
| Vite 7 SSR externals conflict                          | Review build output; adjust `ssr.external` list           |
| Beta instability                                       | Work on feature branch; keep main on Astro 5 until stable |
