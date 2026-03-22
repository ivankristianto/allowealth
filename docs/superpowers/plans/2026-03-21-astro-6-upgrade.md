# Astro 6 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade all three Astro projects in the monorepo from Astro 5.16.15 to Astro 6.0.8, enable Astro 6 native CSP hashing, and leave the codebase green (typecheck + build + lint + unit tests passing).

**Architecture:** Single-wave bump across root app, `apps/docs` (Starlight), and `apps/site` (landing). Remove the Astro 5 patch file; re-patch only if the Cloudflare Workers build fails with the same `import.meta.url` error. Add `security: { csp: true }` to the main app config (SSR only) while keeping the existing custom nonce middleware — both coexist with the middleware header taking precedence at runtime.

**Tech Stack:** Bun 1.x, Astro 6.0.8, @astrojs/cloudflare 13.x (Cloudflare Workers adapter), @astrojs/node 10.x, @astrojs/starlight 0.38.x, Tailwind CSS v4, DaisyUI v5, Drizzle ORM, Valibot

---

## File Map

| File | Change |
|---|---|
| `package.json` | Bump `astro`, `@astrojs/cloudflare`, `@astrojs/node`, `@astrojs/check`, `@astrojs/ts-plugin`, `eslint-plugin-astro`; remove `patchedDependencies` block |
| `apps/docs/package.json` | Bump `astro`, `@astrojs/starlight`, `@astrojs/check` |
| `apps/docs/astro.config.mjs` | Review Starlight `social` config shape for 0.38 |
| `apps/docs/src/env.d.ts` | Keep Starlight virtual types reference current |
| `apps/site/package.json` | Bump `astro`, `@astrojs/check`, `@astrojs/ts-plugin` |
| `patches/astro@5.16.15.patch` | Delete |
| `astro.config.ts` | Add `security: { csp: true }` |
| `src/middleware/security-headers.ts` | Add TODO comment |

---

## Task 1: Bump packages in root `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update `astro` and adapter versions in dependencies**

In `package.json`, change:
```json
"@astrojs/node": "9.5.2",
"astro": "5.16.15",
```
to:
```json
"@astrojs/node": "^10.0.3",
"astro": "6.0.8",
```

- [ ] **Step 2: Update devDependencies**

Change:
```json
"@astrojs/check": "^0.9.6",
"@astrojs/cloudflare": "^12.6.12",
"@astrojs/ts-plugin": "^1.10.6",
"eslint-plugin-astro": "^1.5.0",
```
to:
```json
"@astrojs/check": "^0.9.8",
"@astrojs/cloudflare": "^13.1.3",
"@astrojs/ts-plugin": "^1.10.7",
"eslint-plugin-astro": "^1.6.0",
```

- [ ] **Step 3: Remove the `patchedDependencies` block**

Delete these lines from `package.json`:
```json
"patchedDependencies": {
  "astro@5.16.15": "patches/astro@5.16.15.patch"
},
```

---

## Task 2: Bump packages and Starlight config in sub-apps

**Files:**
- Modify: `apps/docs/package.json`
- Modify: `apps/docs/astro.config.mjs`
- Modify: `apps/docs/src/env.d.ts`
- Modify: `apps/site/package.json`

- [ ] **Step 1: Update `apps/docs/package.json`**

Change:
```json
"@astrojs/starlight": "^0.32.0",
"astro": "5.16.15",
```
to:
```json
"@astrojs/starlight": "^0.38.2",
"astro": "6.0.8",
```

Change in devDependencies:
```json
"@astrojs/check": "^0.9.6",
```
to:
```json
"@astrojs/check": "^0.9.8",
```

- [ ] **Step 2: Update Starlight 0.38 follow-up files**

In `apps/docs/astro.config.mjs`, review the `social` config shape and update it to the Starlight 0.38 format used by the current docs branch.

In `apps/docs/src/env.d.ts`, keep the Starlight virtual types reference so the docs app typechecks cleanly.

- [ ] **Step 3: Update `apps/site/package.json`**

Change:
```json
"astro": "5.16.15",
```
to:
```json
"astro": "6.0.8",
```

Change in devDependencies:
```json
"@astrojs/check": "^0.9.6",
"@astrojs/ts-plugin": "^1.10.6",
```
to:
```json
"@astrojs/check": "^0.9.8",
"@astrojs/ts-plugin": "^1.10.7",
```

---

## Task 3: Delete the Astro 5 patch file and reinstall

**Files:**
- Delete: `patches/astro@5.16.15.patch`

- [ ] **Step 1: Delete the patch file**

```bash
rm patches/astro@5.16.15.patch
```

- [ ] **Step 2: Run bun install**

```bash
bun install
```

Expected: lockfile updates, no install errors. If peer dependency warnings appear for `@astrojs/sitemap`, they are acceptable — check that the installed version is compatible with Astro 6 (`^3.x` should be fine).

---

## Task 4: Add CSP config and TODO comments

**Files:**
- Modify: `astro.config.ts`
- Modify: `src/middleware/security-headers.ts`

- [ ] **Step 1: Add `security: { csp: true }` to `astro.config.ts`**

In `astro.config.ts`, inside `defineConfig({...})`, add the `security` key at the top level alongside `output`, `adapter`, etc.:

```ts
export default defineConfig({
  server: { ... },
  output: 'server',
  adapter,
  security: {
    csp: true,
  },
  prefetch: { ... },
  // ...rest unchanged
});
```

