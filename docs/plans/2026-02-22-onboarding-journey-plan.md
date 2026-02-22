# Onboarding Journey Wizard — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 5-step onboarding checklist with a full-page guided wizard that teaches the envelope budgeting mental model.

**Architecture:** Server-rendered Astro wizard at `/onboarding` with 5 steps. Each step is a form that POSTs to existing APIs. Step 4 (budget allocation) has a client script for real-time updates. View Transitions handle smooth navigation. Dashboard redirects to `/onboarding` when incomplete.

**Tech Stack:** Astro 5 server components, DaisyUI v5, existing services (WorkspaceMetaService, AccountService, BudgetService, TransactionService, CategoryService), client script for step 4 interactivity.

**Design Doc:** `docs/plans/2026-02-22-onboarding-journey-design.md`

---

## Task 1: Add `monthly_income` workspace meta key

**Files:**

- Modify: `src/lib/constants/workspace-meta-keys.ts`
- Modify: `src/services/workspace-meta.service.ts`

**Step 1: Add key to constants**

In `src/lib/constants/workspace-meta-keys.ts`, add `MONTHLY_INCOME` to the WORKSPACE_META_KEYS object (line 17), add its default to WORKSPACE_META_DEFAULTS (line 32), and extend the WorkspaceSettings interface (line 60):

```typescript
// In WORKSPACE_META_KEYS (line 13-18):
export const WORKSPACE_META_KEYS = {
  CURRENCY: 'currency',
  SECONDARY_CURRENCY: 'secondary_currency',
  WEEK_START: 'week_start',
  COMPACT_NUMBERS: 'compact_numbers',
  MONTHLY_INCOME: 'monthly_income',
} as const;

// In WORKSPACE_META_DEFAULTS (line 28-33):
export const WORKSPACE_META_DEFAULTS: Record<WorkspaceMetaKey, string> = {
  [WORKSPACE_META_KEYS.CURRENCY]: DEFAULT_CURRENCY,
  [WORKSPACE_META_KEYS.SECONDARY_CURRENCY]: '',
  [WORKSPACE_META_KEYS.WEEK_START]: 'monday',
  [WORKSPACE_META_KEYS.COMPACT_NUMBERS]: 'true',
  [WORKSPACE_META_KEYS.MONTHLY_INCOME]: '',
};

// In WorkspaceSettings interface (line 56-61):
export interface WorkspaceSettings {
  currency: Currency;
  secondaryCurrency: Currency | '';
  weekStart: WeekStart;
  compactNumbers: boolean;
  monthlyIncome: string;
}

// In DEFAULT_WORKSPACE_SETTINGS (line 66-71):
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  currency: DEFAULT_CURRENCY,
  secondaryCurrency: '',
  weekStart: 'monday',
  compactNumbers: true,
  monthlyIncome: '',
};
```

**Step 2: Add validation in service**

In `src/services/workspace-meta.service.ts`, add a validation case for `monthly_income` in `validateMetaValue()` (after line 97):

```typescript
case WORKSPACE_META_KEYS.MONTHLY_INCOME:
  // JSON string of { currency: amount } pairs, e.g. {"IDR":"10000000"}
  // Empty string is valid (unset)
  if (value.length > 0) {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Monthly income must be a JSON object');
      }
    } catch {
      throw new Error('Monthly income must be valid JSON');
    }
  }
  break;
```

Then add getter/setter methods to the `WorkspaceMetaService` class. Find `getCompactNumbers` method and add after it:

```typescript
async getMonthlyIncome(workspaceId: string): Promise<Record<string, string>> {
  const value = await this.get(workspaceId, WORKSPACE_META_KEYS.MONTHLY_INCOME);
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

async setMonthlyIncome(workspaceId: string, income: Record<string, string>): Promise<void> {
  await this.set(workspaceId, WORKSPACE_META_KEYS.MONTHLY_INCOME, JSON.stringify(income));
}
```

Also update `getSettings()` to include `monthlyIncome`. Find the method and add:

```typescript
monthlyIncome: rawSettings[WORKSPACE_META_KEYS.MONTHLY_INCOME] ?? '',
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (or only pre-existing errors)

**Step 4: Commit**

```bash
git add src/lib/constants/workspace-meta-keys.ts src/services/workspace-meta.service.ts
git commit -m "feat(onboarding): add monthly_income workspace meta key"
```

---

## Task 2: Add default expense categories constant + seeding service method

New users have zero expense categories. The onboarding wizard needs to auto-create a set of common defaults.

**Files:**

- Create: `src/lib/constants/default-categories.ts`
- Modify: `src/services/category.service.ts`

**Step 1: Create default categories constant**

Create `src/lib/constants/default-categories.ts`:

```typescript
/**
 * Default expense categories for onboarding.
 * Created automatically when a new user goes through the onboarding wizard
 * and has no expense categories yet.
 */
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food & Groceries', icon: 'utensils', color: 'bg-orange-500', budgetPercent: 20 },
  { name: 'Housing', icon: 'home', color: 'bg-blue-500', budgetPercent: 30 },
  { name: 'Transportation', icon: 'car', color: 'bg-yellow-500', budgetPercent: 10 },
  { name: 'Utilities', icon: 'zap', color: 'bg-purple-500', budgetPercent: 5 },
  { name: 'Entertainment', icon: 'tv', color: 'bg-pink-500', budgetPercent: 5 },
  { name: 'Savings', icon: 'piggy-bank', color: 'bg-emerald-500', budgetPercent: 15 },
  { name: 'Health', icon: 'heart-pulse', color: 'bg-red-500', budgetPercent: 5 },
  { name: 'Personal', icon: 'user', color: 'bg-indigo-500', budgetPercent: 10 },
] as const;

