# Input and Button Consistency + Accessibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standardize all form controls to `rounded-lg`, all actionable buttons to `rounded-2xl`, and remove low-accessibility border/hover patterns that violate the design system.

**Architecture:** Introduce shared style contracts for controls/buttons in `src/lib/ui`, then migrate atom components first, then modal/page-level overrides. Add regression tests that fail on banned class patterns (`rounded-full` on action buttons, `border-0` on form controls, low-contrast button borders, custom Tailwind shade classes in app UI). Finish with design-system docs updates and full quality gates.

**Tech Stack:** Astro 5, Bun, bun:test, DaisyUI v5, Tailwind v4, design tokens from `@/lib/tokens`.

**Execution Rules:**

- Use `@superpowers:test-driven-development` for every code task.
- Use `@superpowers:systematic-debugging` if any test fails unexpectedly.
- Use `@superpowers:verification-before-completion` before claiming done.

---

### Task 1: Add failing style-regression tests

**Files:**

- Create: `src/__tests__/ui-style-consistency.test.ts`
- Test: `src/__tests__/ui-style-consistency.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/ui-style-consistency.test.ts`:

```ts
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const actionButtonFiles = [
  'src/components/molecules/TransactionEntryForm.astro',
  'src/components/molecules/ConfirmationModal.astro',
  'src/components/organisms/PaymentMethodFormModal.astro',
  'src/components/organisms/CategoryModal.astro',
  'src/components/organisms/AssetCategoryModal.astro',
  'src/components/organisms/AssetFormModal.astro',
  'src/components/organisms/AssetUpdateValueModal.astro',
  'src/components/organisms/InviteMemberModal.astro',
  'src/pages/settings/index.astro',
  'src/pages/budget/categories/index.astro',
];

const formControlFiles = [
  'src/components/atoms/Input.astro',
  'src/components/atoms/AssetSelect.astro',
  'src/components/atoms/CategorySelect.astro',
  'src/components/atoms/CurrencyInput.astro',
  'src/components/atoms/DatePicker.astro',
  'src/components/organisms/TransactionFiltersBar.astro',
];

function read(filePath: string): string {
  return readFileSync(filePath, 'utf-8');
}

describe('UI style consistency', () => {
  it('uses rounded-2xl for actionable buttons', () => {
    for (const filePath of actionButtonFiles) {
      const source = read(filePath);
      expect(source.includes('rounded-full')).toBe(false);
      expect(source.includes('rounded-2xl')).toBe(true);
    }
  });

  it('uses rounded-lg for form controls without border-0', () => {
    for (const filePath of formControlFiles) {
      const source = read(filePath);
      expect(source.includes('rounded-full')).toBe(false);
      expect(source.includes('border-0')).toBe(false);
      expect(source.includes('rounded-lg')).toBe(true);
    }
  });

  it('avoids low-contrast button border opacity classes', () => {
    const flagged = [
      'border-accent/10',
      'border-accent/20',
      'hover:border-accent/30',
      'hover:border-base-content/30',
    ];

    for (const filePath of actionButtonFiles) {
      const source = read(filePath);
      flagged.forEach((pattern) => {
        expect(source.includes(pattern)).toBe(false);
      });
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/ui-style-consistency.test.ts`
Expected: FAIL (current files still contain `rounded-full`, `border-0`, and contrast-risk patterns).

**Step 3: Commit failing baseline**

```bash
git add src/__tests__/ui-style-consistency.test.ts
git commit -m "test: add failing UI style consistency guardrails"
```

---

### Task 2: Create shared control/button style contracts

**Files:**

- Create: `src/lib/ui/controlStyles.ts`
- Create: `src/lib/ui/controlStyles.test.ts`
- Test: `src/lib/ui/controlStyles.test.ts`

**Step 1: Write the failing test**

Create `src/lib/ui/controlStyles.test.ts`:

```ts
import { describe, expect, it } from 'bun:test';
import {
  CONTROL_BASE_CLASSES,
  CONTROL_FOCUS_CLASSES,
  CONTROL_SURFACE_CLASSES,
  BUTTON_BASE_CLASSES,
  BUTTON_ACCESSIBLE_OUTLINE_CLASSES,
} from './controlStyles';

describe('controlStyles contract', () => {
  it('enforces rounded-lg for controls', () => {
    expect(CONTROL_BASE_CLASSES).toContain('rounded-lg');
  });

  it('keeps visible control borders', () => {
    expect(CONTROL_SURFACE_CLASSES).toContain('border');
    expect(CONTROL_SURFACE_CLASSES).toContain('border-base-300');
    expect(CONTROL_SURFACE_CLASSES).not.toContain('border-0');
  });

  it('enforces rounded-2xl for actionable buttons', () => {
    expect(BUTTON_BASE_CLASSES).toContain('rounded-2xl');
  });

  it('uses non-opaque outline borders', () => {
    expect(BUTTON_ACCESSIBLE_OUTLINE_CLASSES).toContain('border-accent');
    expect(BUTTON_ACCESSIBLE_OUTLINE_CLASSES).not.toContain('border-accent/10');
  });

  it('uses visible focus styles', () => {
    expect(CONTROL_FOCUS_CLASSES).toContain('focus-visible:ring-2');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/ui/controlStyles.test.ts`
