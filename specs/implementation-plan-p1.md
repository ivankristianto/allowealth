# Design System Alignment - Milestone P1

Complete audit and alignment of components and styles to strictly follow `design-system/styles.json`.
This the part 2/3 milestones.

## Summary

This plan addresses **significant discrepancies** between the current implementation and the new "Oasis Finance" design system specification in `styles.json`. The current codebase uses an emerald-based color palette while the new design spec calls for a slate-primary, indigo-accent modern design language.

### Key Changes Required

1. **Color Palette Overhaul** - Migrate from emerald-primary to slate-primary with indigo-accent system
2. **Typography Update** - Add Inter font, adjust font sizes to match spec
3. **Component Restyling** - Update all atoms/molecules/organisms to match new specs
4. **Animation System** - Use Motion library directly for component animations
5. **Icon Standardization** - Fix inline SVGs in JavaScript, standardize icon sizes
6. **Layout Updates** - Align with container, spacing, and dimension specs
7. **Color Semantics Audit** - Ensure primary vs accent usage is consistent

### Design System Alignment Rules (Apply to All Tasks)

- Use design tokens from `@/lib/tokens` and CSS variables from `tokens.css`; avoid hardcoded hex values.
- Use DaisyUI semantic colors (`btn-accent`, `text-base-content`, `bg-base-200`, `border-base-300`) instead of Tailwind palette classes (`text-slate-*`, `bg-slate-*`, `dark:` variants).
- Use `@lucide/astro` for icons and follow the size scale from `design-system/styles.json`.
- Use Motion (`motion`) presets for animations when required by the spec.
- Avoid arbitrary value utilities (e.g., `text-[...]`, `p-[...]`, `max-w-[...]`, `shadow-[...]`, `bg-[...]`); use tokens, DaisyUI size classes, or add tokenized utilities.
- Avoid arbitrary radius utilities like `rounded-[...]`; use DaisyUI design variables (`--radius-*`) and tokenized radius classes.

### Proposed Changes (Context)

Note: This list reflects P1 scope only. Animation utilities (`src/lib/animations.ts`, `src/styles/animations.css`) are created in P2-P4.

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

- Priority: P1 only
- Sections included: Task 2.5, Task 3.3, Section 4, Section 5 (Tasks 5.1-5.4), Section 6 (Tasks 6.1-6.3)
- Context: This plan continues from P0 milestone. Tasks 1.x-2.4 and 3.1-3.2 were completed in previous milestone.

---

## Execution Order

Tasks must be completed in this sequence (atoms → molecules → organisms):

1. **Task 2.5** - Atom components (foundation for all other components)
2. **Task 3.3** - PageContainer layout
3. **Section 4** - Icon standardization (Tasks 4.1-4.4)
4. **Section 5** - Molecule components (depend on atoms)
5. **Section 6** - Organism components (depend on molecules)

**Rule:** Do not start a section until the previous section passes quality gates.

---

## Detailed Tasks

### Task 2.5: Update Remaining Atom Components (Priority: P1)

**Goal:** Update all other atoms to use new color tokens

**Current Issue:** Multiple atoms reference emerald colors or old token values that conflict with the new slate-primary, indigo-accent design system. Components need to use accent color for interactive elements and updated semantic colors.

---

#### Task 2.5a: Update Input-Related Atoms

**Checklist:**

- [x] Update `CurrencyInput.astro` - input height 2.5rem, background `bg-base-200`, focus ring `rgba(99, 102, 241, 0.2)`
- [x] Update `DatePicker.astro` - input styling per styles.json input spec (height, padding, radius)
- [x] Update `PasswordField.astro` - focus ring indigo `rgba(99, 102, 241, 0.2)`, background `bg-base-200`
- [x] Update `Checkbox.astro` - accent color for checked state (`checkbox-accent`)

**Files to modify:** `src/components/atoms/CurrencyInput.astro`, `DatePicker.astro`, `PasswordField.astro`, `Checkbox.astro`

**Estimated Time:** 1 hour

**Status:** ✅ Completed (commit 4c773d1)

---

#### Task 2.5b: Update Display Atoms

**Checklist:**