export type DefaultExpenseCategory = (typeof DEFAULT_EXPENSE_CATEGORIES)[number];
```

**Step 2: Add seedDefaultExpenseCategories to CategoryService**

In `src/services/category.service.ts`, add a method to seed default expense categories:

```typescript
/**
 * Seed default expense categories for onboarding.
 * Idempotent — skips if any expense categories already exist.
 * Returns the created category IDs mapped by name.
 */
async seedDefaultExpenseCategories(
  workspaceId: string,
  userId: string
): Promise<Map<string, string>> {
  const { DEFAULT_EXPENSE_CATEGORIES } = await import('@/lib/constants/default-categories');

  // Idempotency: skip if any expense categories exist
  const existing = await this.db.query.categories.findFirst({
    where: and(
      eq(this.schema.categories.workspace_id, workspaceId),
      eq(this.schema.categories.type, 'expense'),
      eq(this.schema.categories.is_active, true)
    ),
    columns: { id: true },
  });

  if (existing) {
    // Return existing categories mapped by name
    const all = await this.findAll(workspaceId, { type: 'expense' });
    const map = new Map<string, string>();
    for (const cat of all) {
      map.set(cat.name, cat.id);
    }
    return map;
  }

  const now = new Date();
  const categoryMap = new Map<string, string>();

  for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
    const id = nanoid();
    await this.db.insert(this.schema.categories).values({
      id,
      workspace_id: workspaceId,
      created_by_user_id: userId,
      name: cat.name,
      type: 'expense',
      icon: cat.icon,
      color: cat.color,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
    categoryMap.set(cat.name, id);
  }

  // Invalidate cache
  const { getCacheManager, CacheTags } = await import('@/lib/cache');
  const cache = getCacheManager();
  await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.CATEGORIES]);

  return categoryMap;
}
```

Add the required imports at the top of `category.service.ts`: `nanoid`, `and`, `eq` (check if already imported).

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/constants/default-categories.ts src/services/category.service.ts
git commit -m "feat(onboarding): add default expense categories for onboarding seeding"
```

---

## Task 3: Update OnboardingStatus to include `income`

**Files:**

- Modify: `src/services/workspace.service.ts:55-316`
- Modify: `src/services/__tests__/onboarding-status.test.ts`

**Step 1: Update the OnboardingStatus interface**

In `src/services/workspace.service.ts`, add `income` to the OnboardingStatus interface (line 55-61):

```typescript
export interface OnboardingStatus {
  currency: boolean;
  categories: boolean;
  budgets: boolean;
  accounts: boolean;
  transactions: boolean;
  income: boolean;
}
```

**Step 2: Add income check to getOnboardingStatus**

In `getOnboardingStatus()` (line 259), add a 6th parallel query for the `monthly_income` meta key. Add it to the destructured result and to the return object:

```typescript
async getOnboardingStatus(workspaceId: string): Promise<OnboardingStatus> {
  const [currencyMeta, expenseCategory, nonZeroBudget, account, transaction, incomeMeta] = await Promise.all([
    // ... existing 5 queries unchanged ...

    // 6. Income: workspace meta has a monthly_income entry with non-empty value
    this.db.query.workspaceMeta.findFirst({
      where: and(
        eq(this.schema.workspaceMeta.workspace_id, workspaceId),
        eq(this.schema.workspaceMeta.meta_key, 'monthly_income'),
        sql`LENGTH(${this.schema.workspaceMeta.meta_value}) > 2`
      ),
      columns: { id: true },
    }),
  ]);

  return {
    currency: !!currencyMeta,
    categories: !!expenseCategory,
    budgets: !!nonZeroBudget,
    accounts: !!account,
    transactions: !!transaction,
    income: !!incomeMeta,
  };
}
```

The `LENGTH > 2` check ensures empty JSON objects `{}` don't count as set.

**Step 3: Update tests**

In `src/services/__tests__/onboarding-status.test.ts`, update all tests:

1. Add `expect(status.income).toBe(false)` to the "all false" test
2. Add a new test for income detection:

```typescript
it('should detect income as set when monthly_income meta exists with content', async () => {
  // Currency, categories, budgets, accounts, transactions not set
  (mockDb.query.workspaceMeta.findFirst as any)
    .mockResolvedValueOnce(undefined) // currency
    .mockResolvedValueOnce(undefined); // income (6th query)
  (mockDb.query.categories.findFirst as any).mockResolvedValueOnce(undefined);
  (mockDb.query.budgets.findFirst as any).mockResolvedValueOnce(undefined);
  (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(undefined);
  (mockDb.query.transactions.findFirst as any).mockResolvedValueOnce(undefined);

  const status = await workspaceService.getOnboardingStatus('workspace-1');
  expect(status.income).toBe(false);
});
```

3. Update the "all true" test to include income mock and assertion.

Note: The mock setup for `workspaceMeta.findFirst` now needs 2 calls (currency + income) since both query the same table. Adjust mock resolution order accordingly in ALL existing tests.

**Step 4: Run tests**

Run: `bun test src/services/__tests__/onboarding-status.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/workspace.service.ts src/services/__tests__/onboarding-status.test.ts
git commit -m "feat(onboarding): add income to OnboardingStatus"
```

---

## Task 4: Add `/onboarding` route guard + dashboard redirect

