# Public Site and App Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split marketing, docs, and app into separate deploy surfaces in one repo: `apps/site` (Pages), `apps/docs` (Pages), and root app (Workers), with no mixed-mode compatibility behavior and no backward-compatibility migration layer.

**Architecture:** Keep the existing app at repo root and make it app-only. Move docs from `docs/sites` to `apps/docs`. Build `apps/site` by reusing the current landing/legal implementation rather than rewriting it. Update deployment/config/docs so each surface is deployed independently, and introduce a single `PUBLIC_SITE_URL` config for app-to-site legal links.

**Tech Stack:** Bun, Astro 5, Cloudflare Workers, Cloudflare Pages, D1, GitHub Actions, `bun:test`

---

### Task 1: Lock Topology With Failing Architecture Tests

**Files:**
- Create: `src/__tests__/architecture/deployment-topology.test.ts`

**Step 1: Write the failing test**

Add assertions for the target topology:
- `apps/site/wrangler.toml` must exist
- `apps/docs/wrangler.toml` must exist
- `docs/sites/` must not exist
- root `package.json` docs scripts must use `apps/docs`
- docs deploy workflow must use `apps/docs`
- no committed source/test/doc file outside historical plan artifacts may still reference `docs/sites`

```ts
import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

function rgOutput(args: string[]): string {
  try {
    return execFileSync('rg', args, { encoding: 'utf-8' }).trim();
  } catch (error) {
    const result = error as { stdout?: string };
    return result.stdout?.trim() ?? '';
  }
}

describe('deployment topology', () => {
  test('uses apps/docs and apps/site deployment surfaces', () => {
    expect(existsSync('apps/docs/wrangler.toml')).toBe(true);
    expect(existsSync('apps/site/wrangler.toml')).toBe(true);
    expect(existsSync('docs/sites')).toBe(false);
  });

  test('docs scripts/workflow target apps/docs', () => {
    const pkg = readFileSync('package.json', 'utf-8');
    const wf = readFileSync('.github/workflows/deploy-docs-site.yml', 'utf-8');
    expect(pkg).toContain('--cwd apps/docs');
    expect(wf).toContain('apps/docs/**');
    expect(wf).toContain('workingDirectory: apps/docs');
  });

  test('non-historical source files no longer reference docs/sites', () => {
    const references = rgOutput(['-n', 'docs/sites', '.', '-g', '!docs/plans/**']);
    expect(references).toBe('');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/architecture/deployment-topology.test.ts`  
Expected: FAIL (missing `apps/site`, `apps/docs`, and old `docs/sites` references still present).

**Step 3: Commit test scaffold**

```bash
git add src/__tests__/architecture/deployment-topology.test.ts
git commit -m "test(architecture): add failing deployment topology contract"
```

### Task 2: Move Docs Project to `apps/docs`

**Files:**
- Move: `docs/sites/**` -> `apps/docs/**`
- Modify: `package.json` (docs scripts `--cwd apps/docs`)
- Modify: `.github/workflows/deploy-docs-site.yml`
- Modify: `COMMANDS.md` (docs commands and wrangler config path)
- Modify: source tests and internal docs that hardcode `docs/sites`

**Step 1: Write the failing behavior check (already in Task 1)**

No new test needed; reuse `deployment-topology.test.ts`.

**Step 2: Implement minimal move and path updates**

Key updates:
- `docs:dev`, `docs:build`, `docs:preview`, `docs:check`, `docs:deploy`
- Workflow path filters and `workingDirectory`
- Commands docs path references
- Tests that read docs content by path
- Docs content that describes repo layout and docs dev flow

Use `rg -n "docs/sites" . -g '!docs/plans/**'` to enumerate and fix all live references before considering this task complete.

**Step 3: Run targeted checks**

Run: `bun test src/__tests__/architecture/deployment-topology.test.ts`  
Expected: PASS for docs path assertions.

Run: `bun run docs:build`  
Expected: PASS (docs build from `apps/docs`).

Run: `bun run docs:check`  
Expected: PASS.

**Step 4: Commit**

```bash
git add apps/docs package.json .github/workflows/deploy-docs-site.yml COMMANDS.md src/__tests__ docs
git commit -m "refactor(docs): move docs site to apps/docs"
```

### Task 3: Create `apps/site` by Reusing the Existing Marketing Implementation

**Files:**
- Create: `apps/site/package.json`
- Create: `apps/site/astro.config.mjs`
- Create: `apps/site/tsconfig.json`
- Create: `apps/site/wrangler.toml`
- Create: `apps/site/src/pages/index.astro`
- Create: `apps/site/src/pages/terms.astro`
- Create: `apps/site/src/pages/privacy.astro`
- Create: `apps/site/public/_headers`
- Move or copy with reuse: current landing/legal components, layouts, assets, and content modules needed by the public site

