# Astro 7 Maintenance Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Astro from 6.4.4 to 7.1.3 and bring every other dependency to its latest compatible version across all four manifests, on a single branch.

**Architecture:** Sequential dependency upgrades ordered lowest-risk-first, with a captured HTML baseline taken *before* any dependency changes so the `compressHTML: 'jsx'` whitespace change can be diffed rather than eyeballed. Astro core lands before the lint toolchain, because a broken build is easier to diagnose than a broken build plus a broken linter.

**Tech Stack:** Bun 1.3.9, Astro 7 (Vite 8 / Rolldown, `@astrojs/compiler-rs`), Tailwind v4 + DaisyUI v5, Drizzle ORM, Playwright, ESLint 10, Stylelint 17.

**Spec:** `docs/superpowers/specs/2026-07-25-astro-7-maintenance-upgrade-design.md`

## Global Constraints

- Branch is `chore/maintenance-astro-7-upgrade`. Already created. Do not branch again.
- `typescript` stays `^5.9.3`. Never raise it. `@astrojs/check@0.9.9` peers `typescript: ^5.0.0 || ^6.0.0` and `@typescript-eslint/eslint-plugin@8.65.0` peers `typescript: >=4.8.4 <6.1.0`.
- Do **not** add a `compressHTML` key to `astro.config.ts`. The new `'jsx'` default is being adopted deliberately.
- Package manager is `bun`. Use `bun install`, never `npm install`. There is no workspaces field — each of the four manifests installs separately.
- The four manifests: `./package.json`, `apps/docs/package.json`, `apps/site/package.json`, `apps/mcp/package.json`.
- Quality gates, all blocking: `bun run lint:fix`, `bun run stylelint:fix`, `bun run format:fix`, `bun run typecheck`.
- Client JS bundle budget: 250 kB gzipped.
- No `bun:` protocol imports may reach middleware-imported code. Verify with `grep -r "bun:" src/ --exclude-dir=node_modules`.
- A husky pre-commit hook runs `lint-staged` plus `bun run typecheck` on every commit. Commits will fail while gates are red. That is intended — fix forward, do not use `--no-verify` unless a step explicitly says to.
- Never `git checkout` or revert a file outside the task's stated scope.
- Use DaisyUI semantic classes and `@lucide/astro` icons. Do not introduce Tailwind palette colors or inline SVG.

## File Structure

**Created:**

| Path | Responsibility |
| --- | --- |
| `e2e/tools/snapshot.config.ts` | Standalone Playwright config for HTML capture. Isolated from the main E2E config so snapshot runs never pollute `test-results/`. |
| `e2e/tools/routes.ts` | The single source of truth for which routes get snapshotted. Imported by the capture spec. |
| `e2e/tools/normalize.ts` | Strips volatile markup (nonces, CSRF tokens, scoped-style hashes) so a diff shows whitespace and structure only. |
| `e2e/tools/capture.spec.ts` | Walks `routes.ts`, normalizes each response, writes one file per route. |

**Modified:**

| Path | Change |
| --- | --- |
| `package.json` | Dependency versions; remove `@types/decimal.js` and `lucide`; add `globals`, `jiti`, `eslint-plugin-jsx-a11y`; `prepare` script for husky 9; add `snapshot:html` script. |
| `astro.config.ts:70-79` | Replace Rollup `manualChunks` with Rolldown `advancedChunks`. |
| `eslint.config.js` | ESLint 10 + `eslint-plugin-astro@3` migration. |
| `stylelint.config.js` | Stylelint 17 migration; drop redundant `stylelint-config-recommended`. |
| `.husky/pre-commit` | Remove the husky 8 sourcing preamble. |
| `apps/docs/package.json` | Astro 7, Starlight 0.41, new `@astrojs/markdown-remark` dep. |
| `apps/site/package.json` | Astro 7, Lucide 1, minors. |
| `apps/mcp/package.json` | Align `@modelcontextprotocol/sdk` and `valibot` with root. |
| `.github/workflows/{quality-gates,deploy-cloudflare,deploy-site,deploy-docs-site}.yml` | `node-version` 22.12.0 → 24.18.0 (5 occurrences across 4 files). |
| `.claude/CLAUDE.md:8,18` | Framework version and the "Astro 6 Note" heading. |
| `AGENTS.md:15` | Baseline line. |
| `docs/prd.md:1155` | Framework version (currently reads "Astro 4.x" — already stale). |
| `.gitignore` | Ignore `.snapshots/`. |

---

### Task 1: Capture the Astro 6 HTML baseline

This must complete **before any dependency changes**. Once Astro 7 is installed the before-picture is unrecoverable without a revert.

**Files:**
- Create: `e2e/tools/routes.ts`
- Create: `e2e/tools/normalize.ts`
- Create: `e2e/tools/capture.spec.ts`
- Create: `e2e/tools/snapshot.config.ts`
- Modify: `package.json` (add `snapshot:html` script)
- Modify: `.gitignore` (add `.snapshots/`)

**Interfaces:**
- Consumes: `e2e/.auth/user.json` (existing Playwright storage state), the `setup` project in `e2e/playwright.config.ts` which matches `global-setup.ts`.
- Produces: `SNAPSHOT_ROUTES: string[]` from `routes.ts`; `normalizeHtml(html: string): string` from `normalize.ts`; snapshot files at `.snapshots/$SNAPSHOT_DIR/<slug>.html`.

- [ ] **Step 1: Create the route list**

Static routes only. Dynamic `[id]` routes are excluded because they need seeded IDs, and their layouts are already covered by the index routes.

Create `e2e/tools/routes.ts`:

```typescript
/**
 * Routes captured by the HTML snapshot tool.
 *
 * Static routes only — dynamic `[id]` routes need seeded IDs and their
 * layouts are already exercised by the corresponding index route.
 *
 * Deliberately excluded because each needs state the snapshot run cannot
 * establish: `/installer` (only renders pre-setup), `/login/verify-mfa`
 * (needs a pending MFA challenge), `/oauth/authorize` and
 * `/oauth/display-token` (need an in-flight OAuth request).
 */
export const SNAPSHOT_ROUTES: string[] = [
  '/login',
  '/signup',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/dashboard',
  '/profile',
  '/security',
  '/settings',
  '/upgrade',
  '/calculators',
  '/onboarding',
  '/accounts',
  '/accounts/closed',
  '/accounts/history',
  '/accounts/categories',
  '/budget',
  '/budget/history',
  '/budget/categories',
  '/transactions',
  '/transactions/import',
  '/transactions/export',
  '/recurring',
  '/recurring/forecast',
  '/forecast',
  '/reports',
  '/reports/expenses',
  '/reports/income',
  '/reports/members',
  '/admin',
  '/admin/audit-logs',
  '/admin/diagnostics',
  '/admin/users',
  '/admin/workspaces',
];

/** Convert a route path into a safe snapshot filename. */
export function routeToSlug(route: string): string {
  const trimmed = route.replace(/^\//, '').replace(/\/$/, '');
  return (trimmed === '' ? 'index' : trimmed.replace(/\//g, '__')) + '.html';
}
```