**Files:**

- Modify: `src/middleware/route-guard.ts`
- Modify: `src/pages/dashboard.astro`

**Step 1: Add `/onboarding` to protected routes**

In `src/middleware/route-guard.ts`, add `/onboarding` to `PROTECTED_PREFIXES` (line 13):

```typescript
const PROTECTED_PREFIXES = [
  '/admin',
  '/dashboard',
  '/onboarding',
  '/transactions',
  // ... rest unchanged
] as const;
```

**Step 2: Add dashboard redirect**

In `src/pages/dashboard.astro`, after the onboarding status check (around line 74-79), add a redirect:

```typescript
// After computing isOnboardingComplete (line 74-79):
if (!isOnboardingComplete) {
  return Astro.redirect('/onboarding', 302);
}
```

This replaces the existing pattern of showing OnboardingChecklist inline on the dashboard.

**Step 3: Remove OnboardingChecklist from dashboard**

In `src/pages/dashboard.astro`:

- Remove the `OnboardingChecklist` import (line 29)
- Remove the `OnboardingChecklist` rendering in the template (the conditional block that shows it when `!isOnboardingComplete`)
- Remove `onboardingStatus` variable usage in the template
- Keep the `workspaceService.getOnboardingStatus()` call since we need it for the redirect check

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/middleware/route-guard.ts src/pages/dashboard.astro
git commit -m "feat(onboarding): redirect incomplete users from dashboard to /onboarding"
```

---

## Task 5: Create OnboardingProgress component

**Files:**

- Create: `src/components/organisms/onboarding/OnboardingProgress.astro`

**Step 1: Create the progress component**

Create `src/components/organisms/onboarding/OnboardingProgress.astro`:

```astro
---
/**
 * OnboardingProgress Component
 *
 * Progress indicator for the onboarding wizard.
 * Shows current step number, title, and visual progress bar.
 */

export interface Props {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
}

const { currentStep, totalSteps, stepTitle } = Astro.props;
const progressPercent = (currentStep / totalSteps) * 100;
---

<div class="mb-8">
  <div class="flex items-center justify-between mb-2">
    <span class="text-sm font-medium text-base-content/60">
      Step {currentStep} of {totalSteps}
    </span>
    <span class="text-sm font-medium text-base-content/60">
      {Math.round(progressPercent)}%
    </span>
  </div>
  <div class="w-full bg-base-200 rounded-full h-2">
    <div
      class="bg-primary rounded-full h-2 transition-all duration-500"
      style={`width: ${progressPercent}%`}
    >
    </div>
  </div>
  <h1 class="text-2xl font-bold text-base-content mt-6">{stepTitle}</h1>
</div>
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/organisms/onboarding/OnboardingProgress.astro
git commit -m "feat(onboarding): add OnboardingProgress component"
```

---

## Task 6: Create Step 1 — Currency selection

**Files:**

- Create: `src/components/organisms/onboarding/StepCurrency.astro`

**Step 1: Create the component**

Create `src/components/organisms/onboarding/StepCurrency.astro`:

```astro
---
/**
 * StepCurrency — Onboarding Step 1
 *
 * Currency selection for the workspace.
 * Primary currency is required, secondary is optional.
 */

import { CURRENCY_OPTIONS, CURRENCY_META } from '@/lib/constants/currency';

export interface Props {
  currentCurrency?: string;
  currentSecondaryCurrency?: string;
}

const { currentCurrency, currentSecondaryCurrency } = Astro.props;
---

<div class="space-y-6">
  <p class="text-base-content/70">
    Everything in Allowealth is organized by currency. Pick the one you use most — you can add a
    second one too.
  </p>

  <form id="onboarding-currency-form" class="space-y-4">
    {/* Primary currency */}
    <div class="form-control w-full">
      <label class="label" for="primary-currency">
        <span class="label-text font-medium">Primary currency</span>
        <span class="label-text-alt text-error">Required</span>
      </label>
      <select id="primary-currency" name="currency" class="select select-bordered w-full" required>
        {
          CURRENCY_OPTIONS.map((opt) => (
            <option value={opt.value} selected={opt.value === currentCurrency}>
              {CURRENCY_META[opt.value].flagEmoji} {opt.label}
            </option>
          ))
        }
      </select>
    </div>

    {/* Secondary currency toggle */}
    <div class="form-control">
      <label class="label cursor-pointer justify-start gap-3" for="use-secondary">
        <input
          type="checkbox"
          id="use-secondary"
          class="checkbox checkbox-sm"
          checked={!!currentSecondaryCurrency}
          data-onboarding-secondary-toggle
        />
        <span class="label-text">I also use a second currency</span>
      </label>
    </div>

    {/* Secondary currency (hidden by default) */}
    <div
      id="secondary-currency-container"
      class:list={['form-control w-full', !currentSecondaryCurrency && 'hidden']}
    >
      <label class="label" for="secondary-currency">
        <span class="label-text font-medium">Secondary currency</span>
      </label>
      <select
        id="secondary-currency"
        name="secondaryCurrency"
        class="select select-bordered w-full"
      >
        <option value="">— None —</option>
        {
          CURRENCY_OPTIONS.map((opt) => (
            <option value={opt.value} selected={opt.value === currentSecondaryCurrency}>
              {CURRENCY_META[opt.value].flagEmoji} {opt.label}
            </option>
          ))
        }
      </select>
    </div>

    {/* Error display */}
    <div id="currency-error" class="text-error text-sm hidden" role="alert"></div>

    {/* Submit */}
    <div class="flex justify-end pt-4">
      <button type="submit" class="btn btn-primary">
        Continue
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg
        >
      </button>
    </div>
  </form>
