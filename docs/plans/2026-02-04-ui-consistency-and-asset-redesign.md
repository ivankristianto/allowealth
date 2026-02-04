# UI Consistency & Asset Architecture Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix rounded corner inconsistencies across all pages, and redesign the asset page architecture so that asset history is the source of truth for values, with a monthly picker for time-travel views.

**Architecture:** Assets will use a denormalized cache pattern — `assets.balance` stays as the "latest value" synced with the most recent `asset_history` entry, and a new `initial_balance` field stores the creation-time balance. The asset page gains a monthly picker (URL-based, like budget page) and a separate "Update Value" modal distinct from "Edit Asset". Portfolio overview calculates from latest history entries for the selected month.

**Tech Stack:** Astro 5, Drizzle ORM (SQLite + PostgreSQL dual schema), DaisyUI v5, Tailwind CSS v4, vanilla JS client scripts

---

## Task 1: Replace `rounded-[2rem]` with `rounded-2xl`

**Files:**
- Modify: `src/components/organisms/landing/FeaturesGrid.astro:50`

**Step 1: Make the replacement**

In `FeaturesGrid.astro` line 50, replace `rounded-[2rem] sm:rounded-[2.5rem]` with `rounded-2xl sm:rounded-3xl`.

**Step 2: Verify visually**

Run: `bun run dev` and check `/` landing page — feature cards should have consistent rounded corners.

**Step 3: Commit**

```bash
git add src/components/organisms/landing/FeaturesGrid.astro
git commit -m "fix: replace rounded-[2rem] with rounded-2xl in FeaturesGrid"
```

---

## Task 2: Standardize card `rounded-3xl` to `rounded-card` across all components

**Files to modify** (replace `rounded-3xl` with `rounded-card` on card-level containers):
- `src/components/organisms/AssetGroupCard.astro:46` — the card wrapper
- `src/components/organisms/AssetHistoryModal.astro` — any card containers
- `src/components/organisms/TransactionActionsBar.astro` — card wrappers
- `src/components/organisms/TransactionSummaryCards.astro` — card wrappers
- `src/components/organisms/WealthTrajectory.astro` — card wrappers
- `src/components/organisms/SetNewBudgetModal.astro` — card wrappers
- `src/components/organisms/MemberList.astro` — card wrappers
- `src/components/organisms/CashFlowWidget.astro` — card wrappers
- `src/components/organisms/CategoryIntelligenceTable.astro` — card wrappers
- `src/components/organisms/CopyBudgetModal.astro` — card wrappers
- `src/components/molecules/Modal.astro` — the dialog card itself
- `src/components/molecules/NotificationDropdown.astro` — dropdown card
- `src/components/molecules/BudgetAlertBanner.astro` — banner card
- `src/components/molecules/CalculatorResultCard.astro` — result card
- `src/components/molecules/CashFlowItem.astro` — item card
- `src/components/atoms/StatCard.astro` — stat card
- `src/components/atoms/Card.astro` — base Card atom
- `src/components/partials/BudgetHistoryTablePartial.astro` — table card
- `src/components/partials/CategoryDrillDownPartial.astro` — card wrapper
- `src/components/partials/TransactionListPartial.astro` — list card
- `src/components/partials/TransactionSummaryPartial.astro` — summary card
- `src/components/partials/AssetCategoryTablePartial.astro` — table card
- `src/pages/budget/categories/index.astro` — page cards
- `src/pages/transactions/index.astro` — page cards
- `src/pages/settings/index.astro` — page cards
- `src/pages/budget/history.astro` — page cards
- `src/pages/contact.astro` — page cards
- `src/pages/assets/categories/index.astro` — page cards
- `src/pages/assets/index.astro:175` — empty state card
- Landing page components (`FeaturesGrid`, `PricingSection`, `ShowcaseSection`) — keep as-is or use `rounded-2xl`/`rounded-3xl` since they are marketing pages, not app cards