- [ ] **Step 2: Create the normalizer**

Astro 7 changes scoped-style hashes and CSS serialization, and every request gets a fresh CSP nonce and CSRF token. Without normalization those swamp the whitespace signal.

Create `e2e/tools/normalize.ts`:

```typescript
/**
 * Remove markup that legitimately varies between runs or between Astro
 * versions, so a snapshot diff surfaces whitespace and structure only.
 *
 * Deliberately does NOT collapse whitespace — whitespace is what we measure.
 */
export function normalizeHtml(html: string): string {
  return (
    html
      // Per-request CSP nonce
      .replace(/nonce="[^"]*"/g, 'nonce="NONCE"')
      // CSRF tokens in hidden inputs
      .replace(
        /(name="(?:_csrf|csrfToken|csrf_token)"\s+value=")[^"]*"/gi,
        '$1CSRF"'
      )
      // Astro scoped-style hashes: class="astro-abc123" / data-astro-cid-abc123
      .replace(/astro-[a-z0-9]{6,}/gi, 'astro-HASH')
      .replace(/data-astro-cid-[a-z0-9]{6,}/gi, 'data-astro-cid-HASH')
      // Hashed asset filenames
      .replace(/\.([A-Za-z0-9_-]{8})\.(js|css)/g, '.HASH.$2')
      // Absolute timestamps and ISO dates
      .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, 'TIMESTAMP')
      // Session/request ids Astro or Better Auth may embed.
      // Capturing group — a non-capturing (?:...) would leave $1 undefined.
      .replace(/"(sessionId|requestId)":"[^"]*"/g, '"$1":"ID"')
  );
}
```

- [ ] **Step 3: Create the capture spec**

Create `e2e/tools/capture.spec.ts`:

```typescript
import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SNAPSHOT_ROUTES, routeToSlug } from './routes';
import { normalizeHtml } from './normalize';

const dir = process.env.SNAPSHOT_DIR;
if (!dir) throw new Error('SNAPSHOT_DIR must be set (e.g. "before" or "after")');

const outDir = join(process.cwd(), '.snapshots', dir);

test.describe.configure({ mode: 'serial' });

test('capture normalized HTML for every snapshot route', async ({ page }) => {
  test.setTimeout(SNAPSHOT_ROUTES.length * 15_000);
  mkdirSync(outDir, { recursive: true });

  const failures: string[] = [];

  for (const route of SNAPSHOT_ROUTES) {
    const response = await page.goto(route, { waitUntil: 'load' });
    const status = response?.status() ?? 0;

    // Record the status so a route that starts 500ing after the upgrade
    // shows up as a diff instead of silently vanishing.
    const html = await page.content();
    const body = `<!-- route: ${route} status: ${status} -->\n${normalizeHtml(html)}\n`;
    writeFileSync(join(outDir, routeToSlug(route)), body, 'utf8');

    if (status >= 500) failures.push(`${route} -> ${status}`);
  }

  if (failures.length > 0) {
    throw new Error(`Routes returned 5xx during capture:\n${failures.join('\n')}`);
  }
});
```

- [ ] **Step 4: Create the snapshot Playwright config**

Mirrors `e2e/playwright.config.ts:36-47` webServer settings so capture runs against the same seeded E2E database. Create `e2e/tools/snapshot.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

const E2E_PORT = 4320;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

/**
 * Isolated config for the HTML snapshot tool. Kept separate from
 * e2e/playwright.config.ts so snapshot runs never overwrite E2E reports.
 */
export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: '../../test-results/snapshot-artifacts',

  use: {
    baseURL: E2E_BASE_URL,
    trace: 'off',
    screenshot: 'off',
  },

  webServer: {
    command: 'bun run dev',
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      DATABASE_URL: 'db/.e2e.db',
      PORT: String(E2E_PORT),
      DEV_HOST: 'localhost',
      SIGNUP_MODE: 'public',
      E2E_USER_EMAIL: 'demo@example.com',
      E2E_USER_PASSWORD: 'demo123456789',
    },
  },

  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
      testDir: '../tests',
    },
    {
      name: 'capture',
      testMatch: /capture\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});
```

- [ ] **Step 5: Add the npm script and gitignore entry**

In `package.json`, add to `scripts` immediately after the `"test:e2e:report"` line:

```json
    "snapshot:html": "playwright test --config=e2e/tools/snapshot.config.ts",
```

Append to `.gitignore`:

```
# HTML snapshots for the compressHTML whitespace audit
.snapshots/
```

- [ ] **Step 6: Ensure the E2E database is seeded**

Run: `bun run test:e2e:setup`

Expected: script completes and `db/.e2e.db` exists. Verify with `ls -la db/.e2e.db`.

- [ ] **Step 7: Capture the baseline**

Run: `SNAPSHOT_DIR=before bun run snapshot:html`

Expected: PASS. Then verify the file count matches the route list:

```bash
ls .snapshots/before | wc -l   # expect 34
grep -c "status: 200" .snapshots/before/dashboard.html   # expect 1
```

If any route reports a 5xx the test fails. Fix the route or remove it from `routes.ts` with a comment explaining why — do not proceed with a broken baseline, because a broken baseline hides real regressions later.

- [ ] **Step 8: Commit**

```bash
git add e2e/tools package.json .gitignore
git commit -m "test(tools): add HTML snapshot tool for compressHTML audit

Captures normalized HTML per route so the Astro 7 compressHTML: 'jsx'
whitespace change can be diffed rather than eyeballed across 276 .astro
files. Normalizer strips per-request nonces, CSRF tokens, scoped-style
hashes and asset hashes while deliberately preserving whitespace."
```

---

