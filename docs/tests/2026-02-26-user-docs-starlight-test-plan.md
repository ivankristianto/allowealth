# User Docs Starlight MVP - Test Plan

**Feature:** Public docs site at `docs.allowealth.io` (separate Starlight app)  
**Date:** 2026-02-26  
**Related plan:** `docs/plans/2026-02-26-user-docs-starlight.md`

## Overview

This test plan validates the MVP documentation launch for Allowealth:

- Separate static Starlight app under `/docs/site`
- Exactly 6 Markdown pages
- Role-split sidebar (End Users, Admins)
- Branded theme tweaks (default Starlight + brand color/logo)
- Main app authenticated menu link to docs
- Separate Cloudflare deployment on `docs.allowealth.io`

## Scope

In scope:

- Build/typecheck/lint verification for app + docs changes
- Docs information architecture and page routing
- Core content presence and required cross-links
- Authenticated app menu integration
- Public domain reachability, DNS/SSL readiness
- SEO baseline (`robots.txt`, sitemap endpoint)

Out of scope (MVP):

- Versioned docs
- Search relevance tuning
- Analytics dashboards

## Prerequisites

- Workspace has latest docs/app changes from implementation plan.
- Bun available locally.
- Cloudflare docs project configured with deployment credentials.
- `docs.allowealth.io` custom domain configured in Cloudflare.

## Automated Verification

Run these commands from repo root:

```bash
bun run docs:check
bun run docs:build
bun run lint
bun run stylelint
bun run format
bun run typecheck
```

Expected:

- All commands exit 0.
- `docs/site/dist/` is generated.
- `docs/site/dist/sitemap-index.xml` exists.

## Manual Test Cases

### 1. Local Docs App Boot and Navigation

| Step | Action                      | Expected                                                   |
| ---- | --------------------------- | ---------------------------------------------------------- |
| 1.1  | Run `bun run docs:dev`      | Dev server starts without errors                           |
| 1.2  | Open docs home page         | Home content renders correctly                             |
| 1.3  | Use sidebar navigation      | Sidebar groups display: Getting Started, End Users, Admins |
| 1.4  | Open each page from sidebar | All pages load without 404                                 |

### 2. MVP Page Count and IA

| Step | Action                                             | Expected                                                                                                                                         |
| ---- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| 2.1  | Run `find docs/site/src/content/docs -name "\*.md" | wc -l`                                                                                                                                           | Result is exactly `6` |
| 2.2  | Verify content files                               | `index.md`, `getting-started.md`, `end-users/onboarding.md`, `end-users/daily-workflow.md`, `admins/onboarding.md`, `admins/deployment-guide.md` |
| 2.3  | Open docs home                                     | Home links to all five content pages                                                                                                             |

### 3. Required Cross-Links

| Step | Action                            | Expected                                  |
| ---- | --------------------------------- | ----------------------------------------- |
| 3.1  | Open End User Onboarding page     | Contains link to End User Daily Workflow  |
| 3.2  | Open End User Daily Workflow page | Contains link back to End User Onboarding |
| 3.3  | Open Admin Onboarding page        | Contains link to Admin Deployment Guide   |

### 4. Theme and Branding

| Step | Action                       | Expected                                                                 |
| ---- | ---------------------------- | ------------------------------------------------------------------------ |
| 4.1  | Open docs header on desktop  | Brand logo is visible                                                    |
| 4.2  | Inspect tab icon             | Favicon loads correctly                                                  |
| 4.3  | Check links/accents/buttons  | Brand color overrides are visible while layout remains Starlight-default |
| 4.4  | Test mobile viewport (375px) | Navigation and content remain readable and usable                        |

### 5. App Integration (Authenticated Main Menu)

| Step | Action                                    | Expected                                              |
| ---- | ----------------------------------------- | ----------------------------------------------------- |
| 5.1  | Log into app and open main sidebar/drawer | Docs menu item is present                             |
| 5.2  | Click Docs menu item                      | Navigates to `https://docs.allowealth.io` in same tab |
| 5.3  | Check public navbar and mobile bottom nav | No Docs item required for MVP (scope check)           |

### 6. Deployment and Domain Go-Live

| Step | Action                                       | Expected                                             |
| ---- | -------------------------------------------- | ---------------------------------------------------- |
| 6.1  | Trigger docs deploy workflow                 | Workflow succeeds                                    |
| 6.2  | Verify Cloudflare custom domain binding      | `docs.allowealth.io` attached to docs worker/project |
| 6.3  | Verify SSL status in Cloudflare              | SSL is active                                        |
| 6.4  | Run `curl -I https://docs.allowealth.io`     | Returns `200` (or redirect chain ending in `200`)    |
| 6.5  | Open `https://docs.allowealth.io` in browser | Site is public without auth                          |

### 7. SEO Baseline

| Step | Action                                              | Expected                            |
| ---- | --------------------------------------------------- | ----------------------------------- |
| 7.1  | Open `https://docs.allowealth.io/robots.txt`        | Contains `Allow: /` and sitemap URL |
| 7.2  | Open `https://docs.allowealth.io/sitemap-index.xml` | Sitemap responds successfully       |
| 7.3  | Crawl internal links manually (home + 5 pages)      | No broken links                     |

## Exit Criteria

Release is accepted when all conditions are true:

- Automated verification commands pass.
- Exactly 6 MVP docs pages exist.
- Required cross-links and role-split navigation are present.
- App docs menu integration works as specified.
- `docs.allowealth.io` is reachable publicly with valid SSL.
- SEO baseline endpoints are available.

## Regression Watchlist

- Accidental extra pages added during MVP (breaks 6-page limit)
- Domain configured but DNS/SSL not active
- App menu link broken by nav refactor
- Brand CSS overriding too much of Starlight defaults