**Step 1: Open each file and replace `rounded-3xl` with `rounded-card` on card-level container elements**

Important rules:
- Only replace on **card-level containers** (the outermost wrapper with `bg-base-*`, `border`, `shadow` patterns)
- Do NOT replace `rounded-3xl` on inner elements, icons, or decorative items
- Landing page components (`src/components/organisms/landing/*`) can keep their own rounded styles
- The `Modal.astro` dialog box should use `rounded-card` for its card container

**Step 2: Run quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

**Step 3: Commit**

```bash
git add -A
git commit -m "fix: standardize card rounded corners to rounded-card token"
```

---

## Task 3: Add `initial_balance` field to database schemas

**Files:**
- Modify: `src/db/schema/sqlite/assets.ts`
- Modify: `src/db/schema/postgresql/assets.ts`
- Modify: `src/lib/types/asset.ts`

**Step 1: Add `initial_balance` to SQLite schema**

In `src/db/schema/sqlite/assets.ts`, add after line 33 (`balance` field):

```typescript
initial_balance: text('initial_balance'), // Original balance at creation, stored as string
```

**Step 2: Add `initial_balance` to PostgreSQL schema**

In `src/db/schema/postgresql/assets.ts`, add after line 34 (`balance` field):

```typescript
initial_balance: text('initial_balance'), // Original balance at creation, stored as string
```

**Step 3: Add `initial_balance` to type interfaces**

In `src/lib/types/asset.ts`, add to `Asset` interface (after `balance`):

```typescript
initial_balance: string | null;
```

Add to `AssetOutput` interface (after `balance`):

```typescript
initial_balance?: string | null;
```

**Step 4: Generate migration**

```bash
bun run db:generate
```

**Step 5: Push migration**

```bash
bun run db:push
```

**Step 6: Commit**

```bash
git add src/db/schema/ src/lib/types/asset.ts drizzle/
git commit -m "feat: add initial_balance field to assets schema"
```

---

## Task 4: Update AssetService for `initial_balance` and date-aware `updateBalance`

**Files:**
- Modify: `src/services/asset.service.ts`

**Step 1: Update `CreateAssetInput` interface**

No change needed — `balance` is already in the input and will be used for both `balance` and `initial_balance`.

**Step 2: Update `create()` method**

In the `create()` method, add `initial_balance: input.balance` to the values object (line 58-71):

```typescript
const [asset] = await (this.db as any)
  .insert(this.schema.assets)
  .values({
    id,
    workspace_id: input.workspace_id,
    created_by_user_id: input.created_by_user_id,
    name: input.name,
    type: input.type,
    category_id: input.category_id ?? null,
    balance: input.balance,
    initial_balance: input.balance,
    currency: input.currency,
    last_updated: now,
    created_at: now,
    updated_at: now,
  })
  .returning();
```

**Step 3: Update `UpdateAssetBalanceInput` to accept optional `recorded_at`**

```typescript
export interface UpdateAssetBalanceInput {
  balance: string;
  notes?: string;
  recorded_at?: Date; // Allow backdating entries, defaults to now
}
```

**Step 4: Update `updateBalance()` to use `recorded_at`**

In the history entry creation (line 206-212), use `input.recorded_at || now`:

```typescript
await (this.db as any).insert(this.schema.assetHistory).values({
  id: nanoid(),
  asset_id: id,
  balance: input.balance,
  notes: input.notes,
  recorded_at: input.recorded_at || now,
});
```

**Step 5: Add `getSnapshotForMonth()` method**

Add new method to `AssetService`:

```typescript
/**
 * Get the latest balance snapshot for each asset within a given month.
 * For each asset, returns the most recent history entry where recorded_at <= end of month.
 * If no entry exists for a month, returns the most recent entry before that month.
 */
async getSnapshotForMonth(
  workspaceId: string,
  year: number,
  month: number,
  perf?: PerfCollector
) {
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999); // Last moment of the month

  return trackQuery('AssetService.getSnapshotForMonth', perf, async () => {
    // Get all non-deleted assets
    const allAssets = await this.findAll(workspaceId);

    // For each asset, find the latest history entry <= endOfMonth
    const snapshots = await Promise.all(
      allAssets.map(async (asset) => {
        const history = await this.db.query.assetHistory.findFirst({
          where: and(
            eq(this.schema.assetHistory.asset_id, asset.id),
            sql`${this.schema.assetHistory.recorded_at} <= ${endOfMonth}`
          ),
          orderBy: (assetHistory: any, { desc }: any) => [desc(assetHistory.recorded_at)],
        });

        return {
          ...asset,
          snapshot_balance: history?.balance || asset.initial_balance || asset.balance,
          snapshot_date: history?.recorded_at || asset.created_at,
        };
      })
    );

    return snapshots;
  });
}
```

**Step 6: Run typecheck**

```bash
bun run typecheck
```

**Step 7: Commit**

```bash
git add src/services/asset.service.ts
git commit -m "feat: add initial_balance support and monthly snapshot to AssetService"
```

---

## Task 5: Update balance API endpoint to accept `recorded_at`

**Files:**
- Modify: `src/pages/api/assets/[id]/balance.ts`

**Step 1: Update validation schema**

Add `recorded_at` to the zod schema:

```typescript
const updateBalanceSchema = z.object({
  balance: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Balance must be a valid number'),
  notes: z.string().optional(),
  recorded_at: z.string().datetime().optional(),
});
```

**Step 2: Pass `recorded_at` to service**

In the POST handler, convert `recorded_at` string to Date before passing to service:

```typescript
const serviceInput = {
  ...validation.data,
  recorded_at: validation.data.recorded_at ? new Date(validation.data.recorded_at) : undefined,
};
const asset = await assetService.updateBalance(id, auth.workspaceId, serviceInput);
```

**Step 3: Commit**

```bash
git add src/pages/api/assets/[id]/balance.ts
git commit -m "feat: accept recorded_at in balance update API"
```

---

## Task 6: Create new "Update Asset Value" modal (`AssetUpdateValueModal.astro`)

**Files:**
- Create: `src/components/organisms/AssetUpdateValueModal.astro`

**Purpose:** A lightweight modal that only asks for Date, Balance, and Notes — used to record a new value for an existing asset. This is separate from the Edit Asset modal (which handles name, category, currency).

**Step 1: Create the component**

The modal should:
- Listen for `open-asset-update-value` custom event with `{ id, name, currency, currentBalance }`
- Show fields: Date (input type="date", default today), Balance (number), Notes (textarea, optional)
- Submit to `POST /api/assets/:id/balance` with `{ balance, notes, recorded_at }`
- Show toast on success, reload page
- Use same premium styling as `AssetFormModal` (rounded-2xl inputs, accent colors)
- Use `Modal` molecule wrapper with `size="sm"`

Template structure:
```astro
<div data-asset-update-value-modal-container data-id={id}>
  <Modal id={id} size="sm" closable={false} backdropClose={true}>
    <div slot="default" class="flex flex-col gap-6">
      <!-- Header with RefreshCw icon -->
      <!-- Form: date, balance, notes -->
      <!-- Actions: Cancel + Update Value -->
    </div>
  </Modal>
</div>
```

Client script should:
- Listen for `open-asset-update-value` event
- Populate asset name in header subtitle
- Set date input default to today (YYYY-MM-DD format)
- On submit: POST to `/api/assets/${assetId}/balance`
- Convert date to ISO string for `recorded_at`

**Step 2: Run quality gates**

```bash
bun run lint:fix && bun run format:fix && bun run typecheck
```

**Step 3: Commit**

```bash
git add src/components/organisms/AssetUpdateValueModal.astro
git commit -m "feat: create AssetUpdateValueModal for recording balance updates"
```

---