</div>

<script>
  import { csrfFetch } from '@/lib/csrf-client';

  function initStepCurrency() {
    const form = document.getElementById('onboarding-currency-form') as HTMLFormElement | null;
    const toggle = document.querySelector(
      '[data-onboarding-secondary-toggle]'
    ) as HTMLInputElement | null;
    const container = document.getElementById('secondary-currency-container');
    const errorDiv = document.getElementById('currency-error');

    if (!form || !toggle || !container) return;

    toggle.addEventListener('change', () => {
      container.classList.toggle('hidden', !toggle.checked);
      if (!toggle.checked) {
        const select = container.querySelector('select') as HTMLSelectElement;
        if (select) select.value = '';
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorDiv) {
        errorDiv.classList.add('hidden');
        errorDiv.textContent = '';
      }

      const formData = new FormData(form);
      const currency = formData.get('currency') as string;
      const secondaryCurrency = toggle.checked ? (formData.get('secondaryCurrency') as string) : '';

      const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      btn.disabled = true;
      btn.classList.add('loading');

      try {
        const res = await csrfFetch('/api/workspace/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currency, secondaryCurrency: secondaryCurrency || null }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to save currency');
        }

        // Navigate to next step (page reload picks up new state)
        window.location.href = '/onboarding';
      } catch (err) {
        if (errorDiv) {
          errorDiv.textContent = err instanceof Error ? err.message : 'An error occurred';
          errorDiv.classList.remove('hidden');
        }
      } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
      }
    });
  }

  initStepCurrency();
  document.addEventListener('astro:page-load', initStepCurrency);
</script>
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/organisms/onboarding/StepCurrency.astro
git commit -m "feat(onboarding): add StepCurrency component (step 1)"
```

---

## Task 7: Create Step 2 — Account creation

**Files:**

- Create: `src/components/organisms/onboarding/StepAccounts.astro`

**Step 1: Create the component**

Create `src/components/organisms/onboarding/StepAccounts.astro`. This step shows existing accounts and allows adding new ones inline.

Key implementation details:

- Show a list of already-created accounts (passed as prop)
- Inline form to add a new account: name, type (select from account types), balance (AmountInput), currency (limited to workspace currencies)
- "Add account" button submits to `/api/accounts` via `csrfFetch`
- On success, reload page (server re-derives step from data)
- "Continue" button only enabled if 1+ account exists
- "Back" navigates to step 1 by clearing currency meta (or just going to `/onboarding?step=1` — but since steps are data-derived, "Back" should just link to currency settings to re-do it)

Props needed:

- `accounts`: existing accounts array
- `currencies`: workspace currencies (primary + secondary)
- `accountCategories`: available account categories for the type dropdown

Use `AmountInput` atom and the existing account type labels from `@/lib/types/account`.

The form structure follows the pattern in `AccountFormModal.astro` but simplified for onboarding.

```astro
---
/**
 * StepAccounts — Onboarding Step 2
 *
 * Account creation for grounding budgets in reality.
 * Shows existing accounts and allows adding new ones.
 */

import AmountInput from '@/components/atoms/AmountInput.astro';
import { ACCOUNT_TYPE_LABELS, type AccountType } from '@/lib/types/account';
import type { Currency } from '@/lib/constants/currency';
import { CURRENCY_META } from '@/lib/constants/currency';
import { Trash2 } from '@lucide/astro';

export interface SimpleAccount {
  id: string;
  name: string;
  type: AccountType;
  balance: string;
  currency: Currency;
}

export interface Props {
  accounts: SimpleAccount[];
  currencies: Currency[];
}

const { accounts, currencies } = Astro.props;
const primaryCurrency = currencies[0];

// Account types suitable for onboarding (most common ones)
const onboardingAccountTypes: AccountType[] = ['bank_account', 'cash', 'e_wallet', 'credit_card'];
---

