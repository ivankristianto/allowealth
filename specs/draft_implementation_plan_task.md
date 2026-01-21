# Design System Alignment - Full Implementation Plan

Complete audit and alignment of components and styles to strictly follow `design-system/styles.json`.

## Summary

This plan addresses **significant discrepancies** between the current implementation and the new "Oasis Finance" design system specification in `styles.json`. The current codebase uses an emerald-based color palette while the new design spec calls for a slate-primary, indigo-accent modern design language.

### Key Changes Required

1. **Color Palette Overhaul** - Migrate from emerald-primary to slate-primary with indigo-accent system
2. **Typography Update** - Add Inter font, adjust font sizes to match spec
3. **Component Restyling** - Update all atoms/molecules/organisms to match new specs
4. **Animation System** - Implement Motion library patterns
5. **Dark Theme** - Implement proper dark theme from spec
6. **Icon Standardization** - Fix inline SVGs in JavaScript, standardize icon sizes
7. **Layout Updates** - Align with container, spacing, and dimension specs

### Proposed Changes

#### New Files

- `src/styles/animations.css` - Motion animation CSS custom properties
- `src/lib/animations.ts` - Motion animation presets and utilities

#### Modified Files

- `src/styles/tokens.css` - Update all color tokens
- `src/styles/globals.css` - Update DaisyUI theme, add new utilities
- `src/lib/tokens.ts` - Update TypeScript token exports
- `tailwind.config.ts` - Update DaisyUI theme colors
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
- [ ] Update dark theme overrides with full dark palette
- [ ] Run `bun run stylelint:fix`
- [ ] Run `bun run format:fix`

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
- [ ] Add animation duration constants (fast: 0.15, normal: 0.3, slow: 0.5)
- [ ] Add spring configuration presets (smooth, bouncy, gentle, snappy)
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`
- [ ] Run `bun run format:fix`

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
- [ ] Run `bun run typecheck`

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
- [ ] Add Inter font import or CSS variable
- [ ] Update focus styles to use accent color (`--color-accent`)
- [ ] Add glass effect utilities (backdrop-blur: 12px, opacity: 0.8)
- [ ] Add gradient utilities (sidebarActive: `linear-gradient(90deg, rgba(99, 102, 241, 0.1) 0%, transparent)`)
- [ ] Add premium shadow utilities (accentGlow: `0 10px 15px -3px rgba(99, 102, 241, 0.2)`)
- [ ] Update scrollbar colors to use slate scale
- [ ] Run `bun run stylelint:fix`
- [ ] Run `bun run format:fix`

**Files to modify:**

- `src/styles/globals.css`

**Estimated Time:** 1-2 hours

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
- [ ] Update secondary variant to use slate-900 (`#0f172a`)
- [ ] Add ghost variant with transparent bg, border slate-200 (`border-[#e2e8f0]`)
- [ ] Update focus ring to use accent/indigo color (`focus:ring-indigo-500`)
- [ ] Add accent glow shadow on primary buttons (`shadow-[0_10px_15px_-3px_rgba(99,102,241,0.2)]`)
- [ ] Update size specs to match styles.json exactly:
  - sm: height 2rem, padding `0.375rem 0.75rem`, fontSize `0.75rem`
  - md: height 2.5rem, padding `0.625rem 1.25rem`, fontSize `0.875rem`
  - lg: height 3rem, padding `0.75rem 1.5rem`, fontSize `0.875rem`
- [ ] Remove emerald-specific hover colors
- [ ] Update outline variant border to indigo
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

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

**Current Issue:** Card uses `p-6` padding (24px), but styles.json specifies `1.75rem` (28px). Border radius should be `1.25rem` (20px).

**Checklist:**

- [ ] Update default padding from `p-6` to `p-7` (1.75rem / 28px) or `p-[1.75rem]`
- [ ] Update border radius to `rounded-[1.25rem]` (20px)
- [ ] Add premium shadow: `shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_0_rgba(0,0,0,0.03)]`
- [ ] Update border color to slate-200 light (`border-[#e2e8f0]`), slate-800 dark (`dark:border-[#1e293b]`)
- [ ] Update compact padding from `p-4` to appropriate smaller value
- [ ] Add hover animation support (y: -4, enhanced shadow)
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

