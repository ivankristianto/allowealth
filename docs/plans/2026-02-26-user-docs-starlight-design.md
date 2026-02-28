# User Documentation MVP Design (Starlight)

## Summary

Build a public user documentation site for Allowealth using Starlight as a **separate app in the same repository**, deployed independently to **`docs.allowealth.io`**. The MVP targets both end users and admins with 6 pages, all authored in Markdown.

## Goals

- Launch a public docs MVP for product release.
- Keep docs architecture separate from the main application runtime.
- Use static generation only (no SSR).
- Preserve Starlight defaults with light brand customization.
- Add a `Docs` entry in app main navigation linking to docs site.
- Author all docs pages in Markdown.

## Non-Goals (MVP)

- Full versioned documentation.
- Custom docs component library.
- Role-aware authentication inside docs.
- API reference generation.

## Decisions (Approved)

- Hosting model: **Subdomain**
- Domain: **`docs.allowealth.io`**
- Visibility: **Public**
- Installation model: **Option 2** (same repo, separate Starlight app)
- Target depth: **Medium**
- MVP page count: **6 pages**
- Audience: **Both end users and admins**
- Information architecture: **Role-split navigation**
- In-app docs link behavior: **Open in same tab**
- Page #6 choice: **Deployment Guide**

## Alternatives Considered

### Option 1: Separate docs repository

- Pros: strongest isolation and ownership boundaries.
- Cons: cross-repo overhead, duplicated CI/tooling, slower coordinated updates.

### Option 2: Same repository, separate Starlight app (**Selected**)

- Pros: separate install/deploy while keeping coordinated PRs and shared release context.
- Cons: introduces monorepo-style structure and additional workspace scripts.

### Option 3: Integrate docs into main Astro app

- Pros: simplest setup.
- Cons: violates separation requirement and increases coupling with app runtime.

## Architecture

### Project Layout

Keep existing internal engineering docs in `/docs`.

Add a dedicated Starlight site under:

- `/docs/site/`

Proposed structure:

- `/docs/site/package.json`
- `/docs/site/astro.config.mjs` (or `.ts`)
- `/docs/site/src/content/docs/`
- `/docs/site/src/content/docs/index.md`
- `/docs/site/public/` (logo/favicon if needed)

### Runtime and Build

- Docs app uses Starlight + Astro static output.
- No SSR requirements.
- Independent build/deploy pipeline from main app.

### Deployment

- Deploy docs app to separate Cloudflare target mapped to `docs.allowealth.io`.
- Keep app and docs deploys decoupled (separate release risk and rollback surface).

## Information Architecture

MVP sidebar uses role-split grouping.

### Page Set (MVP)

1. Home (`/`)
2. Getting Started (`/getting-started`)
3. End User Onboarding (`/end-users/onboarding`)
4. End User Daily Workflow (`/end-users/daily-workflow`)
5. Admin Onboarding (`/admins/onboarding`)
6. Deployment Guide (`/admins/deployment-guide`)

### Sidebar Grouping

- Getting Started
- End Users
  - Onboarding
  - Daily Workflow
- Admins
  - Onboarding
  - Deployment Guide

## Content Model

- All pages authored in Markdown.
- Use Starlight docs collection under `/docs/site/src/content/docs/`.
- Required frontmatter per page:
  - `title`
  - `description`
  - `sidebar` (label/order)
  - `audience: [user, admin]` (or one role)

## Theming and Branding

- Keep default Starlight theme and components.
- Apply minimal brand twist via color token overrides only (primary/accent/link).
- Add Allowealth logo + favicon in docs site assets.
- Defer typography/layout customization to post-MVP to reduce launch risk.

## Main App Integration

- Add `Docs` menu item in main navigation.
- Link target: `https://docs.allowealth.io`.
- Open in same tab.

## Delivery Plan (Phased)

### Phase 1: Foundation

- Scaffold Starlight app in `/docs/site`.
- Configure static build output.
- Add brand color overrides and site metadata.

### Phase 2: Content MVP

- Author the 6 agreed Markdown pages.
- Validate sidebar structure and role split.
- Add cross-links between onboarding and workflow pages.

### Phase 3: Integration + Deployment

- Add app navigation link to docs subdomain.
- Configure docs deployment target and DNS.
- Run launch QA checklist.

### Phase 4: Post-MVP Growth

- Add `Reports & Insights` page.
- Add troubleshooting/FAQ.
- Introduce lightweight analytics-based content prioritization.

## QA and Acceptance Criteria

### Functional

- Docs site is reachable at `docs.allowealth.io`.
- Build succeeds with static generation.
- All pages render from Markdown content.
- In-app `Docs` menu navigates to docs site.

### Content and IA

- Exactly 6 MVP pages published.
- Sidebar reflects agreed role-split structure.
- Audience targeting is clear in page content and frontmatter.

### Quality

- No broken internal links.
- Mobile and desktop layout checks pass.
- Basic metadata (title/description) present on all pages.

## Risks and Mitigations

- Risk: Confusion between internal `/docs` and user docs content.
  - Mitigation: Keep user docs isolated under `/docs/site` with separate tooling.
- Risk: Over-customizing visual theme before launch.
  - Mitigation: Restrict MVP customization to brand colors only.
- Risk: Coupled release between app and docs.
  - Mitigation: Separate deployment target and CI job for docs.

## Open Follow-Ups

- DNS and SSL ownership/setup for `docs.allowealth.io`.
- Decide docs analytics tooling (or defer explicitly).
- Define docs ownership/review process.
- Define docs versioning policy (`latest-only` for MVP recommended).
- Decide “last updated” display convention.