<div class="space-y-6">
  <p class="text-base-content/70">
    Add the accounts you use daily. Start with 1 or 2 that matter most — you can always add more
    later.
  </p>

  {/* Existing accounts list */}
  {
    accounts.length > 0 && (
      <div class="space-y-2" id="onboarding-accounts-list">
        {accounts.map((account) => (
          <div class="flex items-center justify-between rounded-lg bg-base-200 px-4 py-3">
            <div>
              <div class="font-medium text-base-content">{account.name}</div>
              <div class="text-xs text-base-content/50">{ACCOUNT_TYPE_LABELS[account.type]}</div>
            </div>
            <div class="text-right">
              <div class="font-bold text-base-content">
                {CURRENCY_META[account.currency].symbol} {account.balance}
              </div>
              <div class="text-xs text-base-content/50">{account.currency}</div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  {/* Add account form */}
  <form id="onboarding-account-form" class="space-y-3 rounded-lg border border-base-300 p-4">
    <h3 class="text-sm font-semibold text-base-content/70">Add an account</h3>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {/* Account name */}
      <div class="form-control">
        <label class="label" for="account-name">
          <span class="label-text">Account name</span>
        </label>
        <input
          type="text"
          id="account-name"
          name="name"
          class="input input-bordered w-full"
          placeholder="e.g., Main Checking"
          required
        />
      </div>

      {/* Account type */}
      <div class="form-control">
        <label class="label" for="account-type">
          <span class="label-text">Type</span>
        </label>
        <select id="account-type" name="type" class="select select-bordered w-full" required>
          {
            onboardingAccountTypes.map((type) => (
              <option value={type}>{ACCOUNT_TYPE_LABELS[type]}</option>
            ))
          }
        </select>
      </div>
    </div>

    {/* Balance + Currency */}
    <div class="form-control">
      <label class="label" for="account-balance">
        <span class="label-text">Current balance</span>
      </label>
      <div class="join w-full">
        {
          currencies.length > 1 ? (
            <select
              id="account-currency"
              name="currency"
              class="select select-bordered join-item w-24"
            >
              {currencies.map((c) => (
                <option value={c} selected={c === primaryCurrency}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <span class="btn btn-disabled join-item w-24">{primaryCurrency}</span>
          )
        }
        <AmountInput
          id="account-balance"
          name="balance"
          currency={primaryCurrency}
          required={true}
          placeholder="0"
          className="join-item"
        />
      </div>
      {currencies.length === 1 && <input type="hidden" name="currency" value={primaryCurrency} />}
    </div>

    <div id="account-error" class="text-error text-sm hidden" role="alert"></div>

    <button type="submit" class="btn btn-outline btn-sm w-full"> + Add account </button>
  </form>

  <p class="text-xs text-base-content/50">
    Each account starts with your current balance so your budget reflects reality from day one.
  </p>

  {/* Navigation */}
  <div class="flex justify-between pt-4">
    <a href="/onboarding?reset=currency" class="btn btn-ghost">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg
      >
      Back
    </a>
    <button
      type="button"
      id="onboarding-accounts-continue"
      class:list={['btn btn-primary', accounts.length === 0 && 'btn-disabled']}
      disabled={accounts.length === 0}
    >
      Continue
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg
      >
    </button>
  </div>
</div>

<script>
  import { csrfFetch } from '@/lib/csrf-client';
  import { stripAmountFormatting } from '@/lib/formatting/amount-input';

  function initStepAccounts() {
    const form = document.getElementById('onboarding-account-form') as HTMLFormElement | null;
    const continueBtn = document.getElementById('onboarding-accounts-continue');
    const errorDiv = document.getElementById('account-error');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorDiv) {
        errorDiv.classList.add('hidden');
        errorDiv.textContent = '';
      }

      const formData = new FormData(form);
      const name = (formData.get('name') as string).trim();
      const type = formData.get('type') as string;
      const currency = formData.get('currency') as string;
      const rawBalance = formData.get('balance') as string;
      const balance = stripAmountFormatting(rawBalance);

      if (!name) {
        if (errorDiv) {
          errorDiv.textContent = 'Account name is required';
          errorDiv.classList.remove('hidden');
        }
        return;
      }

      const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      btn.disabled = true;
      btn.classList.add('loading');

      try {
        const res = await csrfFetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, type, balance: balance || '0', currency }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create account');
        }

        // Reload to show new account in list
        window.location.href = '/onboarding';
      } catch (err) {
        if (errorDiv) {
          errorDiv.textContent = err instanceof Error ? err.message : 'An error occurred';
          errorDiv.classList.remove('hidden');
        }
        btn.disabled = false;
        btn.classList.remove('loading');
      }
    });

    // Continue button navigates to next step
    continueBtn?.addEventListener('click', () => {
      window.location.href = '/onboarding';
    });
  }

  initStepAccounts();
  document.addEventListener('astro:page-load', initStepAccounts);
</script>
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/organisms/onboarding/StepAccounts.astro
git commit -m "feat(onboarding): add StepAccounts component (step 2)"
```

---

## Task 8: Create Step 3 — Monthly income

**Files:**

- Create: `src/components/organisms/onboarding/StepIncome.astro`
- Modify: `src/pages/api/workspace/settings.ts` (add monthly_income to PUT)

**Step 1: Add monthly_income to workspace settings API**

In `src/pages/api/workspace/settings.ts`, extend the schema and PUT handler:

Add to `updateWorkspaceSettingsSchema` (line 20-26):

```typescript
monthlyIncome: z.record(z.string(), z.string()).optional(),
```

Add to the PUT handler after the `compactNumbers` block (after line 114):

```typescript
if (monthlyIncome !== undefined) {
  await workspaceMetaService.setMonthlyIncome(auth.workspaceId, monthlyIncome);
}
```

Add `monthlyIncome` to the destructured validation data (line 85).

Add `monthlyIncome` to the GET response settings object.

**Step 2: Create the component**

Create `src/components/organisms/onboarding/StepIncome.astro`:

```astro
---
/**
 * StepIncome — Onboarding Step 3
 *
 * Monthly income entry. This is a planning number, not a transaction.
 * Used to pre-fill budget allocation percentages in step 4.
 */

import AmountInput from '@/components/atoms/AmountInput.astro';
import type { Currency } from '@/lib/constants/currency';
import { CURRENCY_META } from '@/lib/constants/currency';

export interface Props {
  currencies: Currency[];
  currentIncome: Record<string, string>;
}

const { currencies, currentIncome } = Astro.props;
---

<div class="space-y-6">
  <p class="text-base-content/70">
    This is the total money you have to work with this month. Think of it as the pool you'll divide
    among your spending categories in the next step.
  </p>

  <form id="onboarding-income-form" class="space-y-4">
    {
      currencies.map((currency) => (
        <div class="form-control">
          <label class="label" for={`income-${currency}`}>
            <span class="label-text font-medium">
              {CURRENCY_META[currency].flagEmoji} Monthly income ({currency})
            </span>
          </label>
          <div class="join w-full">
            <span class="btn btn-disabled join-item w-24 text-base font-bold">
              {CURRENCY_META[currency].symbol}
            </span>
            <AmountInput
              id={`income-${currency}`}
              name={`income_${currency}`}
              currency={currency}
              value={currentIncome[currency] || ''}
              required={true}
              placeholder="0"
              className="join-item"
            />
          </div>
        </div>
      ))
    }

    <div class="rounded-lg bg-info/10 p-3 text-sm text-info-content">
      <strong>Tip:</strong> This is a planning number, not a transaction. You can change it anytime in
      settings.
    </div>

    <div id="income-error" class="text-error text-sm hidden" role="alert"></div>

    {/* Navigation */}
    <div class="flex justify-between pt-4">
      <a href="/onboarding?reset=accounts" class="btn btn-ghost">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg
        >
        Back
      </a>
      <button type="submit" class="btn btn-primary">
        Continue
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg
        >
      </button>
    </div>
  </form>
</div>

<script>
  import { csrfFetch } from '@/lib/csrf-client';
  import { stripAmountFormatting } from '@/lib/formatting/amount-input';

  function initStepIncome() {
    const form = document.getElementById('onboarding-income-form') as HTMLFormElement | null;
    const errorDiv = document.getElementById('income-error');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorDiv) {
        errorDiv.classList.add('hidden');
        errorDiv.textContent = '';
      }

      const formData = new FormData(form);
      const monthlyIncome: Record<string, string> = {};

      for (const [key, value] of formData.entries()) {
        if (key.startsWith('income_')) {
          const currency = key.replace('income_', '');
          const amount = stripAmountFormatting(value as string);
          if (amount && parseFloat(amount) > 0) {
            monthlyIncome[currency] = amount;
          }
        }
      }

      if (Object.keys(monthlyIncome).length === 0) {
        if (errorDiv) {
          errorDiv.textContent = 'Please enter your monthly income';
          errorDiv.classList.remove('hidden');
        }
        return;
      }

      const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      btn.disabled = true;
      btn.classList.add('loading');

      try {
        const res = await csrfFetch('/api/workspace/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monthlyIncome }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to save income');
        }

        window.location.href = '/onboarding';
      } catch (err) {
        if (errorDiv) {
          errorDiv.textContent = err instanceof Error ? err.message : 'An error occurred';
          errorDiv.classList.remove('hidden');
        }
      } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
      }
    });
  }

  initStepIncome();
  document.addEventListener('astro:page-load', initStepIncome);