### Task 2: Remove dead dependencies and declare implicit ones

Smallest possible change, verified independently, so later failures cannot be blamed on it.

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `globals` becomes a declared devDependency, which `eslint.config.js:4` already imports and Task 9 relies on.

- [ ] **Step 1: Confirm both removals are genuinely unused**

```bash
grep -rn --include="*.ts" --include="*.astro" --include="*.js" --include="*.mjs" -E "(from|import|require\()\s*['\"]lucide['\"]" . --exclude-dir=node_modules
grep -rn "@types/decimal" src/ apps/ scripts/ e2e/ tests/ --exclude-dir=node_modules
```

Expected: both produce no output. If either produces a match, stop and report — the spec's removal decision was wrong and needs revisiting.

- [ ] **Step 2: Remove the two dependencies and add `globals`**

```bash
bun remove lucide @types/decimal.js
bun add -d globals
```

`lucide` (vanilla) has no source imports; `@types/decimal.js` is a stub because `decimal.js` ships its own types. `globals` is imported by `eslint.config.js` but currently only reaches `node_modules` transitively through eslint 9, which breaks under eslint 10.

- [ ] **Step 3: Verify types still resolve without `@types/decimal.js`**

Run: `bun run typecheck`

Expected: `0 errors`. If `Decimal` type errors appear, `decimal.js` bundled types are not being picked up — check `tsconfig.json` `types`/`moduleResolution` before reinstating the stub.

- [ ] **Step 4: Verify lint still runs**

Run: `bun run lint`

Expected: no `Cannot find package 'globals'` error, and no new errors versus the baseline.

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock
git commit -m "chore(deps): drop dead deps, declare globals explicitly

Remove lucide (vanilla) — no source imports — and @types/decimal.js, a
stub package superseded by decimal.js's own bundled types.

Add globals as an explicit devDependency. eslint.config.js imports it but
it only reached node_modules transitively via eslint 9, which would break
under eslint 10."
```

---

### Task 3: Apply in-range minor and patch upgrades

Everything satisfiable without a semver-major change, across all four manifests.

**Files:**
- Modify: `package.json`, `apps/docs/package.json`, `apps/site/package.json`, `apps/mcp/package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `wrangler` at 4.114.0, which satisfies `@astrojs/cloudflare@14`'s `wrangler: ^4.83.0` peer in Task 4.

- [ ] **Step 1: Upgrade root minors**

```bash
bun add better-auth@1.6.25 @better-auth/passkey@1.6.25 daisyui@5.7.0 \
  tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 nanostores@1.4.1 \
  simple-icons@16.27.0 @modelcontextprotocol/sdk@1.29.0 valibot@1.4.2
bun add -d @playwright/test@1.62.0 happy-dom@20.11.1 prettier@3.9.6 \
  @typescript-eslint/eslint-plugin@8.65.0 @typescript-eslint/parser@8.65.0 \
  wrangler@4.114.0 @astrojs/ts-plugin@1.10.10 @tailwindcss/typography@0.5.20
```

- [ ] **Step 2: Upgrade `apps/mcp` to match root**

```bash
cd apps/mcp && bun add @modelcontextprotocol/sdk@1.29.0 valibot@1.4.2 && cd ../..
```

`apps/mcp/node_modules` was reported MISSING for both packages, so this is also its first real install.

- [ ] **Step 3: Upgrade `apps/site` minors**

`apps/site/node_modules` has `astro 5.16.15` against a `6.0.8` manifest, so it is stale and needs a clean install.

```bash
cd apps/site
rm -rf node_modules
bun add daisyui@5.7.0 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 motion@12.42.2 @astrojs/sitemap@3.7.3
bun add -d @astrojs/check@0.9.9 @astrojs/ts-plugin@1.10.10 @tailwindcss/typography@0.5.20 wrangler@4.114.0
cd ../..
```

- [ ] **Step 4: Upgrade `apps/docs` minors**

```bash
cd apps/docs
bun add @astrojs/sitemap@3.7.3 wrangler@4.114.0
bun add -d @astrojs/check@0.9.9
cd ../..
```

Starlight stays on 0.38.x here. It moves to 0.41 in Task 7, together with Astro 7, because 0.41 peers `astro ^7.0.2` and installing it now would leave an unsatisfiable peer.

- [ ] **Step 5: Run the full gate set**

```bash
bun run typecheck
bun run lint
bun run test
bun run build
bun run landing:build
bun run docs:build
```

Expected: all pass. `typecheck` reports `0 errors`.

- [ ] **Step 6: Commit**

```bash
git add package.json bun.lock apps/*/package.json apps/*/bun.lock
git commit -m "chore(deps): apply in-range minor and patch upgrades

Bumps every dependency satisfiable without a semver-major change across
all four manifests. wrangler reaches 4.114.0, which satisfies the
wrangler ^4.83.0 peer that @astrojs/cloudflare 14 requires next.

Also reinstalls apps/site, whose node_modules held astro 5.16.15 against
a 6.0.8 manifest, and apps/mcp, which had no install at all."
```

---

### Task 4: Upgrade the root app to Astro 7

The highest-risk task. Astro 7 brings Vite 8 (Rolldown), `@astrojs/compiler-rs` as the only compiler, and stricter HTML parsing across 276 `.astro` files.

**Files:**
- Modify: `package.json`
- Modify: `astro.config.ts:70-79`
- Modify: any `.astro` file the Rust compiler rejects

**Interfaces:**
- Consumes: `wrangler@4.114.0` from Task 3.
- Produces: Astro 7 installed, which Tasks 6 and 7 mirror in the sub-apps, and the `.snapshots/after` capture in Task 8 depends on.

- [ ] **Step 1: Upgrade Astro, the adapters, and the visualizer**

`rollup-plugin-visualizer` must reach 7.x in the same step: v6 peers `rollup` only, while Vite 8 is Rolldown-based, so a v6 visualizer plugin in `astro.config.ts:82-93` will fail to load.

```bash
bun add astro@7.1.3 @astrojs/node@11.0.2
bun add -d @astrojs/cloudflare@14.1.4 rollup-plugin-visualizer@7.0.1
```

- [ ] **Step 2: Migrate `manualChunks` to Rolldown `advancedChunks`**

In `astro.config.ts`, replace this block:

```typescript
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/chart.js')) return 'chartjs';
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion'))
              return 'motion';
          },
        },
      },
```

