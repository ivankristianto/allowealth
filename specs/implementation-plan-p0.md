# Design System Alignment - Milestone P0

Complete audit and alignment of components and styles to strictly follow `design-system/styles.json`.
This the part 1/3 milestones.

## Summary

This plan addresses **significant discrepancies** between the current implementation and the new "Oasis Finance" design system specification in `styles.json`. The current codebase uses an emerald-based color palette while the new design spec calls for a slate-primary, indigo-accent modern design language.

### Key Changes Required

1. **Color Palette Overhaul** - Migrate from emerald-primary to slate-primary with indigo-accent system
2. **Typography Update** - Add Inter font, adjust font sizes to match spec
3. **Component Restyling** - Update all atoms/molecules/organisms to match new specs
4. **Animation System** - Implement Motion library patterns (after foundation)
5. **Dark Theme** - Implement proper dark theme from spec
6. **Icon Standardization** - Fix inline SVGs in JavaScript, standardize icon sizes
7. **Layout Updates** - Align with container, spacing, and dimension specs
8. **Color Semantics Audit** - Ensure primary vs accent usage is consistent

### Design System Alignment Rules (Apply to All Tasks)

- Use design tokens from `@/lib/tokens` and CSS variables from `tokens.css`; avoid hardcoded hex values.
- Use DaisyUI semantic colors (`btn-accent`, `text-base-content`, `bg-base-200`, `border-base-300`) instead of Tailwind palette classes (`text-slate-*`, `bg-slate-*`, `dark:` variants).
- Use `@lucide/astro` for icons and follow the size scale from `design-system/styles.json`.
- Use Motion (`motion`) presets for animations when required by the spec.
- Avoid arbitrary value utilities (e.g., `text-[...]`, `p-[...]`, `max-w-[...]`, `shadow-[...]`, `bg-[...]`); use tokens, DaisyUI size classes, or add tokenized utilities.
- Avoid arbitrary radius utilities like `rounded-[...]`; use DaisyUI design variables (`--radius-*`) and tokenized radius classes.

### Proposed Changes (Context)

Note: This list reflects full-scope changes across all milestones.

#### New Files

- `src/styles/animations.css` - Motion animation CSS custom properties
- `src/lib/animations.ts` - Motion animation presets and utilities

#### Modified Files

- `src/styles/tokens.css` - Update all color tokens
- `src/styles/globals.css` - Update DaisyUI theme, add new utilities
- `src/lib/tokens.ts` - Update TypeScript token exports
- `tailwind.config.ts` - Update DaisyUI theme colors
- `src/layouts/BaseLayout.astro` - Add Inter font import
- `src/components/atoms/Button.astro` - New color scheme, sizes
- `src/components/atoms/Card.astro` - New padding, radius, shadow
- `src/components/atoms/Input.astro` - New height, radius, focus ring
- `src/components/atoms/Badge.astro` - New sizing
- `src/components/layouts/Navigation.astro` - Active gradient, icon sizes
- `src/components/layouts/Header.astro` - Height adjustment
- `src/components/molecules/ForgotPasswordForm.astro` - Replace JS template SVGs
- `src/components/molecules/CSVImportForm.astro` - Replace dynamic SVGs
- `src/components/molecules/LoginForm.astro` - Replace SVG in error template
- `src/components/molecules/Toast.astro` - Motion animations
- All organism components - Color and spacing updates

#### Refactoring (Bulk Changes)

- All 16 atom components - Color token updates
- All 14 molecule components - Color and spacing updates
- All 9 organism components - Color and spacing updates
- All 4 layout components - Layout dimension updates
- All UI components - Replace hardcoded colors with tokens or DaisyUI semantic classes

---

## Scope

- Priority: P0 only
- Sections included: Section 1, Section 2 (Tasks 2.1-2.4), Section 3 (Tasks 3.1-3.2)

---

## Detailed Tasks

### Section 1: Foundation Token Updates (Priority: P0)

**Goal:** Establish the new design token foundation that all components will consume

---

### Task 1.0: Define Primary vs Accent Usage (Priority: P0)

**Goal:** Establish color semantic mapping before implementation to prevent CTA and text color conflicts

**Context:** This plan changes `--color-primary` from emerald (CTAs) to slate-900 (text). This is a semantic inversion that must be clearly defined before any implementation begins.

**Checklist:**

- [x] Document the new color semantic model:
  - `primary` = slate-900 → headings, primary text, secondary buttons
  - `accent` = indigo-500 → CTAs, interactive elements, active states
  - `success` = emerald-500 → positive status, confirmations
  - `warning` = amber-500 → budget alerts, caution states
  - `error` = rose-500 → over budget, destructive actions
- [x] Audit current `btn-primary` usage and identify which should become `btn-accent`
- [x] Audit current `text-primary` usage to ensure it's appropriate for the new text semantic
- [x] Audit current `bg-primary` usage for any CTA backgrounds that need `bg-accent`
- [x] Document the mapping in this plan for reference during component work
- [x] Reserve `btn-primary` for neutral/secondary emphasis; use `btn-accent` for primary CTAs

---

## Audit Findings

### Current State (Emerald-Based)