Expected: FAIL with module not found (`./controlStyles`).

**Step 3: Write minimal implementation**

Create `src/lib/ui/controlStyles.ts`:

```ts
export const CONTROL_BASE_CLASSES = 'w-full rounded-lg';

export const CONTROL_SURFACE_CLASSES = 'bg-base-200 border border-base-300 text-base-content';

export const CONTROL_FOCUS_CLASSES =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';

export const BUTTON_BASE_CLASSES =
  'btn inline-flex items-center justify-center gap-2 rounded-2xl font-medium';

export const BUTTON_ACCESSIBLE_OUTLINE_CLASSES =
  'btn-outline border border-accent text-accent hover:bg-accent/10 hover:border-accent';
```

**Step 4: Run test to verify it passes**

Run: `bun test src/lib/ui/controlStyles.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/ui/controlStyles.ts src/lib/ui/controlStyles.test.ts
git commit -m "feat(ui): add shared control and button style contracts"
```

---

### Task 3: Migrate atom form controls to rounded-lg + accessible borders

**Files:**

- Modify: `src/components/atoms/Input.astro`
- Modify: `src/components/atoms/AssetSelect.astro`
- Modify: `src/components/atoms/CategorySelect.astro`
- Modify: `src/components/atoms/CurrencyInput.astro`
- Modify: `src/components/atoms/DatePicker.astro`
- Modify: `src/components/organisms/TransactionFiltersBar.astro`
- Test: `src/__tests__/ui-style-consistency.test.ts`

**Step 1: Run current regression test**

Run: `bun test src/__tests__/ui-style-consistency.test.ts`
Expected: FAIL.

**Step 2: Implement control updates**

Apply these style changes:

- Replace control radius with `rounded-lg`.
- Remove `border-0` on controls; use `border border-base-300`.
- Keep `bg-base-200` or `bg-base-100` as already intended by context.
- Replace generic focus rings with visible `focus-visible` ring patterns.
- For joined currency controls, use `rounded-l-lg` and `rounded-r-lg` (not `*-full`).

Target snippets:

```astro
class="input input-bordered w-full rounded-lg border border-base-300 bg-base-200"
```

```astro
class="select select-bordered w-full rounded-lg border border-base-300 bg-base-200"
```

```astro
class="textarea textarea-bordered w-full rounded-lg border border-base-300 bg-base-200"
```

**Step 3: Re-run regression test**

Run: `bun test src/__tests__/ui-style-consistency.test.ts`
Expected: Still FAIL (button task not done yet), but form-control assertions pass.

**Step 4: Run targeted grep check**

Run: `rg -n '(input|select|textarea)[^"\n]*rounded-full|rounded-full[^"\n]*(input|select|textarea)|border-0' src/components/atoms src/components/organisms/TransactionFiltersBar.astro`
Expected: No matches for form controls.

**Step 5: Commit**

```bash
git add src/components/atoms/Input.astro src/components/atoms/AssetSelect.astro src/components/atoms/CategorySelect.astro src/components/atoms/CurrencyInput.astro src/components/atoms/DatePicker.astro src/components/organisms/TransactionFiltersBar.astro
git commit -m "refactor(forms): standardize controls to rounded-lg with accessible borders"
```

---

### Task 4: Migrate actionable buttons to rounded-2xl and fix contrast

**Files:**

- Modify: `src/components/atoms/Button.astro`
- Modify: `src/components/molecules/TransactionEntryForm.astro`
- Modify: `src/components/molecules/ConfirmationModal.astro`
- Modify: `src/components/organisms/PaymentMethodFormModal.astro`
- Modify: `src/components/organisms/CategoryModal.astro`
- Modify: `src/components/organisms/AssetCategoryModal.astro`
- Modify: `src/components/organisms/AssetFormModal.astro`
- Modify: `src/components/organisms/AssetUpdateValueModal.astro`
- Modify: `src/components/organisms/InviteMemberModal.astro`
- Modify: `src/components/organisms/CopyBudgetModal.astro`
- Modify: `src/components/organisms/SetNewBudgetModal.astro`
- Modify: `src/components/organisms/GenerateApiKeyModal.astro`
- Modify: `src/components/organisms/MemberList.astro`
- Modify: `src/pages/settings/index.astro`
- Modify: `src/pages/budget/categories/index.astro`
- Test: `src/__tests__/ui-style-consistency.test.ts`

**Step 1: Run current regression test**