</script>
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/organisms/onboarding/StepIncome.astro src/pages/api/workspace/settings.ts
git commit -m "feat(onboarding): add StepIncome component and API support (step 3)"
```

---

## Task 9: Create Step 4 — Budget allocation (with client script)

**Files:**

- Create: `src/components/organisms/onboarding/StepAllocate.astro`
- Create: `src/components/organisms/onboarding/StepAllocate.client.ts`

**Step 1: Create the Astro component**

Create `src/components/organisms/onboarding/StepAllocate.astro`:

The component receives:

- `categories`: array of expense categories (already seeded by the wizard container)
- `income`: Record<string, string> from workspace meta
- `currencies`: workspace currencies
- `existingBudgets`: any already-set budgets for the current month

It renders:

- An allocation progress bar (allocated vs total income)
- A list of categories with AmountInput fields, pre-filled with smart defaults
- The client script handles real-time updates

The form submits by creating/updating budgets for each category for the current month via a new onboarding-specific API endpoint or by batch-calling the existing budget API.

For simplicity, create a new API endpoint `POST /api/onboarding/budgets` that accepts an array of `{ categoryId, amount, currency }` and creates budgets for the current month in batch. This avoids N API calls from the client.

**Step 2: Create onboarding budgets API**

Create `src/pages/api/onboarding/budgets.ts`:

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { budgetService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { AVAILABLE_CURRENCIES } from '@/lib/constants/currency';

const batchBudgetSchema = z.object({
  budgets: z.array(
    z.object({
      categoryId: z.string().min(1),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      currency: z.enum(AVAILABLE_CURRENCIES),
    })
  ),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const validation = await validateBody(context.request, batchBudgetSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { budgets, month, year } = validation.data;
    let created = 0;

    for (const budget of budgets) {
      if (parseFloat(budget.amount) > 0) {
        await budgetService.createOrUpdate({
          workspace_id: auth.workspaceId,
          created_by_user_id: auth.userId,
          category_id: budget.categoryId,
          month,
          year,
          budget_amount: budget.amount,
          currency: budget.currency,
        });
        created++;
      }
    }

    return successResponse({ created }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error creating onboarding budgets', error);
    return errorResponse('Failed to create budgets', 500);
  }
};
```

Note: Check if `BudgetService` has a `createOrUpdate` method. If not, use `create` with a check for existing budget, or use the existing `initializeAllBudgets` + individual `update` calls. Adjust the API accordingly based on what the service exposes.

**Step 3: Create the allocation component**

The StepAllocate.astro component renders server-side with category data and income amounts. The client script attaches to `data-amount-input` fields and updates the allocation bar in real-time.

Key data attributes for client script:

- `data-onboarding-allocate` on the form container
- `data-budget-input` on each category amount input
- `data-category-id` to identify categories
- `data-allocation-bar` on the progress bar fill element
- `data-allocation-remaining` on the remaining text
- `data-allocation-total` for the total income amount

