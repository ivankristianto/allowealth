# Design System Alignment - Milestone P2-P4

Complete audit and alignment of components and styles to strictly follow `design-system/styles.json`.
This the part 3/3 milestones.

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

- Priority: P2-P4
- Sections included: Task 3.4, Task 5.5, Task 6.4, Section 7, Code Quality Improvements

---

## Detailed Tasks

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

## Code Quality Improvements (Priority: P3-P4)

**Note:** These tasks are follow-up improvements identified during code review. They are non-blocking but recommended for better code quality, accessibility, and maintainability.

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

## Success Criteria (P2-P4)

- [ ] Footer aligns with base-content/neutral tokens and spacing
- [ ] Remaining molecule components match new input/button/token styling
- [ ] Remaining organism components align with table, modal, and status tokens
- [ ] Animation utilities and CSS variables are available for Motion-based use
- [ ] Code quality follow-ups are ready to be scheduled
