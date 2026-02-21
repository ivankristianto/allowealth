# Account Filter on Transactions Page

## User Story

As a user, I want to filter transactions by payment method (account) so I can answer questions like "How much did I spend on BCA credit card for food & groceries this month?"

## Decisions

| Decision       | Choice                               | Rationale                                         |
| -------------- | ------------------------------------ | ------------------------------------------------- |
| Selection mode | Multi-select with checkboxes         | Consistent with category filter UX                |
| Grouping       | Grouped by account type              | Easy to find accounts when you have many          |
| Placement      | After Category, before Member        | Groups financial context together                 |
| Summary impact | Filters affect summary cards         | Directly answers the user's question              |
| Architecture   | Extract reusable MultiSelectDropdown | DRY - reuse for both category and account filters |

## Design

### 1. MultiSelectDropdown Component

New reusable `src/components/molecules/MultiSelectDropdown.astro` that encapsulates the multi-select dropdown pattern currently hardcoded in `TransactionFiltersBar.astro`.

**Props:**

```typescript
interface Props {
  id: string; // Unique DOM ID ("category", "account")
  label: string; // Default label ("All Categories")
  inputName: string; // Hidden input name ("category_ids")
  selectedIds?: string[]; // Pre-selected from URL
  items: Array<{
    id: string;
    name: string;
    group?: string; // Group header label
  }>;
  searchable?: boolean; // Show search input (default: true)
  searchPlaceholder?: string; // "Search categories..."
  filterEventType: string; // Event type ("category_ids", "account_ids")
  class?: string; // Additional CSS classes
}
```

**Renders:**

- Trigger button: icon + label + chevron, same styling as current category button
- Dropdown panel: optional search, clear-all/count header, checkbox list
- When items have `group` field: renders group headings as non-selectable styled separators
- Hidden `<input>` with comma-separated selected IDs

**Behavior:**

- Emits `filterChange` events: `{ type: filterEventType, value: string[] }`
- Listens for `FILTERS_RESET_EVENT` to clear selection
- Search filters items by name within visible groups
- Click toggles selection, updates checkbox visuals + label + count

**Icon:** The trigger button icon is passed via Astro slot (named slot `icon`) rather than as a prop, since Lucide icons are Astro components and can't be passed as props easily.

### 2. Service Changes

**TransactionFilters** in `transaction.service.ts`:

```typescript
export interface TransactionFilters {
  // ... existing fields
  account_id?: string; // Keep for single-account consumers
  account_ids?: string[]; // NEW: multiple account filter (OR)
}
```

Query builder addition:

```typescript
if (filters.account_ids?.length) {
  conditions.push(inArray(schema.transactions.account_id, filters.account_ids));
}
```

Applied in both `findAll` and `count` methods.

### 3. Transactions Page Changes

`src/pages/transactions/index.astro`:

- Import `accountService` from `@/services`
- Fetch accounts: `accountService.findAll(user.workspaceId)`
- Parse `account_ids` from URL query params (comma-separated, same as `category_ids`)
- Pass `account_ids` to filters object (service queries + summary + count)
- Transform accounts for dropdown: `{ id, name, group: accountTypeLabel(type) }`
- Pass `accounts` and `accountIds` props to `TransactionFiltersBar`

### 4. Filter Bar Changes

`src/components/organisms/TransactionFiltersBar.astro`:

- Replace inline category dropdown (~190 lines HTML + ~160 lines JS) with `<MultiSelectDropdown>`
- Add second `<MultiSelectDropdown>` for accounts after category
- New props: `accountIds?: string[]`, `accounts?: Array<{ id, name, type }>`
- Update `hasActiveFilters` to include `accountIds.length > 0`
- Update `buildFilterUrl` to include `account_ids` param
- Update reset handler to clear account selection
- Icon for accounts: `Wallet` from `@lucide/astro`

**Layout (Row 2):**

```
[Expenses | Income]  [Tag All Categories v]  [Wallet All Accounts v]  [Users All Members v]
```

### 5. Account Dropdown Grouping

Accounts grouped by type with non-selectable separators:

```
-- Bank Accounts --
  [x] BCA
  [ ] Mandiri
-- Credit Cards --
  [ ] BCA Credit Card
-- E-Wallets --
  [ ] GoPay
  [ ] OVO
```

Group headers: small muted text, not clickable. Search filters within groups. Empty groups hidden.

Account type display labels:

| DB Type      | Display Label |
| ------------ | ------------- |
| bank_account | Bank Accounts |
| credit_card  | Credit Cards  |
| e_wallet     | E-Wallets     |
| cash         | Cash          |
| mutual_fund  | Mutual Funds  |
| bond         | Bonds         |
| crypto       | Crypto        |
| stock        | Stocks        |
| loan         | Loans         |
| other        | Other         |

### 6. URL & State

- URL param: `account_ids=id1,id2`
- `transactionFiltersStore` in Nano Store: add `accountIds` field
- Reset clears `account_ids` from URL and state
- Progressive enhancement: hidden input submitted with form

### 7. Export Integration

`transactionService.exportToCSV(filters)` already uses `TransactionFilters` — once `account_ids` is in the filters, CSV export automatically respects the account filter.

## Out of Scope

- "Select all in group" (clicking group header to select all accounts of a type) — can add later
- Account filter on other pages (dashboard, reports) — separate feature
- Filtering transfers by `to_account_id` — current filter only matches source account