## Task 7: Update AssetItemRow with "Update Value" button and show initial balance

**Files:**
- Modify: `src/components/organisms/AssetItemRow.astro`

**Step 1: Add "Update Value" button**

Add a new button next to the existing History/Edit/Delete buttons. Use `RefreshCw` icon from lucide:

```astro
import { TrendingUp, Pencil, Trash2, Clock, RefreshCw } from '@lucide/astro';
```

Add button before the Edit button:

```astro
{/* Update Value */}
<button
  type="button"
  class="p-2 text-base-content/50 hover:text-warning transition-all rounded-xl hover:bg-warning/10"
  title="Update value"
  aria-label={`Update ${name} value`}
  data-update-value-asset={id}
  data-asset-name={name}
  data-asset-currency={currency}
  data-asset-balance={balance}
  data-testid="asset-update-value-btn"
>
  <RefreshCw size={18} class="stroke-current" aria-hidden="true" />
</button>
```

**Step 2: Add client script for the new button**

Add event listener that dispatches `open-asset-update-value` with asset details.

**Step 3: Remove balance update from Edit flow**

The Edit button (pencil) should now only open the form modal for metadata changes (name, category, currency). The current flow where editing also calls `/balance` endpoint should be removed from `AssetFormModal`.

In `AssetFormModal.astro` script, remove the balance update section (lines 443-455) — the part that calls `/api/assets/${assetId}/balance` during edit mode.

Also hide the Balance field in edit mode of `AssetFormModal`:
- When `data.id` is set (edit mode), hide the balance input field since balance updates go through the new "Update Value" modal.

**Step 4: Commit**

```bash
git add src/components/organisms/AssetItemRow.astro src/components/organisms/AssetFormModal.astro
git commit -m "feat: add Update Value button, separate balance update from edit flow"
```

---

## Task 8: Add `AssetUpdateValueModal` to the assets page and wire events

**Files:**
- Modify: `src/pages/assets/index.astro`

**Step 1: Import and add the modal**

Add import:
```typescript
import AssetUpdateValueModal from '@components/organisms/AssetUpdateValueModal.astro';
```

Add modal alongside other modals (after line 196):
```astro
<AssetUpdateValueModal id="asset-update-value-modal" />
```

**Step 2: Update AssetItemRow props to include `initialBalance`**

Add `initialBalance` prop to `AssetItemRow`:
- In `AssetItemRow.astro` Props interface, add: `initialBalance?: number;`
- Display initial balance in a subtle secondary line under the main balance

In `assets/index.astro`, pass `initialBalance`:
```astro
<AssetItemRow
  ...
  balance={parseFloat(asset.balance)}
  initialBalance={parseFloat(asset.initial_balance || asset.balance)}
  ...
/>
```

Also update the `AssetOutput` mapping (lines 82-98) to include `initial_balance`.

**Step 3: Commit**

```bash
git add src/pages/assets/index.astro src/components/organisms/AssetItemRow.astro
git commit -m "feat: wire AssetUpdateValueModal and show initial balance in asset rows"
```

---

## Task 9: Add monthly picker to assets page

**Files:**
- Modify: `src/pages/assets/index.astro`
- Modify: `src/components/organisms/AssetPageHeader.astro`

**Step 1: Add month navigation to AssetPageHeader**

Follow the same pattern as `BudgetPageHeader.astro` — add `prevMonthUrl`, `nextMonthUrl`, `currentMonth`, `isNextDisabled`, `currentMonthResetUrl` props.

Add Props to `AssetPageHeader`:
```typescript
export interface Props {
  title?: string;
  subtitle?: string;
  className?: string;
  defaultCategoryId?: string;
  currentMonth?: string;
  prevMonthUrl?: string;
  nextMonthUrl?: string;
  isNextDisabled?: boolean;
  currentMonthResetUrl?: string;
}
```