**Step 1: Extend failing topology test**

Add checks for:
- `apps/site/src/pages/index.astro`
- `apps/site/src/pages/terms.astro`
- `apps/site/src/pages/privacy.astro`

Run: `bun test src/__tests__/architecture/deployment-topology.test.ts`  
Expected: FAIL (site files not present yet).

**Step 2: Implement minimal static site**

`apps/site/wrangler.toml` example:

```toml
name = "allowealth-site"
compatibility_date = "2026-03-11"
pages_build_output_dir = "./dist"
```

`apps/site/src/pages/index.astro` should come from the existing landing page implementation.  
`apps/site/src/pages/terms.astro` and `apps/site/src/pages/privacy.astro` should come from the existing legal pages.  
Reuse the current landing content/layout/components where practical instead of creating a parallel implementation from scratch.

`apps/site/public/_headers` should define baseline security headers for static routes.

**Step 3: Run checks**

Run: `bun test src/__tests__/architecture/deployment-topology.test.ts`  
Expected: PASS for site existence checks.

Run: `bun install --cwd apps/site && bun run --cwd apps/site build`  
Expected: PASS.

**Step 4: Commit**

```bash
git add apps/site src/__tests__/architecture/deployment-topology.test.ts
git commit -m "feat(site): add static marketing site in apps/site"
```

### Task 4: Make Root App App-Only and Remove `APP_MODE` Everywhere

**Files:**
- Delete: `src/lib/auth/app-mode.ts`
- Delete: `src/lib/auth/app-mode.test.ts`
- Modify: `src/middleware/route-guard.ts`
- Modify: `src/middleware/auth.ts`
- Modify: `src/middleware/csrf.ts`
- Modify: `src/__tests__/middleware/route-guard.test.ts`
- Delete/Replace: `src/__tests__/public-static-security.test.ts`
- Modify: `src/env.d.ts`
- Modify: `.env.example`
- Modify: `wrangler.toml.example`

**Step 1: Write/adjust failing tests**

Update route-guard tests to enforce app-only behavior:
- `/` redirects signed-out users to `/login`
- `/` redirects authenticated users to `/dashboard` or `/admin`
- no `APP_MODE` branch behavior

If needed, replace static-security test with new contract test:
- middleware does not special-case `['/', '/privacy', '/terms']`
- `APP_MODE` is no longer declared in env typings or example configs

Run: `bun test src/__tests__/middleware/route-guard.test.ts src/__tests__/public-static-security.test.ts`  
Expected: FAIL after test updates.

**Step 2: Implement minimal middleware changes**

`route-guard.ts` target pattern:

```ts
if (pathname === '/') {
  if (context.locals.user) return context.redirect(target, 302);
  return context.redirect('/login', 302);
}
```

Remove `isAppOnly()` imports and public-static route branches from middleware.
Remove `APP_MODE` from env typings and sample config surfaces in the same task so the repo does not keep dead deployment controls.

**Step 3: Run checks**

Run: `bun test src/__tests__/middleware/route-guard.test.ts`  
Expected: PASS.

Run: `bun run typecheck`  
Expected: PASS with removed `app-mode` imports.

**Step 4: Commit**

```bash
git add src/middleware src/__tests__/middleware src/__tests__/public-static-security.test.ts src/lib/auth src/env.d.ts .env.example wrangler.toml.example
git commit -m "refactor(app): remove app mode and enforce app-only routing"
```

### Task 5: Move Marketing Pages Out of Root App and Centralize Legal Link Configuration

**Files:**
- Delete: `src/pages/index.astro`
- Delete: `src/pages/privacy.astro`
- Delete: `src/pages/terms.astro`
- Modify: app-visible legal links to use a single public-site base URL config
- Create/modify: config helper for public-site URL resolution
- Optional cleanup: remove unused landing components/layout/content if no longer referenced

**Step 1: Add failing route-hygiene test**

Create/update test to assert root app no longer contains marketing page files:

```ts
expect(existsSync('src/pages/index.astro')).toBe(false);
expect(existsSync('src/pages/privacy.astro')).toBe(false);
expect(existsSync('src/pages/terms.astro')).toBe(false);
```

Run: `bun test src/__tests__/architecture/deployment-topology.test.ts`  
Expected: FAIL before deletions.

**Step 2: Implement minimal deletions and link updates**

Use `rg -n "terms|privacy"` on `src/` to find app-visible links and replace them via a shared helper, for example:
- `getPublicSiteUrl('/terms')`
- `getPublicSiteUrl('/privacy')`

Default `PUBLIC_SITE_URL` to `https://allowealth.io` for production-facing examples, but keep the app code reading from config so staging and future isolated app instances do not hardcode the production site domain.

