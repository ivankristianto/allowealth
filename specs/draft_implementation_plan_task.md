# Design System Alignment - Full Implementation Plan

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

### Proposed Changes

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

### Task 2.5: Update Remaining Atom Components (Priority: P1)

**Goal:** Update all other atoms to use new color tokens

**Current Issue:** Multiple atoms reference emerald colors or old token values that conflict with the new slate-primary, indigo-accent design system. Components need to use accent color for interactive elements and updated semantic colors.

**Checklist:**

- [ ] Update `Currency.astro` - ensure color tokens, IDR/USD colors
- [ ] Update `CurrencyInput.astro` - input styling alignment with Task 2.3 specs
- [ ] Update `DatePicker.astro` - input styling alignment with Task 2.3 specs
- [ ] Update `EmptyState.astro` - color tokens, accent color for CTAs
- [ ] Update `ErrorMessage.astro` - error semantic color token (no hardcoded hex)
- [ ] Update `Label.astro` - text colors using base-content/neutral tokens
- [ ] Update `PasswordField.astro` - input styling, focus colors to indigo
- [ ] Update `Percentage.astro` - status colors
- [ ] Update `Spinner.astro` - accent color for loading spinner
- [ ] Update `Checkbox.astro` - accent color for checked state
- [ ] Update `CategorySelect.astro` - styling alignment
- [ ] Update `PaymentMethodSelect.astro` - styling alignment

**Files to modify:**

- All 16 files in `src/components/atoms/`

**Estimated Time:** 3-4 hours

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

### Task 3.3: Update PageContainer Component (Priority: P1)

**Goal:** Add container max-width and padding specifications

**Current Issue:** Container doesn't have max-width (should be 1400px) or responsive padding from spec (mobile: 1.5rem, desktop: 3rem).

**Checklist:**

- [ ] Add max-width: 1400px using a tokenized container class (e.g., `max-w-container`)
- [ ] Add responsive padding: `px-6 lg:px-12` (mobile 1.5rem, desktop 3rem)
- [ ] Center container using `mx-auto`
- [ ] Update any existing width constraints

**Files to modify:**

- `src/components/layouts/PageContainer.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

### Task 3.4: Update Footer Component (Priority: P2)

**Goal:** Ensure footer uses correct colors and spacing

**Current Issue:** Footer may use old neutral colors instead of base-content/neutral tokens.

**Checklist:**

- [ ] Update text colors to use `text-base-content/60` or equivalent token
- [ ] Update border color to `border-base-300`
- [ ] Ensure padding matches design system

**Files to modify:**

- `src/components/layouts/Footer.astro`

**Estimated Time:** 15 minutes

**Status:** ⏳ Pending

---

### Section 4: Icon Standardization (Priority: P1)

**Goal:** Replace all inline SVGs with Lucide icons and standardize icon sizes

---

### Task 4.1: Fix ForgotPasswordForm JavaScript Template SVGs (Priority: P1)

**Goal:** Replace inline SVG strings in JavaScript template literals with pre-rendered Lucide icons

**Current Issue:** The Astro template already imports and uses Lucide `CircleCheck` (line 16, 38). However, the client-side JavaScript `<script>` tag contains inline SVG strings in template literals (lines 128-135, 166-173, 181-189, 198-205) for dynamically created error messages.

**Checklist:**

- [ ] Pre-render hidden icon elements in the template for: `CircleX`, `CircleCheck`, `TriangleAlert`
- [ ] Add IDs: `#icon-error-template`, `#icon-success-template`, `#icon-warning-template`
- [ ] Update JavaScript to use `cloneNode(true)` from template elements
- [ ] Remove inline SVG strings from JavaScript template literals (lines 128, 166, 181, 198)

**Files to modify:**

- `src/components/molecules/ForgotPasswordForm.astro`

**Estimated Time:** 20 minutes

**Status:** ⏳ Pending

---

### Task 4.2: Fix CSVImportForm Dynamic SVGs (Priority: P1)

**Goal:** Replace dynamic SVG creation with proper icon rendering

**Current Issue:** JavaScript uses `document.createElementNS` extensively (lines 514-524, 542-558, 586-610, 783-808, 1020-1069) to create SVG elements dynamically, which is hard to maintain and inconsistent with design system.

