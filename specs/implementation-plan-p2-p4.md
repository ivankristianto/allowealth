# Design System Alignment - Milestone P2-P4

Complete audit and alignment of components and styles to strictly follow `design-system/styles.json`.
This is part 3/3 of the design system migration milestones.

**Prerequisites:** This plan continues from [P1 milestone](./implementation-plan-p1.md).

- Tasks 1.x, 2.1-2.4, 3.1-3.3 completed in P0/P1
- Tasks 4.1-4.4 (icon standardization) completed in P1
- Tasks 5.1-5.4 (core molecules) completed in P1
- Tasks 6.1-6.3 (core organisms) completed in P1
- This plan covers remaining tasks: 3.4, 5.5, 6.4, Section 7 (animations)

## Summary

This plan addresses **significant discrepancies** between the current implementation and the new "Oasis Finance" design system specification in `styles.json`. The current codebase uses an emerald-based color palette while the new design spec calls for a slate-primary, indigo-accent modern design language.

### Key Changes Required

1. **Color Palette Overhaul** - Migrate from emerald-primary to slate-primary with indigo-accent system
2. **Typography Update** - Add Inter font, adjust font sizes to match spec
3. **Component Restyling** - Update all atoms/molecules/organisms to match new specs
4. **Animation System** - Implement Motion library patterns (P2)
5. **Dark Theme** - Implement proper dark theme from spec (deferred to post-P4)
6. **Icon Standardization** - Fix inline SVGs in JavaScript, standardize icon sizes (✅ completed in P1)
7. **Layout Updates** - Align with container, spacing, and dimension specs
8. **Color Semantics Audit** - Ensure primary vs accent usage is consistent

### Design System Alignment Rules (Apply to All Tasks)

- Use design tokens from `@/lib/tokens` and CSS variables from `tokens.css`; avoid hardcoded hex values.
- Use DaisyUI semantic colors (`btn-accent`, `text-base-content`, `bg-base-200`, `border-base-300`) instead of Tailwind palette classes (`text-slate-*`, `bg-slate-*`, `dark:` variants).
- Use `@lucide/astro` for icons and follow the size scale from `design-system/styles.json`.
- Use Motion (`motion`) presets for animations when required by the spec.
- Avoid arbitrary value utilities (e.g., `text-[...]`, `p-[...]`, `max-w-[...]`, `shadow-[...]`, `bg-[...]`); use tokens, DaisyUI size classes, or add tokenized utilities.
- Avoid arbitrary radius utilities like `rounded-[...]`; use DaisyUI design variables (`--radius-*`) and tokenized radius classes.

### Quality Gates (Constitution Compliance)

Every task MUST pass these gates before proceeding:

```bash
bun run typecheck    # TypeScript type checking (blocking)
bun run lint:fix     # ESLint validation (blocking)
bun run stylelint:fix # StyleLint validation (blocking)
bun run format:fix   # Prettier formatting (blocking)
```

**Test Strategy:** Storybook serves as visual testing. Failed tests → create ticket, fix in separate PR.

### Proposed Changes (Context)

Note: This list reflects full-scope changes across all milestones.

#### New Files (P2)

- `src/styles/animations.css` - Motion animation CSS custom properties
- `src/lib/animations.ts` - Motion animation presets and utilities

#### Modified Files (P1-P2)

- `src/styles/tokens.css` - Update all color tokens ✅ (P0)
- `src/styles/globals.css` - Update DaisyUI theme, add new utilities ✅ (P0)
- `src/lib/tokens.ts` - Update TypeScript token exports ✅ (P0)
- `tailwind.config.ts` - Update DaisyUI theme colors ✅ (P0)
- `src/layouts/BaseLayout.astro` - Add Inter font import ✅ (P0)
- `src/components/atoms/Button.astro` - Added `accent` variant ✅ (P2)
- `src/components/atoms/*` - Updated in P1
- `src/components/molecules/*` - Core molecules updated in P1, remaining in P2
- `src/components/organisms/*` - Core organisms updated in P1, remaining in P2
- `src/components/layouts/Footer.astro` - Update in P2 (Task 3.4)

#### Storybook Updates (Integrated per Task)

- All component stories updated alongside component changes
- Visual validation after each modification
- Accessibility annotations verified

---

## Scope

