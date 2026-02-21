# Account Filter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-select account filter to the transactions page, extracting a reusable MultiSelectDropdown component from the existing category filter pattern.

**Architecture:** Extract the category multi-select dropdown into a generic `MultiSelectDropdown.astro` component that handles checkbox toggle, search, clear-all, and event dispatching. Use it for both category and new account filters. Add `account_ids` support through the full stack: service → API → client store → UI.

**Tech Stack:** Astro 5.x components, Nano Stores, DaisyUI v5, Drizzle ORM, Lucide icons

---

## Task 1: Add `account_ids` to Transaction Service

**Files:**

- Modify: `src/services/transaction.service.ts`

**Step 1: Add `account_ids` to TransactionFilters interface**

In `src/services/transaction.service.ts`, add `account_ids` to the `TransactionFilters` interface (around line 62, after `account_id`):

```typescript
export interface TransactionFilters {
  workspace_id: string;
  type?: 'expense' | 'income' | 'transfer';
  category_id?: string;
  category_ids?: string[];
  account_id?: string;
  account_ids?: string[]; // Multiple account filter (OR logic)
  created_by_user_id?: string;
  currency?: 'IDR' | 'USD';
  start_date?: Date;
  end_date?: Date;
  search?: string;
  include_deleted?: boolean;
  include_history_flag?: boolean;
  limit?: number;
  offset?: number;
}
```

**Step 2: Add `account_ids` filter condition in `findAll` query builder**

In the `findAll` method, after the existing `account_id` condition (around line 318), add:

```typescript
if (filters.account_ids && filters.account_ids.length > 0) {
  conditions.push(inArray(this.schema.transactions.account_id, filters.account_ids));
}
```

Note: `inArray` is already imported from `drizzle-orm` (line 6).

**Step 3: Add `account_ids` filter condition in `count` query builder**

In the `count` method, after the existing `account_id` condition (around line 652), add the same condition:

