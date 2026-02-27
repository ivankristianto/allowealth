# User Docs Starlight MVP - Manual Test Plan

**Branch:** `feat/docs`  
**Date:** 2026-02-27  
**Source plans:** `docs/plans/2026-02-26-user-docs-starlight-design.md`, `docs/plans/2026-02-26-user-docs-starlight.md`

## Overview

This plan validates the Starlight docs MVP shipped as a separate app in `docs/site`, plus integration from the authenticated app navigation. It covers the agreed MVP scope: static docs, 6 Markdown pages, role-split sidebar, light branding, and local reachability via the docs dev server URL.

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
- `docs/site/dist/` is generated.
- `docs/site/dist/sitemap-index.xml` exists.

---

## Test Steps

### 1. Docs Site Boot, Routes, and Sidebar IA

**Components under test:** `docs/site/astro.config.mjs`, Markdown docs in `docs/site/src/content/docs/`

> **Critical:** Route integrity for all MVP pages and role-split sidebar navigation.

| Step | Action                                                                              | Expected Result                                                  |
| ---- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1.1  | Run `bun run docs:dev`.                                                             | Dev server starts without errors and prints `<DOCS_URL>`.        |
| 1.2  | Open `<DOCS_URL>/` in browser.                                                      | Home page renders with heading "Allowealth Documentation".       |
| 1.3  | Inspect sidebar groups.                                                             | Sidebar shows exactly: `Getting Started`, `End Users`, `Admins`. |
| 1.4  | Open `<DOCS_URL>/getting-started/`.                                                 | Page loads without 404 and shows "Getting Started".              |
| 1.5  | Open `<DOCS_URL>/end-users/onboarding/` and `<DOCS_URL>/end-users/daily-workflow/`. | Both end-user pages load without 404 and with correct titles.    |
| 1.6  | Open `<DOCS_URL>/admins/onboarding/` and `<DOCS_URL>/admins/deployment-guide/`.     | Both admin pages load without 404 and with correct titles.       |

### 2. MVP Content Cap and Frontmatter Coverage

**Files under test:** `docs/site/src/content/docs/**/*.md`, `docs/site/src/content.config.ts`

| Step | Action                                                                                                                                                                  | Expected Result                                    |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 2.1  | Run `find docs/site/src/content/docs -name "*.md" \| wc -l`.                                                                                                            | Output is exactly `6`.                             |
| 2.2  | Verify files present: `index.md`, `getting-started.md`, `end-users/onboarding.md`, `end-users/daily-workflow.md`, `admins/onboarding.md`, `admins/deployment-guide.md`. | All six files exist; no extra MVP pages are added. |
| 2.3  | Open each page source and confirm frontmatter includes `title`, `description`, `sidebar`, and `audience`.                                                               | Frontmatter fields are present on all six pages.   |

### 3. Required Cross-Links Between Guides

**Pages under test:** End-user and admin guide pages

| Step | Action                                                          | Expected Result                            |
| ---- | --------------------------------------------------------------- | ------------------------------------------ |
| 3.1  | On End User Onboarding page, click link to Daily Workflow.      | Navigates to `/end-users/daily-workflow/`. |
| 3.2  | On End User Daily Workflow page, click link back to Onboarding. | Navigates to `/end-users/onboarding/`.     |
| 3.3  | On Admin Onboarding page, click link to Deployment Guide.       | Navigates to `/admins/deployment-guide/`.  |

### 4. Branding and Responsive Rendering

**Files under test:** `docs/site/src/styles/brand.css`, `docs/site/public/logo.svg`, `docs/site/public/favicon.svg`

| Step | Action                                                                         | Expected Result                                                                       |
| ---- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 4.1  | Open docs home on desktop width (>=1280px).                                    | Branded site header is visible and visually consistent with default Starlight layout. |
| 4.2  | Check browser tab icon while on docs pages.                                    | Favicon is loaded from `/favicon.svg`.                                                |
| 4.3  | Check links/accent UI color (sidebar active item, links).                      | Accent/link colors use the configured green brand palette.                            |
| 4.4  | Resize viewport to mobile width (375px) and navigate between at least 3 pages. | Navigation and content remain usable with no horizontal overflow.                     |

