# User Docs Starlight - Manual Test Plan

**Branch:** `feat/docs`  
**Date:** 2026-02-27  
**Source plans:** `docs/plans/2026-02-26-user-docs-starlight-design.md`, `docs/plans/2026-02-26-user-docs-starlight.md`

## Overview

This plan validates the Starlight docs app shipped under `docs/sites`, plus integration from the authenticated app navigation. It covers the current scope: static docs, 13 Markdown pages, role-split sidebar, branding, and local reachability via the docs dev server URL.

## Prerequisites

- Main app and docs changes from branch `feat/docs` are checked out.
- Bun is installed.
- Main app can be started with `bun run dev` (use URL printed in terminal as `<APP_URL>`).
- Docs app can be started with `bun run docs:dev` (use URL printed in terminal as `<DOCS_URL>`).
- Test credentials for authenticated app checks: `demo@example.com` / `demo123456789`.

---

## Automated Verification

Run from repo root:

```bash
bun run docs:check
bun run docs:build
bun run lint
bun run stylelint
bun run format
bun run typecheck
```

Expected results:

- All commands exit `0`.
- `docs/sites/dist/` is generated.
- `docs/sites/dist/sitemap-index.xml` exists.

---

## Test Steps

### 1. Docs Site Boot, Routes, and Sidebar IA

**Components under test:** `docs/sites/astro.config.mjs`, Markdown docs in `docs/sites/src/content/docs/`

> **Critical:** Route integrity for all current docs routes and sidebar navigation.

| Step | Action                                                                                                                                                                                                                                                                                                                                       | Expected Result                                                                                                              |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1.1  | Run `bun run docs:dev`.                                                                                                                                                                                                                                                                                                                      | Dev server starts without errors and prints `<DOCS_URL>`.                                                                    |
| 1.2  | Open `<DOCS_URL>/` in browser.                                                                                                                                                                                                                                                                                                               | Home page renders with heading "Allowealth Documentation".                                                                   |
| 1.3  | Inspect sidebar groups.                                                                                                                                                                                                                                                                                                                      | Sidebar shows: `Getting Started`, `Core Concepts`, `Guides: End Users`, `Guides: Admins`, `Guides: Developers`, `Reference`. |
| 1.4  | Open these routes: `/getting-started/`, `/core-concepts/`, `/end-users/onboarding/`, `/end-users/daily-workflow/`, `/admins/onboarding/`, `/admins/deployment-guide/`, `/developers/local-development/`, `/developers/feature-workflow/`, `/reference/commands/`, `/reference/cli/`, `/reference/api-overview/`, `/reference/architecture/`. | Each route loads without 404 and displays the expected page title.                                                           |

### 2. Content Coverage and Frontmatter

**Files under test:** `docs/sites/src/content/docs/**/*.md`, `docs/sites/src/content.config.ts`

| Step | Action                                                                                                                                                                                                                                                                                                                                                                  | Expected Result                                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 2.1  | Run `find docs/sites/src/content/docs -name "*.md" \| wc -l`.                                                                                                                                                                                                                                                                                                           | Output is exactly `13`.                               |
| 2.2  | Verify files present: `index.md`, `getting-started.md`, `core-concepts.md`, `end-users/onboarding.md`, `end-users/daily-workflow.md`, `admins/onboarding.md`, `admins/deployment-guide.md`, `developers/local-development.md`, `developers/feature-workflow.md`, `reference/commands.md`, `reference/cli.md`, `reference/api-overview.md`, `reference/architecture.md`. | All 13 files exist.                                   |
| 2.3  | Open each page source and confirm frontmatter includes `title`, `description`, `sidebar`, and `audience`.                                                                                                                                                                                                                                                               | Required frontmatter fields are present on all pages. |

### 3. Required Cross-Links Between Guides

**Pages under test:** End-user, admin, and developer guide pages

| Step | Action                                                               | Expected Result                               |
| ---- | -------------------------------------------------------------------- | --------------------------------------------- |
| 3.1  | On End User Onboarding page, click link to Daily Workflow.           | Navigates to `/end-users/daily-workflow/`.    |
| 3.2  | On End User Daily Workflow page, click link back to Onboarding.      | Navigates to `/end-users/onboarding/`.        |
| 3.3  | On Admin Onboarding page, click link to Deployment Guide.            | Navigates to `/admins/deployment-guide/`.     |
| 3.4  | On Developer Local Development page, click link to Feature Workflow. | Navigates to `/developers/feature-workflow/`. |

### 4. Branding and Responsive Rendering

