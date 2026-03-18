# Root App Marketing Removal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the remaining marketing and landing feature set from `src/` so the root app is app-only and `apps/site` is the single owner of the public marketing surface.

**Architecture:** Delete the orphaned public-layout stack, landing components, landing data, and screenshot assets from `src/`. Update root-app links and regression tests so authenticated and auth flows only target app-owned destinations, while marketing assertions move to `apps/site`.

**Tech Stack:** Astro 5.x, Bun test, Tailwind CSS v4, DaisyUI v5

---

## Files Modified

| File | What changes |
|------|-------------|
| `src/__tests__/root-app-boundaries.test.ts` | New boundary test for app-only ownership and app-owned logo destinations |
| `src/__tests__/authenticated-theme-toggle-removal.test.ts` | Point public-layout assertion at `apps/site` |
| `src/components/molecules/atomic-design-reclassify.test.ts` | Remove root landing component assumptions |
| `tests/regression/site-hero-animations.test.ts` | Keep the site hero regression after removing the root landing directory |
| `src/layouts/AuthLayout.astro` | Replace root-home marketing link with app-owned auth destination |
| `src/components/layouts/Navigation.astro` | Replace root-home marketing links with `/dashboard` |
| `design-system/02-components.md` | Update landing component references to `apps/site` |
| `src/layouts/PublicLayout.astro` | Delete |
| `src/components/layouts/PublicNavbar.astro` | Delete |
| `src/components/layouts/PublicFooter.astro` | Delete |
| `src/components/layouts/PublicAuthCta.client.ts` | Delete |
| `src/components/molecules/landing/HeroSection.astro` | Delete |
| `src/components/molecules/landing/FeaturesGrid.astro` | Delete |
| `src/components/molecules/landing/FaqSection.astro` | Delete |
| `src/components/organisms/landing/ShowcaseSection.astro` | Delete |
| `src/components/organisms/landing/PricingSection.astro` | Delete |
| `src/components/molecules/landing/HeroSection.test.ts` | Move/delete in favor of site-scoped regression coverage |
| `src/lib/landing-content.ts` | Delete |
| `src/assets/screenshots/*` | Delete root copies; keep `apps/site` copies |

### Task 1: Lock the App-Only Boundary With Tests

**Files:**
- Create: `src/__tests__/root-app-boundaries.test.ts`
- Modify: `src/__tests__/authenticated-theme-toggle-removal.test.ts`
- Modify: `src/components/molecules/atomic-design-reclassify.test.ts`
- Create: `tests/regression/site-hero-animations.test.ts`
- Delete: `src/components/molecules/landing/HeroSection.test.ts`

- [ ] **Step 1: Write the failing boundary test**
- [ ] **Step 2: Run the targeted test command and verify it fails for the current root marketing files and root-home links**
- [ ] **Step 3: Update the non-boundary tests so surviving marketing assertions target `apps/site`, not `src`**
- [ ] **Step 4: Re-run the targeted tests after implementation**
- [ ] **Step 5: Commit**

### Task 2: Remove Root Marketing Files and Repoint App Branding

**Files:**
- Modify: `src/layouts/AuthLayout.astro`
- Modify: `src/components/layouts/Navigation.astro`
- Delete: `src/layouts/PublicLayout.astro`
- Delete: `src/components/layouts/PublicNavbar.astro`
- Delete: `src/components/layouts/PublicFooter.astro`
- Delete: `src/components/layouts/PublicAuthCta.client.ts`
- Delete: `src/components/molecules/landing/HeroSection.astro`
- Delete: `src/components/molecules/landing/FeaturesGrid.astro`
- Delete: `src/components/molecules/landing/FaqSection.astro`
- Delete: `src/components/organisms/landing/ShowcaseSection.astro`
- Delete: `src/components/organisms/landing/PricingSection.astro`
- Delete: `src/lib/landing-content.ts`
- Delete: `src/assets/screenshots/accounts.jpg`
- Delete: `src/assets/screenshots/budget.jpg`
- Delete: `src/assets/screenshots/dashboard.jpg`
- Delete: `src/assets/screenshots/reports.jpg`
- Delete: `src/assets/screenshots/transactions.jpg`

- [ ] **Step 1: Repoint auth and in-app logo links to app-owned routes**
- [ ] **Step 2: Delete the unused root marketing layout, components, data, and assets**
- [ ] **Step 3: Run the targeted boundary tests to verify the root app no longer owns marketing**
- [ ] **Step 4: Commit**

### Task 3: Update Documentation and Run Quality Gates

**Files:**
- Modify: `design-system/02-components.md`

- [ ] **Step 1: Update documentation references that still point landing components at `src/`**
- [ ] **Step 2: Run `bun run lint:fix`, `bun run stylelint:fix`, `bun run format:fix`, `bun run typecheck`, and `bun run test`**
- [ ] **Step 3: Run `bun run build`**
- [ ] **Step 4: Commit**