```typescript
if (filters.account_ids && filters.account_ids.length > 0) {
  conditions.push(inArray(this.schema.transactions.account_id, filters.account_ids));
}
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (no new errors)

**Step 5: Commit**

```bash
git add src/services/transaction.service.ts
git commit -m "feat(transactions): add account_ids multi-select filter to service"
```

---

## Task 2: Add `account_ids` Parsing to API Endpoint

**Files:**

- Modify: `src/pages/api/transactions/index.ts`

**Step 1: Parse `account_ids` from query params**

In `src/pages/api/transactions/index.ts`, after the existing `account_id` parsing (around line 67), add:

```typescript
const accountIds = url.searchParams.get('account_ids');
if (accountIds) {
  filters.account_ids = accountIds.split(',').filter(Boolean);
}
```

**Step 2: Include `account_ids` in monthSummary query**

The user wants the summary cards to reflect account filters. In the monthSummary calculation (around line 115), the current query only uses `workspace_id`, `created_by_user_id`, and date range. Add `account_ids`:

```typescript
const monthTransactions = await transactionService.findAll({
  workspace_id: auth.workspaceId,
  created_by_user_id: filters.created_by_user_id,
  account_ids: filters.account_ids, // Include account filter in summary
  start_date: filters.start_date,
  end_date: filters.end_date,
  include_deleted: false,
  limit: PAGINATION.MAX_MONTH_TRANSACTIONS,
});
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/pages/api/transactions/index.ts
git commit -m "feat(api): parse account_ids filter and include in summary calculation"
```

---

## Task 3: Add `account_ids` to Client-Side Plumbing

**Files:**

- Modify: `src/lib/stores/transactionFiltersStore.ts`
- Modify: `src/lib/api/transactionsApiClient.ts`
- Modify: `src/components/organisms/TransactionsPage.client.ts`

**Step 1: Add `account_ids` to filter store**

In `src/lib/stores/transactionFiltersStore.ts`:

1. Add to the `TransactionFilters` interface (after `account_id`, around line 23):

```typescript
account_ids: string[]; // Support multiple accounts
```

2. Add to `initialFilters` (after `account_id: ''`, around line 38):

```typescript
account_ids: [],
```

3. Update `initFiltersFromSSR` to handle `account_ids` (around line 57):

```typescript
const newFilters: TransactionFilters = {
  ...initialFilters,
  ...filters,
  category_ids: filters.category_ids || [],
  account_ids: filters.account_ids || [],
};
```

4. Update `hasActiveFilters` to check `account_ids` (add after `account_id` check, around line 86):

```typescript
filters.account_ids.length > 0 ||
```

**Step 2: Add `account_ids` to API client buildQueryString**

In `src/lib/api/transactionsApiClient.ts`, after the `account_id` block (around line 107), add:

```typescript
if (filters.account_ids && filters.account_ids.length > 0) {
  params.set('account_ids', filters.account_ids.join(','));
}
```

**Step 3: Add `account_ids` handling to TransactionsPage.client.ts**

In `src/components/organisms/TransactionsPage.client.ts`:

1. Add to the `SSRData.filters` interface (around line 88):

```typescript
account_ids: string[];
```

2. Add `account_ids` handler in `processFilterChangeEvent` (around line 75):

```typescript
} else if (type === 'account_ids') {
  handleAccountIdsFilterChange(value as string[]);
}
```

3. Add the handler function (after `handleCategoryIdsFilterChange`, around line 327):

```typescript
function handleAccountIdsFilterChange(accountIds: string[]): void {
  transactionFiltersStore.setKey('account_ids', accountIds);
  transactionFiltersStore.setKey('page', 1);
  updateUrl();
  fetchAndRender();
}
```

4. Add `account_ids` to `fetchAndRender` filter params (around line 188):

```typescript
account_ids: filters.account_ids.length > 0 ? filters.account_ids : undefined,
```

5. Add `account_ids` to `updateUrl` — add to the clear list (around line 520):

```typescript
['type', 'search', 'user_id', 'category_id', 'category_ids', 'account_ids', 'month', 'page'].forEach((key) => {
```

And add the set block (after `category_ids`, around line 531):

```typescript
if (filters.account_ids && filters.account_ids.length > 0) {
  url.searchParams.set('account_ids', filters.account_ids.join(','));
}
```

6. Add `account_ids` to `handlePopState` parsing (around line 547):

```typescript
const accountIdsParam = params.account_ids || '';
const accountIds = accountIdsParam ? accountIdsParam.split(',').filter(Boolean) : [];
```

And include in the store set (around line 555):

```typescript
account_ids: accountIds,
```

7. Add `account_ids: []` to the reset handler store set (around line 722):

```typescript
account_ids: [],
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/stores/transactionFiltersStore.ts src/lib/api/transactionsApiClient.ts src/components/organisms/TransactionsPage.client.ts
git commit -m "feat(client): add account_ids to filter store, API client, and page orchestrator"
```

---

## Task 4: Create MultiSelectDropdown Component

**Files:**

- Create: `src/components/molecules/MultiSelectDropdown.astro`

**Step 1: Create the component**

Create `src/components/molecules/MultiSelectDropdown.astro` with the following structure. This extracts the pattern from the category dropdown in `TransactionFiltersBar.astro`.

**Props:**

```typescript
interface Props {
  id: string; // Unique instance ID ("category", "account")
  label: string; // Default label ("All Categories", "All Accounts")
  inputName: string; // Hidden input name ("category_ids", "account_ids")
  selectedIds?: string[]; // Pre-selected IDs from URL
  items: Array<{
    id: string;
    name: string;
    group?: string; // Visual group header label
    filterType?: string; // For parent-controlled visibility filtering
  }>;
  searchable?: boolean; // Show search input (default: true)
  searchPlaceholder?: string; // Placeholder text
  filterEventType: string; // filterChange event type ("category_ids", "account_ids")
  class?: string;
}
```

**HTML structure:**

- Container `div.dropdown.dropdown-end` with `data-multiselect-id={id}`
- Hidden `<input>` with `name={inputName}` and `id={id}-filter`
- Trigger button with slot for icon, label text, chevron
- Dropdown panel with:
  - Optional search input (if `searchable`)
  - Clear all button + count display
  - Items list, optionally grouped under headers
  - Each item is a label with checkbox visual (same pattern as current category items)
- Items get `data-ms-item={item.id}`, `data-ms-name={item.name.toLowerCase()}`, and optionally `data-ms-filter-type={item.filterType}`
- Group headers are non-interactive `div` elements with muted text styling

**Script:**
The script runs once, finds all `[data-multiselect-id]` containers, and initializes each with:

- Internal `selectedIds: string[]` state (initialized from hidden input)
- `toggleItem(id)` — add/remove from selection, update UI
- `clearAll()` — empty selection
- `filterBySearch(query)` — show/hide items by name match
- `filterByType(type)` — show/hide items by `data-ms-filter-type` (for category type switching)
- `pruneHiddenSelections()` — remove selected IDs for items that are currently hidden
- `updateUI()` — sync label text, count, checkbox visuals, hidden input
- Dispatches `filterChange` with `{ type: filterEventType, value: selectedIds }`
- Listens for `FILTERS_RESET_EVENT` to clear selection
- Listens for `multiselect:filter` custom event with `{ id, filterType }` to filter items by type and prune

**Key behaviors:**

- Search only filters within items that pass the current `filterType` filter
- When `filterByType` is called, items not matching are hidden AND deselected (pruned)
- Pruning dispatches `filterChange` only if selection actually changed

Use the same styling classes as the current category dropdown:

- Trigger: `flex items-center gap-2 px-4 py-3 text-xs font-bold border border-base-300 bg-base-100 text-base-content rounded-2xl shadow-sm hover:border-base-content/30 transition-colors min-w-[160px]`
- Dropdown: `dropdown-content z-50 p-3 shadow-lg bg-base-100 rounded-2xl w-72 border border-base-300 mt-2`
- Items: `flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-base-200`
- Checkbox: `w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors`
- Selected state: `bg-accent/10` on item, `bg-accent border-accent` on checkbox

For group headers, use:

```html
<div class="px-3 py-1.5 text-xs font-semibold text-base-content/40 uppercase tracking-wider">
  {group.name}
</div>
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/molecules/MultiSelectDropdown.astro
git commit -m "feat(ui): create reusable MultiSelectDropdown component"
```

---

## Task 5: Refactor Category Filter to Use MultiSelectDropdown

**Files:**

- Modify: `src/components/organisms/TransactionFiltersBar.astro`

**Step 1: Import MultiSelectDropdown**

Add import at top of `TransactionFiltersBar.astro`:

```typescript
import MultiSelectDropdown from '@/components/molecules/MultiSelectDropdown.astro';
```

**Step 2: Replace inline category dropdown HTML with MultiSelectDropdown**

Replace the category dropdown section (lines 184-278, the `showCategoryFilter && categories.length > 0` block) with:

```astro
{
  showCategoryFilter && categories.length > 0 && (
    <MultiSelectDropdown
      id="category"
      label="All Categories"
      inputName="category_ids"
      selectedIds={categoryIds}
      items={categories.map((c) => ({ id: c.id, name: c.name, filterType: c.type }))}
      searchable={true}
      searchPlaceholder="Search categories..."
      filterEventType="category_ids"
    >
      <Tag size={16} class="stroke-current text-base-content/40" aria-hidden="true" slot="icon" />
    </MultiSelectDropdown>
  )
}
```

Note: Category items use `filterType: c.type` so the parent can filter them by expense/income type.

**Step 3: Remove category JS from TransactionFiltersBar script**

Remove the following functions/blocks from the `<script>` tag that are now handled by MultiSelectDropdown:

- `selectedCategoryIds` variable and all its usages
- `initCategorySelection()` function
- `updateCategoryUI()` function
- `updateCategoryVisibility()` function
- Category option click handler (`[data-category-option]` listeners)
- Category search handler (`[data-category-search]` listener)
- Clear all handler (`[data-category-clear-all]` listener)
- Category-related reset in `FILTERS_RESET_EVENT` handler (the `selectedCategoryIds = []` and `updateCategoryUI()` calls)

**Step 4: Update type toggle handler to dispatch multiselect:filter event**

The type toggle handler currently calls `updateCategoryVisibility(filterType)` and prunes `selectedCategoryIds`. Replace this with dispatching a `multiselect:filter` event that the MultiSelectDropdown will handle:

```typescript
// In type filter button click handler, after updating aria-pressed and visual states:
if (filterType) {
  // Tell the category dropdown to filter by the new type and prune
  window.dispatchEvent(
    new CustomEvent('multiselect:filter', {
      detail: { id: 'category', filterType },
    })
  );
}
```

Remove the old `updateCategoryVisibility(filterType)` and `selectedCategoryIds` pruning code from the type toggle handler. The `multiselect:filter` event handler in the MultiSelectDropdown will handle both filtering AND pruning, and will dispatch its own `filterChange` event if the selection changed.

**Step 5: Simplify updateResetButtonVisibility**

Remove `selectedCategoryIds.length > 0` from `hasActiveFilters` check in `updateResetButtonVisibility`. Instead, check the hidden input value:

```typescript
const categoryFilter = document.getElementById('category-filter') as HTMLInputElement | null;
const hasCategories = categoryFilter ? categoryFilter.value.trim() !== '' : false;
```

**Step 6: Simplify FILTERS_RESET_EVENT handler**

The category reset is now handled by the MultiSelectDropdown (it listens for `FILTERS_RESET_EVENT` and clears itself). Remove category-specific reset code from the TransactionFiltersBar's `FILTERS_RESET_EVENT` handler. Keep only member filter reset and other non-category reset logic.

**Step 7: Remove unused imports**

Remove `Search` and `Check` from the Lucide imports if they're no longer used in TransactionFiltersBar (they've moved to MultiSelectDropdown).

**Step 8: Run typecheck and verify**

Run: `bun run typecheck`
Expected: PASS

Run: `bun run build`
Expected: PASS

**Step 9: Commit**

```bash
git add src/components/organisms/TransactionFiltersBar.astro
git commit -m "refactor(filters): extract category dropdown into MultiSelectDropdown component"
```

---

## Task 6: Add Account Filter to TransactionFiltersBar

**Files:**

- Modify: `src/components/organisms/TransactionFiltersBar.astro`

**Step 1: Add account props to the interface**

In the `Props` interface, add:

```typescript
accountIds?: string[];
accounts?: Array<{ id: string; name: string; type: string }>;
showAccountFilter?: boolean;
```

**Step 2: Destructure new props with defaults**

In the props destructuring:

```typescript
const {
  // ... existing props
  accountIds = [],
  accounts = [],
  showAccountFilter = false,
} = Astro.props;
```

**Step 3: Import Wallet icon**

Add `Wallet` to the Lucide import:

```typescript
import { ChevronDown, Tag, RotateCcw, Users, Wallet } from '@lucide/astro';
```

Note: `Search` and `Check` may have been removed in Task 5 since they moved to MultiSelectDropdown.

**Step 4: Add account MultiSelectDropdown after category**

After the category `MultiSelectDropdown`, add the account filter:

```astro
{
  showAccountFilter && accounts.length > 0 && (
    <MultiSelectDropdown
      id="account"
      label="All Accounts"
      inputName="account_ids"
      selectedIds={accountIds}
      items={accounts.map((a) => ({ id: a.id, name: a.name, group: a.type }))}
      searchable={true}
      searchPlaceholder="Search accounts..."
      filterEventType="account_ids"
    >
      <Wallet
        size={16}
        class="stroke-current text-base-content/40"
        aria-hidden="true"
        slot="icon"
      />
    </MultiSelectDropdown>
  )
}
```

Note: Account items use `group: a.type` for visual grouping by account type. The group labels will be the account type strings (e.g., "bank_account"). The MultiSelectDropdown should render group headers using display-friendly labels.

**Step 5: Update hasActiveFilters check**

Add `accountIds.length > 0` to the `hasActiveFilters` check:

```typescript
const hasActiveFilters =
  typeFilter !== 'expense' ||
  searchValue !== '' ||
  categoryIds.length > 0 ||
  accountIds.length > 0 ||
  userId !== '' ||
  (selectedMonth !== '' && selectedMonth !== currentMonth);
```

**Step 6: Update buildFilterUrl to include account_ids**

In the `buildFilterUrl` function, add after the `category_ids` line:

```typescript
if (accountIds.length > 0) params.set('account_ids', accountIds.join(','));
```

**Step 7: Update updateResetButtonVisibility for account_ids**

Add a check for the account filter hidden input in `updateResetButtonVisibility`:

```typescript
const accountFilter = document.getElementById('account-filter') as HTMLInputElement | null;
const hasAccounts = accountFilter ? accountFilter.value.trim() !== '' : false;
```

Include `hasAccounts` in the `hasFilters` check.

**Step 8: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 9: Commit**

```bash
git add src/components/organisms/TransactionFiltersBar.astro
git commit -m "feat(filters): add account multi-select dropdown to filter bar"
```

---

## Task 7: Wire Up Transactions Page

**Files:**

- Modify: `src/pages/transactions/index.astro`

**Step 1: Import accountService**

Add `accountService` to the import from `@/services` (around line 22):

```typescript
import { transactionService, categoryService, accountService } from '@/services';
```

**Step 2: Import ACCOUNT_TYPE_LABELS**

```typescript
import { ACCOUNT_TYPE_LABELS } from '@/lib/types/account';
import type { AccountType } from '@/lib/types/account';
```

**Step 3: Parse account_ids from URL**

After the `userId` parsing (around line 60), add:

```typescript
const accountIdsParam = searchParams.account_ids || '';
const accountIds = accountIdsParam ? accountIdsParam.split(',').filter(Boolean) : [];
```

**Step 4: Add account_ids to filter object**

In the `filters` object (around line 70), replace the single `account_id` line with:

```typescript
account_id: searchParams.account_id,
account_ids: accountIds.length > 0 ? accountIds : undefined,
```

**Step 5: Fetch accounts**

After the categories fetch (around line 102), add:

```typescript
const accounts = await trackPhase('accountService.findAll', perf, () =>
  accountService.findAll(user.workspaceId, undefined, perf)
);
```

**Step 6: Build account type group labels**

Create a mapping function to pluralize account type labels for group headers:

```typescript
const ACCOUNT_TYPE_GROUP_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_account: 'Bank Accounts',
  e_wallet: 'E-Wallets',
  mutual_fund: 'Mutual Funds',
  bond: 'Bonds',
  crypto: 'Crypto',
  stock: 'Stocks',
  other: 'Other',
  credit_card: 'Credit Cards',
  loan: 'Loans',
};
```

**Step 7: Transform accounts for the filter dropdown**

```typescript
const accountOptions = accounts.map((a) => ({
  id: a.id,
  name: a.name,
  type: ACCOUNT_TYPE_GROUP_LABELS[a.type] || a.type,
}));
```

**Step 8: Update summary calculation to respect account filter**

The current summary (around line 167-189) calculates from `allUserTransactions` which doesn't apply account filters. To make the summary reflect account filters, add account filtering to the summary calculation.

In the `filters` for `allUserTransactions` fetch (around line 106), this is an unfiltered fetch used for month extraction AND summary. For the summary portion, if `accountIds` are active, filter the transactions:

```typescript
// In the summary calculation loop (around line 175):
allUserTransactions.forEach((t: any) => {
  const txDate = new Date(t.transaction_date);
  const txMonthKey = createMonthKey(txDate);

  if (txMonthKey === effectiveMonth) {
    // Skip if account filter is active and this transaction doesn't match
    if (accountIds.length > 0 && !accountIds.includes(t.account_id)) {
      return;
    }
    const amount = safeParseAmount(t.amount);
    if (t.type === 'income') {
      monthlyIncome += amount;
    } else {
      monthlyExpenses += Math.abs(amount);
      expenseCount++;
    }
  }
});
```

**Step 9: Update buildBaseUrl**

In `buildBaseUrl` (around line 192), add account_ids:

```typescript
if (accountIds.length > 0) params.set('account_ids', accountIds.join(','));
```

**Step 10: Add account_ids to SSR data filters**

In the `ssrData` object (around line 228), add `account_ids` to the filters:

```typescript
filters: {
  type: typeFilter,
  search: searchValue,
  user_id: userId,
  category_id: categoryId,
  category_ids: categoryIds,
  account_ids: accountIds,
  month: effectiveMonth,
  page,
},
```

**Step 11: Pass account data to TransactionFiltersBar**

Update the `TransactionFiltersBar` component rendering (around line 301) to include account props:

```astro
<TransactionFiltersBar
  typeFilter={typeFilter}
  searchValue={searchValue}
  categoryIds={categoryIds}
  categories={categories}
  showCategoryFilter={true}
  accountIds={accountIds}
  accounts={accountOptions}
  showAccountFilter={accountOptions.length > 0}
  userId={userId}
  members={memberOptions}
  showMemberFilter={showMemberFilter}
  selectedMonth={effectiveMonth}
  currentMonth={currentMonthKey}
  baseUrl={baseUrl}
/>
```

**Step 12: Run typecheck and build**

Run: `bun run typecheck`
Expected: PASS

Run: `bun run build`
Expected: PASS

**Step 13: Commit**

```bash
git add src/pages/transactions/index.astro
git commit -m "feat(transactions): wire up account filter with data fetching and summary integration"
```

---

## Task 8: Quality Gates and Final Verification

**Step 1: Run all quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

All must pass.

**Step 2: Run build**

```bash
bun run build
```

Expected: PASS with no errors.

**Step 3: Manual verification**

Start dev server and verify:

- Account dropdown appears in filter bar after category
- Accounts are grouped by type with headers
- Multi-select works (checkboxes, label updates, count)
- Search within dropdown works
- Clear all works
- Summary cards update when accounts are filtered
- URL updates with `account_ids=...`
- Reset button clears account filter
- Category filter still works (type switching prunes categories)
- Browser back/forward preserves account filter state

**Step 4: Commit any formatting fixes**

```bash
git add -A
git commit -m "chore: formatting and quality gate fixes"
```

---

## Key Reference Files

| File                                                           | Purpose                                  |
| -------------------------------------------------------------- | ---------------------------------------- |
| `src/services/transaction.service.ts:57-72`                    | TransactionFilters interface             |
| `src/services/transaction.service.ts:316-318`                  | account_id filter in findAll             |
| `src/services/transaction.service.ts:650-652`                  | account_id filter in count               |
| `src/pages/api/transactions/index.ts:64-67`                    | account_id parsing                       |
| `src/pages/api/transactions/index.ts:111-143`                  | monthSummary calculation                 |
| `src/lib/stores/transactionFiltersStore.ts:17-29`              | Client TransactionFilters                |
| `src/lib/api/transactionsApiClient.ts:77-130`                  | buildQueryString                         |
| `src/components/organisms/TransactionsPage.client.ts:67-76`    | processFilterChangeEvent                 |
| `src/components/organisms/TransactionsPage.client.ts:515-536`  | updateUrl                                |
| `src/components/organisms/TransactionsPage.client.ts:541-575`  | handlePopState                           |
| `src/components/organisms/TransactionsPage.client.ts:717-729`  | reset handler                            |
| `src/components/organisms/TransactionsPage.client.ts:184-196`  | fetchAndRender filters                   |
| `src/components/organisms/TransactionFiltersBar.astro:19-31`   | FilterBar Props                          |
| `src/components/organisms/TransactionFiltersBar.astro:186-278` | Category dropdown HTML                   |
| `src/components/organisms/TransactionFiltersBar.astro:339-663` | Category JS logic                        |
| `src/pages/transactions/index.astro:45-85`                     | URL parsing + filter building            |
| `src/pages/transactions/index.astro:100-102`                   | Category fetch                           |
| `src/pages/transactions/index.astro:167-189`                   | Summary calculation                      |
| `src/pages/transactions/index.astro:228-241`                   | SSR data serialization                   |
| `src/pages/transactions/index.astro:301-313`                   | FilterBar rendering                      |
| `src/lib/types/account.ts:177-188`                             | ACCOUNT_TYPE_LABELS                      |
| `src/lib/constants/events.ts`                                  | PERIOD_CHANGE_EVENT, FILTERS_RESET_EVENT |
