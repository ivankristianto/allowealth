# Multi-Currency Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hardcoded IDR/USD currency enum with 12 configurable currencies, add workspace-level Primary + optional Secondary currency setting with lock mechanism, remove exchange rate system and header currency selector.

**Architecture:** Expand `AVAILABLE_CURRENCIES` constant (single source of truth), change DB schema from enum to plain text, add `secondary_currency` workspace meta key with lock mechanism. Dashboard shows dual-currency summary cards; detail widgets use tab switching. All `'IDR' | 'USD'` type annotations replaced with `Currency` from constants.

**Tech Stack:** Astro 5, Drizzle ORM (SQLite + PostgreSQL dual-dialect), DaisyUI v5, Nano Stores, Zod validation

**Design:** `docs/plans/2026-02-20-multi-currency-support-design.md`

**Implementation Order Note:** This plan starts with constants/service/schema (Tasks 1-5) before UI (Tasks 8-11). This deviates from the usual UI-first order (`.claude/rules/principles.md:16`) because the UI changes depend on the `Currency` type, `CURRENCY_OPTIONS`, and service methods that must exist first. The foundational types are the prerequisite for all UI work.

---

## Task 1: Expand Currency Constants

**Files:**

- Modify: `src/lib/constants/currency.ts`
- Test: `bun run typecheck`

**Context:** This is the single source of truth for all currency data. The `Currency` type is derived from `AVAILABLE_CURRENCIES`, so expanding the array automatically updates the type system.

**Step 1: Expand AVAILABLE_CURRENCIES array**

Replace line 27:

```ts
export const AVAILABLE_CURRENCIES = ['IDR', 'USD'] as const;
```

With:

```ts
export const AVAILABLE_CURRENCIES = [
  'IDR',
  'USD',
  'SGD',
  'PHP',
  'EUR',
  'GBP',
  'MYR',
  'THB',
  'JPY',
  'AUD',
  'KRW',
  'INR',
] as const;
```

**Step 2: Expand CURRENCY_META with all 12 currencies**

Add entries for SGD, PHP, EUR, GBP, MYR, THB, JPY, AUD, KRW, INR after the USD entry. Each needs: code, symbol, locale, name, decimals, symbolPosition, thousandsSeparator, decimalSeparator, flagEmoji.

Reference data:

- SGD: `$`, `en-SG`, `Singapore Dollar`, 2 decimals, before, `,`, `.`, 🇸🇬
- PHP: `₱`, `en-PH`, `Philippine Peso`, 2 decimals, before, `,`, `.`, 🇵🇭
- EUR: `€`, `de-DE`, `Euro`, 2 decimals, after, `.`, `,`, 🇪🇺
- GBP: `£`, `en-GB`, `British Pound`, 2 decimals, before, `,`, `.`, 🇬🇧
- MYR: `RM`, `ms-MY`, `Malaysian Ringgit`, 2 decimals, before, `,`, `.`, 🇲🇾
- THB: `฿`, `th-TH`, `Thai Baht`, 2 decimals, before, `,`, `.`, 🇹🇭
- JPY: `¥`, `ja-JP`, `Japanese Yen`, 0 decimals, before, `,`, `.`, 🇯🇵
- AUD: `A$`, `en-AU`, `Australian Dollar`, 2 decimals, before, `,`, `.`, 🇦🇺
- KRW: `₩`, `ko-KR`, `South Korean Won`, 0 decimals, before, `,`, `.`, 🇰🇷
- INR: `₹`, `en-IN`, `Indian Rupee`, 2 decimals, before, `,`, `.`, 🇮🇳

Update the `satisfies Record<Currency, CurrencyInfo>` constraint to ensure all entries are present.

**Step 3: Expand CURRENCY_OPTIONS**

Add corresponding entries for all 12 currencies following the pattern:

```ts
{ value: 'SGD', label: 'SGD - Singapore Dollar', symbol: '$' },
```

**Note:** The settings page uses `CURRENCY_META[code].flagEmoji` for display labels (e.g., "🇸🇬 SGD — Singapore Dollar"). Ensure `flagEmoji` is present in every `CURRENCY_META` entry.

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS — The `Currency` type auto-derives from the expanded array.

**Step 5: Commit**

```bash
git add src/lib/constants/currency.ts
git commit -m "feat(currency): expand supported currencies to 12 (IDR, USD, SGD, PHP, EUR, GBP, MYR, THB, JPY, AUD, KRW, INR)"
```

---

## Task 2: Add Secondary Currency to Workspace Meta

**Files:**

- Modify: `src/lib/constants/workspace-meta-keys.ts`
- Modify: `src/services/workspace-meta.service.ts`
- Test: `bun run typecheck`

**Context:** Workspace settings use a key-value store (`workspace_meta` table). We need to add `secondary_currency` key, update the `WorkspaceSettings` interface, and add service methods + lock mechanism.

**Step 1: Add SECONDARY_CURRENCY key and update types**

In `src/lib/constants/workspace-meta-keys.ts`:

Add to `WORKSPACE_META_KEYS`:

```ts
SECONDARY_CURRENCY: 'secondary_currency',
```

Add to `WORKSPACE_META_DEFAULTS`:

```ts
[WORKSPACE_META_KEYS.SECONDARY_CURRENCY]: '',
```

Update `WorkspaceSettings` interface:

```ts
export interface WorkspaceSettings {
  currency: string;
  secondaryCurrency: string;
  weekStart: WeekStart;
  compactNumbers: boolean;
}
```

Update `DEFAULT_WORKSPACE_SETTINGS`:

```ts
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  currency: 'IDR',
  secondaryCurrency: '',
  weekStart: 'monday',
  compactNumbers: true,
};
```

**Step 2: Update validateMetaValue in workspace-meta.service.ts**

Add validation for `SECONDARY_CURRENCY` in the `validateMetaValue` function (after the `CURRENCY` case):

```ts
case WORKSPACE_META_KEYS.SECONDARY_CURRENCY:
  // Secondary currency can be empty string (disabled) or a valid currency code
  if (value.length > 0 && !isValidCurrency(value)) {
    throw new Error(`Invalid currency code: ${value}`);
  }
  break;
```

Update the `CURRENCY` case to validate using `isValidCurrency`:

```ts
case WORKSPACE_META_KEYS.CURRENCY:
  if (!value || value.length === 0) {
    throw new Error('Currency cannot be empty');
  }
  if (!isValidCurrency(value)) {
    throw new Error(`Invalid currency code: ${value}`);
  }
  break;
```

Import `isValidCurrency` from `@/lib/constants/currency`.

**Step 3: Add service methods to WorkspaceMetaService**

Add these methods to the `WorkspaceMetaService` class:

```ts
async getSecondaryCurrency(workspaceId: string): Promise<string | null> {
  const value = await this.get(workspaceId, WORKSPACE_META_KEYS.SECONDARY_CURRENCY);
  return value && value.length > 0 ? value : null;
}

async setSecondaryCurrency(workspaceId: string, currency: string): Promise<void> {
  await this.set(workspaceId, WORKSPACE_META_KEYS.SECONDARY_CURRENCY, currency);
}

async getWorkspaceCurrencies(workspaceId: string): Promise<{ primary: string; secondary: string | null }> {
  const primary = await this.getCurrency(workspaceId);
  const secondary = await this.getSecondaryCurrency(workspaceId);
  return { primary, secondary };
}

async canChangeCurrencySettings(workspaceId: string): Promise<boolean> {
  // IMPORTANT: Include soft-deleted records to prevent create→delete→change bypass
  const schema = this.schema;
  const [accountCount] = await (this.db as any)
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.accounts)
    .where(eq(schema.accounts.workspace_id, workspaceId));
  if (accountCount.count > 0) return false;

  const [budgetCount] = await (this.db as any)
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.budgets)
    .where(eq(schema.budgets.workspace_id, workspaceId));
  if (budgetCount.count > 0) return false;

  const [txCount] = await (this.db as any)
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.transactions)
    .where(eq(schema.transactions.workspace_id, workspaceId));
  return txCount.count === 0;
}
```

Import `sql`, `and` from `drizzle-orm` (already imported partially).

**Step 4: Update getSettings to include secondaryCurrency**

Update the `getSettings` method to return `secondaryCurrency`:

```ts
async getSettings(workspaceId: string): Promise<WorkspaceSettings> {
  const metaAll = await this.getWithDefaults(workspaceId);
  const rawWeekStart = metaAll[WORKSPACE_META_KEYS.WEEK_START];
  const weekStart = isValidWeekStart(rawWeekStart)
    ? rawWeekStart
    : DEFAULT_WORKSPACE_SETTINGS.weekStart;
  const secondaryRaw = metaAll[WORKSPACE_META_KEYS.SECONDARY_CURRENCY];

  return {
    currency: metaAll[WORKSPACE_META_KEYS.CURRENCY],
    secondaryCurrency: secondaryRaw && secondaryRaw.length > 0 ? secondaryRaw : '',
    weekStart,
    compactNumbers: metaValueToBoolean(
      metaAll[WORKSPACE_META_KEYS.COMPACT_NUMBERS],
      DEFAULT_WORKSPACE_SETTINGS.compactNumbers
    ),
  };
}
```

**Step 5: Update setCurrency to enforce lock**

Modify `setCurrency` and `setSecondaryCurrency` to check lock:

```ts
async setCurrency(workspaceId: string, currency: string): Promise<void> {
  const canChange = await this.canChangeCurrencySettings(workspaceId);
  if (!canChange) {
    throw new WorkspaceMetaServiceError(
      ServiceErrorCode.INVALID_META_VALUE,
      'Currency settings cannot be changed after creating accounts, budgets, or transactions',
      400
    );
  }
  await this.set(workspaceId, WORKSPACE_META_KEYS.CURRENCY, currency);
}

async setSecondaryCurrency(workspaceId: string, currency: string): Promise<void> {
  if (currency.length > 0) {
    const primary = await this.getCurrency(workspaceId);
    if (currency === primary) {
      throw new WorkspaceMetaServiceError(
        ServiceErrorCode.INVALID_META_VALUE,
        'Secondary currency must differ from primary currency',
        400
      );
    }
  }
  const canChange = await this.canChangeCurrencySettings(workspaceId);
  if (!canChange) {
    throw new WorkspaceMetaServiceError(
      ServiceErrorCode.INVALID_META_VALUE,
      'Currency settings cannot be changed after creating accounts, budgets, or transactions',
      400
    );
  }
  await this.set(workspaceId, WORKSPACE_META_KEYS.SECONDARY_CURRENCY, currency);
}

/**
 * Atomically set both currency fields in a single transaction.
 * Prevents partial state if one write fails.
 * Only checks lock if values are actually changing.
 */
async setCurrencySettings(
  workspaceId: string,
  primary: string,
  secondary: string,
): Promise<void> {
  const current = await this.getWorkspaceCurrencies(workspaceId);
  const primaryChanging = primary !== current.primary;
  const secondaryChanging = secondary !== (current.secondary ?? '');

  if (!primaryChanging && !secondaryChanging) return;

  const canChange = await this.canChangeCurrencySettings(workspaceId);
  if (!canChange) {
    throw new WorkspaceMetaServiceError(
      ServiceErrorCode.INVALID_META_VALUE,
      'Currency settings cannot be changed after creating accounts, budgets, or transactions',
      400
    );
  }

  if (secondary.length > 0 && secondary === primary) {
    throw new WorkspaceMetaServiceError(
      ServiceErrorCode.INVALID_META_VALUE,
      'Secondary currency must differ from primary currency',
      400
    );
  }

  // Atomic: both writes in a single transaction
  await this.db.transaction(async (tx) => {
    const schema = this.schema;
    await tx
      .insert(schema.workspaceMeta)
      .values({ id: nanoid(), workspace_id: workspaceId, meta_key: WORKSPACE_META_KEYS.CURRENCY, meta_value: primary, created_at: new Date(), updated_at: new Date() })
      .onConflictDoUpdate({ target: [schema.workspaceMeta.workspace_id, schema.workspaceMeta.meta_key], set: { meta_value: primary, updated_at: new Date() } });

    await tx
      .insert(schema.workspaceMeta)
      .values({ id: nanoid(), workspace_id: workspaceId, meta_key: WORKSPACE_META_KEYS.SECONDARY_CURRENCY, meta_value: secondary, created_at: new Date(), updated_at: new Date() })
      .onConflictDoUpdate({ target: [schema.workspaceMeta.workspace_id, schema.workspaceMeta.meta_key], set: { meta_value: secondary, updated_at: new Date() } });
  });
}
```

**Step 6: Run typecheck**

Run: `bun run typecheck`
Expected: May show errors in files referencing `WorkspaceSettings` that don't handle `secondaryCurrency` — fix those in subsequent tasks.

**Step 7: Commit**

```bash
git add src/lib/constants/workspace-meta-keys.ts src/services/workspace-meta.service.ts
git commit -m "feat(workspace): add secondary_currency setting with lock mechanism"
```

---

## Task 3: Update Database Schemas (Remove Enum Constraints)

**Files:**

- Modify: `src/db/schema/sqlite/accounts.ts:42` — remove enum
- Modify: `src/db/schema/sqlite/transactions.ts:25` — remove enum
- Modify: `src/db/schema/sqlite/budgets.ts:23` — remove enum
- Modify: `src/db/schema/sqlite/account-snapshot-items.ts:16` — remove enum
- Modify: `src/db/schema/postgresql/accounts.ts:43` — remove enum
- Modify: `src/db/schema/postgresql/transactions.ts:26` — remove enum
- Modify: `src/db/schema/postgresql/budgets.ts:32` — remove enum
- Modify: `src/db/schema/postgresql/account-snapshot-items.ts:17` — remove enum
- Test: `bun run typecheck`

**Context:** Remove the `{ enum: ['IDR', 'USD'] }` constraint from all currency columns. Drizzle text enum is a TypeScript-only constraint, not enforced at DB level for SQLite. Validation moves to application layer.

**Step 1: Update all 8 schema files**