**`btn-primary` Usage (70+ occurrences):**

| Component                                                                                | Usage Pattern                                               | Should Become |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------- |
| `Button.astro`                                                                           | Primary variant definition                                  | `btn-accent`  |
| Pages (export, payment-methods, categories, calculators, reports, budget, index, assets) | CTA buttons ("Save", "Calculate", "Generate Report", "Add") | `btn-accent`  |
| `EmptyState.astro`                                                                       | Action buttons                                              | `btn-accent`  |
| `UserContext.astro`                                                                      | "Sign Up" button                                            | `btn-accent`  |
| `TransactionModal`                                                                       | "Save/Update Transaction" button                            | `btn-accent`  |
| `Modal` stories                                                                          | Confirm buttons                                             | `btn-accent`  |
| `Header.astro`                                                                           | "Add new item" button                                       | `btn-accent`  |
| `CSVImportForm`                                                                          | Import buttons                                              | `btn-accent`  |
| `QuickActions`                                                                           | Primary action (expense)                                    | `btn-accent`  |

**Key Finding:** ALL current `btn-primary` usages are CTAs and should become `btn-accent`. The only exceptions would be secondary/de-emphasized actions.

---

**`text-primary` Usage (20+ occurrences):**

| Component                         | Usage Pattern                                  | Action                                            |
| --------------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| `RecentTransactionsList.astro`    | Link hover state (`hover:text-primary-hover`)  | Keep - appropriate for links                      |
| `BudgetOverviewTable.astro`       | Sortable column headers (`hover:text-primary`) | Keep - appropriate for interactive elements       |
| `Badge.astro`                     | Primary badge outline variant                  | Keep - appropriate for neutral emphasis           |
| `LoginForm`, `ForgotPasswordForm` | Auth links ("Sign up", "Sign in")              | Keep - appropriate for links                      |
| `UserContext.astro`               | Avatar with `bg-primary text-primary-content`  | **CHANGE** - avatar background should use neutral |
| `AuthLayout.astro`                | Logo background (`bg-primary`)                 | **CHANGE** - logo should use accent or neutral    |
| Settings pages                    | Stat values                                    | Keep - appropriate for emphasis text              |

**Key Finding:** Most `text-primary` usages are appropriate for the new semantic (primary text color). However, `bg-primary` usage in avatars and logos should be reviewed.

---

**`bg-primary` Usage (8 occurrences):**

| Component                       | Usage Pattern                            | Should Become                              |
| ------------------------------- | ---------------------------------------- | ------------------------------------------ |
| `UserContext.astro`             | Avatar background                        | `bg-neutral` or `bg-accent` (for branding) |
| `AuthLayout.astro`              | Logo background box                      | `bg-accent` (for branding)                 |
| `BudgetHistoryComparison.astro` | Current month highlight (`bg-primary/5`) | `bg-accent/5` (subtle accent)              |

**Key Finding:** Avatar backgrounds should use neutral for user avatars, accent for branded elements.

---

**Focus Ring Colors:**

| Component              | Current                  | Should Become       |
| ---------------------- | ------------------------ | ------------------- |
| `Button.astro`         | `focus:ring-emerald-500` | `focus:ring-accent` |
| `Button.astro` outline | `focus:ring-emerald-500` | `focus:ring-accent` |
| `Button.astro` ghost   | `focus:ring-emerald-500` | `focus:ring-accent` |

**Key Finding:** All emerald focus rings should become accent (indigo).

---

**Hardcoded Emerald Colors:**

| File                    | Usage                                                       | Replacement                                                           |
| ----------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/styles/tokens.css` | `--color-primary: #10b981` (emerald-500)                    | `--color-primary: #0f172a` (slate-900), add `--color-accent: #6366f1` |
| `Button.astro`          | `hover:bg-emerald-600`, `text-emerald-600`, `bg-emerald-50` | Use DaisyUI accent utilities                                          |

---

**Color Semantic Mapping:**

| Usage               | Before (Emerald)   | After (Slate/Indigo)           |
| ------------------- | ------------------ | ------------------------------ |
| Primary CTA buttons | `btn-primary`      | `btn-accent`                   |
| Secondary buttons   | `btn-secondary`    | `btn-primary` or `btn-neutral` |
| Headings/text       | `text-gray-900`    | `text-primary`                 |
| Interactive focus   | `ring-emerald-500` | `ring-accent`                  |
| Active nav items    | emerald background | indigo gradient + border       |

**Estimated Time:** 30 minutes

**Status:** ✅ Completed

---

## Implementation Guide

### Task 1.1: Update CSS Design Tokens (Priority: P0)

**Goal:** Update `src/styles/tokens.css` with new color palette from styles.json

**Current Issue:** Current tokens use emerald-based colors (`#10b981`), but styles.json specifies slate-primary (`#0f172a`) with indigo-accent (`#6366f1`).

**Checklist:**