**Step 3: Run checks**

Run: `bun test src/__tests__/architecture/deployment-topology.test.ts`  
Expected: PASS.

Run: `bun run build:cloudflare`  
Expected: PASS with app-only routes.

**Step 4: Commit**

```bash
git add src/pages src/components src/lib src/__tests__/architecture/deployment-topology.test.ts .env.example wrangler.toml.example
git commit -m "refactor(app): remove root marketing pages and centralize public site links"
```

### Task 6: Add `apps/site` Route and Security Contract Tests

**Files:**
- Create: `apps/site/src/__tests__/routes.test.ts` or equivalent site-level verification test
- Create/modify: `apps/site` validation command if needed
- Replace: root public static security test with `apps/site` headers contract test if coverage moved there

**Step 1: Add failing assertions to architecture test**

Assert:
- `apps/site` exposes only `/`, `/terms`, `/privacy`
- `apps/site` does not define `/login`, `/dashboard`, or other app routes
- `apps/site/public/_headers` carries CSP and frame protections for public routes

Run: `bun test src/__tests__/architecture/deployment-topology.test.ts`  
Expected: FAIL until route/security coverage is implemented.

**Step 2: Implement route/security verification**

The verification should prove:
- site build does not accidentally include app pages
- site `_headers` retains the CSP/X-Frame protections currently enforced in the root app
- root app no longer owns those public-route headers once the site is split

**Step 3: Run checks**

Run: `bun test src/__tests__/architecture/deployment-topology.test.ts`  
Expected: PASS.

Run: `bun run --cwd apps/site build`  
Expected: PASS.

**Step 4: Commit**

```bash
git add apps/site src/__tests__/architecture/deployment-topology.test.ts src/__tests__/public-static-security.test.ts
git commit -m "test(site): verify route isolation and static security headers"
```

### Task 7: Update Worker Example Config and Deployment Instructions

**Files:**
- Modify: `wrangler.toml.example`
- Modify: `README.md`
- Modify: `COMMANDS.md`
- Optional: modify `.github/workflows/deploy-cloudflare.yml` summary text to avoid assuming `allowealth.io`

**Step 1: Write failing topology test assertion**

Assert:
- `wrangler.toml.example` documents generic multi-worker manual setup
- app `PUBLIC_URL` and `PUBLIC_SITE_URL` examples are no longer tied to the old mixed deployment model
- app config no longer documents `APP_MODE=full/app_only` as a split mechanism

Run: `bun test src/__tests__/architecture/deployment-topology.test.ts`  
Expected: FAIL.

**Step 2: Implement docs/config updates**

`wrangler.toml.example` should show:
- generic worker name/domain placeholders
- copy/customize flow for multiple app workers
- separate DB per deployment instruction
- `PUBLIC_SITE_URL` for legal/marketing links
- no compatibility redirect guidance

**Step 3: Run checks**

Run: `bun test src/__tests__/architecture/deployment-topology.test.ts`  
Expected: PASS.

Run: `bun run format:fix`  
Expected: formatting clean.

**Step 4: Commit**

```bash
git add wrangler.toml.example README.md COMMANDS.md .github/workflows/deploy-cloudflare.yml src/__tests__/architecture/deployment-topology.test.ts .env.example
git commit -m "docs(deploy): document split topology and generic multi-worker setup"
```

### Task 8: Add Site Deploy Workflow (Pages)

**Files:**
- Create: `.github/workflows/deploy-site.yml`

**Step 1: Write failing topology test assertion**

Assert workflow file exists and contains:
- `paths: - 'apps/site/**'`
- `workingDirectory: apps/site`
- `command: pages deploy`

Run: `bun test src/__tests__/architecture/deployment-topology.test.ts`  
Expected: FAIL.

**Step 2: Implement workflow**

Mirror docs deploy workflow pattern, but target `apps/site`.

**Step 3: Run checks**

Run: `bun test src/__tests__/architecture/deployment-topology.test.ts`  
Expected: PASS.

**Step 4: Commit**

```bash
git add .github/workflows/deploy-site.yml src/__tests__/architecture/deployment-topology.test.ts
git commit -m "ci(site): add cloudflare pages deploy workflow for apps/site"
```

### Task 9: Final Verification and Integration Commit

**Files:**
- Modify as needed from previous tasks only

**Step 1: Run focused validation**

Run:

```bash
bun test src/__tests__/architecture/deployment-topology.test.ts
bun test src/__tests__/middleware/route-guard.test.ts
bun run docs:build
bun run docs:check
bun run --cwd apps/site build
bun run build:cloudflare
```

Expected: all pass.

**Step 2: Run quality gates (@superpowers:verification-before-completion)**

Run:

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: all pass.

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: split public site/docs from app deployment surfaces"
```