with:

```typescript
      rollupOptions: {
        output: {
          advancedChunks: {
            groups: [
              { name: 'chartjs', test: /node_modules[\\/]chart\.js/ },
              { name: 'motion', test: /node_modules[\\/](motion|framer-motion)/ },
            ],
          },
        },
      },
```

Rolldown replaces Rollup's `manualChunks` callback with a declarative `advancedChunks.groups` array. The `test` patterns must match the same paths the callback matched.

- [ ] **Step 3: Build and collect every compiler error**

Run: `bun run build 2>&1 | tee /tmp/astro7-build.log`

Expected on first run: possible failures from the Rust compiler on unclosed non-void tags, plus possible Rolldown config errors. Both are the point of this step.

- [ ] **Step 4: Fix compiler and config errors, one concern per commit**

Work the log from the top. Two error classes, handled differently:

*Unclosed tags.* The Rust compiler rejects omitted end tags on non-void elements. Add the missing closing tag. Do not restructure the markup beyond closing the tag.

*Invalid nesting.* The Go compiler silently relocated block elements out of `<p>` per the HTML parsing spec; the Rust compiler does not. Fix by changing the wrapper element (usually `<p>` → `<div>`), not by moving content.

Re-run `bun run build` after each fix. Commit in small batches grouped by error class:

```bash
git add <files>
git commit -m "fix(astro): close omitted end tags for the Rust compiler

Astro 7's @astrojs/compiler-rs rejects omitted end tags on non-void
elements, which the Go compiler previously auto-corrected."
```

- [ ] **Step 5: Verify the Cloudflare build**

Run: `bun run build:cloudflare`

Expected: succeeds. This exercises `@astrojs/cloudflare@14` rather than `@astrojs/node@11`.

- [ ] **Step 6: Verify no `bun:` imports leaked into middleware paths**

Run: `grep -rn "bun:" src/middleware/ || echo "clean"`

Expected: `clean`. Cloudflare Workers cannot load `bun:` protocol imports from middleware.

- [ ] **Step 7: Verify chunk splitting survived the Rolldown migration**

```bash
ls dist/client/_astro/ | grep -iE "chartjs|motion"
```

Expected: chunk files matching both names. If absent, `advancedChunks.groups` did not match — check the built module paths and correct the `test` regexes. Silent failure here inflates the main bundle without erroring.

- [ ] **Step 8: Run remaining gates**

```bash
bun run typecheck
bun run test
```

Expected: `typecheck` reports `0 errors`; unit tests pass.

If `bun run lint` fails with an Astro parse error at this point, jump ahead to Task 9 — `eslint-plugin-astro@1.7` uses the old `@astrojs/compiler` and v3 moves to `@astrojs/compiler-rs`. Note the jump in the commit message so the ordering change is traceable.

- [ ] **Step 9: Commit**

```bash
git add package.json bun.lock astro.config.ts
git commit -m "feat(deps): upgrade root app to Astro 7.1.3

Astro 7 brings Vite 8 (Rolldown), @astrojs/compiler-rs as the only
compiler, and Sätteri as the default Markdown pipeline. Adapters move to
@astrojs/node 11 and @astrojs/cloudflare 14, both of which peer astro ^7.

Migrates the chart.js/motion chunk split from Rollup's manualChunks
callback to Rolldown's declarative advancedChunks.groups, and raises
rollup-plugin-visualizer to 7.x for its rolldown peer.

compressHTML is intentionally left unset to adopt the new 'jsx' default;
the whitespace audit follows in a later commit."
```

---

### Task 5: Upgrade Lucide to 1.26

**Files:**
- Modify: `package.json`
- Modify: `apps/site/package.json`
- Modify: any `.astro` file importing a renamed icon

**Interfaces:**
- Consumes: Astro 7 from Task 4 (`@lucide/astro@1.26.0` peers `astro ^4 || ^5 || ^6 || ^7`).
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Upgrade in both manifests**

```bash
bun add @lucide/astro@1.26.0
cd apps/site && bun add @lucide/astro@1.26.0 && cd ../..
```

- [ ] **Step 2: Build to surface renamed or removed icons**

Run: `bun run build 2>&1 | grep -iE "lucide|does not provide an export" || echo "no lucide errors"`

Expected: `no lucide errors`. Lucide 1.0 removed all brand icons, but this project sources brand marks from `simple-icons`, and all ~120 icons imported across 168 sites are non-brand. Renames remain possible and appear here as missing-export errors.

- [ ] **Step 3: Fix any renamed icon imports**

For each missing export, find the new name at `https://lucide.dev/icons` and update the import. Example shape of the fix:

```astro
---
// Before
import { TextSelect } from '@lucide/astro';
// After
import { SquareDashedText } from '@lucide/astro';
---
```

Update every usage site in the file, not just the import. Re-run Step 2 until clean.

- [ ] **Step 4: Audit icon-only buttons for accessible names**

Lucide 1.0 sets `aria-hidden="true"` on icons by default, so an icon-only button that previously leaned on the SVG for its accessible name now has none.

```bash
grep -rn "btn-square\|btn-circle\|btn-ghost btn-sm" src/components/ --include="*.astro" | head -40
```

For each hit, confirm the button carries an `aria-label` or visible text. Where missing, add one:

```astro
<button class="btn btn-square btn-ghost" aria-label="Delete transaction">
  <Trash2 class="h-4 w-4" />
</button>
```

This matches the existing project rule about adding tooltips and labels to icon-only buttons.

- [ ] **Step 5: Verify gates**

```bash
bun run typecheck
bun run build
bun run landing:build
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add package.json bun.lock apps/site/package.json apps/site/bun.lock src apps/site/src
git commit -m "feat(deps): upgrade @lucide/astro to 1.26

Lucide 1.0 removed all brand icons for trademark reasons; this project
sources brand marks from simple-icons, so no icon replacements were
needed. Icons now default to aria-hidden=\"true\", so icon-only buttons
were audited to confirm each still exposes an accessible name."
```

---

### Task 6: Upgrade `apps/site` to Astro 7

**Files:**
- Modify: `apps/site/package.json`
- Modify: any `apps/site/src/**/*.astro` the Rust compiler rejects

**Interfaces:**
- Consumes: the Rust-compiler fix patterns established in Task 4.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Upgrade Astro**

```bash
cd apps/site && bun add astro@7.1.3 && cd ../..
```