Add the month navigation UI (copy the pattern from `BudgetPageHeader.astro` lines 73-126) between the title and the action buttons. Import `ChevronLeft`, `ChevronRight`, `CalendarDays` from lucide.

**Step 2: Update assets page to parse month params and build navigation URLs**

In `src/pages/assets/index.astro`, add URL parameter parsing (same pattern as budget page):

```typescript
const yearParam = url.searchParams.get('year');
const monthParam = url.searchParams.get('month');
const now = new Date();
const selectedYear = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
const selectedMonth = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;

// Build month navigation URLs
const buildMonthUrl = (year: number, month: number) => {
  const params = new URLSearchParams();
  params.set('year', year.toString());
  params.set('month', month.toString());
  // Preserve existing filters
  if (searchParams.type) params.set('type', searchParams.type);
  if (searchParams.categoryId) params.set('categoryId', searchParams.categoryId);
  if (searchParams.currency) params.set('currency', searchParams.currency);
  return `/assets?${params.toString()}`;
};

const prevMonthDate = new Date(selectedYear, selectedMonth - 2, 1);
const nextMonthDate = new Date(selectedYear, selectedMonth, 1);
const isViewingCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
const isNextMonthFuture = nextMonthDate > now;

const currentMonthDisplay = new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', {
  month: 'long',
  year: 'numeric',
});
```

**Step 3: Use `getSnapshotForMonth` when viewing non-current months**

When `yearParam` or `monthParam` is provided, use the snapshot method instead of `findAll`:

```typescript
let assets: AssetOutput[];
if (yearParam || monthParam) {
  // Historical view: get snapshot for the selected month
  const snapshots = await assetService.getSnapshotForMonth(
    user.workspaceId, selectedYear, selectedMonth, Astro.locals.perf
  );
  assets = snapshots.map(snapshot => ({
    ...transformToOutput(snapshot),
    balance: snapshot.snapshot_balance,
  }));
} else {
  // Current view: use latest balance
  const rawAssets = await assetService.findAll(user.workspaceId, filters, Astro.locals.perf);
  assets = rawAssets.map(transformToOutput);
}
```

**Step 4: Pass month navigation props to AssetPageHeader**

```astro
<AssetPageHeader
  defaultCategoryId={defaultCategoryId}
  currentMonth={currentMonthDisplay}
  prevMonthUrl={buildMonthUrl(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1)}
  nextMonthUrl={!isNextMonthFuture ? buildMonthUrl(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1) : undefined}
  isNextDisabled={isNextMonthFuture}
  currentMonthResetUrl={!isViewingCurrentMonth ? '/assets' : undefined}
/>
```

**Step 5: Run quality gates**

```bash
bun run lint:fix && bun run format:fix && bun run typecheck
```

**Step 6: Commit**

```bash
git add src/pages/assets/index.astro src/components/organisms/AssetPageHeader.astro
git commit -m "feat: add monthly picker to assets page for historical views"
```

---

## Task 10: Update portfolio overview to use monthly snapshot values

**Files:**
- Modify: `src/lib/utils/asset.ts` (no changes needed — it already works with `AssetOutput[]`)
- Modify: `src/pages/assets/index.astro` (already done in Task 9 — snapshot balances are passed as `balance`)

**Step 1: Verify portfolio calculations work with snapshot data**

The `calculatePortfolioTotals()` and `calculateAssetAllocation()` functions in `src/lib/utils/asset.ts` already use `asset.balance` — since we're overriding `balance` with `snapshot_balance` in Task 9, these will automatically show the correct historical totals.

**Step 2: Add a visual indicator when viewing historical data**

In `src/pages/assets/index.astro`, show a subtle banner above the portfolio summary when viewing a non-current month:

```astro
{!isViewingCurrentMonth && (
  <div class="bg-warning/10 border border-warning/20 rounded-card px-4 py-3 text-sm text-warning font-medium flex items-center gap-2">
    <CalendarDays size={16} class="stroke-current shrink-0" />
    Showing portfolio values as of {currentMonthDisplay}. Update actions are disabled for historical views.
  </div>
)}
```