- Priority: P2-P4
- Sections included: Task 3.4, Task 5.5, Task 6.4, Section 7 (Animation System)
- Storybook: Integrated into component tasks (P3 scope)

---

## Execution Order

Tasks must be completed in this sequence:

1. **Task 3.4** - Footer layout component
2. **Task 5.5** - Remaining molecule components
3. **Task 6.4** - Remaining organism components
4. **Section 7** - Animation system implementation (Tasks 7.1-7.2)

**Rule:** Do not start a task until the previous task passes quality gates.

---

## Detailed Tasks

### Task 3.4: Update Footer Component (Priority: P2) ✅

**Goal:** Ensure footer uses correct colors and spacing per design system

**Current Issue:** Footer may use old neutral colors instead of base-content/neutral tokens.

**Checklist:**

- [x] Replace all `text-slate-*`, `text-gray-*`, `text-neutral-*` with `text-base-content/60` (DaisyUI semantic)
- [x] Verify no hardcoded opacity values (use `/60` suffix for 60% opacity)
- [x] Update border color to `border-base-300`
- [x] Ensure padding matches design system spacing tokens
- [x] Remove any dark mode variants (`dark:text-*`) - DaisyUI handles theme switching
- [ ] **Storybook:** Update `Footer.stories.ts` to show new styling, light/dark theme variants (P3)

**Files to modify:**

- `src/components/layouts/Footer.astro`
- `src/components/layouts/Footer.stories.ts` (P3)

**Acceptance Criteria:**

- [ ] Footer renders correctly in Storybook (P3)
- [x] Text color is `text-base-content/60` (verified in browser inspector)
- [x] Border color is `border-base-300` (verified in browser inspector)
- [x] No hardcoded hex values remain (grep verification: `grep -n "#[0-9a-fA-F]" src/components/layouts/Footer.astro`)
- [x] No Tailwind color classes remain (`text-slate-`, `text-gray-`, `text-neutral-`)
- [ ] Storybook story shows light and dark theme correctly (P3)
- [x] Passes all quality gates without warnings

**Security Review:**

- N/A (layout component, no forms or auth logic)

---

#### Quality Checkpoint (Task 3.4)

