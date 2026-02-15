# Diagnostics Page Design System Fix Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the admin diagnostics page to properly follow the project's design system patterns, matching the dashboard layout structure.

**Architecture:** Fix 6 design system violations in the diagnostics page and DiagnosticsDisplay component by aligning with patterns established in dashboard.astro, Card.astro, and Header.astro.

**Tech Stack:** Astro 5.x, DaisyUI v5, Tailwind CSS v4, Lucide icons

---

## Issues Identified

1. **Wrong header slot usage** - Page puts title/description/icon in header slot, but Header component already renders title. Creates duplicate/misplaced header.
2. **Missing container wrapper** - Content lacks the standard `@container max-w-7xl mx-auto` wrapper used by dashboard.
3. **Raw SVG icons** - Refresh button and error state use inline SVG instead of Lucide.
4. **Raw card divs** - Uses `<div class="card ...">` instead of the Card atom component.
5. **Env vars card outside grid** - Has `col-span-full` but sits outside the grid div.
6. **Duplicate `class` attribute** - Cache status icon div has two `class` attributes (line 282-288), second overrides first.

---

## Task 1: Fix Page Header and Container Structure

**Files:**

- Modify: `src/pages/admin/diagnostics.astro`

**Changes:**

1. Remove the custom h1/description from the header slot - the Header component renders title/subtitle via props already
2. Keep only the refresh button in the header slot
3. Replace inline SVG refresh icon with Lucide `RefreshCw`
4. Replace inline SVG error icon with Lucide `CircleAlert`
5. Wrap `<DiagnosticsDisplay>` in the standard container: `@container max-w-7xl mx-auto @sm:px-2 @3xl:px-6 space-y-6 @sm:space-y-8`
6. Pass subtitle to ProtectedLayout props

**Reference:** `src/pages/dashboard.astro` lines 142-209 for the correct pattern.

---

## Task 2: Fix DiagnosticsDisplay Component - Use Card Atom

**Files:**

- Modify: `src/components/organisms/DiagnosticsDisplay.astro`

**Changes:**

1. Import Card component from `@/components/atoms/Card.astro`
2. Replace all raw `<div class="card bg-base-100 shadow-premium hoverable ...">` with `<Card hoverable padding="lg">`
3. Replace env vars raw card with `<Card padding="lg">`
4. Fix the env vars card - remove `col-span-full` (it's outside the grid). Add a separate `<section>` with proper spacing instead.
5. Fix duplicate `class` attribute on cache status icon div (lines 282-288) - merge into single dynamic class expression
6. Ensure the grid + env vars section are properly structured with `space-y-6 @sm:space-y-8` vertical gap

---

## Task 3: Run Quality Gates

**Steps:**

1. `bun run lint:fix`
2. `bun run stylelint:fix`
3. `bun run format:fix`
4. `bun run typecheck`
5. `bun run build`

---

## Task 4: Verify Visually

**Steps:**

1. Start dev server
2. Navigate to diagnostics page in browser
3. Verify header shows title/subtitle from Header component (not custom slot)
4. Verify container has proper max-width and centering
5. Verify cards use proper Card component styling
6. Verify refresh button uses Lucide icon
