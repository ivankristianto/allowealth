# Mobile UI/UX Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve mobile UI/UX across MobileNavigation, SpendingCard, SpendingChart, RecentTransactionsList, and add date-grouped transaction lists.

**Architecture:** Component-level changes to 4 existing Astro components plus creation of a shared transaction-grouping utility. Service-layer change to pass "Other" category names to SpendingChart. All transaction list components adopt date-grouped rendering.

**Tech Stack:** Astro 5, Tailwind CSS v4, DaisyUI v5, @lucide/astro, bun:test

---

### Task 1: Transaction Grouping Utility (TDD)

**Files:**

- Create: `src/lib/utils/transaction-grouping.ts`
- Create: `src/lib/utils/transaction-grouping.test.ts`

**Step 1: Write the failing tests**

Create `src/lib/utils/transaction-grouping.test.ts`:

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { groupTransactionsByDate, type DateGroup } from './transaction-grouping';
import type { TransactionOutput } from '@/lib/types/transaction';

// Helper to create a minimal TransactionOutput for testing
function makeTx(
  overrides: Partial<TransactionOutput> & { transaction_date: Date }
): TransactionOutput {
  return {
    id: `tx-${Math.random().toString(36).slice(2, 8)}`,
    type: 'expense',
    amount: '50000',
    currency: 'IDR',
    description: 'Test transaction',
    transaction_date: overrides.transaction_date,
    updated_by_user_id: null,
    deleted_by_user_id: null,
    deleted_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    category: { id: 'cat-1', name: 'Food', type: 'expense', icon: 'utensils', color: 'bg-info' },
    asset: { id: 'asset-1', name: 'Cash', type: 'cash' },
    ...overrides,
  };
}