- [ ] **Step 2: Build and fix compiler errors**

Run: `bun run landing:build`

Expected: may fail on unclosed tags or invalid nesting. Apply the same two fix patterns as Task 4 Step 4 — add missing closing tags; change the wrapper element for invalid nesting. Re-run until it succeeds.

- [ ] **Step 3: Verify the site typechecks**

Run: `bun run landing:check`

Expected: `0 errors`.

- [ ] **Step 4: Confirm static security headers are intact**

`apps/site` is a static build whose prerendered HTML bypasses Astro middleware entirely, so its security headers live in `public/_headers`.

```bash
cat apps/site/public/_headers 2>/dev/null || echo "MISSING — investigate before proceeding"
ls apps/site/dist/_headers
```

Expected: the file exists in both source and build output. If Astro 7 stopped copying it, that is a real regression to fix, not a warning to note.

- [ ] **Step 5: Commit**

```bash
git add apps/site
git commit -m "feat(deps): upgrade apps/site to Astro 7.1.3"
```

---

### Task 7: Upgrade `apps/docs` to Astro 7 and Starlight 0.41

**Files:**
- Modify: `apps/docs/package.json`
- Modify: `apps/docs/astro.config.mjs` if Starlight's config shape changed

**Interfaces:**
- Consumes: nothing from earlier tasks beyond the Task 4 fix patterns.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Upgrade Astro, Starlight, and add the markdown-remark peer**

`@astrojs/starlight@0.41.4` peers both `astro ^7.0.2` and `@astrojs/markdown-remark ^7.2.0`. The latter must become an explicit dependency: Astro 7 defaults to the Sätteri Markdown pipeline, and Starlight's remark/rehype-based content needs the remark pipeline package present.

```bash
cd apps/docs
bun add astro@7.1.3 @astrojs/starlight@0.41.4 @astrojs/markdown-remark@7.2.1
cd ../..
```

- [ ] **Step 2: Build**

Run: `bun run docs:build`

Expected: may fail. Two likely causes, both checked in the next step.

- [ ] **Step 3: Resolve Starlight config and Markdown pipeline errors**

*If the error names a Starlight config key*, check the Starlight changelog for 0.39–0.41 and update `apps/docs/astro.config.mjs`. The config currently sets `title`, `description`, `logo`, `favicon`, `customCss`, `social` (array-of-objects form), `components.SocialIcons`, and a `sidebar` of `{ slug }` and `{ label, items }` entries.

*If the error concerns the Markdown processor*, Starlight needs the remark pipeline explicitly selected rather than Astro 7's Sätteri default. Add to `apps/docs/astro.config.mjs`:

```javascript
import { unified } from 'unified';

export default defineConfig({
  markdown: { processor: unified() },
  // ...existing config
});
```

Only add this if the build actually demands it — Starlight 0.41 declares the `@astrojs/markdown-remark` peer precisely so it can configure the pipeline itself, so the explicit override may be unnecessary.

- [ ] **Step 4: Verify docs typecheck and content rendered**

```bash
bun run docs:check
ls apps/docs/dist/ | head
```

Expected: `docs:check` reports `0 errors`; `dist/` contains built pages. Spot-check that a content page rendered its Markdown rather than emitting raw syntax:

```bash
grep -c "<h2" apps/docs/dist/getting-started/index.html
```

Expected: at least 1. A zero here means the Markdown pipeline silently produced nothing useful.

- [ ] **Step 5: Commit**

```bash
git add apps/docs
git commit -m "feat(deps): upgrade apps/docs to Astro 7 and Starlight 0.41

Starlight 0.41.4 peers astro ^7.0.2 and @astrojs/markdown-remark ^7.2.0.
The latter becomes an explicit dependency because Astro 7 defaults to the
Sätteri Markdown pipeline while Starlight's content relies on
remark/rehype."
```

---

### Task 8: Audit the `compressHTML: 'jsx'` whitespace change

The payoff for Task 1. Astro 7 strips whitespace between inline elements by JSX rules, so `<span>hello</span>\n<em>world</em>` now renders `helloworld` instead of `hello world`.

**Files:**
- Create: `.snapshots/after/` (gitignored)
- Modify: any `.astro` file that lost an intentional space

**Interfaces:**
- Consumes: `.snapshots/before/` from Task 1; `SNAPSHOT_ROUTES` and `normalizeHtml` unchanged so the two captures are comparable.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Capture the post-upgrade snapshot**

The capture tooling must be byte-identical to Task 1's, or the diff measures the tooling rather than the upgrade.

```bash
git diff --stat HEAD -- e2e/tools/   # expect empty output
SNAPSHOT_DIR=after bun run snapshot:html
ls .snapshots/after | wc -l          # expect 34, same as before
```

- [ ] **Step 2: Diff the two captures**

```bash
diff -ru .snapshots/before .snapshots/after > /tmp/whitespace.diff; wc -l /tmp/whitespace.diff
```

An empty diff means no observable change and the task is done at Step 6. A non-empty diff needs per-hunk review.

- [ ] **Step 3: Narrow the source-side search**

Find the high-risk shape — a closing inline tag, a newline, then an opening inline tag — to know where to look:

```bash
grep -rnzoP '</(span|em|strong|a|b|i|code|small|label|abbr|time)>\s*\n\s*<(span|em|strong|a|b|i|code|small|label|abbr|time)[ >]' \
  src/ apps/site/src/ --include="*.astro" | tr '\0' '\n' | head -60
```

Also check text-to-element boundaries, where JSX removes newline-containing whitespace entirely:

```bash
grep -rnE '[a-z,.]\s*$' src/components --include="*.astro" -A1 | grep -B1 -E '^\S+-\s*<(span|em|strong|a|b|code)' | head -40
```

- [ ] **Step 4: Review every diff hunk and classify it**

For each hunk, decide one of three:

*Intentional space lost* — two words ran together, e.g. `helloworld`. Fix in the source with an explicit space:

```astro
<span>hello</span>{' '}
<em>world</em>
```

*Cosmetic only* — indentation or a blank line changed with no visible effect. Leave it.

*Not whitespace at all* — a real regression from another task (missing element, changed attribute, different status code). Stop the whitespace audit and fix the underlying task's work first.

- [ ] **Step 5: Re-capture and confirm convergence**

After fixes:

```bash
rm -rf .snapshots/after
SNAPSHOT_DIR=after bun run snapshot:html
diff -ru .snapshots/before .snapshots/after > /tmp/whitespace.diff; wc -l /tmp/whitespace.diff
```

Expected: every remaining hunk is one you consciously classified as cosmetic. Save the final diff as evidence for the PR:

```bash
cp /tmp/whitespace.diff /tmp/whitespace-final.diff
```

- [ ] **Step 6: Commit**

```bash
git add src apps/site/src
git commit -m "fix(ui): restore intentional spacing under compressHTML: 'jsx'

Astro 7 changes the compressHTML default from true to 'jsx', which strips
whitespace between inline elements separated only by a newline. Restores
the affected spaces with explicit {' '} expressions.

Verified by diffing normalized HTML snapshots across 34 routes captured
before and after the upgrade."
```

If there were no fixes to make, skip the commit and record that the diff was clean.

---

### Task 9: Upgrade to ESLint 10 and eslint-plugin-astro 3

**Files:**
- Modify: `package.json`
- Modify: `eslint.config.js`

**Interfaces:**
- Consumes: `globals` as an explicit devDependency from Task 2.
- Produces: nothing later tasks depend on, though Task 11's `lint-staged` invokes `eslint --fix`.

- [ ] **Step 1: Upgrade ESLint and add the new required peers**

`eslint-plugin-astro@3` peers `eslint >=10.0.0`, `@typescript-eslint/parser >=8.61.0`, and `eslint-plugin-jsx-a11y >=6.10.2`. ESLint 10 additionally peers `jiti` (2.2.0 or later).

```bash
bun add -d eslint@10.8.0 eslint-plugin-astro@3.0.1 eslint-plugin-jsx-a11y@6.10.2 jiti@2.7.0
```

- [ ] **Step 2: Confirm the config export shape still resolves**

`eslint-plugin-astro@3` exposes both `configs.recommended` and the canonical `configs['flat/recommended']`, each typed `Linter.Config[]`. The existing spread at `eslint.config.js:19` therefore still works.

```bash
bun -e "import p from 'eslint-plugin-astro'; console.log(Object.keys(p.configs)); console.log(Array.isArray(p.configs.recommended))"
```

Expected: the key list includes both `recommended` and `flat/recommended`, and `true`.

- [ ] **Step 3: Switch to the canonical config key**

In `eslint.config.js`, change:

```javascript
  ...astroPlugin.configs.recommended,
```

to:

```javascript
  ...astroPlugin.configs['flat/recommended'],
```

Both work, but `flat/recommended` is the name the plugin documents for ESLint 10 flat config and is less likely to be dropped later.

- [ ] **Step 4: Run lint and triage the new errors**

Run: `bun run lint 2>&1 | tee /tmp/eslint10.log`

Three rules are newly enabled in `eslint:recommended`: `no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error`. ESLint 10 also reports `eslint-env` comments as errors, and `eslint-plugin-astro@3` adds `astro/no-prerender-export-outside-pages` to its recommended set.

Fix each finding at the source. Per project rules, do not suppress with `eslint-disable`. `preserve-caught-error` in particular usually wants `cause` threaded through a re-throw:

```typescript
try {
  await doWork();
} catch (error) {
  throw new Error('Work failed', { cause: error });
}
```

Two rules are now deprecated no-ops in the plugin: `astro/no-omitted-end-tags` (the Rust compiler enforces it) and `astro/valid-compile` (use `astro check`). If `eslint.config.js` referenced either, remove the reference — it currently does not.

- [ ] **Step 5: Verify autofix is clean and idempotent**

```bash
bun run lint:fix
bun run lint
```

Expected: the second command exits 0 with no output.

- [ ] **Step 6: Verify no `eslint-env` comments remain**

Run: `grep -rn "eslint-env" src/ apps/ scripts/ e2e/ tests/ --exclude-dir=node_modules || echo "clean"`

Expected: `clean`.

- [ ] **Step 7: Commit**

```bash
git add package.json bun.lock eslint.config.js src apps scripts e2e tests
git commit -m "feat(deps): upgrade to ESLint 10 and eslint-plugin-astro 3

eslint-plugin-astro 3 requires ESLint 10 and parses .astro files with
@astrojs/compiler-rs, matching Astro 7's compiler. Adds its required
eslint-plugin-jsx-a11y peer and ESLint 10's jiti peer.

Adopts the three rules newly enabled in eslint:recommended
(no-unassigned-vars, no-useless-assignment, preserve-caught-error) and
switches to the canonical configs['flat/recommended'] key."
```

---

### Task 10: Upgrade to Stylelint 17

**Files:**
- Modify: `package.json`
- Modify: `stylelint.config.js`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing later tasks depend on, though Task 11's `lint-staged` invokes `stylelint --fix`.

- [ ] **Step 1: Upgrade Stylelint and drop the redundant config**

`stylelint-config-standard` already extends `stylelint-config-recommended`, so listing both is redundant and the two would need version-matched bumps forever.

```bash
bun remove stylelint-config-recommended
bun add -d stylelint@17.14.1 stylelint-config-standard@40.0.0
```

- [ ] **Step 2: Remove the dropped config from `extends`**

In `stylelint.config.js`, change:

```javascript
  extends: ['stylelint-config-standard', 'stylelint-config-recommended'],
```

to:

```javascript
  extends: ['stylelint-config-standard'],
```

- [ ] **Step 3: Run stylelint and triage findings**

Run: `bun run stylelint 2>&1 | tee /tmp/stylelint17.log`

Stylelint 17 changes behaviour in ways that can produce new findings:
- CSS nesting rules no longer desugar nested selectors; selectors are linted as written.
- Specificity follows the CSS Nesting spec, where `&` inherits from the parent's most specific selector.
- `*-list` and `*-no-vendor-prefix` rules check properties and values as-is rather than unprefixing them.

Fix findings at the source. If a vendor-prefix rule now needs a pattern, use a regex form, e.g. `"/^(-webkit-|-moz-)?keyframes$/i"`.

- [ ] **Step 4: Verify autofix does not over-rewrite**

Stylelint 17 changes `fix` from `lax` to `strict` by default, which can rewrite more than v16 did.

```bash
bun run stylelint:fix
git diff --stat -- '*.css'
```

Review the diff. If `strict` made unwanted changes, revert them and run `bunx stylelint "**/*.css" --fix=lax --quiet` instead, recording the choice in the commit message.