**Files to modify:**

- `src/components/atoms/Card.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

### Task 2.3: Update Input Component (Priority: P0)

**Goal:** Align Input with styles.json specifications

**Current Issue:** Input doesn't match height (2.5rem), padding, background, or focus ring specs from styles.json.

**Checklist:**

- [ ] Set height to 2.5rem (40px) using `h-10`
- [ ] Update padding to match spec: `py-2 pr-10 pl-3` (0.5rem 2.5rem 0.5rem 0.75rem)
- [ ] Set font size to 0.75rem (12px) using `text-xs`
- [ ] Update border radius to 0.75rem using `rounded-xl`
- [ ] Add background: `bg-slate-100 dark:bg-slate-800` (`bg-[#f1f5f9] dark:bg-[#1e293b]`)
- [ ] Update focus ring to 2px indigo with opacity: `focus:ring-2 focus:ring-[rgba(99,102,241,0.2)]`
- [ ] Update error state border to rose-500 (`border-[#f43f5e]`)
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

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
- [ ] Update font size to `text-[0.625rem]` (10px)
- [ ] Update font weight to `font-bold` (700)
- [ ] Ensure border radius is full (`rounded-full` / 9999px)
- [ ] Update color variants to use new semantic colors (accent for primary badge)
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

**Files to modify:**

- `src/components/atoms/Badge.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

### Task 2.5: Update Remaining Atom Components (Priority: P1)

**Goal:** Update all other atoms to use new color tokens

**Current Issue:** Multiple atoms reference emerald colors or old token values that conflict with the new slate-primary, indigo-accent design system. Components need to use accent color for interactive elements and updated semantic colors.

**Checklist:**

- [ ] Update `Currency.astro` - verify color tokens, IDR/USD colors
- [ ] Update `CurrencyInput.astro` - input styling alignment with Task 2.3 specs
- [ ] Update `DatePicker.astro` - input styling alignment with Task 2.3 specs
- [ ] Update `EmptyState.astro` - color tokens, accent color for CTAs
- [ ] Update `ErrorMessage.astro` - rose-500 error color (`#f43f5e`)
- [ ] Update `Label.astro` - text colors using slate scale
- [ ] Update `PasswordField.astro` - input styling, focus colors to indigo
- [ ] Update `Percentage.astro` - status colors
- [ ] Update `Spinner.astro` - accent color for loading spinner
- [ ] Update `Checkbox.astro` - accent color for checked state
- [ ] Update `CategorySelect.astro` - styling alignment
- [ ] Update `PaymentMethodSelect.astro` - styling alignment
- [ ] Run `bun run typecheck` on all
- [ ] Run `bun run lint:fix` on all

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
- [ ] Add active gradient: `linear-gradient(90deg, rgba(99, 102, 241, 0.1) 0%, transparent)`
- [ ] Add active left border: `border-l-2 border-[#6366f1]`
- [ ] Update nav item padding to `py-2.5 px-4` (0.625rem 1rem)
- [ ] Update gap between icon and text to `gap-3` (0.75rem)
- [ ] Verify sidebar width is 16rem (256px) - currently `w-64` ✅
- [ ] Update border color to slate-200 (`border-[#e2e8f0]`)
- [ ] Update user section styling with slate colors
- [ ] Add custom CSS class `.nav-active` for active state styling
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

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
- [ ] Add glass effect if applicable (`backdrop-blur-[12px] bg-white/80`)
- [ ] Update notification bell styling
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

**Files to modify:**

- `src/components/layouts/Header.astro`

**Estimated Time:** 45 minutes

**Status:** ⏳ Pending

---

### Task 3.3: Update PageContainer Component (Priority: P1)

**Goal:** Add container max-width and padding specifications

**Current Issue:** Container doesn't have max-width (should be 1400px) or responsive padding from spec (mobile: 1.5rem, desktop: 3rem).

**Checklist:**

- [ ] Add max-width: 1400px using `max-w-[1400px]`
- [ ] Add responsive padding: `px-6 lg:px-12` (mobile 1.5rem, desktop 3rem)
- [ ] Center container using `mx-auto`
- [ ] Update any existing width constraints
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

**Files to modify:**

- `src/components/layouts/PageContainer.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

### Task 3.4: Update Footer Component (Priority: P2)

**Goal:** Ensure footer uses correct colors and spacing

**Current Issue:** Footer may use old neutral colors instead of slate scale.

**Checklist:**

- [ ] Update text colors to use slate tokens (`text-slate-500`)
- [ ] Update border color to slate-200 (`border-[#e2e8f0]`)
- [ ] Verify padding matches design system
- [ ] Run `bun run lint:fix`

**Files to modify:**

- `src/components/layouts/Footer.astro`

**Estimated Time:** 15 minutes

**Status:** ⏳ Pending

---

### Section 4: Icon Standardization (Priority: P0-P1)

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
- [ ] Verify error/success states display correctly
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

**Files to modify:**

- `src/components/molecules/ForgotPasswordForm.astro`

**Estimated Time:** 20 minutes

**Status:** ⏳ Pending

---

### Task 4.2: Fix CSVImportForm Dynamic SVGs (Priority: P0)

**Goal:** Replace dynamic SVG creation with proper icon rendering

**Current Issue:** JavaScript uses `document.createElementNS` extensively (lines 514-524, 542-558, 586-610, 783-808, 1020-1069) to create SVG elements dynamically, which is hard to maintain and inconsistent with design system.

**Checklist:**

- [ ] Pre-render hidden SVG elements for validation states: `Check`, `XCircle`, `TriangleAlert`
- [ ] Add template elements with IDs: `#icon-check-template`, `#icon-error-template`, `#icon-warning-template`
- [ ] Update JavaScript to use `cloneNode(true)` instead of `createElementNS`
- [ ] Remove all `document.createElementNS('http://www.w3.org/2000/svg', ...)` code
- [ ] Test all validation states display correctly
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

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
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

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
- [ ] Document icon size conventions in design system
- [ ] Run bulk lint/typecheck

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
- [ ] Consider migrating to Motion library for consistency
- [ ] Update toast colors to use new semantic colors (accent for info, rose for error)
- [ ] Update positioning if needed
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

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
- [ ] Verify modal styling uses new tokens (border-radius, shadow)
- [ ] Update close button styling with accent hover
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

**Files to modify:**

- `src/components/molecules/Modal.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

### Task 5.3: Update BudgetHealthWidget (Priority: P1)

**Goal:** Update colors and styling to new design tokens

**Current Issue:** May use old color tokens for status indicators.

**Checklist:**

- [ ] Verify status colors match new tokens (success: emerald, warning: amber, danger: rose)
- [ ] Update any hardcoded colors to use CSS variables
- [ ] Update badge styling to match Task 2.4 specs
- [ ] Update progress bar styling
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

**Files to modify:**

- `src/components/molecules/BudgetHealthWidget.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

### Task 5.4: Update TransactionForm (Priority: P1)

**Goal:** Update form styling to match new input/button specs

**Current Issue:** Form may use old styling that doesn't match updated Input and Button components.

**Checklist:**

- [ ] Verify all inputs use updated Input component styling
- [ ] Verify buttons use updated Button component styling
- [ ] Update any direct color references to use tokens
- [ ] Update spacing to match form gap spec: `gap-4` (16px)
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

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
- [ ] Run `bun run typecheck` on all
- [ ] Run `bun run lint:fix` on all

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

- [ ] Update header background to semi-transparent slate: `bg-[rgba(248,250,252,0.5)]` light, `bg-[rgba(30,41,59,0.5)]` dark
- [ ] Update row hover color to slate-50: `hover:bg-[#f8fafc]`
- [ ] Update cell padding to `py-4 px-6` (1rem 1.5rem)
- [ ] Update icon sizes to 22px
- [ ] Update status colors to new tokens (rose for danger, amber for warning)
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

**Files to modify:**

- `src/components/organisms/BudgetOverviewTable.astro`

**Estimated Time:** 45 minutes

**Status:** ⏳ Pending

---

### Task 6.2: Update SummaryCards (Priority: P1)

**Goal:** Update dashboard summary cards to new card styling

**Current Issue:** Cards may not use updated Card component with new padding, radius, and shadow specs.

**Checklist:**

- [ ] Verify cards use updated Card component (p-7, rounded-[1.25rem], premium shadow)
- [ ] Update icon colors to use new accent color (`text-[#6366f1]`)
- [ ] Update trend indicators styling (emerald for up, rose for down)
- [ ] Update text colors to slate scale
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

**Files to modify:**

- `src/components/organisms/SummaryCards.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

### Task 6.3: Update RecentTransactionsList (Priority: P1)

**Goal:** Update list styling to match new design

**Current Issue:** List may use old hover colors and inconsistent icon sizes.

**Checklist:**

- [ ] Update row hover colors to slate-50 (`hover:bg-[#f8fafc]`)
- [ ] Update icon sizes to 22px
- [ ] Update text colors to slate tokens
- [ ] Update badge styling to match Task 2.4 specs
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

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
- [ ] Run `bun run typecheck` on all
- [ ] Run `bun run lint:fix` on all

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
- [ ] Run `bun run typecheck`

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
- [ ] Run `bun run stylelint:fix`

**Files to create:**

- `src/styles/animations.css`

**Files to modify:**

- `src/styles/globals.css` (add import)

**Estimated Time:** 1 hour

**Status:** ⏳ Pending

---

### Section 8: Dark Theme Implementation (Priority: P1)

**Goal:** Implement full dark theme from styles.json

---

### Task 8.1: Implement Dark Theme (Priority: P1)

**Goal:** Add complete dark theme configuration

**Current Issue:** Dark theme is placeholder only with minimal overrides, not fully implemented per styles.json spec.

**Checklist:**

- [ ] Add dark theme to tailwind.config.ts DaisyUI themes array
- [ ] Update CSS tokens with dark theme values in `[data-theme='dark']` block
- [ ] Set dark primary: `#f8fafc` (slate-50)
- [ ] Set dark accent: `#818cf8` (indigo-400)
- [ ] Set dark background (base-100): `#020617` (slate-950)
- [ ] Set dark cardBg (base-200): `#0f172a` (slate-900)
- [ ] Set dark border (base-300): `#1e293b` (slate-800)
- [ ] Set dark textMain: `#f1f5f9` (slate-100)
- [ ] Set dark textMuted: `#94a3b8` (slate-400)
- [ ] Verify all components work in dark mode
- [ ] Test theme toggle functionality
- [ ] Run `bun run typecheck`
- [ ] Run `bun run lint:fix`

**Files to modify:**

- `tailwind.config.ts`
- `src/styles/tokens.css`
- `src/styles/globals.css`

**Estimated Time:** 2-3 hours

**Status:** ⏳ Pending

---

### Section 9: Font Integration (Priority: P0)

**Goal:** Add Inter font and update typography

---

### Task 9.1: Add Inter Font (Priority: P0)

**Goal:** Integrate Inter font family as specified in styles.json

**Current Issue:** Using system font stack, but styles.json specifies Inter as the primary font family.

**Checklist:**

- [ ] Evaluate self-hosting vs CDN (consider privacy for financial app)
- [ ] Add Inter font import (Google Fonts CDN or local hosting)
- [ ] Add `font-display: swap` to prevent FOIT (Flash of Invisible Text)
- [ ] Consider using Inter variable font for reduced file size
- [ ] Update `--font-sans` in tokens.css to: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- [ ] Update TypeScript fonts constant in tokens.ts
- [ ] Verify font renders correctly across browsers
- [ ] Test font weights render correctly: 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- [ ] Run visual verification

**Files to modify:**

- `src/styles/tokens.css`
- `src/lib/tokens.ts`
- `src/layouts/BaseLayout.astro` (font import)

**Font Import (Google Fonts):**

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

**Font Import (Self-hosted alternative):**

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Variable.woff2') format('woff2');
  font-weight: 300 700;
  font-display: swap;
}
```

**Estimated Time:** 45 minutes

**Status:** ⏳ Pending

---

## How to Test

### Manual Test Steps

1. **Visual Regression Testing**
   - Compare screenshots before/after each component update
   - Verify color palette matches styles.json (indigo accent, slate neutrals)
   - Check spacing and sizing consistency

2. **Component Testing**
   - View each updated component in Storybook
   - Test all variants and states
   - Verify hover/focus/active states use correct colors

3. **Theme Testing**
   - Toggle between light and dark themes
   - Verify all components render correctly in both
   - Check that accent color changes appropriately (indigo-500 → indigo-400)

4. **Accessibility Testing**
   - Run axe-core accessibility audit
   - Test keyboard navigation
   - Verify focus states are visible (indigo focus ring)
   - Check color contrast ratios meet WCAG AA (4.5:1 text, 3:1 UI)

5. **Responsive Testing**
   - Test at mobile breakpoint (< 640px)
   - Test at tablet breakpoint (768px)
   - Test at desktop breakpoint (1024px+)

### Automated Tests

```bash
# Quality gates - run after each task
bun run typecheck      # TypeScript compilation
bun run lint:fix       # ESLint
bun run stylelint:fix  # Stylelint
bun run format:fix     # Prettier
bun run test           # Unit tests (non-blocking)
```

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
- [ ] Inter font is properly loaded and rendering with correct weights
- [ ] Button component matches styles.json specs (indigo accent, correct sizes, accent glow shadow)
- [ ] Card component matches specs (1.75rem padding, 1.25rem radius, premium shadow)
- [ ] Input component matches specs (2.5rem height, 0.75rem radius, indigo focus ring)
- [ ] Badge component matches specs (0.625rem font, 700 weight, full radius)
- [ ] Navigation has active gradient and proper icon sizes (22px)
- [ ] Header height is 5rem with 1.25rem padding
- [ ] Container max-width is 1400px with responsive padding
- [ ] All inline SVGs in JavaScript replaced with pre-rendered Lucide icons
- [ ] Dark theme fully functional with correct color mapping
- [ ] All quality gates pass (typecheck, lint, stylelint, format)
- [ ] No hardcoded color values in components
- [ ] Storybook stories render without errors
- [ ] Color contrast meets WCAG AA standards (verified with audit tool)

---

## Estimated Effort

| Section                         | Task Count | Time Estimate   | Priority |
| ------------------------------- | ---------- | --------------- | -------- |
| Section 1: Foundation Tokens    | 4          | 5-8 hours       | P0       |
| Section 2: Atom Components      | 5          | 6-8 hours       | P0-P1    |
| Section 3: Layout Components    | 4          | 2-3 hours       | P0-P2    |
| Section 4: Icon Standardization | 4          | 2-3 hours       | P0-P1    |
| Section 5: Molecule Components  | 5          | 4-6 hours       | P1-P2    |
| Section 6: Organism Components  | 4          | 5-7 hours       | P1-P2    |
| Section 7: Animation System     | 2          | 2-3 hours       | P2       |
| Section 8: Dark Theme           | 1          | 2-3 hours       | P1       |
| Section 9: Font Integration     | 1          | 0.75 hours      | P0       |
| **Total**                       | **30**     | **29-44 hours** | -        |

**Note:** Add 20-30% buffer for testing, visual verification, and potential design review cycles.

---

## Code Quality Improvements (Priority: P3-P4)

**Note:** These tasks are follow-up improvements identified during code review. They are non-blocking but recommended for better code quality, accessibility, and maintainability.