In each file, change:

```ts
currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
```

To:

```ts
currency: text('currency').notNull(),
```

Files (4 SQLite + 4 PostgreSQL):

1. `src/db/schema/sqlite/accounts.ts:42`
2. `src/db/schema/sqlite/transactions.ts:25`
3. `src/db/schema/sqlite/budgets.ts:23`
4. `src/db/schema/sqlite/account-snapshot-items.ts:16`
5. `src/db/schema/postgresql/accounts.ts:43`
6. `src/db/schema/postgresql/transactions.ts:26`
7. `src/db/schema/postgresql/budgets.ts:32`
8. `src/db/schema/postgresql/account-snapshot-items.ts:17`

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: Many type errors — files that use `'IDR' | 'USD'` type derived from schema enum will now see `string`. These are expected and will be fixed in Task 6.

**Step 3: Commit**

```bash
git add src/db/schema/sqlite/accounts.ts src/db/schema/sqlite/transactions.ts src/db/schema/sqlite/budgets.ts src/db/schema/sqlite/account-snapshot-items.ts src/db/schema/postgresql/accounts.ts src/db/schema/postgresql/transactions.ts src/db/schema/postgresql/budgets.ts src/db/schema/postgresql/account-snapshot-items.ts
git commit -m "refactor(schema): remove hardcoded IDR/USD enum from currency columns"
```

---

## Task 4: Remove Exchange Rate System

**Files:**

- Delete: `src/db/schema/sqlite/exchange-rates.ts`
- Delete: `src/db/schema/postgresql/exchange-rates.ts`
- Delete: `src/lib/currency/conversion.ts`
- Delete: `src/lib/stores/currencyStore.ts`
- Delete: `src/components/molecules/CurrencySelector.astro`
- Delete: `src/components/molecules/CurrencySelector.stories.ts`
- Modify: `src/db/schema/sqlite/index.ts:18` — remove exchange-rates export
- Modify: `src/db/schema/postgresql/index.ts:18` — remove exchange-rates export
- Modify: `src/db/empty.ts:34` — remove `schema.exchangeRates`
- Modify: `src/db/seed.ts` — remove exchange rate import, deletion, and seeding
- Modify: `src/components/layouts/Header.astro` — remove CurrencySelector import and usage
- Modify: `src/services/dashboard.service.ts` — remove exchange rate import and conversion logic
- Test: `bun run typecheck`

**Context:** Exchange rates, currency conversion, currency selector, and currency store are all being removed per design. The dashboard service needs its conversion logic replaced with simple per-currency totals.

**Step 1: Delete files**

Delete these 6 files:

- `src/db/schema/sqlite/exchange-rates.ts`
- `src/db/schema/postgresql/exchange-rates.ts`
- `src/lib/currency/conversion.ts`
- `src/lib/stores/currencyStore.ts`
- `src/components/molecules/CurrencySelector.astro`
- `src/components/molecules/CurrencySelector.stories.ts`

**Step 2: Remove exchange-rates exports from schema index files**

In both `src/db/schema/sqlite/index.ts` and `src/db/schema/postgresql/index.ts`, remove line:

```ts
export * from './exchange-rates';
```

**Step 3: Remove from empty.ts**

In `src/db/empty.ts`, remove `schema.exchangeRates` from the tables array.

**Step 4: Remove from seed.ts**

In `src/db/seed.ts`:

- Remove `exchangeRates` from imports (line 29)
- Remove `await db.delete(exchangeRates);` from `clearAllTables` (line 667)
- Remove the entire exchange rate seeding function and its call (around lines 1619-1639)

**Step 5: Remove CurrencySelector from Header.astro**

In `src/components/layouts/Header.astro`:

- Remove import: `import CurrencySelector from '../molecules/CurrencySelector.astro';` (line 15)
- Remove the CurrencySelector usage block (lines 87-93):

```astro
{
  user && (
    <div class="hidden sm:block">
      <CurrencySelector />
    </div>
  )
}
```

**Step 6: Update DashboardService — remove conversion logic**

In `src/services/dashboard.service.ts`:

Remove import (line 23):

```ts
import { getLatestExchangeRate } from '@/lib/currency/conversion';
```

Update `TotalAccounts` interface — remove `converted` and `convertedCurrency`:

```ts
export interface TotalAccounts {
  idr: string;
  usd: string;
}
```

**Note:** This interface will be further refactored in Task 7 to be currency-generic. For now, just remove the conversion fields. Keep `totalDebt` — the dashboard still shows debt totals.

Remove conversion logic from `getAccountsOptimized`:

In `getAccountsOptimized`, remove lines 313-325 (exchange rate fetch and conversion calculation). Replace with:

```ts
return {
  totalAccounts: {
    idr: idrTotal,
    usd: usdTotal,
  },
  totalDebt: {
    idr: idrDebt,
    usd: usdDebt,
  },
  accountReminders: reminders,
};
```

Also update the error return to match:

```ts
totalAccounts: { idr: '0', usd: '0' },
```

**Step 7: Run typecheck**

Run: `bun run typecheck`
Expected: Errors from files still referencing deleted modules and changed interfaces. Note them for Task 6.

**Step 8: Commit**

```bash
git add -A
git commit -m "refactor: remove exchange rate system, currency selector, and currency store"
```

---

## Task 5: Update API Settings Endpoint

**Files:**

- Modify: `src/pages/api/workspace/settings.ts`
- Test: `bun run typecheck`

**Context:** The settings API currently uses `z.enum(['IDR', 'USD'])` for validation and doesn't support `secondary_currency`.

**Step 1: Update validation schema**

Replace the `updateWorkspaceSettingsSchema` (lines 17-22):

```ts
import { isValidCurrency } from '@/lib/constants/currency';

const updateWorkspaceSettingsSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  currency: z
    .string()
    .min(2)
    .max(10)
    .optional()
    .refine((val) => val === undefined || isValidCurrency(val), {
      message: 'Invalid currency code',
    }),
  secondaryCurrency: z
    .string()
    .max(10)
    .optional()
    .refine((val) => val === undefined || val === '' || isValidCurrency(val), {
      message: 'Invalid currency code',
    }),
  weekStart: z.enum(['monday', 'sunday']).optional(),
  compactNumbers: z.boolean().optional(),
});
```

**Step 2: Update PUT handler**