### 5. Main App Integration: Docs Nav Item

**Component under test:** `src/components/layouts/Navigation.astro`

> **Critical:** Authenticated navigation must expose docs and route to the local docs URL for local QA.

| Step | Action                                                                                                   | Expected Result                                                                                |
| ---- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 5.1  | Run main app (`bun run dev`), open `<APP_URL>/login`, sign in with `demo@example.com` / `demo123456789`. | Login succeeds and main app shell loads.                                                       |
| 5.2  | In the main sidebar, locate nav item labeled `Docs`.                                                     | `Docs` item is visible with docs icon.                                                         |
| 5.3  | Click `Docs`.                                                                                            | Browser navigates in same tab to the local docs URL (`<DOCS_URL>`).                            |
| 5.4  | Return to an app page (for example `/dashboard`) and inspect sidebar item states.                        | Internal current page is highlighted; external `Docs` link is not treated as active app route. |

### 6. Local Build and Preview Reachability

**Files/systems under test:** `docs/site/astro.config.mjs`, `docs/site/public/robots.txt`, local docs preview/dev server

> **Critical:** Local docs launch path must succeed end to end.

| Step | Action                                                             | Expected Result                                         |
| ---- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| 6.1  | Run `bun run docs:build`.                                          | Static build succeeds and generates `docs/site/dist`.   |
| 6.2  | Run `bun run docs:preview` and open the printed local preview URL. | Preview server loads docs locally without errors.       |
| 6.3  | Run `curl -I <DOCS_URL>`.                                          | Returns `200`, or redirect chain ending in `200`.       |
| 6.4  | Open `<DOCS_URL>` in browser without logging in.                   | Docs are locally accessible without app authentication. |

### 7. SEO Baseline

**Files/endpoints under test:** `docs/site/public/robots.txt`, generated sitemap on local docs server

| Step | Action                                                         | Expected Result                                                      |
| ---- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| 7.1  | Open `<DOCS_URL>/robots.txt`.                                  | Contains `Allow: /` and sitemap URL pointing to `sitemap-index.xml`. |
| 7.2  | Open `<DOCS_URL>/sitemap-index.xml`.                           | Sitemap endpoint is reachable and valid XML is returned.             |
| 7.3  | Manually navigate all six docs routes from sitemap/home links. | No broken links or unexpected 404s.                                  |

---

## Summary Checklist

| #   | Area               | Key Assertion                                                           | Pass |
| --- | ------------------ | ----------------------------------------------------------------------- | ---- |
| 1   | Docs IA            | Role-split sidebar and all 6 routes load correctly                      | [ ]  |
| 2   | Content Cap        | Exactly 6 Markdown docs pages exist                                     | [ ]  |
| 3   | Cross-links        | Onboarding/workflow/admin links work bidirectionally where expected     | [ ]  |
| 4   | Branding           | Brand CSS, logo/favicon, and responsive rendering are correct           | [ ]  |
| 5   | App Nav            | Authenticated app shows Docs item and opens local docs URL in same tab  | [ ]  |
| 6   | Local Reachability | Local build + preview docs path succeeds                                | [ ]  |
| 7   | SEO                | `robots.txt` and `sitemap-index.xml` are available on local docs server | [ ]  |

**Critical paths:** Sections 1, 5, and 6 are highest priority.

## Automated Test Coverage

| Suite              | What to Run                                                                | File/Config                                               |
| ------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------- |
| Docs integrity     | `bun run docs:check`, `bun run docs:build`                                 | `package.json`, `docs/site/astro.config.mjs`              |
| Repo quality gates | `bun run lint`, `bun run stylelint`, `bun run format`, `bun run typecheck` | `eslint.config.js`, `stylelint.config.js`, root TS checks |
| Local preview path | `bun run docs:build`, `bun run docs:preview`                               | `docs/site/astro.config.mjs`, docs local server output    |