**Checklist:**

- [ ] Pre-render hidden SVG elements for validation states: `Check`, `XCircle`, `TriangleAlert`
- [ ] Add template elements with IDs: `#icon-check-template`, `#icon-error-template`, `#icon-warning-template`
- [ ] Update JavaScript to use `cloneNode(true)` instead of `createElementNS`
- [ ] Remove all `document.createElementNS('http://www.w3.org/2000/svg', ...)` code

**Files to modify:**

- `src/components/molecules/CSVImportForm.astro`

**Estimated Time:** 45 minutes

**Status:** ⏳ Pending

---

### Task 4.3: Fix LoginForm Error SVG (Priority: P1)

**Goal:** Replace SVG in error message template with Lucide icon

**Current Issue:** Error message template uses inline SVG string in JavaScript for constructing error UI.

**Checklist:**

- [ ] Locate inline SVG in JavaScript error handling code
- [ ] Pre-render error icon in the template (hidden by default) with ID
- [ ] Update JavaScript to clone and display the template icon
- [ ] Or refactor to use the ErrorMessage component which already uses Lucide `CircleX`
- [ ] Remove inline SVG string from JavaScript

**Files to modify:**

- `src/components/molecules/LoginForm.astro`

**Estimated Time:** 20 minutes

**Status:** ⏳ Pending

---

### Task 4.4: Standardize Icon Sizes Across Components (Priority: P1)

**Goal:** Update all icon sizes to match styles.json specifications

**Current Issue:** Icons use inconsistent sizes (mostly 16px, 20px), should follow spec: xs=16, sm=20, md=22, lg=24, xl=32.

**Checklist:**

- [ ] Audit all components for icon usage
- [ ] Update navigation icons to 22px (md size)
- [ ] Update button icons to 20px (sm size) for default buttons
- [ ] Update table/list icons to 22px (md size)
- [ ] Update header icons to 24px (lg size)
- [ ] Update small UI icons (close, etc.) to 16px (xs size)
- [ ] Align icon package naming across docs and code to `@lucide/astro` (update styles.json metadata if needed)
- [ ] Document icon size conventions in design system

**Files to modify:**

- Multiple component files across atoms, molecules, organisms, layouts

**Estimated Time:** 1-2 hours

**Status:** ⏳ Pending

---

### Section 5: Molecule Component Updates (Priority: P1)

**Goal:** Update all molecule components to use new design tokens

---

### Task 5.1: Update Toast Component (Priority: P1)

**Goal:** Align Toast with styles.json animation specifications

**Current Issue:** Toast uses CSS keyframes, styles.json specifies Motion library animations with specific timing (enter: 0.2s, exit: 0.2s).

**Checklist:**

- [ ] Update animation timing to match spec: enter 0.2s, exit 0.2s
- [ ] Update initial/animate states: `{ opacity: 0, y: -10, scale: 0.95 }` → `{ opacity: 1, y: 0, scale: 1 }`
- [ ] Use Motion presets for toast animations to match the design system
- [ ] Update toast colors to use semantic colors (info/success/warning/error) via DaisyUI or tokens
- [ ] Update positioning if needed

**Files to modify:**

- `src/components/molecules/Toast.astro`
- `src/components/molecules/ToastContainer.astro`

**Estimated Time:** 45 minutes

**Status:** ⏳ Pending

---

### Task 5.2: Update Modal Component (Priority: P1)

**Goal:** Align Modal animations with styles.json specifications

**Current Issue:** Modal may not have optimal animation specs matching styles.json modal presets.

**Checklist:**

- [ ] Update backdrop animation: opacity 0→1, duration 0.2s
- [ ] Update content animation: `{ opacity: 0, scale: 0.95, y: 20 }` → `{ opacity: 1, scale: 1, y: 0 }`, duration 0.3s
- [ ] Ensure modal styling uses new tokens (border-radius, shadow)
- [ ] Update close button styling with accent hover

**Files to modify:**

- `src/components/molecules/Modal.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

### Task 5.3: Update BudgetHealthWidget (Priority: P1)

**Goal:** Update colors and styling to new design tokens

**Current Issue:** May use old color tokens for status indicators.

**Checklist:**

- [ ] Ensure status colors match new tokens (success, warning, danger) via tokens or semantic classes
- [ ] Update any hardcoded colors to use CSS variables
- [ ] Update badge styling to match Task 2.4 specs
- [ ] Update progress bar styling

**Files to modify:**

- `src/components/molecules/BudgetHealthWidget.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