Before proceeding to Task 5.5:

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
```

**Manual Verification:**

- [ ] View Footer in Storybook
- [ ] Test light/dark theme switch
- [ ] Verify spacing and colors match `styles.json`

---

### Task 5.5: Update Remaining Molecule Components (Priority: P2)

**Goal:** Update all remaining molecules to use new design tokens

**Current Issue:** Remaining molecules may reference old emerald colors or outdated token values. Auth forms need styling updates while maintaining security.

**Checklist:**

**Auth Components (Security Review Required):**

- [x] Update `AuthValidationMessages.astro` - error colors to `text-error` (DaisyUI)
- [x] Update `ForgotPasswordForm.astro` - colors (SVG fix completed in P1 Task 4.1)
  - [x] Replace emerald/green tokens with `btn-accent` for CTAs
  - [x] Update input styling to match `Input.astro` spec
  - [x] Update error message colors to `text-error`
- [x] Update `LoginForm.astro` - colors (SVG fix completed in P1 Task 4.3)
  - [x] Replace emerald/green tokens with `btn-accent` for login button
  - [x] Update input styling (height 2.5rem, bg-base-200, indigo focus ring)
  - [x] Update error styling to `text-error`
- [x] Update `PasswordChangeForm.astro` - input/button styling
  - [x] Update inputs to match spec (height, background, focus ring)
  - [x] Update buttons to `btn-accent`
- [x] Update `RegistrationForm.astro` - form styling
  - [x] Update all input fields to match spec
  - [x] Update submit button to `btn-accent`
  - [x] Update validation error styling

**Security Review (Auth Forms):**

- [x] ✅ Verify form validation logic unchanged
- [x] ✅ Verify CSRF token handling intact
- [x] ✅ Verify no sensitive data in client-side code
- [x] ✅ Verify password fields use `type="password"`
- [x] ✅ Verify no `console.log` statements with credentials
- [x] ✅ Verify no hardcoded tokens or secrets

**Non-Auth Components:**

- [x] Update `QuickActions.astro` - button colors to `btn-accent`
- [x] Update `TransactionFilters.astro` - input/select styling matches updated atoms
- [x] Update `TransactionRow.astro` - hover colors `hover:bg-base-100`, text colors `text-base-content`

**Storybook Updates (P3):**

- [ ] Update `AuthValidationMessages.stories.ts` - show error state colors
- [ ] Update `ForgotPasswordForm.stories.ts` - show new styling, Lucide icons
- [ ] Update `LoginForm.stories.ts` - show new styling, Lucide icons, error states
- [ ] Update `PasswordChangeForm.stories.ts` - show input/button updates
- [ ] Update `QuickActions.stories.ts` - show accent buttons
- [ ] Update `RegistrationForm.stories.ts` - show form styling, validation states
- [ ] Update `TransactionFilters.stories.ts` - show input/select styling
- [ ] Update `TransactionRow.stories.ts` - show hover states, semantic colors

**Files to modify:**

- `src/components/molecules/AuthValidationMessages.astro`
- `src/components/molecules/ForgotPasswordForm.astro`
- `src/components/molecules/LoginForm.astro`
- `src/components/molecules/PasswordChangeForm.astro`
- `src/components/molecules/QuickActions.astro`
- `src/components/molecules/RegistrationForm.astro`
- `src/components/molecules/TransactionFilters.astro`
- `src/components/molecules/TransactionRow.astro`
- 8 corresponding `.stories.ts` files (P3)

**Acceptance Criteria:**

- [x] All components use DaisyUI semantic colors (no `text-slate-*`, `bg-emerald-*`, etc.)
- [x] Auth forms maintain all security features (validation, CSRF, password masking)
- [x] Buttons use `btn-accent` for primary CTAs
- [x] Inputs match updated `Input.astro` spec (height, background, focus ring)
- [x] Error messages use `text-error` semantic class
- [x] Hover states use `hover:bg-base-100` or appropriate semantic class
- [x] No hardcoded hex values (verified with grep)
- [ ] All Storybook stories show light/dark theme correctly (P3)
- [x] Security audit checklist passed for auth components
- [x] Passes all quality gates

---

#### Quality Checkpoint (Task 5.5)

Before proceeding to Task 6.4:

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
```

**Manual Verification:**

- [ ] View all updated molecules in Storybook
- [ ] Test auth form submissions (dev environment)
- [ ] Verify no console errors
- [ ] Test light/dark theme switching

---

### Task 6.4: Update Remaining Organism Components (Priority: P2) ✅

**Goal:** Update all remaining organisms to use new design tokens

**Current Issue:** Remaining organisms may reference old color tokens or have inconsistent styling with the new design system.

**Checklist:**

- [x] Update `AssetUpdateTodoList.astro`
  - [x] Already aligned with design system (verified)
  - [x] Priority badge colors: `badge-error` (high), `badge-warning` (medium), `badge-success` (low)
  - [x] Badge sizing: padding `0.25rem 0.625rem`, fontSize `0.625rem`, fontWeight 700
  - [x] Text colors: `text-base-content` for main, `text-base-content/60` for secondary
- [x] Update `BudgetHistoryComparison.astro`
  - [x] Updated table header background: `bg-base-200/50`
  - [x] Updated row hover: `hover:bg-base-100`
  - [x] Already using status colors: `text-warning` (80-99%), `text-error` (≥100%), `text-success` (<80%)
  - [x] Updated cell padding: `py-4 px-6`
  - [x] Replaced all `text-neutral-*` classes with `text-base-content/*` opacity variants
- [x] Update `DashboardError.astro`
  - [x] Already using `text-error` semantic colors (verified)
  - [x] Error icon color matches design system
  - [x] CTA button uses `btn-accent`
- [x] Update `TransactionList.astro`
  - [x] Table styling matches styles.json table spec (verified)
  - [x] Header background: `bg-base-200/50`
  - [x] Row hover: `hover:bg-base-100`
  - [x] Icon sizes: 22px (md)
  - [x] Text colors: `text-base-content` for main
- [x] Update `TransactionModal.astro`
  - [x] Modal styling handled by Modal molecule (verified)
  - [x] Uses `rounded-box` (via `--radius-box`) in Modal component
  - [x] Submit button uses `btn-accent` in TransactionForm