**Step 4: Create the client script**

Create `src/components/organisms/onboarding/StepAllocate.client.ts`:

```typescript
import { stripAmountFormatting } from '@/lib/formatting/amount-input';

let controller: AbortController | null = null;

function initStepAllocate() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  const container = document.querySelector('[data-onboarding-allocate]');
  if (!container) return;

  const totalIncomeStr = container.getAttribute('data-allocation-total') || '0';
  const totalIncome = parseFloat(totalIncomeStr);
  const barFill = container.querySelector('[data-allocation-bar]') as HTMLElement | null;
  const remainingEl = container.querySelector('[data-allocation-remaining]') as HTMLElement | null;
  const allocatedEl = container.querySelector('[data-allocation-allocated]') as HTMLElement | null;
  const inputs = container.querySelectorAll<HTMLInputElement>('[data-budget-input]');

  function updateAllocation() {
    let allocated = 0;
    inputs.forEach((input) => {
      const raw = stripAmountFormatting(input.value);
      allocated += parseFloat(raw) || 0;
    });

    const remaining = totalIncome - allocated;
    const percent = totalIncome > 0 ? Math.min((allocated / totalIncome) * 100, 100) : 0;

    if (barFill) barFill.style.width = `${percent}%`;
    if (remainingEl) {
      remainingEl.textContent = remaining.toLocaleString();
      remainingEl.classList.toggle('text-error', remaining < 0);
    }
    if (allocatedEl) allocatedEl.textContent = allocated.toLocaleString();
  }

  inputs.forEach((input) => {
    input.addEventListener('input', updateAllocation, { signal });
  });

  // Initial calculation
  updateAllocation();
}

initStepAllocate();
document.addEventListener('astro:page-load', initStepAllocate);
document.addEventListener('astro:before-swap', () => {
  controller?.abort();
});
```

**Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/organisms/onboarding/StepAllocate.astro src/components/organisms/onboarding/StepAllocate.client.ts src/pages/api/onboarding/budgets.ts
git commit -m "feat(onboarding): add StepAllocate component with client interactivity (step 4)"
```

---

## Task 10: Create Step 5 — First expense

**Files:**

- Create: `src/components/organisms/onboarding/StepFirstExpense.astro`

**Step 1: Create the component**

Create `src/components/organisms/onboarding/StepFirstExpense.astro`:

Props:

- `categories`: expense categories (for dropdown)
- `accounts`: user accounts (for dropdown)
- `currencies`: workspace currencies
- `budgets`: current month budgets (for the mini preview)

The form creates a transaction via `POST /api/transactions`. On success, redirects to `/dashboard`.

The component includes a mini budget preview that shows how the expense would affect the budget for the selected category. This preview updates client-side when the user picks a category and enters an amount.

Key fields:

- Amount (AmountInput)
- Category (select from expense categories)
- Account (select from user accounts)
- Description (optional text)
- Date (date input, defaults to today)

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/organisms/onboarding/StepFirstExpense.astro
git commit -m "feat(onboarding): add StepFirstExpense component (step 5)"
```

---

## Task 11: Create the wizard container page

**Files:**

- Create: `src/pages/onboarding/index.astro`

**Step 1: Create the page**

Create `src/pages/onboarding/index.astro`:

This is the main wizard container. It:

1. Checks authentication (via ProtectedLayout)
2. Gets onboarding status to determine current step
3. Loads data needed for the current step
4. Renders the appropriate step component
5. Handles `?reset=` query params for "Back" navigation