**Files under test:** `docs/sites/src/styles/brand.css`, `docs/sites/public/logo.svg`, `docs/sites/public/favicon.svg`

| Step | Action                                                                         | Expected Result                                                      |
| ---- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| 4.1  | Open docs home on desktop width (>=1280px).                                    | Header, sidebar, content, and TOC render cleanly with brand styling. |
| 4.2  | Check browser tab icon while on docs pages.                                    | Favicon is loaded from `/favicon.svg`.                               |
| 4.3  | Check links/accent UI color (sidebar active item, links).                      | Accent/link colors use the configured green brand palette.           |
| 4.4  | Resize viewport to mobile width (375px) and navigate between at least 3 pages. | Navigation and content remain usable with no horizontal overflow.    |

### 5. Main App Integration: Docs Nav Item

**Component under test:** `src/components/layouts/Navigation.astro`

> **Critical:** Authenticated navigation must expose docs and open the docs domain.

| Step | Action                                                                                                   | Expected Result                                                                                |
| ---- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 5.1  | Run main app (`bun run dev`), open `<APP_URL>/login`, sign in with `demo@example.com` / `demo123456789`. | Login succeeds and main app shell loads.                                                       |
| 5.2  | In the main sidebar, locate nav item labeled `Docs`.                                                     | `Docs` item is visible with docs icon.                                                         |
| 5.3  | Click `Docs`.                                                                                            | Browser navigates in same tab to `https://docs.allowealth.io/`.                                |
| 5.4  | Return to an app page (for example `/dashboard`) and inspect sidebar item states.                        | Internal current page is highlighted; external `Docs` link is not treated as active app route. |

### 6. Local Build and Preview Reachability

**Files/systems under test:** `docs/sites/astro.config.mjs`, `docs/sites/public/robots.txt`, local docs preview/dev server

> **Critical:** Local docs launch path must succeed end to end.

| Step | Action                                                             | Expected Result                                         |
| ---- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| 6.1  | Run `bun run docs:build`.                                          | Static build succeeds and generates `docs/sites/dist`.  |
| 6.2  | Run `bun run docs:preview` and open the printed local preview URL. | Preview server loads docs locally without errors.       |
| 6.3  | Run `curl -I <DOCS_URL>`.                                          | Returns `200`, or redirect chain ending in `200`.       |
| 6.4  | Open `<DOCS_URL>` in browser without logging in.                   | Docs are locally accessible without app authentication. |

### 7. SEO Baseline

**Files/endpoints under test:** `docs/sites/public/robots.txt`, generated sitemap on local docs server

| Step | Action                                                        | Expected Result                                                      |
| ---- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| 7.1  | Open `<DOCS_URL>/robots.txt`.                                 | Contains `Allow: /` and sitemap URL pointing to `sitemap-index.xml`. |
| 7.2  | Open `<DOCS_URL>/sitemap-index.xml`.                          | Sitemap endpoint is reachable and valid XML is returned.             |
| 7.3  | Manually navigate all 13 docs routes from sitemap/home links. | No broken links or unexpected 404s.                                  |

---

## Summary Checklist

| #   | Area               | Key Assertion                                                           | Status |
| --- | ------------------ | ----------------------------------------------------------------------- | ------ |
| 1   | Docs IA            | Sidebar groups and all current routes load correctly                    | TBD    |
| 2   | Content Coverage   | Exactly 13 Markdown docs pages exist                                    | TBD    |
| 3   | Cross-links        | Guide links navigate to expected routes                                 | TBD    |
| 4   | Branding           | Brand CSS, logo/favicon, and responsive rendering are correct           | TBD    |
| 5   | App Nav            | Authenticated app shows Docs item and opens docs domain                 | TBD    |
| 6   | Local Reachability | Local build + preview docs path succeeds                                | TBD    |
| 7   | SEO                | `robots.txt` and `sitemap-index.xml` are available on local docs server | TBD    |

**Critical paths:** Sections 1, 5, and 6 are highest priority.

## Automated Test Coverage

| Suite              | What to Run                                                                | File/Config                                               |
| ------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------- |
| Docs integrity     | `bun run docs:check`, `bun run docs:build`                                 | `package.json`, `docs/sites/astro.config.mjs`             |
| Repo quality gates | `bun run lint`, `bun run stylelint`, `bun run format`, `bun run typecheck` | `eslint.config.js`, `stylelint.config.js`, root TS checks |
| Local preview path | `bun run docs:build`, `bun run docs:preview`                               | `docs/sites/astro.config.mjs`, docs local server output   |