- [x] Update `UserContext.astro`
  - [x] Text colors: `text-base-content` for name, `text-base-content/60` for email (verified)
  - [x] Hover states: `hover:bg-base-100`

**Storybook Updates (P3):**

- [ ] Update `AssetUpdateTodoList.stories.ts` - show priority badges, colors
- [ ] Update `BudgetHistoryComparison.stories.ts` - show table styling, status colors
- [ ] Update `DashboardError.stories.ts` - show error state colors
- [ ] Update `TransactionList.stories.ts` - show table styling, hover states
- [ ] Update `TransactionModal.stories.ts` - show modal styling, animations
- [ ] Update `UserContext.stories.ts` - show text colors, hover states

**Files to modify:**

- `src/components/organisms/AssetUpdateTodoList.astro` ✅ (verified aligned)
- `src/components/organisms/BudgetHistoryComparison.astro` ✅ (updated)
- `src/components/organisms/DashboardError.astro` ✅ (verified aligned)
- `src/components/organisms/TransactionList.astro` ✅ (verified aligned)
- `src/components/organisms/TransactionModal.astro` ✅ (verified aligned)
- `src/components/organisms/UserContext.astro` ✅ (verified aligned)
- 6 corresponding `.stories.ts` files (P3)

**Acceptance Criteria:**

- [x] All organisms use DaisyUI semantic colors
- [x] Table components match styles.json table spec (header bg, row hover, cell padding, icon sizes)
- [x] Badge components match updated styling (padding, fontSize, fontWeight)
- [x] Modal components use `rounded-box` and premium shadow
- [x] Status indicators use semantic colors (success, warning, error)
- [x] No hardcoded hex values remain
- [x] No Tailwind color classes (`text-slate-*`, `bg-gray-*`)
- [ ] All Storybook stories show correct light/dark theme behavior (P3)
- [x] Passes all quality gates

**Commit:** `cb4d6c2` - feat(organisms): update remaining organisms for design system P2-P4 (Task 6.4)

---

#### Quality Checkpoint (Task 6.4)

Before proceeding to Section 7:

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
```

**Manual Verification:**

- [ ] View all updated organisms in Storybook
- [ ] Test table interactions (sorting, hover)
- [ ] Test modal open/close
- [ ] Verify light/dark theme switching

---

### Section 7: Animation System Implementation (Priority: P2)

**Goal:** Implement Motion library animation patterns from styles.json

**Context:** Create reusable animation utilities to replace ad-hoc CSS animations and enable consistent, performant animations across all components.

---

### Task 7.1: Create Animation Utilities (Priority: P2)

**Goal:** Create reusable animation utilities based on styles.json presets

**Current Issue:** No centralized animation utilities exist. Components use ad-hoc CSS animations.

**Checklist:**

- [x] Create `src/lib/animation-utils.ts` with TypeScript types (renamed to avoid directory conflict)
- [x] Export spring configurations: smooth, bouncy, gentle, snappy
- [x] Export duration constants: instant, fast, normal, slow, slower
- [x] Export animation presets: fadeIn, slideInFromBottom/Top/Left/Right, scaleIn, scaleOut, popIn
- [x] Export button animations: buttonPress (scale 0.98), buttonHover (scale 1.05)
- [x] Export stagger timing utilities: fast (0.05s), normal (0.1s), slow (0.15s)
- [x] Export component-specific animation configs (modal, toast, dropdown, card, listItem)
- [x] Add JSDoc comments for all exports
- [x] Add usage examples in comments

**Files to create:**

- `src/lib/animations.ts`

**Code Implementation:**

```typescript
/**
 * Animation Utilities
 *
 * Centralized animation configurations based on design-system/styles.json.
 * Uses Motion library for performant, declarative animations.
 *
 * @example
 * import { animate } from 'motion';
 * import { presets, durations } from '@/lib/animations';
 *
 * animate(element, presets.fadeIn.animate, { duration: durations.fast });
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export interface AnimationKeyframes {
  opacity?: number | number[];
  x?: number | number[];
  y?: number | number[];
  scale?: number | number[];
}

export interface AnimationPreset {
  initial: AnimationKeyframes;
  animate: AnimationKeyframes;
  duration?: number;
  spring?: keyof typeof springs;
}

export interface ComponentAnimation {
  backdrop?: AnimationPreset;
  content?: AnimationPreset;
  enter?: AnimationPreset;
  exit?: AnimationPreset;
  hover?: Partial<AnimationKeyframes>;
}

// ============================================================================
// Spring Configurations
// ============================================================================

/**
 * Spring physics configurations for natural motion
 * Based on styles.json animation.spring
 */