```astro
---
import ProtectedLayout from '@/layouts/ProtectedLayout.astro';
import {
  workspaceService,
  workspaceMetaService,
  accountService,
  categoryService,
  budgetService,
} from '@/services';
import type { OnboardingStatus } from '@/services/workspace.service';
import OnboardingProgress from '@/components/organisms/onboarding/OnboardingProgress.astro';
import StepCurrency from '@/components/organisms/onboarding/StepCurrency.astro';
import StepAccounts from '@/components/organisms/onboarding/StepAccounts.astro';
import StepIncome from '@/components/organisms/onboarding/StepIncome.astro';
import StepAllocate from '@/components/organisms/onboarding/StepAllocate.astro';
import StepFirstExpense from '@/components/organisms/onboarding/StepFirstExpense.astro';
import { isValidCurrency, type Currency } from '@/lib/constants/currency';

const user = Astro.locals.user;
if (!user) return Astro.redirect('/login', 302);

const status: OnboardingStatus = await workspaceService.getOnboardingStatus(user.workspaceId);

// If all complete, redirect to dashboard
const isComplete =
  status.currency &&
  status.categories &&
  status.budgets &&
  status.accounts &&
  status.transactions &&
  status.income;
if (isComplete) return Astro.redirect('/dashboard', 302);

// Determine current step from completion status
let currentStep = 1;
if (status.currency) currentStep = 2;
if (status.currency && status.accounts) currentStep = 3;
if (status.currency && status.accounts && status.income) currentStep = 4;
if (status.currency && status.accounts && status.income && status.categories && status.budgets)
  currentStep = 5;

// Handle ?reset= for Back navigation
const resetParam = Astro.url.searchParams.get('reset');
if (resetParam === 'currency' && currentStep > 1) currentStep = 1;
if (resetParam === 'accounts' && currentStep > 2) currentStep = 2;
if (resetParam === 'income' && currentStep > 3) currentStep = 3;
if (resetParam === 'allocation' && currentStep > 4) currentStep = 4;

const STEP_TITLES = [
  '',
  'What currency do you use?',
  'Where does your money live?',
  'How much do you earn this month?',
  'Allocate your income',
  'Record your first expense',
];

// Load step-specific data
let currencies: Currency[] = [];
let settings: any = null;

if (currentStep >= 2) {
  settings = await workspaceMetaService.getSettings(user.workspaceId);
  currencies = [settings.currency];
  if (settings.secondaryCurrency && isValidCurrency(settings.secondaryCurrency)) {
    currencies.push(settings.secondaryCurrency);
  }
}

// Step 2 data
let accounts: any[] = [];
if (currentStep === 2) {
  const allAccounts = await accountService.findAll(user.workspaceId);
  accounts = allAccounts.map((a: any) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: a.balance,
    currency: a.currency,
  }));
}

// Step 3 data
let currentIncome: Record<string, string> = {};
if (currentStep === 3) {
  currentIncome = await workspaceMetaService.getMonthlyIncome(user.workspaceId);
}

// Step 4 data: seed categories if needed, load income + categories
let expenseCategories: any[] = [];
let monthlyIncome: Record<string, string> = {};
if (currentStep === 4) {
  // Seed default categories if none exist
  await categoryService.seedDefaultExpenseCategories(user.workspaceId, user.id);
  expenseCategories = await categoryService.findAll(user.workspaceId, { type: 'expense' });
  monthlyIncome = await workspaceMetaService.getMonthlyIncome(user.workspaceId);
}

// Step 5 data
let step5Categories: any[] = [];
let step5Accounts: any[] = [];
if (currentStep === 5) {
  step5Categories = await categoryService.findAll(user.workspaceId, { type: 'expense' });
  const allAccounts = await accountService.findAll(user.workspaceId);
  step5Accounts = allAccounts.map((a: any) => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
  }));
}
---

<ProtectedLayout title="Set up your workspace" currentPath="/onboarding">
  <div class="mx-auto max-w-xl px-4 py-8">
    <OnboardingProgress
      currentStep={currentStep}
      totalSteps={5}
      stepTitle={STEP_TITLES[currentStep]}
    />

    {
      currentStep === 1 && (
        <StepCurrency
          currentCurrency={settings?.currency}
          currentSecondaryCurrency={settings?.secondaryCurrency}
        />
      )
    }

    {currentStep === 2 && <StepAccounts accounts={accounts} currencies={currencies} />}

    {currentStep === 3 && <StepIncome currencies={currencies} currentIncome={currentIncome} />}

    {
      currentStep === 4 && (
        <StepAllocate
          categories={expenseCategories}
          income={monthlyIncome}
          currencies={currencies}
        />
      )
    }

    {
      currentStep === 5 && (
        <StepFirstExpense
          categories={step5Categories}
          accounts={step5Accounts}
          currencies={currencies}
        />
      )
    }
  </div>
</ProtectedLayout>
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Run dev server and test**

Run: `bun run dev`
Test: Navigate to `/onboarding` while logged in — verify step 1 renders.

**Step 4: Commit**

```bash
git add src/pages/onboarding/index.astro
git commit -m "feat(onboarding): add wizard container page with step routing"
```

---

## Task 12: Remove old OnboardingChecklist

**Files:**

- Delete: `src/components/organisms/OnboardingChecklist.astro`
- Modify: `src/pages/dashboard.astro` (remove import and usage)
- Check: Any other files referencing OnboardingChecklist

**Step 1: Search for all references**

Run: `grep -r "OnboardingChecklist" src/`

Remove all imports and usages. The dashboard should no longer render the checklist — it now redirects.

**Step 2: Delete the component file**

Delete `src/components/organisms/OnboardingChecklist.astro`.

**Step 3: Clean up onboarding query params**

Search for `?onboarding=` in the codebase and remove any references. These were used to link from the checklist to specific pages with onboarding context.

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(onboarding): remove old OnboardingChecklist component"
```

---

## Task 13: Quality gates + integration test

**Files:**

- No new files

**Step 1: Run full quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

All must pass.

**Step 2: Run existing tests**

```bash
bun test src/services/__tests__/onboarding-status.test.ts
bun run build
```

**Step 3: Manual smoke test**

1. Reset database: `rm -f .db/dev.db && bun run db:migrate`
2. Start dev server: `bun run dev`
3. Create a new user account
4. Verify redirect to `/onboarding`
5. Complete all 5 steps
6. Verify redirect to `/dashboard` after step 5
7. Verify dashboard shows data (no checklist)

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(onboarding): address quality gate issues"
```

---

## Dependency Graph

```
Task 1 (meta key)
  └── Task 3 (onboarding status)
        └── Task 4 (route guard + redirect)

Task 2 (default categories)
  └── Task 9 (step 4 uses them)

Task 5 (progress component)
  └── Task 11 (wizard container uses it)

Task 6 (step 1)
Task 7 (step 2)
Task 8 (step 3)
Task 9 (step 4)
Task 10 (step 5)
  └── All feed into Task 11 (wizard container)

Task 11 (wizard container)
  └── Task 12 (remove old checklist)
        └── Task 13 (quality gates)
```

**Parallelizable groups:**

- Wave 1: Tasks 1, 2, 5 (independent foundations)
- Wave 2: Tasks 3, 6, 7, 8, 9, 10 (step components + status update)
- Wave 3: Task 4, 11 (integration — depends on all step components)
- Wave 4: Task 12, 13 (cleanup + validation)