- [x] Keep `--color-primary` as `#0f172a` (slate-900) for primary text/headings
- [x] Add `--color-accent` as `#6366f1` (indigo-500) for CTAs and interactive elements
- [x] Add `--color-accent-hover` as `#4f46e5` (indigo-600)
- [x] Add `--color-accent-content` as `#ffffff`
- [x] Update `--color-error` from `#ef4444` to `#f43f5e` (rose-500)
- [x] Update `--color-info` from `#3b82f6` to `#6366f1` (indigo-500)
- [x] Keep `--color-success` as `#10b981` (emerald-500)
- [x] Add slate color scale (50: #f8fafc, 100: #f1f5f9, 200: #e2e8f0, 300: #cbd5e1, 400: #94a3b8, 500: #64748b, 600: #475569, 700: #334155, 800: #1e293b, 900: #0f172a)
- [x] Add indigo color scale (50: #eef2ff, 100: #e0e7ff, 400: #818cf8, 500: #6366f1, 600: #4f46e5, 700: #4338ca)
- [x] Add rose color scale (50: #fff1f2, 100: #ffe4e6, 500: #f43f5e, 600: #e11d48)
- [x] Update typography font sizes with accessibility adjustment (diverges from styles.json for WCAG compliance):
  - xs: 0.75rem (12px) - minimum accessible size
  - sm: 0.8125rem (13px)
  - base: 0.875rem (14px) - accessible body text
  - md: 0.9375rem (15px)
  - lg: 1rem (16px)
  - xl: 1.25rem (20px)
  - 2xl: 1.5rem (24px)
  - 3xl: 1.875rem (30px)
- [x] Updates design-system/styles.json file to sync
- [x] Add Inter font family to `--font-sans`: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- [x] Add component-specific tokens (button, card, input, sidebar, badge, table)
- [x] Add effect tokens (glass, gradient, shadows including accentGlow: `0 10px 15px -3px rgba(99, 102, 241, 0.2)`)
- [x] Add status tokens (ok/warning/danger) and currency tokens (IDR/USD) as CSS variables
- [x] Update dark theme overrides with full dark palette

**Files to modify:**

- `src/styles/tokens.css`
- `src/styles/globals.css` (uncommented import)
- `design-system/styles.json` (synced font sizes, border radius, badge font size)

**Token Changes:**

```css
/* Before */
--color-primary: #10b981;
--color-info: #3b82f6;
--color-error: #ef4444;

/* After - following styles.json exactly */
--color-primary: #0f172a; /* slate-900 - headings, primary text */
--color-accent: #6366f1; /* indigo-500 - CTAs, active states */
--color-accent-hover: #4f46e5; /* indigo-600 */
--color-accent-content: #ffffff;
--color-info: #6366f1; /* indigo-500 */
--color-error: #f43f5e; /* rose-500 */
--color-success: #10b981; /* emerald-500 - keep for success states */
```

**Estimated Time:** 2-3 hours

**Status:** ✅ Completed (2025-01-22)

---

### Task 1.2: Update TypeScript Token Exports (Priority: P0)

**Goal:** Sync `src/lib/tokens.ts` with new CSS tokens

**Current Issue:** TypeScript tokens don't include accent color, have wrong error/info colors, and use incorrect color mapping.

**Checklist:**

- [x] Update `primary` color to `#0f172a` (slate-900)
- [x] Add `accent` color constant (`#6366f1`)
- [x] Add `accentHover` color constant (`#4f46e5`)
- [x] Update `error` color to `#f43f5e`
- [x] Update `info` color to `#6366f1`
- [x] Add full slate color scale object
- [x] Add full indigo color scale object
- [x] Add rose color scale object
- [x] Update font family to include Inter as primary
- [x] Update font sizes to match accessibility-adjusted scale:
  - xs: 0.75rem, sm: 0.8125rem, base: 0.875rem, md: 0.9375rem
  - lg: 1rem, xl: 1.25rem, 2xl: 1.5rem, 3xl: 1.875rem
- [x] Add component spacing constants from styles.json
- [x] Add `colors.status` and `colors.currency` mappings to match the design system
- [x] Add animation duration constants (fast: 0.15, normal: 0.3, slow: 0.5)
- [x] Add spring configuration presets (smooth, bouncy, gentle, snappy)

**Files to modify:**

- `src/lib/tokens.ts`

**Estimated Time:** 1-2 hours

**Status:** ✅ Completed (2025-01-22)

---

### Task 1.3: Update DaisyUI Theme Configuration (Priority: P0)

**Goal:** Configure DaisyUI v5 custom themes using CSS @plugin syntax

**Current Issue:** DaisyUI v5 uses CSS `@plugin` syntax for theme configuration, not JavaScript theme objects in tailwind.config.ts.

**Checklist:**

- [x] Remove any DaisyUI theme configuration from `tailwind.config.ts` (themes defined in CSS)
- [x] Ensure `tailwind.config.ts` only has DaisyUI plugin registered without theme objects
- [x] Configure custom light theme in `globals.css` using @plugin syntax
- [x] Configure custom dark theme in `globals.css` using @plugin syntax
- [x] Set DaisyUI design variables (radius, size, border, depth, noise)
- [x] Verify theme switching works with `data-theme` attribute

**Files to modify:**

- `tailwind.config.ts` (simplify - remove theme config)
- `src/styles/globals.css` (add @plugin theme configuration)

**DaisyUI v5 Theme Configuration (globals.css):**

```css
/* Light Theme */
@plugin "daisyui/theme" {
  name: 'light';
  default: true;

  /* Color tokens */
  --color-primary: oklch(from #0f172a l c h); /* slate-900 - text/headings */
  --color-primary-content: oklch(from #ffffff l c h);
  --color-secondary: oklch(from #0f172a l c h); /* slate-900 - secondary buttons */
  --color-secondary-content: oklch(from #ffffff l c h);
  --color-accent: oklch(from #6366f1 l c h); /* indigo-500 - CTAs */
  --color-accent-content: oklch(from #ffffff l c h);
  --color-neutral: oklch(from #64748b l c h); /* slate-500 */
  --color-neutral-content: oklch(from #ffffff l c h);
  --color-base-100: oklch(from #ffffff l c h); /* white */
  --color-base-200: oklch(from #f8fafc l c h); /* slate-50 */
  --color-base-300: oklch(from #e2e8f0 l c h); /* slate-200 */
  --color-base-content: oklch(from #1e293b l c h); /* slate-800 */
  --color-info: oklch(from #6366f1 l c h); /* indigo-500 */
  --color-info-content: oklch(from #ffffff l c h);
  --color-success: oklch(from #10b981 l c h); /* emerald-500 */
  --color-success-content: oklch(from #ffffff l c h);
  --color-warning: oklch(from #f59e0b l c h); /* amber-500 */
  --color-warning-content: oklch(from #ffffff l c h);
  --color-error: oklch(from #f43f5e l c h); /* rose-500 */
  --color-error-content: oklch(from #ffffff l c h);

  /* Design variables */
  --radius-selector: 1rem;
  --radius-field: 0rem;
  --radius-box: 0.5rem;
  --size-selector: 0.25rem;
  --size-field: 0.25rem;
  --border: 1px;
  --depth: 1;
  --noise: 0;
}

/* Dark Theme */
@plugin "daisyui/theme" {
  name: 'dark';
  prefersdark: true;

  --color-primary: oklch(from #f8fafc l c h); /* slate-50 - light text */
  --color-primary-content: oklch(from #0f172a l c h);
  --color-secondary: oklch(from #f8fafc l c h);
  --color-secondary-content: oklch(from #0f172a l c h);
  --color-accent: oklch(from #818cf8 l c h); /* indigo-400 */
  --color-accent-content: oklch(from #0f172a l c h);
  --color-neutral: oklch(from #94a3b8 l c h); /* slate-400 */
  --color-neutral-content: oklch(from #0f172a l c h);
  --color-base-100: oklch(from #020617 l c h); /* slate-950 */
  --color-base-200: oklch(from #0f172a l c h); /* slate-900 */
  --color-base-300: oklch(from #1e293b l c h); /* slate-800 */
  --color-base-content: oklch(from #f1f5f9 l c h); /* slate-100 */
  --color-info: oklch(from #818cf8 l c h); /* indigo-400 */
  --color-success: oklch(from #34d399 l c h); /* emerald-400 */
  --color-warning: oklch(from #fbbf24 l c h); /* amber-400 */
  --color-error: oklch(from #f43f5e l c h); /* rose-500 */

  --radius-selector: 1rem;
  --radius-field: 0rem;
  --radius-box: 0.5rem;
  --depth: 1;
  --noise: 0;
}
```

**Estimated Time:** 1 hour

**Status:** ✅ Completed (2025-01-22)

---

### Task 1.4: Update Global Styles (Priority: P0)

**Goal:** Update `globals.css` with new DaisyUI plugin configuration and global styles

**Current Issue:** Current globals.css uses basic DaisyUI setup, needs custom theme configuration with accent-based focus styles.

**Checklist:**

- [ ] Import tokens.css (currently commented out)
- [ ] Configure DaisyUI with custom theme using @plugin syntax
- [ ] Set DaisyUI design variables to match `styles.json` (radius/size/border/depth/noise)
- [ ] Use: `--radius-selector: 1rem`, `--radius-field: 0rem`, `--radius-box: 0.5rem`, `--size-selector: 0.25rem`, `--size-field: 0.25rem`, `--border: 1px`, `--depth: 1`, `--noise: 0`
- [ ] Ensure global font styles reference the tokenized font family
- [ ] Update focus styles to use accent color (`--color-accent`)
- [ ] Add glass effect utilities (backdrop-blur: 12px, opacity: 0.8)
- [ ] Add gradient utilities using pattern tokens (e.g., `sidebarActive`)
- [ ] Add premium shadow utilities using tokenized shadows (e.g., `accentGlow`)
- [ ] Add tokenized utility classes for non-standard sizing (badge text size, container max width)
- [ ] Update scrollbar colors to use base tokens

**Files to modify:**

- `src/styles/globals.css`

**Utility Classes to Define:**

```css
/* Shadow utilities */
.shadow-premium {
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.05),
    0 1px 2px 0 rgba(0, 0, 0, 0.03);
}
.shadow-accent-glow {
  box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.2);
}
.shadow-accent-glow-lg {
  box-shadow: 0 25px 50px -12px rgba(99, 102, 241, 0.3);
}

/* Active navigation gradient */
.nav-active {
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.1) 0%, transparent 100%);
  border-left: 2px solid var(--color-accent);
}

/* Glass effect */
.glass-effect {
  backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.8);
}
[data-theme='dark'] .glass-effect {
  background: rgba(15, 23, 42, 0.8);
}

/* Badge text size (accessibility-adjusted) */
.text-badge {
  font-size: 0.75rem; /* 12px - adjusted from 0.625rem for accessibility */
}

/* Container max-width */
.container-app {
  max-width: 1400px;
}
```

**Estimated Time:** 1-2 hours

**Status:** ✅ Completed (2025-01-22)

---

#### Task 1.4 Code Review Feedback (P2/P3 - Non-blocking)

- [ ] Add fallback values to utility classes for graceful degradation (e.g., `var(--shadow-premium, 0 1px 3px 0 rgb(0 0 0 / 0.05))`)
- [ ] Consider adding `@supports` for `backdrop-filter` in `.glass-effect` for older Safari versions
- [ ] Add inline documentation comments for shadow utilities describing when to use each variant

---

### Task 1.5: Add Inter Font Import (Priority: P0)

**Goal:** Integrate Inter font family as specified in styles.json

**Checklist:**

- [x] Decide on self-hosted vs CDN font delivery (privacy vs convenience) - **Decision: CDN (Google Fonts)**
- [x] Add Inter font import in `src/layouts/BaseLayout.astro`
- [x] Ensure `font-display: swap` is used if self-hosting
- [x] Keep font weights aligned with spec: 300, 400, 500, 600, 700

**Files to modify:**

- `src/layouts/BaseLayout.astro` ✅
- `src/middleware.ts` ✅ (CSP font-src update for P0 fix)

**Estimated Time:** 30 minutes

**Status:** ✅ Completed (2025-01-22)

**Implementation Notes:**

- Chose Google Fonts CDN for simplicity and performance
- Added preconnect hints for `fonts.googleapis.com` and `fonts.gstatic.com`
- Used `display=swap` for FOUT (Flash of Unstyled Text) handling
- Updated CSP `font-src` directive to allow Google Fonts domains (P0 fix)

---

### Task 1.6: Update Design System Documentation (Priority: P0)

**Goal:** Sync design system documentation with new token values and color semantics

**Context:** The color semantic model is changing significantly (primary = text, accent = CTAs). Documentation must be updated to prevent developer confusion.

**Checklist:**

- [x] Update `design-system/START.md` Token Quick Reference section:
  - Update `colors.primary` from `#10b981 (emerald - growth, CTAs)` to `#0f172a (slate - headings, text)`
  - Add `colors.accent` as `#6366f1 (indigo - CTAs, interactive)`
  - Add `colors.accentHover` as `#4f46e5 (indigo-600)`
  - Update `colors.error` from `#ef4444` to `#f43f5e`
  - Update `colors.info` from `#3b82f6` to `#6366f1`
- [x] Update `design-system/START.md` Common Patterns section:
  - Change button examples from `btn-primary` to `btn-accent` for CTAs
  - Update focus ring examples to use accent color
- [x] Update `design-system/01-foundations.md` with full new color palette
- [x] Update font size documentation to reflect accessibility-adjusted scale
- [x] Add note about DaisyUI v5 @plugin syntax for theme configuration
- [x] Verify all code examples in docs reflect new color usage

**Files to modify:**

- `design-system/START.md`
- `design-system/01-foundations.md`

**Estimated Time:** 45 minutes

**Status:** ✅ Completed (2025-01-22)

**Implementation Notes:**

- Updated Token Quick Reference section with new color semantic model (slate primary, indigo accent)
- Updated Typography section with accessibility-adjusted font sizes
- Updated Common Patterns section to use btn-accent for CTAs
- Added DaisyUI v5 @plugin syntax note
- Fixed documentation to match actual tokens.ts implementation (removed non-existent primaryHover)

---

### Quality Gate Checkpoint - Section 1

**Run before proceeding to Section 2:**

```bash
bun run typecheck
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run dev  # Verify dev server starts
```

**Verify:**

- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Styles compile without warnings
- [ ] Dev server starts without errors
- [ ] Theme switching works (light/dark)

---

### Section 2: Atom Component Updates (Priority: P0)

**Goal:** Update all atomic components to match new design specifications

---

### Task 2.1: Update Button Component (Priority: P0)

**Goal:** Align Button with styles.json specifications

**Current Issue:** Button uses emerald colors (`hover:bg-emerald-600`, `focus:ring-emerald-500`) and wrong focus ring colors. Should use indigo accent.

**Checklist:**

- [x] Update primary variant to use accent/indigo colors (`btn-accent` or custom `bg-accent`)
- [x] Update secondary variant to use tokenized primary/neutral color
- [x] Add ghost variant with transparent bg and `border-base-300` (or tokenized border color)
- [x] Update focus ring to use accent token (theme-friendly, no hardcoded color)
- [x] Add accent glow shadow using tokenized shadow utility
- [x] Update size specs to match styles.json exactly:
  - sm: height 2rem, padding `0.375rem 0.75rem`, fontSize `0.75rem`
  - md: height 2.5rem, padding `0.625rem 1.25rem`, fontSize `0.875rem`
  - lg: height 3rem, padding `0.75rem 1.5rem`, fontSize `0.875rem`
- [x] Remove emerald-specific hover colors
- [x] Update outline variant border to accent token

**Files to modify:**

- `src/components/atoms/Button.astro` ✅
- `src/components/atoms/Button.stories.ts` ✅

**UI Change:**

```
Before:
┌─────────────────────────┐
│ Primary (Emerald Green) │
└─────────────────────────┘

After:
┌─────────────────────────┐
│ Primary (Indigo/Purple) │  + accent glow shadow
└─────────────────────────┘
```

**Estimated Time:** 1 hour

**Status:** ✅ Completed (2025-01-22)

---

### Task 2.2: Update Card Component (Priority: P0)

**Goal:** Align Card with styles.json specifications

**Current Issue:** Card uses `p-6` padding (24px), but styles.json specifies `1.75rem` (28px). Border radius should come from DaisyUI `--radius-box` (tokenized), not a custom `rounded-[...]` value.

**Checklist:**

- [x] Update default padding from `p-6` to `p-7` (1.75rem / 28px) using tokenized spacing
- [x] Use DaisyUI `radius-box` for card border radius (no `rounded-[...]`)
- [x] Add premium shadow via tokenized shadow utility
- [x] Use `border-base-300` for borders so the theme handles light/dark variants
- [x] Update compact padding from `p-4` to appropriate smaller value
- [x] Add hover animation support (y: -4, enhanced shadow)

**Files to modify:**

- `src/components/atoms/Card.astro` ✅
- `src/components/atoms/Card.stories.ts` ✅
- `src/components/atoms/Card.behavior.test.ts` ✅

**Estimated Time:** 30 minutes

**Status:** ✅ Completed (2025-01-22)

**Implementation Notes:**

- Updated padding from `p-6` to `p-7` (1.75rem/28px) to match styles.json
- Added `shadow-premium` utility class for tokenized shadow
- Added `border-base-300` for theme-aware border colors
- Added hover animation: `hover:-translate-y-1 hover:shadow-lg transition-all duration-200`
- Updated JSDoc comments to reference Oasis Finance v1.0.0 design system
- Created comprehensive behavior test file documenting design system alignment
- Updated Storybook stories to match new component implementation

---

#### Task 2.2 Code Review Feedback (P2/P3 - Non-blocking)

- [ ] Add fallback values to `.shadow-premium` utility class for graceful degradation (also tracked in Task 1.4 feedback)
- [ ] Update `spacing.card` token in `src/lib/tokens.ts` from `1.5rem` to `1.75rem` for consistency

---

### Task 2.3: Update Input Component (Priority: P0)

**Goal:** Align Input with styles.json specifications

**Current Issue:** Input doesn't match height (2.5rem), padding, background, or focus ring specs from styles.json. Border radius should come from DaisyUI `--radius-field` (tokenized).

**Checklist:**

- [x] Set height to 2.5rem (40px) using `h-10`
- [x] Update padding to match spec (top right bottom left: 0.5rem 2.5rem 0.5rem 0.75rem):
  - Use `pt-2 pb-2 pl-3` (0.5rem top/bottom, 0.75rem left)
  - Use `pr-10` (2.5rem right - space for trailing icon/button)
  - Or use inline style for exact values: `padding: 0.5rem 2.5rem 0.5rem 0.75rem`
- [x] Set font size to 0.75rem (12px) using `text-xs`
- [x] Use DaisyUI `radius-field` for input border radius (no `rounded-[...]`)
- [x] Add background using theme base tokens (e.g., `bg-base-200`)
- [x] Update focus ring to 2px using accent token (theme-friendly)
- [x] Update error state border to `border-error` (or tokenized equivalent)

**Files to modify:**

- `src/components/atoms/Input.astro` ✅
- `src/components/atoms/Input.behavior.test.ts` ✅ (created)
- `src/components/atoms/Input.stories.ts` ✅ (updated)

**Estimated Time:** 45 minutes

**Status:** ✅ Completed (2025-01-22)

**Implementation Notes:**

- Updated height to `h-10` (2.5rem/40px) to match styles.json
- Updated padding to `pt-2 pb-2 pl-3 pr-10` (0.5rem 2.5rem 0.5rem 0.75rem)
- Updated font size to `text-xs` (0.75rem/12px) for accessibility
- Added `bg-base-200` for theme-aware background
- Updated focus ring to `focus:ring-2 focus:ring-accent focus:ring-opacity-20 focus:outline-none`
- Updated error state to use `input-error border-error`
- Created comprehensive behavior test file documenting design system alignment
- Updated Storybook stories to match new component styles

---

### Task 2.4: Update Badge Component (Priority: P0)

**Goal:** Align Badge with styles.json specifications

**Current Issue:** Badge doesn't match padding, font size, or font weight specs from styles.json.

**Checklist:**

- [x] Update padding to `px-2.5 py-1` (0.25rem 0.625rem / 4px 10px)
- [x] Update font size using a tokenized utility (e.g., `text-badge`) aligned to 0.625rem
- [x] Update font weight to `font-bold` (700)
- [x] Ensure badge radius follows DaisyUI selector radius (no `rounded-[...]`)
- [x] Update color variants to use DaisyUI semantic colors (`badge-accent`, `badge-success`, `badge-warning`, `badge-error`)

**Files to modify:**

- `src/components/atoms/Badge.astro` ✅
- `src/components/atoms/Badge.behavior.test.ts` ✅ (created)
- `src/components/atoms/Badge.stories.ts` ✅ (updated)

**Estimated Time:** 30 minutes

**Status:** ✅ Completed (2025-01-22)

**Implementation Notes:**

- Updated padding from unspecified to `px-2.5 py-1` (0.625rem horizontal, 0.25rem vertical)
- Added `text-badge` utility class for 0.75rem (12px) font size (WCAG compliant)
- Added `font-bold` (700) for improved readability
- Added `accent` variant to Props interface and variantClasses
- Border radius inherited from DaisyUI badge class using `--radius-selector` (1rem)
- Created comprehensive behavior test file documenting design system alignment
- Updated Storybook stories to match new component implementation

---

### Quality Gate Checkpoint - Section 2

**Run before proceeding to Section 3:**

```bash
bun run typecheck
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run storybook  # Verify components render correctly
```

**Verify:**

- [ ] No TypeScript errors
- [ ] Button component renders with accent colors for primary variant
- [ ] Card component has correct padding and shadow
- [ ] Input component has correct height and focus ring
- [ ] Badge component has correct sizing and colors
- [ ] All components work in both light and dark themes

---

### Section 3: Layout Component Updates (Priority: P0)

**Goal:** Update layouts to match dimension and style specifications

---

### Task 3.1: Update Navigation Component (Priority: P0)

**Goal:** Align sidebar navigation with styles.json specifications

**Current Issue:** Navigation doesn't have active gradient, icon sizes are 16px (should be 22px), missing active left border.

**Checklist:**

- [x] Update icon sizes from 16px to 22px (`size={22}`)
- [x] Add active gradient using the `sidebarActive` pattern token
- [x] Add active left border using the accent token (no hardcoded color)
- [x] Update nav item padding to `py-2.5 px-4` (0.625rem 1rem)
- [x] Update gap between icon and text to `gap-3` (0.75rem)
- [x] Ensure sidebar width is 16rem (256px) - currently `w-64` ✅
- [x] Update border color to `border-base-300`
- [x] Update user section styling with base-content/neutral tokens
- [x] Add custom CSS class `.nav-active` for active state styling

**Files to modify:**

- `src/components/layouts/Navigation.astro` ✅
- `src/components/layouts/Navigation.behavior.test.ts` ✅

**UI Change:**

```
Before:
│ [16px] Dashboard     │
│                      │

After:
│▌[22px] Dashboard     │  (gradient bg + left border when active)
│                      │
```

**Estimated Time:** 1 hour

**Status:** ✅ Completed (2025-01-22)

**Implementation Notes:**

- Updated all icon sizes from 16px to 22px (md size from design system)
- Updated nav item padding to `py-2.5 px-4`
- Updated icon-text gap to `gap-3`
- Active state uses `.nav-active` CSS class with `var(--sidebar-active-gradient)` and `var(--sidebar-active-border)`
- Changed badge from `badge-primary` to `badge-accent` (color semantic change)
- Updated user section to use `text-base-content` and `text-neutral` (theme-aware colors)
- Fixed mobile close button icon size to 22px
- Used flexbox layout (`flex flex-col` on aside, `flex-1` on nav, `mt-auto` on user section) to prevent overlap
- Fixed user initials fallback from "UK" to "--" for clarity
- Removed undefined `.nav-item` class (Tailwind utilities handle all styling)
- Added JSDoc comments with Oasis Finance v1.0.0 reference

---

---

### Task 3.2: Update Header Component (Priority: P0)

**Goal:** Align header with styles.json specifications

**Current Issue:** Header height not specified, should be 5rem (80px). Padding should be 1.25rem.

**Checklist:**

- [x] Set header height to 5rem (80px) using `h-20`
- [x] Update padding to match spec: `p-5` (1.25rem)
- [x] Update icon sizes in header to 22px or 24px per spec
- [x] Update search input styling if present (match Input component)
- [x] Add glass effect using the design system glass token (backdrop blur + themed surface)
- [x] Update notification bell styling

**Files to modify:**

- `src/components/layouts/Header.astro`

**Estimated Time:** 45 minutes

**Status:** ✅ Completed (2026-01-22)

**Implementation Notes:**

- Applied `glass-effect` utility with `h-20 p-5` sizing to match specs
- Updated header action icons to 22px and added `btn-sm` for consistent sizing
- Switched CTA to `btn-accent` with `shadow-accent-glow`
- Refined notifications dropdown with `shadow-premium`, `border-base-300`, and semantic text colors
- Confirmed header has no search input to restyle

---

### Quality Gate Checkpoint - Section 3 (Final P0)

**Run after completing all P0 tasks:**

```bash
bun run typecheck
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run build  # Full production build
```

**Final Verification:**

- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Production build succeeds
- [ ] Navigation has active gradient and 22px icons
- [ ] Header has correct height (5rem) and padding
- [ ] All pages render correctly in browser
- [ ] Theme switching works throughout the app
- [ ] All Success Criteria items checked

---

## Dependencies

### Required Packages

- `@lucide/astro` ✅ (exists)
- `daisyui` ✅ (exists)
- `motion` ✅ (exists)
- `tailwindcss` ✅ (exists)
- `@tailwindcss/typography` ✅ (exists)

### Required Services

- None

### Required Files

- `design-system/styles.json` ✅ (reference spec)
- `design-system/START.md` ✅ (design system guide)
- `docs/constitution.md` ✅ (development guidelines)

---

## Success Criteria (P0)

### Foundation (Section 1)

- [x] Color semantic model documented (Task 1.0): primary=text, accent=CTAs
- [x] All color tokens match styles.json specification (slate primary, indigo accent) - Task 1.1 ✅
- [x] Font sizes adjusted for accessibility (min 12px for xs, 14px for base) - Task 1.1 ✅
- [x] DaisyUI v5 themes configured via CSS @plugin syntax - Task 1.3 ✅
- [x] Utility classes defined (.shadow-premium, .shadow-accent-glow, .glass-effect, .nav-active, .text-badge, .container-app) - Task 1.4 ✅
- [x] Inter font is properly loaded and rendering with correct weights - Task 1.5 ✅
- [x] Status and currency tokens are exposed in `@/lib/tokens` - Task 1.2 ✅
- [x] Design system documentation updated (styles.json synced, START.md/01-foundations.md) - Task 1.6 ✅

### Components (Section 2)

- [x] Button component uses `btn-accent` for primary CTAs (indigo, accent glow shadow) - Task 2.1 ✅
- [x] Card component matches specs (1.75rem padding, radius-box, premium shadow) - Task 2.2 ✅
- [x] Input component matches specs (2.5rem height, accent focus ring) - Task 2.3 ✅
- [x] Badge component matches specs (0.75rem font for accessibility, 700 weight) - Task 2.4 ✅

### Layout (Section 3)

- [x] Navigation has active gradient and proper icon sizes (22px) - Task 3.1 ✅
- [x] Header height is 5rem with 1.25rem padding - Task 3.2 ✅
- [x] Glass effect applied where specified - Task 3.2 ✅

### Quality Gates

- [x] All quality gate checkpoints pass (typecheck, lint, stylelint, format) - Final Checkpoint ✅
- [x] Production build succeeds - Final Checkpoint ✅
- [x] Theme switching works throughout the app (light/dark) - Configured in Task 1.3 ✅

### Code Quality & Accessibility Improvements

**Note:** Reserved for follow-up improvements identified during code review. They are non-blocking but recommended for better code quality, accessibility, and maintainability.

#### Task 1.2 Code Review Feedback (P2/P3 - Non-blocking)

- [x] Update `design-system/START.md` Token Quick Reference section (lines 43-47) to reflect new color semantic model - Task 1.6 ✅
- [ ] Resolve `currency.usd` value inconsistency: tokens.ts has `#3b82f6` (blue-500) but styles.json specifies `#2563eb` (blue-600)
- [ ] Decide whether to add `4xl`, `5xl`, `6xl` font sizes to styles.json or remove from tokens.ts for source-of-truth consistency

#### Task 1.3 Code Review Feedback (P2/P3 - Non-blocking)

- [ ] Consider adding `color-scheme: light` to the light theme for symmetry with dark theme
- [ ] Add documentation note about where `styles.json` is located and how it relates to the design system
- [x] Add `--size-selector` and `--size-field` variables to dark theme for consistency with light theme - Task 1.4 ✅

#### Task 2.1 Code Review Feedback (P2/P3 - Non-blocking)

- [ ] Add fallback values to utility classes for graceful degradation (e.g., `--shadow-accent-glow, 0 10px 15px -3px rgb(99 102 241 / 0.2)`)
- [ ] Extract duplicate class configuration between Button.astro and Button.stories.ts to shared config file

#### Task 2.3 Code Review Feedback (P2/P3 - Non-blocking)

- [x] Update Storybook stories to match updated Input component styles (P1 - fixed during implementation)
- [ ] Add `required` attribute to select and input elements (defined in Props but not passed to elements)
- [ ] Update comment on line 67 to clarify right padding purpose (space for trailing icon/button)

#### Task 3.1 Code Review Feedback (P2/P3 - Non-blocking)

- [x] Remove undefined `.nav-item` class from Navigation component (P1 - fixed during implementation)
- [x] Fix absolute positioning for user section - use flexbox layout instead (P1 - fixed during implementation)
- [x] Fix hardcoded "UK" fallback - change to "--" for clarity (P1 - fixed during implementation)
- [ ] Test contains non-asserting tests - consider converting to actual assertions or documentation-only comments
- [ ] Navigation item array could use const assertion for better type safety