- [x] Update `Currency.astro` - IDR color `text-success` (#10b981), USD color `text-info` (#3b82f6)
- [x] Update `Percentage.astro` - status colors via DaisyUI (`text-success`, `text-warning`, `text-error`)
- [x] Update `Spinner.astro` - accent color (`text-accent` or #6366f1)
- [x] Update `Badge.astro` - padding `0.25rem 0.625rem`, fontSize `0.625rem`, fontWeight 700 (verified aligned)

**Files to modify:** `src/components/atoms/Currency.astro`, `Percentage.astro`, `Spinner.astro`, `Badge.astro`

**Estimated Time:** 1 hour

**Status:** ✅ Completed (commit e383ca8)

---

#### Task 2.5c: Update Feedback Atoms

**Checklist:**

- [x] Update `EmptyState.astro` - CTA buttons use `btn-accent`, text uses `text-base-content`
- [x] Update `ErrorMessage.astro` - error color via DaisyUI (`text-error`), no hardcoded hex
- [x] Update `Label.astro` - text color `text-base-content` for labels, `text-neutral` for optional hints

**Files to modify:** `src/components/atoms/EmptyState.astro`, `ErrorMessage.astro`, `Label.astro`

**Estimated Time:** 45 minutes

**Status:** ✅ Completed (commit 7cdfb86)

---

#### Task 2.5d: Update Select Atoms

**Checklist:**

- [x] Update `CategorySelect.astro` - input styling alignment (height, background, focus ring)
- [x] Update `PaymentMethodSelect.astro` - input styling alignment (height, background, focus ring)

**Files to modify:** `src/components/atoms/CategorySelect.astro`, `PaymentMethodSelect.astro`

**Estimated Time:** 30 minutes

**Status:** ✅ Completed

---

#### Quality Checkpoint (Task 2.5)

Before proceeding to Task 3.3:

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
```

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

#### Quality Checkpoint (Task 3.3)

Before proceeding to Section 4:

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
```

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

#### Quality Checkpoint (Section 4)

Before proceeding to Section 5:

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
```

---

### Section 5: Molecule Component Updates (Priority: P1)

**Goal:** Update all molecule components to use new design tokens

---

### Task 5.1: Update Toast Component (Priority: P1)

**Goal:** Align Toast with styles.json animation specifications using Motion library

**Current Issue:** Toast uses CSS keyframes, styles.json specifies Motion library animations with specific timing.

**Checklist:**

- [ ] Import Motion library: `import { animate } from 'motion'`
- [ ] Replace CSS keyframes with Motion animations:
  - Enter: `animate(element, { opacity: [0, 1], y: [-10, 0], scale: [0.95, 1] }, { duration: 0.2 })`
  - Exit: `animate(element, { opacity: [1, 0], scale: [1, 0.95] }, { duration: 0.2 })`
- [ ] Update toast colors to DaisyUI semantic: `alert-info`, `alert-success`, `alert-warning`, `alert-error`
- [ ] Update positioning if needed

**Files to modify:**

- `src/components/molecules/Toast.astro`
- `src/components/molecules/ToastContainer.astro`

**Estimated Time:** 45 minutes

**Status:** ⏳ Pending

---

### Task 5.2: Update Modal Component (Priority: P1)

**Goal:** Align Modal animations with styles.json specifications using Motion library

**Current Issue:** Modal may not have optimal animation specs matching styles.json modal presets.

**Checklist:**

- [ ] Import Motion library: `import { animate } from 'motion'`
- [ ] Update backdrop animation using Motion:
  - Enter: `animate(backdrop, { opacity: [0, 1] }, { duration: 0.2 })`
  - Exit: `animate(backdrop, { opacity: [1, 0] }, { duration: 0.2 })`
- [ ] Update content animation using Motion:
  - Enter: `animate(content, { opacity: [0, 1], scale: [0.95, 1], y: [20, 0] }, { duration: 0.3 })`
  - Exit: `animate(content, { opacity: [1, 0], scale: [1, 0.95], y: [0, 20] }, { duration: 0.3 })`
- [ ] Ensure modal styling uses `rounded-box` (via `--radius-box`) and premium shadow
- [ ] Update close button: `hover:bg-accent/10` or `hover:text-accent`

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

#### Quality Checkpoint (Section 5)

Before proceeding to Section 6:

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
```

---

### Section 6: Organism Component Updates (Priority: P1)

**Goal:** Update all organism components to use new design tokens

---

### Task 6.1: Update BudgetOverviewTable (Priority: P1)

**Goal:** Align table with styles.json specifications

**Current Issue:** Table may not match header background, row hover, cell padding specs from styles.json.

**Checklist:**

- [ ] Update header background using DaisyUI: `bg-base-200/50` (matches styles.json light: `rgba(248, 250, 252, 0.5)`)
- [ ] Update row hover color using DaisyUI: `hover:bg-base-100` (theme-friendly)
- [ ] Update cell padding to `py-4 px-6` (1rem 1.5rem per styles.json)
- [ ] Update icon sizes to 22px (md size per styles.json icons.sizes)
- [ ] Update status colors using DaisyUI: `text-warning` for 80-99%, `text-error` for ≥100%

**Files to modify:**

- `src/components/organisms/BudgetOverviewTable.astro`

**Estimated Time:** 45 minutes

**Status:** ⏳ Pending

---

### Task 6.2: Update SummaryCards (Priority: P1)

**Goal:** Update dashboard summary cards to new card styling

**Current Issue:** Cards may not use updated Card component with new padding, radius, and shadow specs.

**Checklist:**

- [ ] Ensure cards use updated Card component (`p-7` = 1.75rem, `rounded-box`, premium shadow)
- [ ] Update icon colors using DaisyUI: `text-accent`
- [ ] Update trend indicators using DaisyUI: `text-success` for up, `text-error` for down
- [ ] Update text colors using DaisyUI: `text-base-content` for main, `text-neutral` for secondary

**Files to modify:**

- `src/components/organisms/SummaryCards.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

### Task 6.3: Update RecentTransactionsList (Priority: P1)

**Goal:** Update list styling to match new design

**Current Issue:** List may use old hover colors and inconsistent icon sizes.

**Checklist:**

- [ ] Update row hover colors using DaisyUI: `hover:bg-base-100`
- [ ] Update icon sizes to 22px (md size per styles.json)
- [ ] Update text colors using DaisyUI: `text-base-content` for main, `text-neutral` for secondary
- [ ] Update badge styling: padding `0.25rem 0.625rem`, fontSize `0.625rem`, use semantic badge colors

**Files to modify:**

- `src/components/organisms/RecentTransactionsList.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

#### Quality Checkpoint (Section 6 - Final)

Before marking P1 milestone complete:

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
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

## Success Criteria (P1)

- [x] Remaining atom components use new tokens and semantic colors (Task 2.5 completed)
- [ ] Page container uses tokenized max width and responsive padding
- [ ] Inline SVGs in auth/import flows are replaced with Lucide templates
- [ ] Icon sizing matches the md/sm/lg scale and uses `@lucide/astro`
- [ ] Toast and modal animations match Motion presets
- [ ] Budget health widget uses tokenized status colors and badges
- [ ] Transaction form uses updated inputs, buttons, and spacing
- [ ] Budget overview table aligns with header/rowHover tokens and padding
- [ ] Summary cards and recent transactions list match updated card/list specs

## Code Quality & Accessibility Improvements

**Note:** These are reserved for improvements identified during code review. They are non-blocking but recommended for better code quality, accessibility, and maintainability. When added, follow the same format as tasks and have checklists.

---

### Task QA.1: Add Label Support to Select Components (Priority: P2)

**Goal:** Improve accessibility by adding label support to CategorySelect and PaymentMethodSelect components.

**Issue:** The select components lack associated labels, which impacts accessibility. Screen reader users rely on proper label associations to understand form fields.

**Checklist:**

- [ ] Add `label` prop to CategorySelect.astro interface
- [ ] Add `label` prop to PaymentMethodSelect.astro interface
- [ ] Render `<label>` element with `htmlFor` pointing to the select's `id` when label is provided
- [ ] Follow design system pattern from `design-system/START.md`
- [ ] Update stories to demonstrate label usage
- [ ] Update JSDoc comments

**Files to modify:**

- `src/components/atoms/CategorySelect.astro`
- `src/components/atoms/PaymentMethodSelect.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending

---

### Task QA.2: Add Focus Ring Offset to Input Components (Priority: P2)

**Goal:** Complete design system consistency by adding focus ring offset to all input-type components.

**Issue:** CategorySelect and PaymentMethodSelect now include `focus:ring-offset-2`, but Input.astro and CurrencyInput.astro lack this offset. This creates visual inconsistency.

**Checklist:**

- [ ] Add `focus:ring-offset-2` to Input.astro base classes
- [ ] Add `focus:ring-offset-2` to CurrencyInput.astro input classes
- [ ] Verify focus ring appearance across all input components
- [ ] Update stories if needed

**Files to modify:**

- `src/components/atoms/Input.astro`
- `src/components/atoms/CurrencyInput.astro`

**Estimated Time:** 15 minutes

**Status:** ⏳ Pending

---

### Task QA.3: Standardize aria-required Pattern (Priority: P2)

**Goal:** Standardize the `aria-required` attribute pattern across all form components for consistency.

**Issue:** CategorySelect and PaymentMethodSelect use `aria-required={required ? 'true' : undefined}` (ternary pattern), while CurrencyInput uses `aria-required={required}` (boolean pattern). Both are ARIA-compliant but inconsistency creates maintenance burden.

**Checklist:**

- [ ] Decide on standard pattern (ternary for explicitness vs boolean for simplicity)
- [ ] Update all form components to use the standard pattern
- [ ] Verify ARIA compliance after changes
- [ ] Document the pattern in design system guide

**Files to modify:**

- `src/components/atoms/CategorySelect.astro`
- `src/components/atoms/PaymentMethodSelect.astro`
- `src/components/atoms/CurrencyInput.astro`
- `src/components/atoms/Input.astro`
- `src/components/atoms/DatePicker.astro`
- `src/components/atoms/PasswordField.astro`

**Estimated Time:** 30 minutes

**Status:** ⏳ Pending
