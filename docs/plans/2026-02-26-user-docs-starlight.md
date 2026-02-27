# Starlight User Docs MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a public, static Starlight documentation site at `docs.allowealth.io` as a separate app in this repository, with exactly 6 Markdown pages and a Docs link in the authenticated app main menu.

**Architecture:** Keep existing internal engineering docs in `/docs` and add a dedicated Starlight app in `/docs/site`. Build and deploy docs independently from the main app to a separate Cloudflare target/subdomain. Integrate app navigation to docs without coupling runtimes.

**Tech Stack:** Astro 5, Starlight, `@astrojs/sitemap`, Markdown content, Bun scripts, Cloudflare Workers deployment workflow, existing Astro app navigation components.

---

## Execution Rules

- Use `@test-driven-development` discipline per task: fail -> minimal change -> pass.
- Use `@verification-before-completion` before any done claim.
- Use frequent commits (one commit per task).
- Keep docs site fully static (no SSR adapters).
- MVP content cap is strict: exactly 6 pages (Home + 5 content pages).

### Task 1: Add Root-Level Docs Scripts

**Files:**

- Modify: `package.json`
- Modify: `COMMANDS.md`

**Step 1: Write the failing check**

Run:

```bash
bun run docs:build
```

Expected: command fails because `docs:build` script does not exist.

**Step 2: Add root scripts in `package.json`**

Add scripts:

```json
{
  "docs:dev": "bun --cwd docs/site run dev",
  "docs:build": "bun --cwd docs/site run build",
  "docs:preview": "bun --cwd docs/site run preview",
  "docs:check": "bun --cwd docs/site run astro check"
}
```

Update `COMMANDS.md` with a new Docs section listing these commands.

**Step 3: Run check again**

Run:

```bash
bun run docs:build
```

Expected: command resolves but fails because `/docs/site` app does not exist yet.

**Step 4: Commit**

```bash
git add package.json COMMANDS.md
git commit -m "chore(docs): add root scripts for starlight docs site"
```

### Task 2: Scaffold Separate Starlight App in `/docs/site`

**Files:**

- Create: `docs/site/package.json`
- Create: `docs/site/astro.config.mjs`
- Create: `docs/site/tsconfig.json`
- Create: `docs/site/src/env.d.ts`
- Create: `docs/site/src/content/docs/index.md`

**Step 1: Write the failing check**

Run:

```bash
test -f docs/site/package.json
```

Expected: non-zero exit code (file missing).

**Step 2: Create minimal app files**

`docs/site/package.json`:

```json
{
  "name": "allowealth-docs",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
  "dependencies": {
    "astro": "5.16.15",
    "@astrojs/starlight": "^0.32.0",
    "@astrojs/sitemap": "^3.6.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.6",
    "typescript": "^5.9.3"
  }
}
```

`docs/site/astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://docs.allowealth.io',
  output: 'static',
  integrations: [
    starlight({
      title: 'Allowealth Docs',
      description: 'Public product documentation for Allowealth.',
      sidebar: [{ label: 'Getting Started', items: [{ label: 'Home', slug: '' }] }],
    }),
    sitemap(),
  ],
});
```

`docs/site/src/content/docs/index.md`:

```md
---
title: Home
description: Public documentation for Allowealth.
---

# Allowealth Documentation

Welcome to the docs.
```

**Step 3: Install and run base validation**

Run:

```bash
bun install --cwd docs/site
bun run docs:build
bun run docs:check
```

Expected: static build passes and `astro check` passes.

**Step 4: Commit**

```bash
git add docs/site package.json
git commit -m "feat(docs): scaffold separate starlight app under docs/site"
```

### Task 3: Apply Brand Twist (Default Starlight + Brand Tokens + Logo/Favicon)

**Files:**

- Modify: `docs/site/astro.config.mjs`
- Create: `docs/site/src/styles/brand.css`
- Create: `docs/site/public/favicon.svg`
- Create: `docs/site/public/logo.svg`

**Step 1: Write the failing check**

Run:

```bash
test -f docs/site/src/styles/brand.css && test -f docs/site/public/logo.svg
```

Expected: non-zero exit code (files missing).

**Step 2: Add brand styles and assets**

`docs/site/src/styles/brand.css`:

```css
:root {
  --sl-color-accent-low: #e6f3eb;
  --sl-color-accent: #15803d;
  --sl-color-accent-high: #0f5f2c;
  --sl-color-text-accent: #15803d;
  --sl-color-text-link: #0f5f2c;
}
```

Update Starlight config to include custom CSS plus logo/favicon:

```js
starlight({
  title: 'Allowealth Docs',
  description: 'Public product documentation for Allowealth.',
  logo: {
    src: '/logo.svg',
    alt: 'Allowealth',
  },
  favicon: '/favicon.svg',
  customCss: ['./src/styles/brand.css'],
});
```

**Step 3: Verify themed build**

Run:

```bash
bun run docs:build
```

Expected: build succeeds; docs header renders logo and accent/link color overrides apply.

**Step 4: Commit**

```bash
git add docs/site/astro.config.mjs docs/site/src/styles/brand.css docs/site/public/favicon.svg docs/site/public/logo.svg
git commit -m "feat(docs): add branded starlight theme with logo and favicon"
```

### Task 4: Create MVP Markdown Content (Exactly 6 Pages, Role-Split, Cross-Linked)

**Files:**

- Modify: `docs/site/src/content/docs/index.md`
- Create: `docs/site/src/content/docs/getting-started.md`
- Create: `docs/site/src/content/docs/end-users/onboarding.md`
- Create: `docs/site/src/content/docs/end-users/daily-workflow.md`
- Create: `docs/site/src/content/docs/admins/onboarding.md`
- Create: `docs/site/src/content/docs/admins/deployment-guide.md`
- Modify: `docs/site/astro.config.mjs`

**Step 1: Write the failing check**

Run:

```bash
find docs/site/src/content/docs -name "*.md" | wc -l
```

Expected: count is not 6 yet.

**Step 2: Create the 5 content pages and update landing page**

Use frontmatter pattern:

```md
---
title: <Page Title>
description: <Short summary>
sidebar:
  label: <Sidebar Label>
  order: <number>
audience:
  - user
  - admin
---
```

Audience assignment:

- `getting-started.md`: user + admin
- `end-users/onboarding.md`: user
- `end-users/daily-workflow.md`: user
- `admins/onboarding.md`: admin
- `admins/deployment-guide.md`: admin

Home page requirement:

- `index.md` must link to all 5 content pages.

Cross-link requirements (mandatory):

- `end-users/onboarding.md` links to `end-users/daily-workflow.md`.
- `end-users/daily-workflow.md` links back to `end-users/onboarding.md`.
- `admins/onboarding.md` links to `admins/deployment-guide.md`.

**Step 3: Finalize role-split sidebar**

In `docs/site/astro.config.mjs`:

```js
sidebar: [
  { label: 'Getting Started', items: [{ slug: 'getting-started' }] },
  {
    label: 'End Users',
    items: [{ slug: 'end-users/onboarding' }, { slug: 'end-users/daily-workflow' }],
  },
  {
    label: 'Admins',
    items: [{ slug: 'admins/onboarding' }, { slug: 'admins/deployment-guide' }],
  },
];
```

**Step 4: Verify page-count and routes**

Run:

```bash
find docs/site/src/content/docs -name "*.md" | wc -l
bun run docs:build
find docs/site/dist -maxdepth 3 -name "index.html" | sort
```

Expected:

- Markdown page count is exactly `6`.
- Dist includes Home + 5 content routes.

**Step 5: Commit**

```bash
git add docs/site/src/content/docs docs/site/astro.config.mjs
git commit -m "docs(docs-site): add 6-page mvp content with role-split sidebar"
```

### Task 5: Add Docs Link to Authenticated Main Menu (Scope Explicit)

**Files:**

- Modify: `src/components/layouts/Navigation.astro`

**Scope decision (explicit):**

- MVP adds Docs link to authenticated main sidebar/drawer navigation (`Navigation.astro`).
- MVP does not add Docs to `PublicNavbar.astro` or `MobileNavigation.astro`.

**Step 1: Write the failing check**

Run:

```bash
rg --line-number "docs.allowealth.io|Docs" src/components/layouts/Navigation.astro src/components/layouts/MobileNavigation.astro src/components/layouts/PublicNavbar.astro
```

Expected: no matches.

**Step 2: Add Docs menu item in `Navigation.astro`**

Update nav type and item:

```ts
interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  external?: boolean;
}

{ href: 'https://docs.allowealth.io', label: 'Docs', icon: ClipboardList, external: true }
```

Render external item safely in same tab.

**Step 3: Verify app checks**

Run:

```bash
bun run typecheck
```

Expected: no type errors.

**Step 4: Commit**

```bash
git add src/components/layouts/Navigation.astro
git commit -m "feat(nav): add docs.allowealth.io to authenticated main menu"
```

### Task 6: Add Separate Docs Deployment + Custom Domain Go-Live Steps

**Files:**

- Create: `docs/site/wrangler.toml`
- Create: `.github/workflows/deploy-docs-site.yml`
- Modify: `COMMANDS.md`

**Step 1: Write the failing check**

Run:

```bash
test -f docs/site/wrangler.toml
```

Expected: non-zero exit code (file missing).

**Step 2: Create deployment config + workflow**

`docs/site/wrangler.toml`:

```toml
name = "allowealth-docs"
compatibility_date = "2026-02-26"
routes = [{ pattern = "docs.allowealth.io", custom_domain = true }]

[assets]
directory = "./dist"
```

Create `.github/workflows/deploy-docs-site.yml`:

- Trigger on `push` to `main` with paths: `docs/site/**` and workflow file itself.
- Steps:
  - checkout
  - setup bun
  - `bun install --cwd docs/site`
  - `bun run docs:build`
  - `cloudflare/wrangler-action@v3` with `command: deploy --config docs/site/wrangler.toml`
- Secrets:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`

Update `COMMANDS.md` with docs deployment command examples.

**Step 3: Add explicit domain go-live checklist (manual ops)**

Add these release-gate checks to plan execution notes:

- Confirm `docs.allowealth.io` custom domain is attached to `allowealth-docs` in Cloudflare.
- Confirm DNS record exists and is proxied.
- Confirm SSL status is active.
- Smoke check from terminal:

```bash
curl -I https://docs.allowealth.io
```

Expected: `HTTP/2 200` (or `301`/`302` then `200` on follow).

**Step 4: Verify pipeline and config locally**

Run:

```bash
bun run docs:build
```

Expected: build passes and workflow references existing paths.

**Step 5: Commit**

```bash
git add docs/site/wrangler.toml .github/workflows/deploy-docs-site.yml COMMANDS.md
git commit -m "ci(docs): add docs deployment workflow and custom domain config"
```

### Task 7: Add SEO Baseline + Non-Mutating Final Verification

**Files:**

- Create: `docs/site/public/robots.txt`
- Modify: `docs/site/astro.config.mjs`

**Step 1: Write the failing check**

Run:

```bash
test -f docs/site/public/robots.txt
```

Expected: non-zero exit code (file missing).

**Step 2: Add robots + sitemap baseline**

`docs/site/public/robots.txt`:

```txt
User-agent: *
Allow: /

Sitemap: https://docs.allowealth.io/sitemap-index.xml
```

Ensure `@astrojs/sitemap` is still integrated in `docs/site/astro.config.mjs`.

**Step 3: Run final non-mutating verification**

Run:

```bash
bun run docs:check
bun run docs:build
bun run lint
bun run stylelint
bun run format
bun run typecheck
```

Expected: all commands pass without modifying files.

If a check fails, run fixers intentionally as a remediation step (not as baseline verification), then re-run the non-mutating checks.

**Step 4: Commit**

```bash
git add docs/site/public/robots.txt docs/site/astro.config.mjs
git commit -m "chore(docs): add seo baseline and final verification"
```

## Manual QA Checklist (Release Gate)

- Run `bun run docs:dev` and validate desktop + mobile docs layout.
- Confirm all 6 pages are reachable and sidebar grouping is correct.
- Confirm required cross-links exist between user/admin onboarding and workflow/deployment pages.
- Confirm app authenticated sidebar/drawer contains `Docs` and opens `https://docs.allowealth.io` in same tab.
- Confirm no broken internal links in docs pages.
- Confirm `docs.allowealth.io` is publicly reachable without authentication.
- Confirm `https://docs.allowealth.io/sitemap-index.xml` resolves.

## Rollback Plan

- If docs deployment fails: app deployment remains unaffected (separate workflow).
- If docs content regresses: rollback docs worker to previous successful deployment.
- If menu link causes issues: temporarily remove `Docs` nav item and redeploy app.