- [ ] **Step 5: Confirm the config still loads and Tailwind at-rules pass**

Run: `bun run stylelint`

Expected: exits 0. Confirm no `at-rule-no-unknown` errors on `@theme`, `@plugin`, `@source`, or `@apply` — the `ignoreAtRules` list in `stylelint.config.js` must still be honoured.

- [ ] **Step 6: Commit**

```bash
git add package.json bun.lock stylelint.config.js src/styles apps
git commit -m "feat(deps): upgrade to Stylelint 17

Drops stylelint-config-recommended, which stylelint-config-standard
already extends, removing a redundant version to keep in lockstep.

Stylelint 17 lints nested selectors as written rather than desugaring
them, follows the CSS Nesting spec for specificity, and checks vendor
prefixes as-is."
```

---

### Task 11: Upgrade husky, lint-staged, and nanoid

Grouped because all three are commit-tooling or runtime majors with no config coupling to Astro, and husky's migration changes the very hook the other commits run through.

**Files:**
- Modify: `package.json`
- Modify: `.husky/pre-commit`

**Interfaces:**
- Consumes: working `eslint --fix` and `stylelint --fix` from Tasks 9 and 10, which `lint-staged` invokes.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Upgrade all three**

```bash
bun add nanoid@6.0.0
bun add -d husky@9.1.7 lint-staged@17.2.0
```

`nanoid@6` has no API changes — it dropped Node 18/20 support and made `nanoid()` and `customAlphabet()` faster. The two call sites (`src/lib/audit-log.ts:10` and `src/cli/commands/db.ts:310`) need no edits, and the 21-character ID format the validation patterns in `src/components/organisms/AccountDeleteConfirmModal.astro:169` depend on is unchanged.

- [ ] **Step 2: Update the `prepare` script for husky 9**

In `package.json`, change:

```json
    "prepare": "husky install",
```

to:

```json
    "prepare": "husky",
```

- [ ] **Step 3: Remove the husky 8 sourcing preamble from the hook**

husky 9 no longer uses `_/husky.sh`. Replace `.husky/pre-commit` in full:

```sh
echo "Running pre-commit quality gates..."

# Run lint-staged on staged files only
echo "▸ Running lint-staged (format, lint, stylelint on staged files)..."
bunx lint-staged

# Run typecheck on entire codebase (fast, doesn't modify files)
echo "▸ Running astro check..."
bun run typecheck

echo "✅ Pre-commit checks passed"
```

Both the shebang and the `. "$(dirname "$0")/_/husky.sh"` line are gone; husky 9 needs neither.

- [ ] **Step 4: Reinstall hooks and verify the hook is wired**

```bash
bunx husky
cat .git/hooks/pre-commit
```

Expected: the hook file exists and references husky 9's runner.

- [ ] **Step 5: Verify nanoid still generates 21-character IDs**

Run: `bun -e "import {nanoid} from 'nanoid'; const id=nanoid(); console.log(id, id.length, /^[A-Za-z0-9_-]{21}$/.test(id))"`

Expected: a 21-character ID and `true`. The regex is the same one the account modals validate against.

- [ ] **Step 6: Verify lint-staged 17 runs**

Invoke the hook directly rather than making a probe commit. This proves the
hook works without creating a commit that then has to be removed:

```bash
sh .husky/pre-commit; echo "hook exit: $?"
```

Expected: the `Running pre-commit quality gates...` banner, lint-staged
output, `astro check` reporting `0 errors`, the `✅ Pre-commit checks passed`
line, and `hook exit: 0`.

Do **not** verify this with `git commit --allow-empty` followed by
`git reset --hard`. A hard reset would destroy any uncommitted work in the
tree, and Step 7's real commit already exercises the hook end to end.

- [ ] **Step 7: Commit**

```bash
git add package.json bun.lock .husky/pre-commit
git commit -m "feat(deps): upgrade husky 9, lint-staged 17, nanoid 6

husky 9 drops the _/husky.sh sourcing preamble and replaces
'husky install' with 'husky' in the prepare script.

nanoid 6 has no API change — it dropped Node 18/20 support and made ID
generation faster. The 21-character format the account ID validation
patterns depend on is unchanged."
```

---

### Task 12: Raise the CI Node version

**Files:**
- Modify: `.github/workflows/quality-gates.yml:19,192`
- Modify: `.github/workflows/deploy-cloudflare.yml:30`
- Modify: `.github/workflows/deploy-site.yml:25`
- Modify: `.github/workflows/deploy-docs-site.yml:25`

**Interfaces:**
- Consumes: nothing.
- Produces: CI that can actually run the new toolchain.

- [ ] **Step 1: Replace the pinned version in all five places**

Five occurrences across four files. The current `'22.12.0'` pin sits below the floor required by `eslint-plugin-astro@3` (`^22.22.3 || ^24.16.0 || >=26.3.0`), `lint-staged@17` (`>=22.22.1`), `nanoid@6` (`^22 || ^24 || >=26`), and `rollup-plugin-visualizer@7` (`>=22`).

```bash
grep -rln "node-version: '22.12.0'" .github/workflows/ | xargs sed -i '' "s/node-version: '22.12.0'/node-version: '24.18.0'/"
```

- [ ] **Step 2: Verify all five were replaced**

```bash
grep -rn "node-version" .github/workflows/
```

Expected: five lines, all reading `node-version: '24.18.0'`. No `22.12.0` remains.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows
git commit -m "ci: raise Node from 22.12.0 to 24.18.0

The old pin sits below the floor required by eslint-plugin-astro 3
(^22.22.3 || ^24.16.0 || >=26.3.0), lint-staged 17 (>=22.22.1), nanoid 6
(^22 || ^24 || >=26) and rollup-plugin-visualizer 7 (>=22)."
```

---

### Task 13: Update documentation

**Files:**
- Modify: `.claude/CLAUDE.md:8,18`
- Modify: `AGENTS.md:15`
- Modify: `docs/prd.md:1155`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Update `.claude/CLAUDE.md`**

Change line 8 from:

```markdown
- **Framework:** Astro 6.x (file-based routing)
```

to:

```markdown
- **Framework:** Astro 7.x (file-based routing)
```

Change the heading on line 18 from `## Astro 6 Note` to `## Astro 7 Note`. Leave the paragraph beneath it unchanged — it describes the CSP nonce middleware, which Task 14 verifies is still accurate.