Run: `bun test src/__tests__/ui-style-consistency.test.ts`
Expected: FAIL on button assertions.

**Step 2: Implement button radius changes**

- Replace `rounded-full` with `rounded-2xl` on actionable buttons.
- Keep intentionally circular non-action UI (status dots, avatars, progress markers) unchanged.

**Step 3: Implement border contrast fixes**

In button classes and button-like controls:

- Replace `border-accent/10` + `hover:border-accent/30` with stable accessible border classes.
- Prefer: `border-accent` for accent outline, or `border-base-300 hover:border-base-content/50` for neutral outlines.

Example target:

```astro
class="btn btn-outline border border-accent text-accent hover:bg-accent/10 hover:border-accent
rounded-2xl"
```

**Step 4: Re-run regression test**

Run: `bun test src/__tests__/ui-style-consistency.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/atoms/Button.astro src/components/molecules/TransactionEntryForm.astro src/components/molecules/ConfirmationModal.astro src/components/organisms/PaymentMethodFormModal.astro src/components/organisms/CategoryModal.astro src/components/organisms/AssetCategoryModal.astro src/components/organisms/AssetFormModal.astro src/components/organisms/AssetUpdateValueModal.astro src/components/organisms/InviteMemberModal.astro src/components/organisms/CopyBudgetModal.astro src/components/organisms/SetNewBudgetModal.astro src/components/organisms/GenerateApiKeyModal.astro src/components/organisms/MemberList.astro src/pages/settings/index.astro src/pages/budget/categories/index.astro
git commit -m "refactor(buttons): unify to rounded-2xl and improve border contrast"
```

---

### Task 5: Remove design-system drift from custom Tailwind shades

**Files:**

- Modify: `src/pages/assets/history/[id].astro`
- Modify: `src/pages/assets/history.astro`
- Modify: `src/pages/assets/edit/[id].astro`
- Modify: `src/pages/transactions/import.astro`
- Modify: `src/pages/transactions/export.astro`
- Modify: `src/components/atoms/CategoryIcon.astro`
- Test: `src/__tests__/ui-style-consistency.test.ts`

**Step 1: Write failing check for custom shade classes**

Run:

```bash
rg -n "\b(bg|text|border|ring|placeholder)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b" src/components src/pages --glob '!**/*.stories.ts' --glob '!**/*.test.ts'
```

Expected: Matches found.

**Step 2: Implement semantic replacements**

- Replace `text-neutral-500` / `text-neutral-600` with semantic equivalents (`text-base-content/60`, `text-base-content/70`) based on visual intent.
- Update docs/comments in `CategoryIcon.astro` to stop recommending Tailwind shade classes and use Daisy semantic classes.

**Step 3: Re-run shade check**

Run the same `rg` command.
Expected: No matches in app UI files.

**Step 4: Re-run style regression tests**

Run: `bun test src/__tests__/ui-style-consistency.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/pages/assets/history/[id].astro src/pages/assets/history.astro src/pages/assets/edit/[id].astro src/pages/transactions/import.astro src/pages/transactions/export.astro src/components/atoms/CategoryIcon.astro
git commit -m "refactor(ui): replace custom Tailwind shade usage with semantic classes"
```

---

### Task 6: Document standards and run full quality gates

**Files:**

- Modify: `design-system/03-forms.md`
- Modify: `design-system/02-components.md`
- Modify: `docs/plans/2026-02-06-input-button-consistency-accessibility-plan.md` (if implementation notes are needed)

**Step 1: Update docs with explicit standards**

Add standards:

- Form controls default radius: `rounded-lg`
- Action buttons default radius: `rounded-2xl`
- Border/accessibility rule: avoid low-opacity-only borders for interactive controls
- Exceptions list: circular indicators only (`rounded-full` for dots/avatars/progress markers)

**Step 2: Run targeted tests**

Run:

```bash
bun test src/lib/ui/controlStyles.test.ts
bun test src/__tests__/ui-style-consistency.test.ts
```

Expected: PASS.

**Step 3: Run mandatory quality gates**

Run:

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: All pass.

**Step 4: Final audit checks**

Run:

```bash
rg -n 'btn[^"\n]*rounded-full|rounded-full[^"\n]*btn' src/components src/pages --glob '!**/*.stories.ts' --glob '!**/*.test.ts'
rg -n '(input|select|textarea)[^"\n]*rounded-full|rounded-full[^"\n]*(input|select|textarea)|border-0' src/components src/pages --glob '!**/*.stories.ts' --glob '!**/*.test.ts'
```

Expected:

- First command returns only intentional circular non-action patterns (or no matches).
- Second command returns no form-control matches.

**Step 5: Commit docs + verification**

```bash
git add design-system/03-forms.md design-system/02-components.md
git commit -m "docs(design-system): codify control and button radius accessibility standards"
```