describe('groupTransactionsByDate', () => {
  // Fix "now" for deterministic tests
  let realDate: typeof Date;

  beforeEach(() => {
    realDate = globalThis.Date;
    const fixed = new Date(2026, 1, 13); // Feb 13, 2026
    globalThis.Date = class extends realDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(2026, 1, 13);
        } else {
          // @ts-expect-error - spread constructor args
          super(...args);
        }
      }
      static now() {
        return fixed.getTime();
      }
    } as any;
  });

  afterEach(() => {
    globalThis.Date = realDate;
  });

  test('returns empty array for empty input', () => {
    expect(groupTransactionsByDate([])).toEqual([]);
  });

  test('labels today correctly', () => {
    const tx = makeTx({ transaction_date: new Date(2026, 1, 13) });
    const groups = groupTransactionsByDate([tx]);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Today');
    expect(groups[0].dateKey).toBe('2026-02-13');
    expect(groups[0].transactions).toHaveLength(1);
  });

  test('labels yesterday correctly', () => {
    const tx = makeTx({ transaction_date: new Date(2026, 1, 12) });
    const groups = groupTransactionsByDate([tx]);
    expect(groups[0].label).toBe('Yesterday');
    expect(groups[0].dateKey).toBe('2026-02-12');
  });

  test('formats older dates as "d MMMM yyyy"', () => {
    const tx = makeTx({ transaction_date: new Date(2026, 1, 10) });
    const groups = groupTransactionsByDate([tx]);
    expect(groups[0].label).toBe('10 February 2026');
    expect(groups[0].dateKey).toBe('2026-02-10');
  });

  test('groups multiple transactions by date, ordered descending', () => {
    const txToday1 = makeTx({ id: 't1', transaction_date: new Date(2026, 1, 13) });
    const txToday2 = makeTx({ id: 't2', transaction_date: new Date(2026, 1, 13) });
    const txYesterday = makeTx({ id: 'y1', transaction_date: new Date(2026, 1, 12) });
    const txOld = makeTx({ id: 'o1', transaction_date: new Date(2026, 1, 9) });

    const groups = groupTransactionsByDate([txToday1, txYesterday, txToday2, txOld]);

    expect(groups).toHaveLength(3);
    expect(groups[0].label).toBe('Today');
    expect(groups[0].transactions).toHaveLength(2);
    expect(groups[1].label).toBe('Yesterday');
    expect(groups[1].transactions).toHaveLength(1);
    expect(groups[2].label).toBe('9 February 2026');
    expect(groups[2].transactions).toHaveLength(1);
  });

  test('preserves transaction order within same date group', () => {
    const tx1 = makeTx({ id: 'first', transaction_date: new Date(2026, 1, 13) });
    const tx2 = makeTx({ id: 'second', transaction_date: new Date(2026, 1, 13) });

    const groups = groupTransactionsByDate([tx1, tx2]);
    expect(groups[0].transactions[0].id).toBe('first');
    expect(groups[0].transactions[1].id).toBe('second');
  });

  test('handles string dates (ISO format)', () => {
    const tx = makeTx({ transaction_date: '2026-02-11' as any });
    const groups = groupTransactionsByDate([tx]);
    expect(groups[0].label).toBe('11 February 2026');
    expect(groups[0].dateKey).toBe('2026-02-11');
  });

  test('handles cross-year dates', () => {
    const tx = makeTx({ transaction_date: new Date(2025, 11, 25) });
    const groups = groupTransactionsByDate([tx]);
    expect(groups[0].label).toBe('25 December 2025');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/lib/utils/transaction-grouping.test.ts`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

Create `src/lib/utils/transaction-grouping.ts`:

```typescript
import type { TransactionOutput } from '@/lib/types/transaction';

export interface DateGroup {
  label: string;
  dateKey: string;
  transactions: TransactionOutput[];
}

/**
 * Parse a transaction_date (Date object or ISO string) to local date components.
 * Avoids timezone shift by parsing as local date.
 */
function parseLocalDate(dateStr: string | Date): { year: number; month: number; day: number } {
  if (dateStr instanceof Date) {
    return { year: dateStr.getFullYear(), month: dateStr.getMonth(), day: dateStr.getDate() };
  }
  const str = String(dateStr).split('T')[0];
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDateLabel(year: number, month: number, day: number): string {
  const now = new Date();
  const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
  const dateKey = toDateKey(year, month, day);

  if (dateKey === todayKey) return 'Today';

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayKey = toDateKey(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate()
  );
  if (dateKey === yesterdayKey) return 'Yesterday';

  const date = new Date(year, month, day);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Group transactions by date, ordered by date descending (most recent first).
 * Preserves original order of transactions within each date group.
 */
export function groupTransactionsByDate(transactions: TransactionOutput[]): DateGroup[] {
  if (transactions.length === 0) return [];

  const groupMap = new Map<string, { label: string; transactions: TransactionOutput[] }>();
  const dateOrder: string[] = [];

  for (const tx of transactions) {
    const { year, month, day } = parseLocalDate(tx.transaction_date);
    const key = toDateKey(year, month, day);

    if (!groupMap.has(key)) {
      groupMap.set(key, { label: formatDateLabel(year, month, day), transactions: [] });
      dateOrder.push(key);
    }
    groupMap.get(key)!.transactions.push(tx);
  }

  // Sort date keys descending
  dateOrder.sort((a, b) => b.localeCompare(a));

  return dateOrder.map((key) => ({
    dateKey: key,
    label: groupMap.get(key)!.label,
    transactions: groupMap.get(key)!.transactions,
  }));
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test src/lib/utils/transaction-grouping.test.ts`
Expected: All 8 tests PASS

**Step 5: Commit**

```bash
git add src/lib/utils/transaction-grouping.ts src/lib/utils/transaction-grouping.test.ts
git commit -m "feat: add transaction date-grouping utility with tests"
```

---

### Task 2: MobileNavigation Updates

**Files:**

- Modify: `src/components/layouts/MobileNavigation.astro`

**Step 1: Apply all MobileNavigation changes**

In `src/components/layouts/MobileNavigation.astro`:

1. **Import change** (line 15): Replace `Receipt` with `ArrowLeftRight`

   ```typescript
   import { ArrowLeftRight, Wallet, Plus, Donut, ChartBar } from '@lucide/astro';
   ```

2. **Label + icon change** (line 30): Change `Activity` to `Transactions`, icon to `ArrowLeftRight`

   ```typescript
   { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
   ```

3. **FAB rounded** (line 97): Change `rounded-2xl` to `rounded-full`

4. **Nav height reduction** (line 49): Change `h-14` to `h-12`

5. **Padding reduction** (line 45): Change `pt-3` to `pt-2`

6. **Stronger border/shadow** (line 45):
   - `border-base-300/50` → `border-base-300`
   - `shadow-[0_-10px_40px_rgba(0,0,0,0.05)]` → `shadow-[0_-8px_30px_rgba(0,0,0,0.12)]`

7. **Sentence case** (lines 81, 139): Remove `uppercase` from the `<span>` class for label text

**Step 2: Run quality checks**

Run: `bun run typecheck`
Expected: 0 errors

**Step 3: Visual verification in Chrome**

Open `http://mobile-view-improvements.expenses.local:4322/dashboard` in iPhone 12 Pro viewport. Verify:

- "Transactions" label with arrow icon
- Fully rounded FAB
- Reduced nav height
- Stronger top border/shadow
- Sentence case labels

**Step 4: Commit**

```bash
git add src/components/layouts/MobileNavigation.astro
git commit -m "feat(mobile): update MobileNavigation - rename Activity, rounded FAB, reduced height, stronger border, sentence case"
```

---

### Task 3: SpendingCard Updates

**Files:**

- Modify: `src/components/organisms/SpendingCard.astro`
- Modify: `src/pages/dashboard.astro` (remove alertMessage prop)

**Step 1: Apply all SpendingCard changes**

In `src/components/organisms/SpendingCard.astro`:

1. **Remove unused imports** (lines 23-24, 29): Remove `getStatusBadgeClasses` from import, remove `BudgetAlertBanner` import

2. **Remove unused Props** (line 40): Remove `alertMessage?: string` from Props interface

3. **Remove alertMessage destructure** (line 51): Remove `alertMessage` from destructured props

4. **Change label** (line 171): `MONTHLY EXPENSES` → `Expenses`

5. **Remove percentage pill** (lines 186-188): Delete the `<span>` with `getStatusBadgeClasses(status)` showing `{percentageRounded}% used`

6. **Remove BudgetAlertBanner** (lines 205-211): Delete the `{alertMessage && (<BudgetAlertBanner .../>)}` block

7. **Income/Net Savings responsive grid** (line 216): Change `grid grid-cols-2 gap-4` to `grid grid-cols-1 @xs:grid-cols-2 gap-4`

In `src/pages/dashboard.astro`:

8. **Remove alertMessage prop** (lines 172-177): Remove the `alertMessage={...}` prop from the `<SpendingCard>` component

**Step 2: Run quality checks**

Run: `bun run typecheck`
Expected: 0 errors

**Step 3: Visual verification in Chrome**

Open dashboard in iPhone 12 Pro viewport. Verify:

- "Expenses" label (not "MONTHLY EXPENSES")
- No percentage pill badge
- No budget alert banner
- Income and Net Savings stack vertically on narrow mobile
- Income and Net Savings side-by-side on wider screens

**Step 4: Commit**

```bash
git add src/components/organisms/SpendingCard.astro src/pages/dashboard.astro
git commit -m "feat(mobile): simplify SpendingCard - remove pill, alert banner, stack income on mobile"
```

---

### Task 4: SpendingChart Header + "Other" Tooltip

**Files:**

- Modify: `src/components/organisms/SpendingChart.astro`
- Modify: `src/services/dashboard.service.ts` (add otherCategoryNames to TopCategoryExpense)
- Modify: `src/pages/dashboard.astro` (pass otherCategoryNames to SpendingChart)

**Step 1: Add `otherCategoryNames` to service layer**

In `src/services/dashboard.service.ts`:

1. **Extend TopCategoryExpense** (line 68-73): Add optional field

   ```typescript
   export interface TopCategoryExpense {
     category: string;
     percentage: number;
     color: string;
     amount: string;
     otherCategoryNames?: string[];
   }
   ```

2. **Populate in processTopCategories** (around line 706): Add names array when building "Other"
   ```typescript
   result.push({
     category: 'Other',
     percentage: otherPercentage,
     color: '#6b7280',
     amount: otherTotal.toString(),
     otherCategoryNames: otherCategories.map((cat: any) => cat.category_name),
   });
   ```

**Step 2: Pass data through dashboard page**

In `src/pages/dashboard.astro` (around line 132-138): Include otherCategoryNames

```typescript
const spendingCategories =
  dashboardData?.topCategoryExpenses.map((cat) => ({
    category: cat.category,
    percentage: cat.percentage,
    color: cat.color,
    otherCategoryNames: cat.otherCategoryNames,
  })) ?? [];
```

**Step 3: Update SpendingChart component**

In `src/components/organisms/SpendingChart.astro`:

1. **Update SpendingCategory interface** (line 21-25): Add optional `otherCategoryNames`

   ```typescript
   export interface SpendingCategory {
     category: string;
     percentage: number;
     color?: string;
     otherCategoryNames?: string[];
   }
   ```

2. **Add `Info` import** (line 18 area): Add to lucide imports or add new import

   ```typescript
   import { Info } from '@lucide/astro';
   ```

3. **Simplify header** (lines 77-81): Replace both lines with single heading

   ```astro
   <h4 class="font-bold text-xl text-base-content leading-none tracking-tight">
     Most spending categories
   </h4>
   ```

   Remove the `<StatLabel>` line beneath. Also remove `StatLabel` import if unused elsewhere in file.

4. **Update aria-label** (line 72): Change to `aria-label="Most spending categories"`

5. **Add info icon to "Other" legend item** (inside the legend item loop, around line 154-178): After the category name `<span>`, conditionally render an info icon with tooltip when `item.category === 'Other'` and `item.otherCategoryNames` exists.

   Replace the existing legend item button content to add tooltip for "Other":

   ```astro
   <div class="flex items-center gap-2 @xs:gap-3">
     <div
       class="w-3 h-3 @xs:w-3.5 @xs:h-3.5 rounded-md @xs:rounded-lg shadow-sm shrink-0"
       style={`background-color: ${item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}`}
       aria-hidden="true"
     >
     </div>
     <span
       class="text-sm @xs:text-base font-semibold text-base-content tracking-tight truncate max-w-[140px] @xs:max-w-[200px]"
       title={item.category}
     >
       {item.category}
     </span>
     {
       item.category === 'Other' &&
         item.otherCategoryNames &&
         item.otherCategoryNames.length > 0 && (
           <div
             class="tooltip tooltip-top"
             data-tip={`Includes: ${item.otherCategoryNames.join(', ')}`}
           >
             <Info
               size={14}
               class="stroke-current text-base-content/40 shrink-0"
               aria-hidden="true"
             />
           </div>
         )
     }
   </div>
   ```

   Also serialize `otherCategoryNames` into the data attribute so the client script can use it if needed.

**Step 4: Run quality checks**

Run: `bun run typecheck`
Expected: 0 errors

**Step 5: Visual verification in Chrome**

Open dashboard. Verify:

- "Most spending categories" heading (no subtitle)
- If "Other" category exists, info icon appears next to it
- Hover/tap shows tooltip with combined category names

**Step 6: Commit**

```bash
git add src/services/dashboard.service.ts src/pages/dashboard.astro src/components/organisms/SpendingChart.astro
git commit -m "feat(mobile): simplify SpendingChart header, add Other category tooltip"
```

---

### Task 5: RecentTransactionsList Heading + Card Layout

**Files:**

- Modify: `src/components/molecules/RecentTransactionsList.astro`

**Step 1: Update heading and move inside card**

In `src/components/molecules/RecentTransactionsList.astro`:

1. **Change wrapper structure**: Remove the outer `space-y-5` div's heading section. Move heading inside the Card.

2. **New structure** — replace the entire component markup (from line 38 to end of template):

```astro
<div class={className} data-recent-transactions-list data-testid="recent-transactions">
  <Card rounded="card-lg" padding="sm" className="p-0 overflow-hidden shadow-sm">
    {/* Header inside card */}
    <div class="flex items-center justify-between p-5 pb-0">
      <h2 class="text-lg font-bold tracking-tight leading-none">Recent transactions</h2>
      {
        !loading && transactions.length > 0 && (
          <a
            href={viewAllUrl}
            class="btn btn-outline btn-sm text-accent border-accent/20 hover:bg-accent/5 rounded-xl tracking-wide"
            aria-label="View all transactions"
          >
            View all
          </a>
        )
      }
    </div>

    {
      loading ? (
        <div
          class="divide-y divide-base-200"
          role="status"
          aria-live="polite"
          aria-label="Loading recent transactions"
        >
          {Array.from({ length: 10 }).map(() => (
            <div class="flex items-center gap-5 p-5">
              <Skeleton variant="rectangular" width="48px" height="48px" className="rounded-2xl" />
              <div class="flex-1 space-y-2">
                <Skeleton variant="rectangular" width="75%" height="16px" />
                <Skeleton variant="rectangular" width="50%" height="12px" />
              </div>
              <div class="w-24 space-y-2">
                <Skeleton variant="rectangular" width="100%" height="16px" />
                <Skeleton variant="rectangular" width="100%" height="12px" />
              </div>
            </div>
          ))}
        </div>
      ) : displayTransactions.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          message="Start tracking by adding your first expense or income transaction."
          iconName="plus"
          actionLabel="Add Transaction"
          actionHref="/transactions/add"
          variant="compact"
        />
      ) : (
        <ul class="divide-y divide-base-200" role="list" aria-label="Recent transactions">
          {displayTransactions.map((transaction) => (
            <li>
              <TransactionCard transaction={transaction} showActions={false} />
            </li>
          ))}
        </ul>
      )
    }
  </Card>
</div>
```

**Step 2: Run quality checks**

Run: `bun run typecheck`
Expected: 0 errors

**Step 3: Visual verification**

Verify heading is inside the card with proper spacing.

**Step 4: Commit**

```bash
git add src/components/molecules/RecentTransactionsList.astro
git commit -m "feat(mobile): update RecentTransactionsList - rename heading, move inside card"
```

---

### Task 6: Date-Grouped RecentTransactionsList

**Files:**

- Modify: `src/components/molecules/RecentTransactionsList.astro`

**Step 1: Add date grouping to RecentTransactionsList**

1. **Add import** at top of frontmatter:

   ```typescript
   import { groupTransactionsByDate } from '@/lib/utils/transaction-grouping';
   ```

2. **Group transactions** after `displayTransactions`:

   ```typescript
   const dateGroups = groupTransactionsByDate(displayTransactions);
   ```

3. **Replace the flat `<ul>` with grouped rendering**:

```astro
<div role="list" aria-label="Recent transactions">
  {
    dateGroups.map((group) => (
      <div role="group" aria-label={`Transactions from ${group.label}`}>
        <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wide py-2 px-4 bg-base-200/30">
          {group.label}
        </div>
        <ul class="divide-y divide-base-200" role="list">
          {group.transactions.map((transaction) => (
            <li>
              <TransactionCard transaction={transaction} showActions={false} />
            </li>
          ))}
        </ul>
      </div>
    ))
  }
</div>
```

**Step 2: Run quality checks**

Run: `bun run typecheck`
Expected: 0 errors

**Step 3: Visual verification**

Verify date group headers appear between transaction groups.

**Step 4: Commit**

```bash
git add src/components/molecules/RecentTransactionsList.astro
git commit -m "feat: add date-grouped layout to RecentTransactionsList"
```

---

### Task 7: Date-Grouped TransactionList

**Files:**

- Modify: `src/components/organisms/TransactionList.astro`

**Step 1: Add date grouping to TransactionList**

1. **Add import** at top of frontmatter:

   ```typescript
   import { groupTransactionsByDate } from '@/lib/utils/transaction-grouping';
   ```

2. **Group transactions** in frontmatter:

   ```typescript
   const dateGroups = groupTransactionsByDate(transactions);
   ```

3. **Replace flat transaction list** (around lines 168-172). Replace:
   ```astro
   <div class="divide-y divide-base-200">
     {
       transactions.map((transaction) => (
         <TransactionCard transaction={transaction} showActions={true} />
       ))
     }
   </div>
   ```
   With:
   ```astro
   <div>
     {
       dateGroups.map((group) => (
         <div role="group" aria-label={`Transactions from ${group.label}`}>
           <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wide py-2 px-4 md:px-6 bg-base-200/30 border-b border-base-200">
             {group.label}
           </div>
           <div class="divide-y divide-base-200">
             {group.transactions.map((transaction) => (
               <TransactionCard transaction={transaction} showActions={true} />
             ))}
           </div>
         </div>
       ))
     }
   </div>
   ```

**Step 2: Run quality checks**

Run: `bun run typecheck`
Expected: 0 errors

**Step 3: Visual verification**

Navigate to `/transactions` and verify date groups.

**Step 4: Commit**

```bash
git add src/components/organisms/TransactionList.astro
git commit -m "feat: add date-grouped layout to TransactionList"
```

---

### Task 8: Date-Grouped Partials

**Files:**

- Modify: `src/components/partials/TransactionListPartial.astro`
- Modify: `src/components/partials/CategoryTransactionListPartial.astro`

**Step 1: Update TransactionListPartial**

In `src/components/partials/TransactionListPartial.astro`:

1. **Add import**:

   ```typescript
   import { groupTransactionsByDate } from '@/lib/utils/transaction-grouping';
   ```

2. **Group transactions**:

   ```typescript
   const dateGroups = groupTransactionsByDate(transactions);
   ```

3. **Replace flat list rendering** with grouped rendering (keep existing empty state else branch):

   <!-- prettier-ignore -->
   ```astro
   {
     transactions.length > 0 ? (
       dateGroups.map((group) => (
         <div role="group" aria-label={`Transactions from ${group.label}`}>
           <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wide py-2 px-4 bg-base-200/30 border-b border-base-200">
             {group.label}
           </div>
           <div class="divide-y divide-base-200">
             {group.transactions.map((transaction) => (
               <TransactionCard transaction={transaction} showActions={showActions} />
             ))}
           </div>
         </div>
       ))
     ) : ( /* ...existing empty state unchanged... */ )
   }
   ```

**Step 2: Update CategoryTransactionListPartial**

In `src/components/partials/CategoryTransactionListPartial.astro`:

1. **Add import**:

   ```typescript
   import { groupTransactionsByDate } from '@/lib/utils/transaction-grouping';
   ```

2. **Group transactions**:

   ```typescript
   const dateGroups = groupTransactionsByDate(transactions);
   ```

3. **Replace flat list** with grouped rendering (keep existing empty state else branch):

   <!-- prettier-ignore -->
   ```astro
   {
     transactions.length > 0 ? (
       <div class="space-y-1">
         {dateGroups.map((group) => (
           <div role="group" aria-label={`Transactions from ${group.label}`}>
             <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wide py-2 px-4 bg-base-200/30 rounded-lg">
               {group.label}
             </div>
             <div class="space-y-1">
               {group.transactions.map((transaction) => (
                 <TransactionCard transaction={transaction} showActions={false} />
               ))}
             </div>
           </div>
         ))}
       </div>
     ) : ( /* ...existing empty state unchanged... */ )
   }
   ```

**Step 3: Run quality checks**

Run: `bun run typecheck`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/components/partials/TransactionListPartial.astro src/components/partials/CategoryTransactionListPartial.astro
git commit -m "feat: add date-grouped layout to transaction partials"
```

---

### Task 9: Final Quality Gates + Build Verification

**Step 1: Run full quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

All must pass.

**Step 2: Run unit tests**

```bash
bun test src/lib/utils/transaction-grouping.test.ts
```

Expected: All tests pass.

**Step 3: Run build**

```bash
bun run build
```

Expected: Build succeeds with no errors.

**Step 4: Full visual verification in Chrome (iPhone 12 Pro)**

Verify all changes on:

- `/dashboard` — MobileNavigation, SpendingCard, SpendingChart, RecentTransactionsList
- `/transactions` — TransactionList with date groups

**Step 5: Commit any auto-fixes from linters**

```bash
git add -A && git status
# If changes: git commit -m "style: apply linter auto-fixes"
```
