# Consolidate Primary Actions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standardize page-level action hierarchy across all `ActionBar` consumers, reduce button overload, and clean up Accounts information architecture without changing business logic.

**Architecture:** Introduce a shared action hierarchy contract and selector utility, then migrate each `ActionBar` consumer to render primary/secondary/overflow consistently. Reuse one overflow menu primitive for accessibility and behavior parity. Apply Accounts-specific IA cleanup by simplifying group headers and consolidating row secondary actions behind a single overflow trigger.

**Tech Stack:** Astro 5, TypeScript, DaisyUI/Tailwind, Bun test runner (`bun:test`), Astro typecheck (`astro check`)

---

### Task 1: Add Shared Action Hierarchy Utility

**Files:**
- Create: `src/lib/ui/action-hierarchy.ts`
- Test: `src/lib/ui/action-hierarchy.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { partitionActionsForViewport } from './action-hierarchy';

describe('partitionActionsForViewport', () => {
  it('keeps up to 2 secondary actions on mobile and overflows the rest', () => {
    const result = partitionActionsForViewport(
      [
        { id: 'categories', label: 'Categories' },
        { id: 'import', label: 'Import' },
        { id: 'export', label: 'Export' },
      ],
      'mobile'
    );

    expect(result.visible.map((a) => a.id)).toEqual(['categories', 'import']);
    expect(result.overflow.map((a) => a.id)).toEqual(['export']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/ui/action-hierarchy.test.ts`
Expected: FAIL with module/function not found.

**Step 3: Write minimal implementation**

```ts
export type ActionViewport = 'mobile' | 'desktop';

export interface HierarchyAction {
  id: string;
  label: string;
}

const CAP_BY_VIEWPORT: Record<ActionViewport, number> = {
  mobile: 2,
  desktop: 3,
};

export function partitionActionsForViewport(actions: HierarchyAction[], viewport: ActionViewport) {
  const cap = CAP_BY_VIEWPORT[viewport];
  return {
    visible: actions.slice(0, cap),
    overflow: actions.slice(cap),
  };
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/lib/ui/action-hierarchy.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/ui/action-hierarchy.ts src/lib/ui/action-hierarchy.test.ts
git commit -m "feat(ui): add shared action hierarchy partition utility"
```

### Task 2: Add Overflow Menu Primitive

**Files:**
- Create: `src/components/molecules/ActionOverflowMenu.astro`
- Test: `src/__tests__/action-overflow-menu.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('ActionOverflowMenu', () => {
  it('includes consistent More trigger with menu semantics', () => {
    const content = readFileSync('src/components/molecules/ActionOverflowMenu.astro', 'utf8');
    expect(content).toContain('More');
    expect(content).toContain('aria-haspopup="menu"');
    expect(content).toContain('role="menu"');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/action-overflow-menu.test.ts`
Expected: FAIL because component file does not exist yet.

**Step 3: Write minimal implementation**

```astro
---
import { Ellipsis } from '@lucide/astro';

export interface OverflowAction {
  id: string;
  label: string;
  href?: string;
  disabled?: boolean;
  dataTestId?: string;
}

export interface Props {
  actions: OverflowAction[];
  triggerLabel?: string;
}

const { actions = [], triggerLabel = 'More' } = Astro.props;
---

<div class="dropdown dropdown-end" data-action-overflow>
  <button
    type="button"
    tabindex={0}
    class="btn btn-ghost btn-sm md:btn-md min-h-[44px] min-w-[44px] gap-2 rounded-lg md:rounded-xl"
    aria-label={triggerLabel}
    aria-haspopup="menu"
  >
    <Ellipsis size={16} class="stroke-current" aria-hidden="true" />
    <span class="text-xs md:text-sm">{triggerLabel}</span>
  </button>
  <ul tabindex={0} class="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-xl w-52 border border-base-300" role="menu">
    {actions.map((action) => (
      <li role="none">
        {action.href ? (
          <a href={action.href} role="menuitem" data-testid={action.dataTestId}>{action.label}</a>
        ) : (
          <button type="button" role="menuitem" disabled={action.disabled} data-action-id={action.id} data-testid={action.dataTestId}>{action.label}</button>
        )}
      </li>
    ))}
  </ul>
</div>
```

**Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/action-overflow-menu.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/molecules/ActionOverflowMenu.astro src/__tests__/action-overflow-menu.test.ts
git commit -m "feat(ui): add shared ActionOverflowMenu primitive"
```

### Task 3: Extend ActionBar for Secondary and Overflow Zones

**Files:**
- Modify: `src/components/molecules/ActionBar.astro`
- Test: `src/__tests__/action-bar-layout.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('ActionBar layout', () => {
  it('supports secondary-visible and overflow slots without requiring primary', () => {
    const content = readFileSync('src/components/molecules/ActionBar.astro', 'utf8');
    expect(content).toContain("Astro.slots.has('secondary-visible')");
    expect(content).toContain("Astro.slots.has('overflow')");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/action-bar-layout.test.ts`
Expected: FAIL because new slot checks do not exist.

**Step 3: Write minimal implementation**

```astro
const hasPrimary = Astro.slots.has('primary');
const hasSecondaryVisible = Astro.slots.has('secondary-visible') || Astro.slots.has('default');
const hasOverflow = Astro.slots.has('overflow');

// render order
// 1) primary
// 2) secondary-visible slot (fallback to default)
// 3) overflow slot
```

Keep backward compatibility by rendering `default` slot when `secondary-visible` is absent.

**Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/action-bar-layout.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/molecules/ActionBar.astro src/__tests__/action-bar-layout.test.ts
git commit -m "feat(ui): add explicit secondary and overflow zones to ActionBar"
```

### Task 4: Migrate Transactions Action Bar

**Files:**
- Modify: `src/components/molecules/TransactionActionsBar.astro`
- Test: `src/__tests__/transactions-action-hierarchy.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('Transactions action hierarchy', () => {
  it('removes Add Expense and Add Income from page action bar', () => {
    const content = readFileSync('src/components/molecules/TransactionActionsBar.astro', 'utf8');
    expect(content).not.toContain('data-add-expense-button');
    expect(content).not.toContain('data-add-income-button');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/transactions-action-hierarchy.test.ts`
Expected: FAIL because add buttons still exist.

**Step 3: Write minimal implementation**

- Remove Expense/Income buttons and listeners.
- Keep `Import CSV` and `Export CSV` visible secondary actions.
- Move `Scan Receipt` into shared `ActionOverflowMenu`.

```astro
<ActionBar ariaLabel="Transaction actions" edgeBleed>
  <div slot="secondary-visible">...</div>
  <ActionOverflowMenu slot="overflow" actions={[{ id: 'scan-receipt', label: 'Scan Receipt' }]} />
</ActionBar>
```

**Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/transactions-action-hierarchy.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/molecules/TransactionActionsBar.astro src/__tests__/transactions-action-hierarchy.test.ts
git commit -m "refactor(transactions): remove local add buttons and use overflow actions"
```

### Task 5: Migrate Accounts Top Action Bar

**Files:**
- Modify: `src/components/organisms/AccountActions.astro`
- Test: `src/__tests__/accounts-action-hierarchy.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('Accounts action hierarchy', () => {
  it('keeps New Account primary and overflows low-frequency actions', () => {
    const content = readFileSync('src/components/organisms/AccountActions.astro', 'utf8');
    expect(content).toContain('New Account');
    expect(content).toContain('ActionOverflowMenu');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/accounts-action-hierarchy.test.ts`
Expected: FAIL because overflow primitive not wired yet.

**Step 3: Write minimal implementation**

- Keep primary `New Account`.
- Visible secondary: `Categories`, `Transfer`, `Bulk`.
- Move `Closed` into overflow when present.
- Keep historical disabled state logic.

**Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/accounts-action-hierarchy.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/organisms/AccountActions.astro src/__tests__/accounts-action-hierarchy.test.ts
git commit -m "refactor(accounts): apply consistent action hierarchy in top action bar"
```

### Task 6: Migrate Budget Action Bar

**Files:**
- Modify: `src/components/molecules/BudgetActions.astro`
- Test: `src/__tests__/budget-action-hierarchy.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('Budget action hierarchy', () => {
  it('keeps categories/import/export visible and overflows advanced actions', () => {
    const content = readFileSync('src/components/molecules/BudgetActions.astro', 'utf8');
    expect(content).toContain('ActionOverflowMenu');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/budget-action-hierarchy.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

- Keep primary `New Budget`.
- Keep `Categories`, `Import`, `Export` visible.
- Move `Copy` and `Initialize All` into overflow list.
- Preserve existing modal trigger wiring via `data-*` hooks.

**Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/budget-action-hierarchy.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/molecules/BudgetActions.astro src/__tests__/budget-action-hierarchy.test.ts
git commit -m "refactor(budget): consolidate advanced actions under overflow menu"
```

### Task 7: Migrate Recurring and Category Page Action Bars

**Files:**
- Modify: `src/components/molecules/RecurringActionsBar.astro`
- Modify: `src/components/molecules/RecurringSectionActionBar.astro`
- Modify: `src/pages/budget/categories/index.astro`
- Modify: `src/pages/accounts/categories/index.astro`
- Test: `src/__tests__/global-action-bar-consistency.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('global action bar consistency', () => {
  it('wires all ActionBar consumers to consistent overflow semantics', () => {
    const recurring = readFileSync('src/components/molecules/RecurringActionsBar.astro', 'utf8');
    const budgetCategories = readFileSync('src/pages/budget/categories/index.astro', 'utf8');
    const accountCategories = readFileSync('src/pages/accounts/categories/index.astro', 'utf8');

    expect(recurring).toContain('ActionBar');
    expect(budgetCategories).toContain('ActionBar');
    expect(accountCategories).toContain('ActionBar');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/global-action-bar-consistency.test.ts`
Expected: FAIL once assertions include `ActionOverflowMenu` for pages with overflow.

**Step 3: Write minimal implementation**

- Ensure these consumers use same slot structure (`primary`, `secondary-visible`, `overflow` as needed).
- Keep pages without overflow clean (no forced empty menu).

**Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/global-action-bar-consistency.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/molecules/RecurringActionsBar.astro src/components/molecules/RecurringSectionActionBar.astro src/pages/budget/categories/index.astro src/pages/accounts/categories/index.astro src/__tests__/global-action-bar-consistency.test.ts
git commit -m "refactor(ui): align recurring and category action bars with shared hierarchy"
```

### Task 8: Simplify Accounts Group Header Copy

**Files:**
- Modify: `src/components/organisms/AccountGroupCard.astro`
- Test: `src/__tests__/accounts-group-header-ia.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('AccountGroupCard IA', () => {
  it('uses concise subtitle text and keeps info tooltip support', () => {
    const content = readFileSync('src/components/organisms/AccountGroupCard.astro', 'utf8');
    expect(content).toContain('Info');
    expect(content).not.toContain('Readily accessible cash — bank accounts, e-wallets, petty cash.');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/accounts-group-header-ia.test.ts`
Expected: FAIL because long description text still exists.

**Step 3: Write minimal implementation**

- Replace paragraph-like descriptive strings with shorter phrases.
- Keep tooltip for extended explanation.
- Preserve title format `X Accounts`.

**Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/accounts-group-header-ia.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/organisms/AccountGroupCard.astro src/__tests__/accounts-group-header-ia.test.ts
git commit -m "refactor(accounts): simplify group header copy for better scannability"
```

### Task 9: Consolidate Account Row Secondary Actions

**Files:**
- Modify: `src/components/molecules/AccountItemRow.astro`
- Test: `src/__tests__/account-row-actions-consolidation.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('Account row actions', () => {
  it('keeps update-balance inline and groups secondary actions under overflow', () => {
    const content = readFileSync('src/components/molecules/AccountItemRow.astro', 'utf8');
    expect(content).toContain('data-testid="account-update-value-btn"');
    expect(content).toContain('data-dropdown-menu');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/account-row-actions-consolidation.test.ts`
Expected: FAIL once assertion checks desktop standalone timeline button removal.

**Step 3: Write minimal implementation**

- Remove desktop standalone timeline icon button.
- Keep `Update Balance` inline.
- Keep one dropdown menu containing timeline/edit/deactivate for both breakpoints.
- Preserve existing `data-*` selectors for script compatibility.

**Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/account-row-actions-consolidation.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/molecules/AccountItemRow.astro src/__tests__/account-row-actions-consolidation.test.ts
git commit -m "refactor(accounts): consolidate row secondary actions into single overflow menu"
```

### Task 10: Update Existing Regression Suite References

**Files:**
- Modify: `src/__tests__/mobile-view-improvements.test.ts`
- Modify: any failing tests reported by `bun test`

**Step 1: Write/adjust failing assertions first**

Update assertions that reference removed transaction add buttons or old action layouts.

**Step 2: Run targeted tests to verify failures are resolved**

Run:
- `bun test src/__tests__/mobile-view-improvements.test.ts`
- `bun test src/__tests__/transactions-action-hierarchy.test.ts`
- `bun test src/__tests__/accounts-action-hierarchy.test.ts`
- `bun test src/__tests__/budget-action-hierarchy.test.ts`

Expected: PASS.

**Step 3: Commit**

```bash
git add src/__tests__/mobile-view-improvements.test.ts src/__tests__/*.test.ts
git commit -m "test(ui): update regression coverage for consolidated action hierarchy"
```

### Task 11: Full Verification Gates

**Files:**
- Modify only if gates fail.

**Step 1: Run test suite for touched areas**

Run: `bun test src/__tests__/mobile-view-improvements.test.ts src/__tests__/action-overflow-menu.test.ts src/__tests__/global-action-bar-consistency.test.ts`
Expected: PASS.

**Step 2: Run quality gates**

Run:
- `bun run lint:fix`
- `bun run stylelint:fix`
- `bun run format:fix`
- `bun run typecheck`
- `bun run build`

Expected: all PASS.

**Step 3: Commit final fixes if any**

```bash
git add -A
git commit -m "chore(ui): finalize action hierarchy refactor and verification fixes"
```

### Task 12: Browser Verification Checklist

**Files:**
- Create: `docs/tests/2026-03-05-consolidate-primary-actions.md`

**Step 1: Write manual QA checklist**

Include desktop + mobile checks for all six `ActionBar` consumer pages:

1. Visible action cap behavior.
2. Overflow contents.
3. Disabled historical-mode actions.
4. Transactions page has no local add-expense/add-income buttons.
5. Accounts row uses one inline quick action + overflow for secondary actions.

**Step 2: Commit**

```bash
git add docs/tests/2026-03-05-consolidate-primary-actions.md
git commit -m "test(manual): add browser QA checklist for consolidated primary actions"
```

## Notes for Executor

1. Keep stable `data-*` hooks where existing client scripts rely on them.
2. Use `ActionOverflowMenu` for page-level overflow; keep row-level overflow in `AccountItemRow` consistent with existing dropdown behavior.
3. Prefer incremental migration with passing tests after each task.
4. If any existing test conflicts with approved design decisions, update test intent to match the new UX contract.