export const springs: Record<string, SpringConfig> = {
  /** Smooth, balanced spring - general purpose */
  smooth: { stiffness: 100, damping: 15, mass: 1 },

  /** Bouncy, playful spring - modals, popovers */
  bouncy: { stiffness: 300, damping: 10, mass: 1 },

  /** Gentle, soft spring - subtle transitions */
  gentle: { stiffness: 50, damping: 20, mass: 1 },

  /** Snappy, quick spring - buttons, toggles */
  snappy: { stiffness: 400, damping: 30, mass: 1 },
};

// ============================================================================
// Duration Constants
// ============================================================================

/**
 * Animation duration presets in seconds
 * Based on styles.json animation.duration
 */
export const durations: Record<string, number> = {
  instant: 0,
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  slower: 1,
};

// ============================================================================
// Animation Presets
// ============================================================================

/**
 * Common animation presets for reuse
 * Based on styles.json animation.presets
 */
export const presets: Record<string, AnimationPreset> = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    duration: 0.3,
  },

  fadeOut: {
    initial: { opacity: 1 },
    animate: { opacity: 0 },
    duration: 0.3,
  },

  slideInFromBottom: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    duration: 0.3,
  },

  slideInFromTop: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    duration: 0.3,
  },

  slideInFromLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    duration: 0.3,
  },

  slideInFromRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    duration: 0.3,
  },

  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    duration: 0.3,
  },

  scaleOut: {
    initial: { opacity: 1, scale: 1 },
    animate: { opacity: 0, scale: 0.9 },
    duration: 0.3,
  },

  popIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    spring: 'bouncy',
  },
};

// ============================================================================
// Interaction Animations
// ============================================================================

/**
 * Button interaction animations
 * Based on styles.json animation.presets.buttonPress/buttonHover
 */
export const buttonAnimations = {
  press: {
    scale: 0.98,
    duration: 0.15,
  },
  hover: {
    scale: 1.05,
    duration: 0.15,
  },
};

// ============================================================================
// Stagger Timing
// ============================================================================

/**
 * Stagger delays for sequential animations
 * Based on styles.json animation.stagger
 */
export const stagger: Record<string, number> = {
  fast: 0.05,
  normal: 0.1,
  slow: 0.15,
};

// ============================================================================
// Component-Specific Animations
// ============================================================================

/**
 * Pre-configured animations for common components
 * Based on styles.json animation.components
 */