When viewing historical months, disable the "Add Asset" and "Update Value" buttons.

**Step 3: Run quality gates**

```bash
bun run lint:fix && bun run format:fix && bun run typecheck
```

**Step 4: Commit**

```bash
git add src/pages/assets/index.astro
git commit -m "feat: show historical indicator and disable mutations for past months"
```

---

## Task 11: Backfill `initial_balance` for existing assets

**Files:**
- Modify: `src/db/seed.ts` or create a migration script

**Step 1: Create a one-time backfill**

Add logic to the seed script or create a standalone script that:
1. Finds all assets where `initial_balance IS NULL`
2. For each, finds the earliest `asset_history` entry (ordered by `recorded_at ASC`)
3. Sets `initial_balance` to that entry's balance
4. If no history exists, sets `initial_balance = balance` (current balance)

```typescript
// Backfill script logic
const assetsWithoutInitial = await db.query.assets.findMany({
  where: sql`${schema.assets.initial_balance} IS NULL AND ${schema.assets.deleted_at} IS NULL`,
});

for (const asset of assetsWithoutInitial) {
  const firstHistory = await db.query.assetHistory.findFirst({
    where: eq(schema.assetHistory.asset_id, asset.id),
    orderBy: (h, { asc }) => [asc(h.recorded_at)],
  });

  await db.update(schema.assets)
    .set({ initial_balance: firstHistory?.balance || asset.balance })
    .where(eq(schema.assets.id, asset.id));
}
```

**Step 2: Run the backfill**

```bash
bun run db:seed
```

Or run as a standalone script.

**Step 3: Commit**

```bash
git add src/db/
git commit -m "feat: backfill initial_balance from earliest history entry"
```

---

## Task 12: Final quality gates and integration test

**Step 1: Run all quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

**Step 2: Manual testing checklist**

- [ ] Landing page: feature cards have `rounded-2xl` (no arbitrary values)
- [ ] All app cards use `rounded-card` consistently
- [ ] Assets page: shows monthly picker defaulting to current month
- [ ] Navigate to previous month: portfolio totals reflect historical values
- [ ] Navigate to future month: next button disabled
- [ ] "Today" button appears when viewing non-current month
- [ ] Historical view shows warning banner
- [ ] Add Asset: sets `initial_balance` equal to initial `balance`
- [ ] Edit Asset (pencil): only edits name, category, currency — no balance field
- [ ] Update Value (refresh icon): opens separate modal with date, balance, notes
- [ ] Update Value creates history entry and updates `assets.balance`
- [ ] Portfolio overview reflects updated values immediately
- [ ] Asset item row shows initial balance as secondary text

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final polish and quality gate pass"
```

---

## File Summary

### Files Created:
- `src/components/organisms/AssetUpdateValueModal.astro` — new modal for balance updates

### Files Modified:
- `src/db/schema/sqlite/assets.ts` — add `initial_balance`
- `src/db/schema/postgresql/assets.ts` — add `initial_balance`
- `src/lib/types/asset.ts` — add `initial_balance` to interfaces
- `src/services/asset.service.ts` — `initial_balance` in create, `recorded_at` in updateBalance, new `getSnapshotForMonth`
- `src/pages/api/assets/[id]/balance.ts` — accept `recorded_at`
- `src/pages/assets/index.astro` — monthly picker, snapshot view, historical banner
- `src/components/organisms/AssetPageHeader.astro` — add month navigation UI
- `src/components/organisms/AssetItemRow.astro` — add Update Value button, show initial balance
- `src/components/organisms/AssetFormModal.astro` — remove balance from edit mode
- `src/components/organisms/landing/FeaturesGrid.astro` — `rounded-2xl`
- `src/components/organisms/AssetGroupCard.astro` — `rounded-card`
- ~30 other components/pages — `rounded-3xl` → `rounded-card`