- [ ] **Step 2: Update `AGENTS.md`**

Change line 15 from:

```markdown
Current baseline: Astro 6 across the main app, docs site, and marketing site.
```

to:

```markdown
Current baseline: Astro 7 across the main app, docs site, and marketing site.
```

- [ ] **Step 3: Update `docs/prd.md`**

Line 1155 reads `- Framework: Astro 4.x`, which was already stale before this upgrade. Change it to:

```markdown
- Framework: Astro 7.x
```

- [ ] **Step 4: Confirm no stale references remain**

Run: `grep -rn "Astro 6\|Astro 5\|Astro 4" .claude/ AGENTS.md docs/prd.md README.md --exclude-dir=node_modules || echo "clean"`

Expected: `clean`, or only hits inside `docs/superpowers/` and `docs/plans/`, which are historical artifacts and must be left unchanged per project rules.

- [ ] **Step 5: Commit**

```bash
git add .claude/CLAUDE.md AGENTS.md docs/prd.md
git commit -m "docs: update framework baseline to Astro 7

Also corrects docs/prd.md, which still claimed Astro 4.x."
```

---

### Task 14: Full verification

Nothing here changes behaviour. Every step gathers evidence, and any failure sends work back to the owning task.

**Files:**
- Modify: only files needed to fix a failure surfaced here

**Interfaces:**
- Consumes: everything from Tasks 1–13.
- Produces: the evidence recorded in the PR body.

- [ ] **Step 1: Clean install all four manifests**

Proves the lockfiles are coherent rather than propped up by leftover `node_modules`.

```bash
rm -rf node_modules apps/docs/node_modules apps/site/node_modules apps/mcp/node_modules
bun install
cd apps/docs && bun install && cd ../..
cd apps/site && bun install && cd ../..
cd apps/mcp && bun install && cd ../..
```

Expected: no unmet peer dependency errors. Record any warnings.

- [ ] **Step 2: Confirm TypeScript did not drift above 5.x**

```bash
bun pm ls | grep -E "^\s*.?.? typescript@" || node -e "console.log(require('./node_modules/typescript/package.json').version)"
```

Expected: a `5.9.x` version. Anything 6 or above breaks `astro check` and must be pinned back.

- [ ] **Step 3: Run every quality gate**

```bash
bun run lint
bun run stylelint
bun run format
bun run typecheck
```

Expected: all exit 0. `typecheck` reports `0 errors`.

- [ ] **Step 4: Confirm no `bun:` imports reached middleware**

```bash
grep -rn "bun:" src/middleware/ || echo "middleware clean"
grep -rn "bun:" src/ --exclude-dir=node_modules | grep -vE "src/(cli|db)/|\.test\.ts" | head
```

Expected: `middleware clean`. Any remaining `bun:` hits should sit only in CLI, DB, or test paths.

- [ ] **Step 5: Run the test suites**

```bash
bun run test
bun run test:e2e
```

Expected: both pass. If an E2E test fails, check whether it is pre-existing by stashing and running against `main` before treating it as a regression — a `reuseExistingServer: true` dev server can mask startup failures, so confirm the server actually restarted.

- [ ] **Step 6: Build all three apps for both targets**

```bash
bun run build
bun run build:cloudflare
bun run landing:build
bun run docs:build
```

Expected: all four succeed.

- [ ] **Step 7: Check the bundle budget**

```bash
bun run bundle:report
```

Expected: client JS at or under 250 kB gzipped. Confirm the chart.js and motion chunks are still split out — if `advancedChunks` silently stopped matching, the main bundle absorbs both and the budget is likely blown.

- [ ] **Step 8: Verify CSP headers still land**

```bash
bun run build && (bun run preview &) && sleep 8
curl -s -D - -o /dev/null http://localhost:4321/login | grep -i "content-security-policy"
```

Use a GET with headers dumped (`-D -`), not `curl -I`. A HEAD request can take a different middleware path and report a header set the real page never sees.

Expected: a `Content-Security-Policy` header containing a `nonce-` value, written by `src/middleware/security-headers.ts`. If the header is absent or lost its nonce, `security: { csp: true }` in Astro 7 is now conflicting with the middleware — fix that before merging, and update the "Astro 7 Note" in `.claude/CLAUDE.md` to match reality.

Stop the preview server afterwards: `kill %1` or `pkill -f "astro preview"`.

- [ ] **Step 9: Visually verify the main pages in Chrome**

Start the dev server (`bun run dev`) and confirm the port with `lsof -i -P | grep LISTEN | grep 432`, since other worktrees may hold 4321.

Check on desktop **and** mobile viewports: `/dashboard`, `/transactions`, `/budget`, `/accounts`, `/reports`.

For each, confirm: no words run together from the `compressHTML` change; charts render (proving the chartjs chunk loads); icons render (proving Lucide 1); no console errors. Mobile and desktop differ structurally — mobile uses dropdowns where desktop uses inline icons — so both need looking at.

- [ ] **Step 10: Push and open the PR**

```bash
git push -u origin chore/maintenance-astro-7-upgrade
```

Then open a PR whose body records:
- The version table from the spec.
- **Held back:** `typescript` at `^5.9.3`, capped by `@astrojs/check@0.9.9` (`^5 || ^6`) and `@typescript-eslint@8.65.0` (`<6.1.0`).
- **Removed:** `lucide` (no source imports), `@types/decimal.js` (stub superseded by bundled types), `stylelint-config-recommended` (redundant).
- The whitespace audit result: route count captured, hunk count reviewed, and the final diff from `/tmp/whitespace-final.diff`.
- Bundle report numbers before and after.
- Which verification steps passed, and any E2E failure confirmed pre-existing.

Per project rules, claim only what was actually run. If a step was skipped, say so.

---

## Notes for the Implementer

**Why this order.** Dead-code removal and minors come first so that when Astro 7 breaks something, the cause is unambiguous. Astro precedes the lint toolchain because a broken build is easier to diagnose than a broken build plus a broken linter. Husky is late because its migration changes the hook every other commit passes through.

**If a task fails in a way the plan did not anticipate**, stop and report rather than improvising. Three failed fix attempts on the same problem means the approach is wrong — surface it instead of trying a fourth.

**Task 1 is not optional and cannot be deferred.** Once Astro 7 is installed, the Astro 6 baseline cannot be captured without reverting the branch.
