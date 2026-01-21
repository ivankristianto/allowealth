# Design System Alignment - Milestone P0

Complete audit and alignment of components and styles to strictly follow `design-system/styles.json`.

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

### Task 1.1: Update CSS Design Tokens (Priority: P0)

**Goal:** Update `src/styles/tokens.css` with new color palette from styles.json

**Current Issue:** Current tokens use emerald-based colors (`#10b981`), but styles.json specifies slate-primary (`#0f172a`) with indigo-accent (`#6366f1`).

**Checklist:**

- [ ] Keep `--color-primary` as `#0f172a` (slate-900) for primary text/headings
- [ ] Add `--color-accent` as `#6366f1` (indigo-500) for CTAs and interactive elements
- [ ] Add `--color-accent-hover` as `#4f46e5` (indigo-600)
- [ ] Add `--color-accent-content` as `#ffffff`
- [ ] Update `--color-error` from `#ef4444` to `#f43f5e` (rose-500)
- [ ] Update `--color-info` from `#3b82f6` to `#6366f1` (indigo-500)
- [ ] Keep `--color-success` as `#10b981` (emerald-500)
- [ ] Add slate color scale (50: #f8fafc, 100: #f1f5f9, 200: #e2e8f0, 300: #cbd5e1, 400: #94a3b8, 500: #64748b, 600: #475569, 700: #334155, 800: #1e293b, 900: #0f172a)
- [ ] Add indigo color scale (50: #eef2ff, 100: #e0e7ff, 400: #818cf8, 500: #6366f1, 600: #4f46e5, 700: #4338ca)
- [ ] Add rose color scale (50: #fff1f2, 100: #ffe4e6, 500: #f43f5e, 600: #e11d48)
- [ ] Update typography font sizes to match styles.json (xs: 0.625rem, sm: 0.75rem, base: 0.8125rem, md: 0.875rem, lg: 1rem, xl: 1.25rem, 2xl: 1.5rem, 3xl: 1.875rem)
- [ ] Add Inter font family to `--font-sans`: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- [ ] Add component-specific tokens (button, card, input, sidebar, badge, table)
- [ ] Add effect tokens (glass, gradient, shadows including accentGlow: `0 10px 15px -3px rgba(99, 102, 241, 0.2)`)
- [ ] Add status tokens (ok/warning/danger) and currency tokens (IDR/USD) as CSS variables
- [ ] Update dark theme overrides with full dark palette

**Files to modify:**

- `src/styles/tokens.css`

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

**Status:** ⏳ Pending

---

### Task 1.2: Update TypeScript Token Exports (Priority: P0)

**Goal:** Sync `src/lib/tokens.ts` with new CSS tokens

**Current Issue:** TypeScript tokens don't include accent color, have wrong error/info colors, and use incorrect color mapping.

**Checklist:**

- [ ] Update `primary` color to `#0f172a` (slate-900)
- [ ] Add `accent` color constant (`#6366f1`)
- [ ] Add `accentHover` color constant (`#4f46e5`)
- [ ] Update `error` color to `#f43f5e`
- [ ] Update `info` color to `#6366f1`
- [ ] Add full slate color scale object
- [ ] Add full indigo color scale object
- [ ] Add rose color scale object
- [ ] Update font family to include Inter as primary
- [ ] Update font sizes to match new scale (xs: 0.625rem through 3xl: 1.875rem)
- [ ] Add component spacing constants from styles.json
- [ ] Add `colors.status` and `colors.currency` mappings to match the design system
- [ ] Add animation duration constants (fast: 0.15, normal: 0.3, slow: 0.5)
- [ ] Add spring configuration presets (smooth, bouncy, gentle, snappy)

**Files to modify:**

- `src/lib/tokens.ts`

**Estimated Time:** 1-2 hours

**Status:** ⏳ Pending

---

### Task 1.3: Update Tailwind/DaisyUI Configuration (Priority: P0)

**Goal:** Update DaisyUI theme to use new color palette from styles.json

**Current Issue:** DaisyUI theme uses emerald primary (`#10b981`), but styles.json specifies slate-primary with indigo-accent system.

**Checklist:**

- [ ] Update light theme primary to slate-900 (`#0f172a`) for primary text
- [ ] Add accent color (`#6366f1`) to theme for CTAs
- [ ] Update secondary to slate-900 (`#0f172a`) for secondary buttons
- [ ] Update info to indigo (`#6366f1`)
- [ ] Update error to rose (`#f43f5e`)
- [ ] Update neutral to slate-500 (`#64748b`)
- [ ] Update base-100 to white (`#ffffff`)
- [ ] Add base-200 as slate-50 (`#f8fafc`)
- [ ] Add base-300 as slate-200 (`#e2e8f0`)
- [ ] Add dark theme with full color mapping from styles.json

**Files to modify:**

- `tailwind.config.ts`

**Theme Update:**

```typescript
/* Before */
light: {
  primary: '#10b981',
  secondary: '#f59e0b',
  accent: '#3b82f6',
}

/* After - matching styles.json exactly */
light: {
  primary: '#0f172a',      // slate-900 (headings, primary text)
  secondary: '#0f172a',    // slate-900 (secondary buttons)
  accent: '#6366f1',       // indigo-500 (CTAs, active states)
  neutral: '#64748b',      // slate-500
  'base-100': '#ffffff',
  'base-200': '#f8fafc',   // slate-50
  'base-300': '#e2e8f0',   // slate-200
  info: '#6366f1',         // indigo-500
  success: '#10b981',      // emerald-500
  warning: '#f59e0b',      // amber-500
  error: '#f43f5e',        // rose-500
}

dark: {
  primary: '#f8fafc',      // slate-50 (light text on dark)
  secondary: '#f8fafc',
  accent: '#818cf8',       // indigo-400
  neutral: '#94a3b8',      // slate-400
  'base-100': '#020617',   // slate-950
  'base-200': '#0f172a',   // slate-900
  'base-300': '#1e293b',   // slate-800
  info: '#818cf8',
  success: '#34d399',      // emerald-400
  warning: '#fbbf24',      // amber-400
  error: '#f43f5e',
}
```

**Estimated Time:** 1 hour

**Status:** ⏳ Pending

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

**Estimated Time:** 1-2 hours

**Status:** ⏳ Pending

---

### Task 1.5: Add Inter Font Import (Priority: P0)

**Goal:** Integrate Inter font family as specified in styles.json

**Checklist:**

- [ ] Decide on self-hosted vs CDN font delivery (privacy vs convenience)
- [ ] Add Inter font import in `src/layouts/BaseLayout.astro`
- [ ] Ensure `font-display: swap` is used if self-hosting
- [ ] Keep font weights aligned with spec: 300, 400, 500, 600, 700

**Files to modify:**

- `src/layouts/BaseLayout.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

### Task 1.6: Define Primary vs Accent Usage (Priority: P0)

**Goal:** Prevent CTA and text color conflicts after the palette shift

**Checklist:**

- [ ] Define usage: primary = headings/body text, accent = CTAs/interactive, success/warning/error = status
- [ ] Audit `btn-primary`, `text-primary`, and `bg-primary` usage to ensure CTAs use `btn-accent` (or equivalent)
- [ ] Reserve `btn-primary` for neutral/secondary emphasis if needed; avoid using it for primary CTAs
- [ ] Document the mapping in the plan to keep component work consistent

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

### Section 2: Atom Component Updates (Priority: P0)

**Goal:** Update all atomic components to match new design specifications

---

### Task 2.1: Update Button Component (Priority: P0)

**Goal:** Align Button with styles.json specifications

**Current Issue:** Button uses emerald colors (`hover:bg-emerald-600`, `focus:ring-emerald-500`) and wrong focus ring colors. Should use indigo accent.

**Checklist:**

- [ ] Update primary variant to use accent/indigo colors (`btn-accent` or custom `bg-accent`)
- [ ] Update secondary variant to use tokenized primary/neutral color
- [ ] Add ghost variant with transparent bg and `border-base-300` (or tokenized border color)
- [ ] Update focus ring to use accent token (theme-friendly, no hardcoded color)
- [ ] Add accent glow shadow using tokenized shadow utility
- [ ] Update size specs to match styles.json exactly:
  - sm: height 2rem, padding `0.375rem 0.75rem`, fontSize `0.75rem`
  - md: height 2.5rem, padding `0.625rem 1.25rem`, fontSize `0.875rem`
  - lg: height 3rem, padding `0.75rem 1.5rem`, fontSize `0.875rem`
- [ ] Remove emerald-specific hover colors
- [ ] Update outline variant border to accent token

**Files to modify:**

- `src/components/atoms/Button.astro`

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

**Status:** ⏳ Pending

---

### Task 2.2: Update Card Component (Priority: P0)

**Goal:** Align Card with styles.json specifications

**Current Issue:** Card uses `p-6` padding (24px), but styles.json specifies `1.75rem` (28px). Border radius should come from DaisyUI `--radius-box` (tokenized), not a custom `rounded-[...]` value.

**Checklist:**

- [ ] Update default padding from `p-6` to `p-7` (1.75rem / 28px) using tokenized spacing
- [ ] Use DaisyUI `radius-box` for card border radius (no `rounded-[...]`)
- [ ] Add premium shadow via tokenized shadow utility
- [ ] Use `border-base-300` for borders so the theme handles light/dark variants
- [ ] Update compact padding from `p-4` to appropriate smaller value
- [ ] Add hover animation support (y: -4, enhanced shadow)

**Files to modify:**

- `src/components/atoms/Card.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

### Task 2.3: Update Input Component (Priority: P0)

**Goal:** Align Input with styles.json specifications

**Current Issue:** Input doesn't match height (2.5rem), padding, background, or focus ring specs from styles.json. Border radius should come from DaisyUI `--radius-field` (tokenized).

**Checklist:**

- [ ] Set height to 2.5rem (40px) using `h-10`
- [ ] Update padding to match spec: `py-2 pr-10 pl-3` (0.5rem 2.5rem 0.5rem 0.75rem)
- [ ] Set font size to 0.75rem (12px) using `text-xs`
- [ ] Use DaisyUI `radius-field` for input border radius (no `rounded-[...]`)
- [ ] Add background using theme base tokens (e.g., `bg-base-200`)
- [ ] Update focus ring to 2px using accent token (theme-friendly)
- [ ] Update error state border to `border-error` (or tokenized equivalent)

**Files to modify:**

- `src/components/atoms/Input.astro`

**Estimated Time:** 45 minutes

**Status:** ⏳ Pending

---

### Task 2.4: Update Badge Component (Priority: P0)

**Goal:** Align Badge with styles.json specifications

**Current Issue:** Badge doesn't match padding, font size, or font weight specs from styles.json.

**Checklist:**

- [ ] Update padding to `px-2.5 py-1` (0.25rem 0.625rem / 4px 10px)
- [ ] Update font size using a tokenized utility (e.g., `text-badge`) aligned to 0.625rem
- [ ] Update font weight to `font-bold` (700)
- [ ] Ensure badge radius follows DaisyUI selector radius (no `rounded-[...]`)
- [ ] Update color variants to use DaisyUI semantic colors (`badge-accent`, `badge-success`, `badge-warning`, `badge-error`)

**Files to modify:**

- `src/components/atoms/Badge.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

### Section 3: Layout Component Updates (Priority: P0)

**Goal:** Update layouts to match dimension and style specifications

---

### Task 3.1: Update Navigation Component (Priority: P0)

**Goal:** Align sidebar navigation with styles.json specifications

**Current Issue:** Navigation doesn't have active gradient, icon sizes are 16px (should be 22px), missing active left border.

**Checklist:**

- [ ] Update icon sizes from 16px to 22px (`size={22}`)
- [ ] Add active gradient using the `sidebarActive` pattern token
- [ ] Add active left border using the accent token (no hardcoded color)
- [ ] Update nav item padding to `py-2.5 px-4` (0.625rem 1rem)
- [ ] Update gap between icon and text to `gap-3` (0.75rem)
- [ ] Ensure sidebar width is 16rem (256px) - currently `w-64` ✅
- [ ] Update border color to `border-base-300`
- [ ] Update user section styling with base-content/neutral tokens
- [ ] Add custom CSS class `.nav-active` for active state styling

**Files to modify:**

- `src/components/layouts/Navigation.astro`

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

**Status:** ⏳ Pending

---

### Task 3.2: Update Header Component (Priority: P0)

**Goal:** Align header with styles.json specifications

**Current Issue:** Header height not specified, should be 5rem (80px). Padding should be 1.25rem.

**Checklist:**

- [ ] Set header height to 5rem (80px) using `h-20`
- [ ] Update padding to match spec: `p-5` (1.25rem)
- [ ] Update icon sizes in header to 22px or 24px per spec
- [ ] Update search input styling if present (match Input component)
- [ ] Add glass effect using the design system glass token (backdrop blur + themed surface)
- [ ] Update notification bell styling

**Files to modify:**

- `src/components/layouts/Header.astro`

**Estimated Time:** 45 minutes

**Status:** ⏳ Pending

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

- [ ] All color tokens match styles.json specification (slate primary, indigo accent)
- [ ] Primary vs accent usage is consistent across CTAs, text, and interactive elements
- [ ] Status and currency tokens are exposed in `@/lib/tokens`
- [ ] Inter font is properly loaded and rendering with correct weights
- [ ] Button component matches styles.json specs (indigo accent, correct sizes, accent glow shadow)
- [ ] Card component matches specs (1.75rem padding, radius-box, premium shadow)
- [ ] Input component matches specs (2.5rem height, 0.75rem radius, indigo focus ring)
- [ ] Badge component matches specs (0.625rem font, 700 weight, full radius)
- [ ] Navigation has active gradient and proper icon sizes (22px)
- [ ] Header height is 5rem with 1.25rem padding