### Task 5.4: Update TransactionForm (Priority: P1)

**Goal:** Update form styling to match new input/button specs

**Current Issue:** Form may use old styling that doesn't match updated Input and Button components.

**Checklist:**

- [ ] Ensure all inputs use updated Input component styling
- [ ] Ensure buttons use updated Button component styling
- [ ] Update any direct color references to use tokens
- [ ] Update spacing to match form gap spec: `gap-4` (16px)

**Files to modify:**

- `src/components/molecules/TransactionForm.astro`

**Estimated Time:** 45 minutes

**Status:** ⏳ Pending

---

### Task 5.5: Update Remaining Molecule Components (Priority: P2)

**Goal:** Update all other molecules to use new tokens

**Current Issue:** Remaining molecules may reference old emerald colors or outdated token values.

**Checklist:**

- [ ] Update `AuthValidationMessages.astro` - error colors to rose
- [ ] Update `ForgotPasswordForm.astro` - colors (after SVG fix in Task 4.1)
- [ ] Update `LoginForm.astro` - colors (after SVG fix in Task 4.3)
- [ ] Update `PasswordChangeForm.astro` - input/button styling
- [ ] Update `QuickActions.astro` - button colors to accent
- [ ] Update `RegistrationForm.astro` - form styling
- [ ] Update `TransactionFilters.astro` - input/select styling
- [ ] Update `TransactionRow.astro` - hover colors, text colors

**Files to modify:**

- All 14 files in `src/components/molecules/`

**Estimated Time:** 2-3 hours

**Status:** ⏳ Pending

---

### Section 6: Organism Component Updates (Priority: P1)

**Goal:** Update all organism components to use new design tokens

---

### Task 6.1: Update BudgetOverviewTable (Priority: P1)

**Goal:** Align table with styles.json specifications

**Current Issue:** Table may not match header background, row hover, cell padding specs from styles.json.

**Checklist:**

- [ ] Update header background to the table header token from styles.json (theme-friendly)
- [ ] Update row hover color to the table rowHover token (theme-friendly)
- [ ] Update cell padding to `py-4 px-6` (1rem 1.5rem)
- [ ] Update icon sizes to 22px
- [ ] Update status colors to new tokens (warning/danger)

**Files to modify:**

- `src/components/organisms/BudgetOverviewTable.astro`

**Estimated Time:** 45 minutes

**Status:** ⏳ Pending

---

### Task 6.2: Update SummaryCards (Priority: P1)

**Goal:** Update dashboard summary cards to new card styling

**Current Issue:** Cards may not use updated Card component with new padding, radius, and shadow specs.

**Checklist:**

- [ ] Ensure cards use updated Card component (p-7, radius-box, premium shadow)
- [ ] Update icon colors to use accent token (`text-accent` or equivalent)
- [ ] Update trend indicators styling (emerald for up, rose for down)
- [ ] Update text colors to base-content/neutral tokens

**Files to modify:**

- `src/components/organisms/SummaryCards.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

### Task 6.3: Update RecentTransactionsList (Priority: P1)

**Goal:** Update list styling to match new design

**Current Issue:** List may use old hover colors and inconsistent icon sizes.

**Checklist:**

- [ ] Update row hover colors using table rowHover token
- [ ] Update icon sizes to 22px
- [ ] Update text colors to base-content/neutral tokens
- [ ] Update badge styling to match Task 2.4 specs

**Files to modify:**

- `src/components/organisms/RecentTransactionsList.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

### Task 6.4: Update Remaining Organism Components (Priority: P2)

**Goal:** Update all other organisms to use new tokens

**Current Issue:** Remaining organisms may reference old color tokens or have inconsistent styling with the new design system.

**Checklist:**

- [ ] Update `AssetUpdateTodoList.astro` - colors, badge styling
- [ ] Update `BudgetHistoryComparison.astro` - table styling, status colors
- [ ] Update `DashboardError.astro` - error colors to rose
- [ ] Update `TransactionList.astro` - table styling, hover colors
- [ ] Update `TransactionModal.astro` - modal styling, button colors
- [ ] Update `UserContext.astro` - text colors, hover states