Use the atomic `setCurrencySettings` method for currency updates. This ensures both values are set in a single transaction and only checks lock when values are actually changing (so weekStart/compactNumbers updates aren't blocked):

```ts
const { name, currency, secondaryCurrency, weekStart, compactNumbers } = validation.data;

// Currency updates: atomic, only lock-checked when values change
if (currency !== undefined || secondaryCurrency !== undefined) {
  const currentSettings = await workspaceMetaService.getSettings(auth.workspaceId);
  await workspaceMetaService.setCurrencySettings(
    auth.workspaceId,
    currency ?? currentSettings.currency,
    secondaryCurrency ?? currentSettings.secondaryCurrency
  );
}
```

Remove the individual `setCurrency` / `setSecondaryCurrency` calls from the PUT handler — they are replaced by the atomic method above.

**Step 3: Update GET and PUT response**

In both GET and PUT response objects, add `secondaryCurrency`:

```ts
settings: {
  currency: settings.currency,
  secondaryCurrency: settings.secondaryCurrency,
  weekStart: settings.weekStart,
  compactNumbers: settings.compactNumbers,
},
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS for this file.

**Step 5: Commit**

```bash
git add src/pages/api/workspace/settings.ts
git commit -m "feat(api): add secondary_currency to workspace settings endpoint with lock mechanism"
```

---

## Task 6: Bulk Type Updates — Replace 'IDR' | 'USD' with Currency Type

**Files:** ~80+ files (see grep output in exploration)

- All service files, component files, API files, store files, type files, test files
- Test: `bun run typecheck`

**Context:** After removing the enum from DB schemas, Drizzle infers `string` instead of `'IDR' | 'USD'`. All hardcoded `'IDR' | 'USD'` type annotations need to be replaced with the `Currency` type from `@/lib/constants/currency`.

**IMPORTANT — Execute in waves to reduce blast radius:**

- **Wave A** (types/enums/constants): `src/lib/types/`, `src/lib/enums.ts`, `src/lib/forecast/types.ts`
- **Wave B** (services + API validation): `src/services/`, `src/pages/api/`
- **Wave C** (UI/components/client scripts): `src/components/`, `src/pages/`, `src/lib/stores/`, `src/lib/api/`
- **Wave D** (tests/mocks/MCP): `src/services/__tests__/`, `e2e/`, `mcp-server/`

Run `bun run typecheck` after each wave before proceeding to the next.

**Strategy:** This is a bulk search-and-replace task. The agent should:

1. Find all files with `'IDR' | 'USD'` type annotations
2. Add `import type { Currency } from '@/lib/constants/currency';` where missing
3. Replace `'IDR' | 'USD'` with `Currency`
4. For Zod schemas using `z.enum(['IDR', 'USD'])`, replace with `z.string().refine(val => isValidCurrency(val))` or use `AVAILABLE_CURRENCIES` array
5. For `as 'IDR' | 'USD'` type casts, prefer runtime validation with `isValidCurrency(val)` guard over unsafe `as Currency` casts. Use `as Currency` only when the value is known-safe (e.g., from a validated DB column)

**Key files to update (grouped by area):**

**Services:**

- `src/services/dashboard.service.ts` — interfaces + method signatures
- `src/services/budget.service.ts` — method signatures
- `src/services/report.service.ts` — method signatures (~13 occurrences)
- `src/services/transaction.service.ts` — types
- `src/services/__tests__/mocks/dashboard-generator.ts`
- `src/services/__tests__/mocks/dashboard-mocks.ts`

**Types & Stores:**

- `src/lib/types/account.ts:63` — `Currency` type (remove — use from constants instead)
- `src/lib/stores/transactionFiltersStore.ts`
- `src/lib/stores/transactionsDataStore.ts`
- `src/lib/stores/budgetHistoryStore.ts`
- `src/lib/forecast/types.ts`
- `src/lib/forecast/calculations.ts`
- `src/lib/cash-flow.ts`
- `src/lib/enums.ts:9` — `currencyEnum`

**API Endpoints:**

- `src/pages/api/accounts/index.ts:33` — `z.enum(['IDR', 'USD'])`
- `src/pages/api/accounts/[id].ts:41` — `z.enum(['IDR', 'USD'])`
- `src/pages/api/budget/import.ts:19`
- `src/pages/api/budget/export.ts:18`
- `src/pages/api/budget/overview.ts`
- `src/pages/api/budget/history.ts`
- `src/pages/api/budget/category/[id]/remaining.ts`
- `src/pages/api/budgets/index.ts`
- `src/pages/api/reports/index.ts`
- `src/pages/api/reports/members/index.ts`
- `src/pages/api/transactions/index.ts`
- `src/pages/api/forecast/index.ts`

**Client Libraries:**

- `src/lib/api/transactionsApiClient.ts`
- `src/lib/api/budgetApiClient.ts`
- `src/lib/api/budgetHistoryApiClient.ts`
- `src/lib/utils/budget-period.ts`
- `src/lib/utils/account.ts:83`
- `src/lib/utils/transaction.ts`

**Components:**

- `src/components/atoms/Currency.astro`
- `src/components/atoms/CurrencyInput.astro`
- `src/components/atoms/Currency.stories.ts`
- `src/components/atoms/CurrencyInput.stories.ts`
- `src/components/molecules/AccountItemRow.astro`
- `src/components/molecules/AccountItemRow.stories.ts`
- `src/components/molecules/TransactionEntryForm.astro`
- `src/components/molecules/TransactionFilters.astro`
- `src/components/molecules/RecentTransactionsList.astro` (if applicable)
- `src/components/molecules/GrowthScheduleTable.astro`
- `src/components/molecules/GrowthScheduleTable.stories.ts`
- `src/components/molecules/CashFlowItem.stories.ts`
- `src/components/molecules/CalculatorResultCard.astro`
- `src/components/molecules/CalculatorResultCard.stories.ts`
- `src/components/organisms/SummaryCards.astro`
- `src/components/organisms/SpendingCard.astro`
- `src/components/organisms/BudgetCard.astro`
- `src/components/organisms/BudgetCard.stories.ts`
- `src/components/organisms/BudgetCardGrid.astro`
- `src/components/organisms/BudgetCardGrid.test.ts`
- `src/components/organisms/BudgetSummary.astro`
- `src/components/organisms/BudgetSummary.stories.ts`
- `src/components/organisms/BudgetTable.astro`
- `src/components/organisms/BudgetHistoryComparison.astro`
- `src/components/organisms/BudgetHistoryComparison.stories.ts`
- `src/components/organisms/BudgetImportModal.astro`
- `src/components/organisms/SetNewBudgetModal.astro`
- `src/components/organisms/InitializeBudgetsModal.astro`
- `src/components/organisms/AccountFormModal.astro`
- `src/components/organisms/AccountFormModal.test.ts`
- `src/components/organisms/AccountFormModal.stories.ts`
- `src/components/organisms/AccountDeleteConfirmModal.astro`
- `src/components/organisms/AccountDeleteConfirmModal.stories.ts`
- `src/components/organisms/AccountGroupCard.stories.ts`
- `src/components/organisms/AccountHistoryModal.astro`
- `src/components/organisms/AccountHistoryModal.test.ts`
- `src/components/organisms/AccountHistoryModal.stories.ts`
- `src/components/organisms/TransactionsPage.client.ts`
- `src/components/organisms/TransactionSummaryCards.astro`
- `src/components/organisms/TransactionSummaryCards.stories.ts`
- `src/components/organisms/CalculatorsPage.client.ts`
- `src/components/organisms/BudgetPage.client.ts`
- `src/components/organisms/BudgetHistoryPage.client.ts`
- `src/components/organisms/CategoryIntelligenceTable.astro`
- `src/components/partials/TransactionSummaryPartial.astro`
- `src/components/partials/BudgetSummaryPartial.astro`
- `src/components/partials/BudgetCardGridPartial.astro`
- `src/components/partials/BudgetHistoryTablePartial.astro`
- `src/components/partials/CalculatorResultsPartial.astro`

**Pages:**

- `src/pages/dashboard.astro`
- `src/pages/budget/index.astro`
- `src/pages/budget/history.astro`
- `src/pages/reports/index.astro`
- `src/pages/transactions/index.astro`
- `src/pages/transactions/export.astro`
- `src/pages/accounts/index.astro`
- `src/pages/accounts/[id].astro`
- `src/pages/calculators/index.astro`

**MCP Server:**

- `mcp-server/src/tools/budget.ts`
- `mcp-server/src/tools/transactions.ts`
- `mcp-server/src/tools/dashboard.ts`

**E2E Tests:**

- `e2e/helpers/api-helpers.ts`
- `e2e/pages/AccountsPage.ts`
- `e2e/tests/accounts/accounts-redesign-journey.spec.ts`

**Step 1: Use find-and-replace across codebase**

For type annotations, replace all `'IDR' | 'USD'` with `Currency` and add the import.

For `z.enum(['IDR', 'USD'])` in API endpoints, either:

- Use `z.string().refine((val): val is Currency => isValidCurrency(val))`, or
- If in a query param cast `as 'IDR' | 'USD'`, change to `as Currency`

For the local `Currency` type in `src/lib/types/account.ts:63`, remove it and import + re-export from constants:

```ts
import type { Currency } from '@/lib/constants/currency';
export type { Currency };
```

**Note:** `export type { Currency } from '...'` re-exports but does NOT create a local binding. If the same file uses `currency: Currency`, you need a separate `import type` statement.

For the local `Currency` type in `src/lib/currency/conversion.ts` — already deleted in Task 4.

For `src/lib/enums.ts:9` `currencyEnum`, update to use `AVAILABLE_CURRENCIES`:

```ts
import { AVAILABLE_CURRENCIES } from '@/lib/constants/currency';
export const currencyEnum = z.enum(AVAILABLE_CURRENCIES);
```

**Step 2: Handle special cases**

- `src/lib/utils/account.ts:83` `convertToIdr` — this function does currency conversion. Either remove it or keep it as a simple multiplier utility. Check if it's used anywhere first. If only used in a few places, remove and inline.
- `src/lib/forecast/calculations.ts:164-165` — `fromCurrency`/`toCurrency` conversion — review if this is exchange-rate dependent. If so, simplify to remove conversion.

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS — all type references should now use `Currency` from constants.

**Step 4: Run quality gates**

Run: `bun run lint:fix && bun run format:fix`

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: replace hardcoded 'IDR' | 'USD' type with Currency from constants across codebase"
```

---

## Task 7: Update Dashboard Service for Multi-Currency

**Files:**

- Modify: `src/services/dashboard.service.ts`
- Test: `bun run typecheck`

**Context:** The dashboard currently returns `TotalAccounts` with hardcoded `idr`/`usd` fields and `converted` total. Replace with currency-generic structure.

**Step 1: Update interfaces**

Replace `TotalAccounts` and `TotalDebt`:

```ts
import type { Currency } from '@/lib/constants/currency';

export interface CurrencyAmount {
  currency: Currency;
  amount: string;
}

export interface TotalAccounts {
  byCurrency: CurrencyAmount[];
}

export interface TotalDebt {
  byCurrency: CurrencyAmount[];
}
```

Update `DashboardData`:

```ts
export interface DashboardData {
  totalAccounts: TotalAccounts;
  totalDebt: TotalDebt;
  // ... rest unchanged
}
```

**Step 2: Update getAccountsOptimized**

Replace the hardcoded IDR/USD filtering with dynamic grouping by currency:

```ts
private async getAccountsOptimized(
  workspaceId: string,
  perf?: PerfCollector
): Promise<{
  totalAccounts: TotalAccounts;
  totalDebt: TotalDebt;
  accountReminders: AccountReminder[];
}> {
```

Remove the `primaryCurrency` parameter. Group accounts by currency dynamically:

```ts
// Group by currency dynamically
const accountsByCurrency = new Map<string, string[]>();
const debtByCurrency = new Map<string, string[]>();

for (const account of workspaceAccounts) {
  if (account.account_class === 'debt') {
    const balances = debtByCurrency.get(account.currency) || [];
    balances.push(account.balance.replace(/^-/, '')); // absolute value
    debtByCurrency.set(account.currency, balances);
  } else {
    const balances = accountsByCurrency.get(account.currency) || [];
    balances.push(account.balance);
    accountsByCurrency.set(account.currency, balances);
  }
}

const totalAccounts: CurrencyAmount[] = [];
for (const [currency, balances] of accountsByCurrency) {
  totalAccounts.push({ currency: currency as Currency, amount: decimalSum(balances) });
}

const totalDebt: CurrencyAmount[] = [];
for (const [currency, balances] of debtByCurrency) {
  totalDebt.push({ currency: currency as Currency, amount: decimalSum(balances) });
}
```

**Step 3: Update getDashboardData call signature**

Remove `primaryCurrency` parameter from `getAccountsOptimized` call:

```ts
this.getAccountsOptimized(workspaceId, perf),
```

The `currency` parameter on `getDashboardData` itself stays — it's used for filtering budgets/transactions. But change its type:

```ts
async getDashboardData(
  workspaceId: string,
  month?: number,
  year?: number,
  currency: Currency = 'IDR',
  perf?: PerfCollector
): Promise<DashboardData>
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: Errors in files consuming `TotalAccounts`/`TotalDebt` (e.g., `SummaryCards.astro`, `dashboard.astro`). Note them for Task 9.

**Step 5: Commit**

```bash
git add src/services/dashboard.service.ts
git commit -m "refactor(dashboard): replace hardcoded currency fields with dynamic currency grouping"
```

---

## Task 8: Update Settings Page UI

**Files:**

- Modify: `src/pages/settings/index.astro`
- Modify: `src/pages/api/workspace/settings.ts` (if not done in Task 5)
- Test: `bun run typecheck`, verify in browser

**Context:** Add secondary currency dropdown, show lock state warning, update onboarding text.

**Step 1: Update currencyOptions to use CURRENCY_OPTIONS**

In `src/pages/settings/index.astro`, replace hardcoded options (lines 135-138):

```ts
import { CURRENCY_OPTIONS, CURRENCY_META } from '@/lib/constants/currency';

const currencyOptions = CURRENCY_OPTIONS.map((opt) => ({
  value: opt.value,
  label: `${CURRENCY_META[opt.value].flagEmoji} ${opt.value} — ${CURRENCY_META[opt.value].name}`,
}));
```

**Step 2: Fetch canChangeCurrency and secondaryCurrency**

After the settings fetch (around line 79), add:

```ts
const canChangeCurrency = await workspaceMetaService.canChangeCurrencySettings(workspaceId);
```

And update `workspaceData`:

```ts
settings: {
  currency: settings.currency,
  secondaryCurrency: settings.secondaryCurrency,
  weekStart: settings.weekStart,
  compactNumbers: settings.compactNumbers,
},
```

**Step 3: Update form HTML**

Replace the single currency select (lines 316-335) with two selects in a grid:

```astro
<div class="grid gap-4 md:grid-cols-2">
  <div class="form-control">
    <Label htmlFor="primary-currency">Primary Currency</Label>
    <select
      id="primary-currency"
      name="currency"
      class="select select-bordered w-full h-14 rounded-lg border border-base-300 bg-base-200 py-4 pl-6 pr-10 text-base font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      disabled={!canChangeCurrency}
    >
      {
        currencyOptions.map((currency) => (
          <option
            value={currency.value}
            selected={workspaceData.settings.currency === currency.value}
          >
            {currency.label}
          </option>
        ))
      }
    </select>
  </div>

  <div class="form-control">
    <Label htmlFor="secondary-currency">Secondary Currency</Label>
    <select
      id="secondary-currency"
      name="secondaryCurrency"
      class="select select-bordered w-full h-14 rounded-lg border border-base-300 bg-base-200 py-4 pl-6 pr-10 text-base font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      disabled={!canChangeCurrency}
    >
      <option value="" selected={!workspaceData.settings.secondaryCurrency}>None</option>
      {
        currencyOptions
          .filter((c) => c.value !== workspaceData.settings.currency)
          .map((currency) => (
            <option
              value={currency.value}
              selected={workspaceData.settings.secondaryCurrency === currency.value}
            >
              {currency.label}
            </option>
          ))
      }
    </select>
  </div>
</div>
```

**Step 4: Add lock warning**

Below the currency grid, add a warning when locked:

```astro
---
import { Info } from '@lucide/astro';
---

{
  !canChangeCurrency && (
    <div class="alert alert-info text-sm">
      <Info class="size-5 shrink-0" />
      <span>Currency settings are locked after creating accounts, budgets, or transactions.</span>
    </div>
  )
}
```

And during onboarding (when `canChangeCurrency` is true), show a tip:

```astro
{
  canChangeCurrency && (
    <p class="text-xs text-warning/80 mt-1 ml-4">
      Choose carefully — currency settings cannot be changed after you add accounts or transactions.
    </p>
  )
}
```

**Step 5: Update client-side save handler**

Move the save logic to a `.client.ts` file (per project rules — `.claude/rules/frontend/astro.md:30`). If the settings page already has a `.client.ts`, add to it; otherwise create `src/pages/settings/settings.client.ts`.

**IMPORTANT:** Disabled form fields are excluded from `FormData` by browsers. Read values directly from the DOM elements instead:

```ts
const currencySelect = document.getElementById('primary-currency') as HTMLSelectElement;
const secondaryCurrencySelect = document.getElementById('secondary-currency') as HTMLSelectElement;

const payload: Record<string, unknown> = {
  currency: currencySelect.value,
  secondaryCurrency: secondaryCurrencySelect.value,
  weekStart: formData.get('weekStart'),
  compactNumbers: formData.get('compactNumbers') === 'on',
};
```

Also wire up primary currency `change` event to re-filter secondary options (exclude selected primary):

```ts
currencySelect.addEventListener('change', () => {
  const selectedPrimary = currencySelect.value;
  for (const option of secondaryCurrencySelect.options) {
    if (option.value === '') continue; // "None" option
    option.hidden = option.value === selectedPrimary;
  }
  // If secondary matches new primary, reset to "None"
  if (secondaryCurrencySelect.value === selectedPrimary) {
    secondaryCurrencySelect.value = '';
  }
});
```

**Step 6: Run typecheck and verify**

Run: `bun run typecheck`
Run: `bun run dev` and navigate to `/settings` to verify the UI.

**Step 7: Commit**

```bash
git add src/pages/settings/index.astro
git commit -m "feat(settings): add secondary currency selector with lock mechanism"
```

---

## Task 9: Update Dashboard UI for Multi-Currency

**Files:**

- Modify: `src/pages/dashboard.astro`
- Modify: `src/components/organisms/SummaryCards.astro`
- Modify: `src/components/organisms/OnboardingChecklist.astro`
- Test: `bun run typecheck`, verify in browser

**Context:** Dashboard needs to show dual-currency summary cards and remove the `isSupportedCurrency` hardcoded check. The dashboard page must fetch workspace currencies and pass them to components.

**Step 1: Update dashboard.astro**

Replace `isSupportedCurrency` check (lines 47-66) with `isValidCurrency`:

```ts
import { isValidCurrency, type Currency } from '@/lib/constants/currency';

let primaryCurrency: Currency | null = null;
let secondaryCurrency: Currency | null = null;

// ... in try block:
const currencyValue = await workspaceMetaService.getCurrency(user.workspaceId);
primaryCurrency = isValidCurrency(currencyValue) ? currencyValue : null;

const secondaryValue = await workspaceMetaService.getSecondaryCurrency(user.workspaceId);
secondaryCurrency = secondaryValue && isValidCurrency(secondaryValue) ? secondaryValue : null;
```

Fetch dashboard data once — `getAccountsOptimized` now returns `CurrencyAmount[]` (grouped dynamically by currency), so no need to double-fetch. The `currency` parameter is still used for filtering budgets/spending widgets:

```ts
if (primaryCurrency) {
  dashboardData = await dashboardService.getDashboardData(
    user.workspaceId,
    currentMonth,
    currentYear,
    primaryCurrency,
    perf
  );
}
```

Pass `primaryCurrency` and `secondaryCurrency` to summary components.

**Step 2: Update AccountsWidget (NOT SummaryCards)**

**IMPORTANT:** The dashboard page (`dashboard.astro:25, 235`) renders `AccountsWidget`, not `SummaryCards`. Update `AccountsWidget` to accept and display multi-currency totals from the new `CurrencyAmount[]` structure.

Update Props:

```ts
interface Props {
  totalAccounts: TotalAccounts;
  totalDebt: TotalDebt;
  primaryCurrency: Currency;
  secondaryCurrency?: Currency | null;
}
```

Display both currency totals side-by-side in the summary area. If `SummaryCards.astro` is also used elsewhere, update it too — but verify which components the dashboard actually renders before modifying.

**Step 3: Update OnboardingChecklist**

Update step 1 title and description:

```ts
{
  id: 1,
  title: 'Set your currencies',
  description: 'Choose a primary and optionally a secondary currency',
  href: '/settings',
  complete: status.currency,
  unlocked: true,
},
```

**Step 4: Run typecheck and verify**

Run: `bun run typecheck`
Run: `bun run dev` and verify dashboard renders correctly.

**Step 5: Commit**

```bash
git add src/pages/dashboard.astro src/components/organisms/SummaryCards.astro src/components/organisms/OnboardingChecklist.astro
git commit -m "feat(dashboard): show multi-currency summary cards and update onboarding text"
```

---

## Task 10: Add Currency Tabs to Detail Widgets

**Files:**

- Create: `src/components/atoms/CurrencyTabs.astro` — reusable tab component
- Modify: Dashboard detail sections to use tabs
- Modify: Budget pages
- Modify: Transaction pages
- Modify: Report pages
- Test: `bun run typecheck`, verify in browser

**Context:** Detail widgets (budgets, spending, categories, budget health) need a tab bar to switch between primary and secondary currency. When only one currency is configured, no tabs are shown.

**Step 1: Create CurrencyTabs component**

Create `src/components/atoms/CurrencyTabs.astro`:

```astro
---
import type { Currency } from '@/lib/constants/currency';
import { getCurrencyMeta } from '@/lib/constants/currency';

interface Props {
  primary: Currency;
  secondary?: Currency | null;
  selected?: Currency;
  name?: string;
}

const { primary, secondary, selected, name = 'currency-tabs' } = Astro.props;
const showTabs = !!secondary;
const activeCurrency = selected || primary;
---

{
  showTabs && (
    <div class="tabs tabs-boxed tabs-sm bg-base-200 w-fit" data-currency-tabs={name}>
      <button
        type="button"
        class:list={['tab', activeCurrency === primary && 'tab-active']}
        data-currency-tab={primary}
      >
        {getCurrencyMeta(primary).flagEmoji} {primary}
      </button>
      <button
        type="button"
        class:list={['tab', activeCurrency === secondary && 'tab-active']}
        data-currency-tab={secondary}
      >
        {getCurrencyMeta(secondary!).flagEmoji} {secondary}
      </button>
    </div>
  )
}
```

**Step 2: Integrate tabs into dashboard**

Add `CurrencyTabs` above the budget/spending sections on the dashboard. Wire up client-side tab switching to reload section data via `?_render=html` API calls.

**Step 3: Add tabs to budget pages**

In `src/pages/budget/index.astro`, add `CurrencyTabs` and wire up client-side filtering.

**Step 4: Add tabs to transaction pages**

In `src/pages/transactions/index.astro`, replace the hardcoded `userCurrency = 'IDR'` with workspace primary currency and add tabs.

**Step 5: Add tabs to report pages**

In `src/pages/reports/index.astro`, replace hardcoded currency and add tabs.

**Step 6: Run typecheck and verify**

Run: `bun run typecheck`
Run: `bun run dev` and verify tabs work on all pages.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): add currency tabs to budget, transaction, and report pages"
```

---

## Task 11: Update Account Form — Restrict to Workspace Currencies

**Files:**

- Modify: `src/components/organisms/AccountFormModal.astro`
- Modify: `src/pages/accounts/index.astro`
- Test: `bun run typecheck`, verify in browser

**Context:** When creating an account, the currency dropdown should only show the workspace's configured currencies (primary + secondary if set), not all 12.

**Step 1: Pass workspace currencies to AccountFormModal**

In pages that render `AccountFormModal`, pass the workspace currencies:

```ts
const { primary, secondary } = await workspaceMetaService.getWorkspaceCurrencies(user.workspaceId);
const workspaceCurrencies = [primary, ...(secondary ? [secondary] : [])];
```

Update `AccountFormModal` props to accept `availableCurrencies`:

```ts
interface Props {
  // ... existing
  availableCurrencies?: Currency[];
}
```

Filter the currency dropdown to only show `availableCurrencies`.

**Step 2: Block cross-currency transfers**

In the transfer modal logic, filter destination accounts to match source account currency. This may already be partially implemented — verify and add validation.

**Step 3: Run typecheck and verify**

Run: `bun run typecheck`

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(accounts): restrict currency options to workspace currencies, block cross-currency transfers"
```

---

## Task 12: Update Seeder for Multi-Currency

**Files:**

- Modify: `src/db/seed.ts`
- Test: `bun run aw seed`

**Context:** The seeder should create a workspace with both primary and secondary currencies set, and seed accounts/transactions in both currencies.

**Step 1: Update workspace meta seeding**

**IMPORTANT:** The seeder already inserts `currency` meta key (around `seed.ts:713`). Do NOT insert it again — this causes a unique constraint violation on `(workspace_id, meta_key)`.

Instead, find the existing currency insert and update it to also insert `secondary_currency`. Use upsert to be safe:

```ts
// Set workspace currencies (upsert to avoid unique constraint on re-seed)
for (const entry of [
  { key: 'currency', value: 'IDR' },
  { key: 'secondary_currency', value: 'USD' },
]) {
  await db
    .insert(workspaceMeta)
    .values({
      id: nanoid(),
      workspace_id: workspaceId,
      meta_key: entry.key,
      meta_value: entry.value,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .onConflictDoUpdate({
      target: [workspaceMeta.workspace_id, workspaceMeta.meta_key],
      set: { meta_value: entry.value, updated_at: new Date() },
    });
}
```

**Step 2: Verify existing seed data**

Ensure existing seeded accounts have valid currencies from the expanded list. The current seed data uses IDR and USD which are still valid — no changes needed for account/transaction seeds.

**Step 3: Run seeder**

Run: `bun run aw seed`
Expected: Seeder completes without errors.

**Step 4: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat(seed): add workspace currency settings to seeder"
```

---

## Task 13: Generate Database Migrations

**Files:**

- Generated: `drizzle/sqlite/XXXX-multi-currency.sql` (Drizzle outputs to `drizzle/sqlite/` per `drizzle.config.ts:27`)
- Generated: `drizzle/postgresql/XXXX-multi-currency.sql` (Drizzle outputs to `drizzle/postgresql/` per `drizzle.config.ts:35`)

**Context:** Drizzle generates migrations by comparing current schema to the last snapshot. Since we removed the enum constraint (which is TypeScript-only for text columns in SQLite), the actual SQL migration may be minimal or empty for SQLite. PostgreSQL may need ALTER TABLE statements. The exchange_rates table drop will appear in both dialects.

**Step 1: Generate SQLite migration**

Run: `bun run db:generate`
Review the generated migration SQL in `drizzle/sqlite/`.

**Step 2: Generate PostgreSQL migration**

Run: `bun run db:generate:prod`
Review the generated migration SQL in `drizzle/postgresql/`.

**Step 3: Apply SQLite migration (dev)**

Run: `bun run db:migrate`
Expected: Migration applies successfully.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore(db): generate migrations for multi-currency schema changes"
```

---

## Task 14: Run Full Quality Gates & Fix

**Files:** Various

- Test: All quality gates

**Step 1: Run quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

**Step 2: Fix any remaining issues**

Address lint errors, type errors, and formatting issues.

**Step 3: Run tests**

```bash
bun run test
```

Fix any failing unit tests.

**Step 4: Run build**

```bash
bun run build
```

Verify the build succeeds.

**Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve quality gate issues for multi-currency support"
```

---

## Task 15: Clean Up Documentation & References

**Files:**

- Modify: `docs/architecture/004-database-schema.md` — update currency references
- Modify: `design-system/02-components.md` — remove CurrencySelector reference
- Modify: MCP server tools — update enum references
- Test: `bun run typecheck`

**Step 1: Update architecture docs**

In `docs/architecture/004-database-schema.md`, update the currency field documentation to reflect the expanded currency list.

**Step 2: Update design system docs**

In `design-system/02-components.md`, remove or update the CurrencySelector component reference.

**Step 3: Update MCP server tools**

In `mcp-server/src/tools/`:

- `budget.ts:8,20` — update `z.enum(['IDR', 'USD'])` and description
- `transactions.ts:29,71,89` — update enum and descriptions
- `dashboard.ts:8,12,24,35` — update enum and descriptions

**Step 4: Commit**

```bash
git add -A
git commit -m "docs: update architecture and MCP server for multi-currency support"
```

---

## Task 16: Update OpenAPI Schemas

**Files:**

- Modify: `openapi/schemas/WorkspaceSettings.yml`
- Modify: `openapi/schemas/UpdateWorkspaceSettingsRequest.yml`
- Modify: `openapi/paths/workspace.yml`
- Test: `bun run typecheck`

**Context:** Rules require OpenAPI updates for API changes (`.claude/rules/workflow.md:7`, `.claude/rules/backend/api.md:11`). Current schemas hardcode IDR/USD and don't include `secondaryCurrency`.

**Step 1: Update WorkspaceSettings.yml**

Replace the hardcoded `enum: [IDR, USD]` with a `type: string` + description listing supported currencies. Add `secondaryCurrency` field (nullable string).

**Step 2: Update UpdateWorkspaceSettingsRequest.yml**

Add `secondaryCurrency` optional field. Update `currency` from enum to string with validation description.

**Step 3: Update workspace.yml**

Update response examples to include `secondaryCurrency`.

**Step 4: Commit**

```bash
git add openapi/
git commit -m "docs(openapi): add secondaryCurrency and expand currency validation"
```

---

## Task 17: Add Service-Layer Currency Validation

**Files:**

- Modify: `src/services/account.service.ts`
- Modify: `src/services/budget.service.ts`
- Test: `bun run typecheck`

**Context:** Design requires service-layer validation that account/budget currency is in workspace's configured currencies (design:130, 135). The plan previously only did UI filtering — services must also enforce this.

**Step 1: Add workspace currency validation to AccountService**

In the account creation method, after validating other fields, check:

```ts
const { primary, secondary } = await workspaceMetaService.getWorkspaceCurrencies(workspaceId);
const allowedCurrencies = [primary, ...(secondary ? [secondary] : [])];
if (!allowedCurrencies.includes(currency)) {
  throw new AccountServiceError(
    ServiceErrorCode.INVALID_META_VALUE,
    `Currency '${currency}' is not configured for this workspace. Allowed: ${allowedCurrencies.join(', ')}`,
    400
  );
}
```

Also add transfer validation: block cross-currency transfers (source/destination accounts must have same currency).

**Step 2: Add workspace currency validation to BudgetService**

Same pattern in budget creation — currency must be in workspace's configured currencies.

**Step 3: Run typecheck**

Run: `bun run typecheck`

**Step 4: Commit**

```bash
git add src/services/account.service.ts src/services/budget.service.ts
git commit -m "feat(services): enforce workspace currency validation on account/budget creation"
```

---

## Task 18: Fix Transaction Form — Auto-Set Currency from Account

**Files:**

- Modify: `src/components/molecules/TransactionEntryForm.astro`
- Modify: Related `.client.ts` files
- Test: `bun run typecheck`, verify in browser

**Context:** Design requirement (design:96): "Transaction form: currency auto-set from selected account (no manual override)." Current form has a manual currency toggle (`TransactionEntryForm.astro:615-620`) that must be removed.

**Step 1: Remove manual currency toggle**

In `TransactionEntryForm.astro`, remove the currency toggle/dropdown. The currency should be derived from the selected account's currency — read-only display only.

**Step 2: Auto-set currency on account selection**

In the client-side script (`.client.ts`), when the user selects an account, automatically set the transaction currency to match that account's currency. Display it as a read-only badge next to the amount field.

**Step 3: Run typecheck and verify**

Run: `bun run typecheck`
Verify in browser that selecting an account auto-sets the currency.

**Step 4: Commit**

```bash
git add src/components/molecules/TransactionEntryForm.astro
git commit -m "feat(transactions): auto-set currency from selected account, remove manual override"
```

---

## Task 19: Update Existing Tests

**Files:**

- Modify: `src/db/index.integration.test.ts`
- Modify: `src/services/dashboard.service.test.ts`
- Modify: Other test files that reference removed/changed interfaces
- Test: `bun run test`

**Context:** Exchange rate removal and dashboard interface changes will break existing tests. This task explicitly updates them.

**Step 1: Fix integration test**

In `src/db/index.integration.test.ts:431`, remove assertions referencing `exchangeRates` schema export.

**Step 2: Fix dashboard service test**

In `src/services/dashboard.service.test.ts:57`, update assertions from `convertedCurrency` and hardcoded `idr`/`usd` fields to the new `CurrencyAmount[]` structure.

**Step 3: Fix any other broken test files**

Run `bun run test` and fix all failures related to:

- Removed `exchangeRates` references
- Changed `TotalAccounts`/`TotalDebt` interfaces
- Changed `Currency` type imports

**Step 4: Commit**

```bash
git add -A
git commit -m "test: update tests for multi-currency interface changes"
```

---

## Summary of Task Dependencies

```
Task 1 (Constants) ─┐
                     ├── Task 3 (Schema) ──── Task 13 (Migrations)
Task 2 (Meta Svc) ──┤
                     ├── Task 4 (Removals) ── Task 6 (Bulk Types, waves A→D) ── Task 7 (Dashboard Svc)
                     │                                                               │
                     ├── Task 5 (API) ───────────────────────────────────────────────┤
                     │                                                               │
                     ├── Task 16 (OpenAPI) ──────────────────────────────────────────┤
                     │                                                               │
                     ├── Task 17 (Service Validation) ──────────────────────────────┤
                     │                                                               │
                     └── Task 8 (Settings UI) ── Task 9 (Dashboard UI) ─────────────┤
                                                                                     │
                                                  Task 10 (Tabs) ───────────────────┤
                                                  Task 11 (Accounts) ───────────────┤
                                                  Task 18 (Transaction Form) ───────┤
                                                  Task 12 (Seeder) ─────────────────┤
                                                                                     │
                                                  Task 19 (Test Updates) ───────────┤
                                                  Task 14 (QA) ────────────────────┘
                                                  Task 15 (Docs)
```

**Parallelizable groups:**

- Tasks 1 + 2 can run in parallel (independent foundation)
- Tasks 3 + 4 can run in parallel after 1+2 (schema + removals)
- Tasks 5 + 16 + 17 can run in parallel (API + OpenAPI + service validation)
- Tasks 8 + 10 + 11 + 18 can run in parallel (UI changes)
- Tasks 12 + 13 + 15 + 19 can run in parallel (cleanup + tests)

**Highest-risk tasks (add review checkpoints):**

- Task 2 + 5: Lock atomicity — verify atomic transaction works in both SQLite and PostgreSQL
- Task 6: Mass typing (~80 files) — run typecheck after each wave
- Task 9: Dashboard architecture — verify which components dashboard.astro actually renders
- Task 7: Dashboard service — verify interface changes don't break consumers