> Note: This is effectively a no-op for now because the custom `securityHeaders` middleware sets `Content-Security-Policy` after render, overwriting Astro's hash-based header. The flag documents intent. The TODO below tracks cleanup.

- [ ] **Step 2: Add TODO comment to `src/middleware/security-headers.ts`**

Insert the following comment block before the `// ---------- Middleware ----------` section comment:

```ts
// TODO(ALL-62): Astro 6 security.csp is enabled in astro.config.ts (hash-based).
// This middleware currently overwrites Astro's CSP header with a nonce-based one.
// To fully migrate to Astro 6 native CSP: validate all inline scripts can be
// statically hashed, then remove this middleware's CSP logic and the nonce
// generation. See docs/superpowers/specs/2026-03-21-astro-6-upgrade-design.md.
// ---------- Middleware ----------
```

(Replace the existing `// ---------- Middleware ----------` line with the above block.)

---

## Task 5: Fix typecheck

**Files:**
- Varies — fix whatever errors surface

- [ ] **Step 1: Run typecheck for main app**

```bash
bun run typecheck
```

Expected: 0 errors. If errors appear, fix them. Common Astro 5→6 issues:
- Types renamed or moved in `astro` package — update imports
- `AstroIntegration` or adapter type signatures changed — update accordingly
- `locals` type changes — check `src/env.d.ts`

- [ ] **Step 2: Run typecheck for docs app**

```bash
bun run docs:check
```

Expected: 0 errors. Starlight 0.38.x requires Astro 6 — after the bump this should resolve cleanly.

- [ ] **Step 3: Run typecheck for landing app**

```bash
bun run landing:check
```

Expected: 0 errors.

---

## Task 6: Fix build — node target

**Files:**
- Varies — fix whatever errors surface

- [ ] **Step 1: Build with node adapter**

```bash
bun run build
```

(`build` uses node adapter by default — fastest feedback loop, no Workers-specific issues)

Expected: build completes with no errors. If Vite 7 plugin API errors appear, check `astro.config.ts` vite plugins for deprecated APIs.

---

## Task 7: Fix build — Cloudflare Workers target

**Files:**
- Varies; possibly `patches/astro@6.0.8.patch` if the Workers bug resurfaces

- [ ] **Step 1: Build with Cloudflare adapter**

```bash
bun run build:cloudflare
```

Expected: build completes with no errors.

- [ ] **Step 2: If build fails with `import.meta.url` error — re-patch**

If you see an error like:
```
TypeError: Failed to construct 'URL': Invalid URL
```
or similar in a file inside `node_modules/astro/dist/`, the same Workers runtime issue is present in Astro 6.

To find the target location:
```bash
grep -r "hrefRoot\|import\.meta\.url" node_modules/astro/dist/container/ 2>/dev/null
```

Create a new patch `patches/astro@6.0.8.patch` with the same guard from the old patch:
```js
// Old (Astro 5 patch):
hrefRoot: import.meta.url,

// New (patched):
hrefRoot: (() => { try { new URL(import.meta.url); return import.meta.url; } catch { return "file:///app/"; } })(),
```

Then add to `package.json`:
```json
"patchedDependencies": {
  "astro@6.0.8": "patches/astro@6.0.8.patch"
}
```

And re-run `bun install` to apply the patch.

- [ ] **Step 3: Re-run `bun run build:cloudflare` to verify it passes**

---

## Task 8: Fix lint and formatting

- [ ] **Step 1: Run ESLint autofix**

```bash
bun run lint:fix
```

Expected: no remaining errors. If `eslint-plugin-astro` 1.6.0 adds new rules that flag existing code, fix or disable at file level with a comment explaining why.

- [ ] **Step 2: Run Prettier**

```bash
bun run format:fix
```

- [ ] **Step 3: Run Stylelint**

```bash
bun run stylelint:fix
```

---

## Task 9: Run unit tests

- [ ] **Step 1: Run all unit tests**

```bash
bun run test
```

Expected: all tests pass. If `src/__tests__/middleware/security-headers.test.ts` fails, check if the test imports from `astro` types that changed — update imports only, do not change test intent.

---

## Task 10: Commit

- [ ] **Step 1: Stage all changes**

```bash
git add package.json apps/docs/package.json apps/site/package.json bun.lock astro.config.ts src/middleware/security-headers.ts
# Stage the patch file deletion (rm deleted it from disk; git rm stages the tracked-file removal):
git rm patches/astro@5.16.15.patch
# If patch was re-created for Astro 6:
# git add patches/astro@6.0.8.patch
```

- [ ] **Step 2: Verify quality gates are green**

```bash
bun run lint:fix && bun run format:fix && bun run stylelint:fix && bun run typecheck && bun run test
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore: upgrade Astro 5 → 6 across all apps (ALL-62)

- astro 5.16.15 → 6.0.8
- @astrojs/cloudflare 12.x → 13.x
- @astrojs/node 9.x → 10.x
- @astrojs/starlight 0.32 → 0.38 (docs)
- @astrojs/check, ts-plugin, eslint-plugin-astro bumped
- Remove astro@5 patch (re-patched for Astro 6 if Workers build required it)
- Enable security.csp in astro.config.ts (Astro 6 native hash-based CSP)
- Add TODO to security-headers.ts to migrate away from custom nonce middleware
EOF
)"
```