**Files to modify:**

- All 9 files in `src/components/organisms/`

**Estimated Time:** 3-4 hours

**Status:** ⏳ Pending

---

### Section 7: Animation System Implementation (Priority: P2)

**Goal:** Implement Motion library animation patterns from styles.json

---

### Task 7.1: Create Animation Utilities (Priority: P2)

**Goal:** Create reusable animation utilities based on styles.json presets

**Current Issue:** No centralized animation utilities exist. Components use ad-hoc CSS animations.

**Checklist:**

- [ ] Create `src/lib/animations.ts` with Motion presets
- [ ] Export spring configurations: smooth, bouncy, gentle, snappy
- [ ] Export animation presets: fadeIn, slideInFromBottom/Top/Left/Right, scaleIn, scaleOut, popIn
- [ ] Export button animations: buttonPress (scale 0.98), buttonHover (scale 1.05)
- [ ] Export stagger timing utilities: fast (0.05s), normal (0.1s), slow (0.15s)
- [ ] Export component-specific animation configs (modal, toast, dropdown, card, listItem)
- [ ] Add TypeScript types for all exports

**Files to create:**

- `src/lib/animations.ts`

**Code Example:**

```typescript
import { spring } from 'motion';

export const springs = {
  smooth: { stiffness: 100, damping: 15, mass: 1 },
  bouncy: { stiffness: 300, damping: 10, mass: 1 },
  gentle: { stiffness: 50, damping: 20, mass: 1 },
  snappy: { stiffness: 400, damping: 30, mass: 1 },
};

export const durations = {
  instant: 0,
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  slower: 1,
};

export const presets = {
  fadeIn: { initial: { opacity: 0 }, animate: { opacity: 1 }, duration: 0.3 },
  slideInFromBottom: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    duration: 0.3,
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    duration: 0.3,
  },
  popIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    spring: 'bouncy',
  },
};
```

**Estimated Time:** 1-2 hours

**Status:** ⏳ Pending

---

### Task 7.2: Add Animation CSS Custom Properties (Priority: P2)

**Goal:** Add CSS custom properties for animation timing

**Current Issue:** No CSS variables exist for consistent animation timing across components.

**Checklist:**

- [ ] Create `src/styles/animations.css` with animation variables
- [ ] Add duration variables: `--duration-fast: 0.15s`, `--duration-normal: 0.3s`, `--duration-slow: 0.5s`
- [ ] Add easing variables matching styles.json: default, in, out, inOut, bounce, elastic
- [ ] Add keyframe definitions for common animations (fadeIn, slideIn, scaleIn)
- [ ] Import in globals.css

**Files to create:**

- `src/styles/animations.css`

**Files to modify:**

- `src/styles/globals.css` (add import)

**Estimated Time:** 1 hour

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

## Success Criteria

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
- [ ] Container max-width is 1400px with responsive padding
- [ ] All inline SVGs in JavaScript replaced with pre-rendered Lucide icons
- [ ] Icon imports standardized to `@lucide/astro` across components and docs
- [ ] Dark theme fully functional with correct color mapping
- [ ] No hardcoded color values in components

---

## Estimated Effort

| Section                         | Task Count | Time Estimate   | Priority |
| ------------------------------- | ---------- | --------------- | -------- |
| Section 1: Foundation Tokens    | 6          | 6-9 hours       | P0       |
| Section 2: Atom Components      | 5          | 6-8 hours       | P0-P1    |
| Section 3: Layout Components    | 4          | 2-3 hours       | P0-P2    |
| Section 4: Icon Standardization | 4          | 2-3 hours       | P1       |
| Section 5: Molecule Components  | 5          | 4-6 hours       | P1-P2    |
| Section 6: Organism Components  | 4          | 5-7 hours       | P1-P2    |
| Section 7: Animation System     | 2          | 2-3 hours       | P2       |
| **Total**                       | **30**     | **27-39 hours** | -        |

**Note:** Add 20-30% buffer for integration work and potential design review cycles.

---

## Code Quality Improvements (Priority: P3-P4)

**Note:** These tasks are follow-up improvements identified during code review. They are non-blocking but recommended for better code quality, accessibility, and maintainability.