export const components: Record<string, ComponentAnimation> = {
  modal: {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      duration: 0.2,
    },
    content: {
      initial: { opacity: 0, scale: 0.95, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      duration: 0.3,
    },
  },

  toast: {
    enter: {
      initial: { opacity: 0, y: -10, scale: 0.95 },
      animate: { opacity: 1, y: 0, scale: 1 },
      duration: 0.2,
    },
    exit: {
      initial: { opacity: 1, scale: 1 },
      animate: { opacity: 0, scale: 0.95 },
      duration: 0.2,
    },
  },

  dropdown: {
    enter: {
      initial: { opacity: 0, y: -8 },
      animate: { opacity: 1, y: 0 },
      duration: 0.15,
    },
    exit: {
      initial: { opacity: 1, y: 0 },
      animate: { opacity: 0, y: -8 },
      duration: 0.15,
    },
  },

  card: {
    hover: {
      y: -4,
    },
  },

  listItem: {
    enter: {
      initial: { opacity: 0, x: -10 },
      animate: { opacity: 1, x: 0 },
      duration: 0.3,
    },
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Apply staggered animation to a list of elements
 *
 * @example
 * import { animate } from 'motion';
 * import { animateList, presets, stagger } from '@/lib/animations';
 *
 * const items = document.querySelectorAll('.list-item');
 * animateList(items, presets.fadeIn, stagger.normal);
 */
export function animateList(
  elements: NodeListOf<Element> | Element[],
  preset: AnimationPreset,
  staggerDelay: number = stagger.normal
): void {
  elements.forEach((element, index) => {
    // Dynamic import to avoid SSR issues
    import('motion').then(({ animate }) => {
      animate(element, preset.animate, {
        duration: preset.duration,
        delay: index * staggerDelay,
      });
    });
  });
}
```

**Acceptance Criteria:**

- [x] All types are properly defined with TypeScript
- [x] All exports have JSDoc comments
- [x] Code matches styles.json animation specifications
- [x] No hardcoded values (all from styles.json)
- [x] Usage examples included in comments
- [x] File passes all quality gates
- [x] Can be imported without errors: `import { presets, durations } from '@/lib/animations'` (via barrel file)

**Commit**: `844e4c2` - feat(animations): add animation utilities based on design-system/styles.json (Task 7.1)

---

#### Quality Checkpoint (Task 7.1)

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
```

---

### Task 7.2: Add Animation CSS Custom Properties (Priority: P2)

**Goal:** Add CSS custom properties for animation timing

**Current Issue:** No CSS variables exist for consistent animation timing across components. CSS animations lack design system integration.

**Checklist:**

- [x] Create `src/styles/animations.css` with animation variables
- [x] Add duration variables: `--duration-instant: 0s`, `--duration-fast: 0.15s`, `--duration-normal: 0.3s`, `--duration-slow: 0.5s`, `--duration-slower: 1s`
- [x] Add easing variables matching styles.json:
  - `--ease-default: cubic-bezier(0.4, 0, 0.2, 1)`
  - `--ease-in: cubic-bezier(0.4, 0, 1, 1)`
  - `--ease-out: cubic-bezier(0, 0, 0.2, 1)`
  - `--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)`
  - `--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)`
  - `--ease-elastic: cubic-bezier(0.68, -0.6, 0.32, 1.6)`
- [x] Add keyframe definitions for common animations (fadeIn, slideIn, scaleIn)
- [x] Import in `globals.css` using `@import './animations.css';`
- [x] Add documentation comments

**Files to create:**

- `src/styles/animations.css`

**Files to modify:**

- `src/styles/globals.css` (add import at top)

**Code Implementation:**

```css
/**
 * Animation System
 *
 * CSS custom properties for animation timing and easing.
 * Based on design-system/styles.json animation specifications.
 *
 * For complex animations, use Motion library (@/lib/animations.ts).
 * Use these CSS variables for simple transitions.
 */

/* ============================================================================
   Duration Variables
   ========================================================================= */

:root {
  /* Animation durations - use for transition-duration */
  --duration-instant: 0s;
  --duration-fast: 0.15s;
  --duration-normal: 0.3s;
  --duration-slow: 0.5s;
  --duration-slower: 1s;

  /* Easing functions - use for transition-timing-function */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --ease-elastic: cubic-bezier(0.68, -0.6, 0.32, 1.6);
}

/* ============================================================================
   Keyframe Animations
   ========================================================================= */

/* Fade animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* Slide animations */
@keyframes slideInFromBottom {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInFromTop {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Scale animations */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes scaleOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ============================================================================
   Utility Classes
   ========================================================================= */

/* Apply animation with CSS class */
.animate-fade-in {
  animation: fadeIn var(--duration-normal) var(--ease-default);
}

.animate-slide-in-bottom {
  animation: slideInFromBottom var(--duration-normal) var(--ease-default);
}

.animate-scale-in {
  animation: scaleIn var(--duration-normal) var(--ease-default);
}

.animate-pop-in {
  animation: popIn var(--duration-normal) var(--ease-bounce);
}

/* Transition utilities - use with hover/focus states */
.transition-fast {
  transition-duration: var(--duration-fast);
  transition-timing-function: var(--ease-default);
}

.transition-normal {
  transition-duration: var(--duration-normal);
  transition-timing-function: var(--ease-default);
}

.transition-slow {
  transition-duration: var(--duration-slow);
  transition-timing-function: var(--ease-default);
}
```

**Acceptance Criteria:**

- [x] All CSS custom properties defined
- [x] All keyframe animations defined
- [x] Utility classes created for common animations
- [x] Documentation comments included
- [x] Imported in `globals.css`
- [x] No syntax errors (verified with stylelint)
- [x] Variables accessible in all components
- [x] Can use in component: `transition-duration: var(--duration-fast);`
- [x] Can use utility class: `class="animate-fade-in"`
- [x] Passes all quality gates

**Commit**: (pending)

---

#### Quality Checkpoint (Task 7.2)

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
```

**Manual Verification:**

- [ ] Check `globals.css` has `@import './animations.css';`
- [ ] Verify CSS variables are accessible in browser DevTools
- [ ] Test utility class: add `animate-fade-in` to an element and verify it fades in

---

#### Quality Checkpoint (Section 7 - Final)

Before marking P2 milestone complete:

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
```

**Manual Verification:**

- [ ] Can import animations: `import { presets, durations } from '@/lib/animations'`
- [ ] Can use CSS variables: `transition: opacity var(--duration-fast) var(--ease-default);`
- [ ] Can use utility classes: `class="animate-fade-in"`
- [ ] All exports have proper TypeScript types
- [ ] All CSS variables render correctly

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
- `design-system/START.md` ✅ (design system guide - updated)
- `docs/constitution.md` ✅ (development guidelines)
- `specs/implementation-plan-p1.md` ✅ (prerequisite tasks)

---

## Success Criteria (P2-P4)

### P2 (Core Implementation)

- [x] Footer aligns with base-content/neutral tokens and spacing ✅
- [x] All remaining molecule components match new input/button/token styling ✅
- [x] All remaining organism components align with table, modal, and status tokens ✅
- [x] Animation utilities (`@/lib/animation-utils.ts`) created with full TypeScript types ✅
- [x] Animation CSS variables (`src/styles/animations.css`) available and documented ✅
- [x] All auth form security reviews passed ✅
- [x] Zero hardcoded hex values remain in P2 scope components ✅
- [x] All quality gates pass for all modified components ✅

### P3 (Storybook & Visual QA)

- [ ] All modified component stories updated to show new styling
- [ ] All stories demonstrate light and dark theme correctly
- [ ] All stories show component variants and states
- [ ] Storybook renders without console errors or warnings
- [ ] Visual QA passed for all components in Storybook

### P4 (Polish & Documentation)

- [ ] Code quality audit completed
- [ ] Refactoring opportunities documented
- [ ] Technical debt tickets created for future improvements
- [ ] `design-system/START.md` reflects current design system ✅
- [ ] All documentation references updated

---

## Post-P4 (Deferred)

The following items are **explicitly deferred** to post-P4 milestones:

- [ ] **Dark theme implementation** - Full dark mode support with theme switcher
- [ ] **Animation refactoring** - Replace all CSS animations with Motion library
- [ ] **Component composition audit** - Identify opportunities for better composition
- [ ] **Performance optimization** - Bundle size analysis, lazy loading strategy
- [ ] **Accessibility audit** - Comprehensive WCAG 2.1 AA compliance check

---

## Notes

### Design System Source of Truth

- **Primary:** `design-system/styles.json` (complete token definitions)
- **Secondary:** `design-system/START.md` (quick reference guide - now updated)
- **Implementation:** `src/lib/tokens.ts` and `src/styles/tokens.css`

### Storybook Strategy

Stories are updated **alongside component changes** (not as separate section):

- Component modification includes story update in checklist
- Visual validation happens immediately after component update
- Maintains synchronization between code and documentation
- P3 priority allows deferring if implementation is blocked

---

**End of Plan**

## Code Quality & Accessibility Improvements

**Note:** These are reserved for improvements identified during code review. They are non-blocking but recommended for better code quality, accessibility, and maintainability. When added, follow the same format as tasks and have checklists.

### P3 - Footer Component Optional Enhancements

From Task 3.4 code review (2025-01-23):

1. **Consider using the dedicated `footer` component class** (P3)
   - **Location:** `src/components/layouts/Footer.astro:9`
   - **Suggested:** `<footer class="footer footer-center bg-base-100 border-t border-base-300 px-4 py-3">`
   - **Rationale:** DaisyUI provides a dedicated `footer` component class for more consistent styling
   - **Note:** Optional - current implementation works correctly

2. **Typography size consideration** (P3)
   - **Location:** `src/components/layouts/Footer.astro:10`
   - **Note:** `text-sm` (0.875rem / 14px) correctly aligns with `fontSizes.sm` from design system
   - **Future:** Consider using tokens if component becomes more complex
