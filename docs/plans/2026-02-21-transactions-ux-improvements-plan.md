# Transactions UX Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 3 UX issues on the transactions page: replace desktop inline actions with a kebab menu, add a toolbar visual separator, and improve history tooltip copy.

**Architecture:** Pure frontend changes to two Astro components. No service/API/DB changes. The mobile layout already has the kebab dropdown pattern — we replicate it for desktop.

**Tech Stack:** Astro components, DaisyUI dropdown, Lucide icons, Tailwind CSS

---

### Task 1: Replace desktop inline actions with kebab dropdown menu

**Files:**

- Modify: `src/components/molecules/TransactionCard.astro:17` (add import)
- Modify: `src/components/molecules/TransactionCard.astro:329-375` (replace desktop actions)

**Step 1: Add `EllipsisVertical` to the Lucide import**

In `src/components/molecules/TransactionCard.astro`, line 17, change the import:

```diff
-import { CreditCard, Ellipsis, History, Pencil, Trash2 } from '@lucide/astro';
+import { CreditCard, Ellipsis, EllipsisVertical, History, Pencil, Trash2 } from '@lucide/astro';
```

**Step 2: Replace desktop actions block (lines 329-375)**

Replace the entire `{/* Actions (fixed-width column for alignment) */}` block with a kebab dropdown that mirrors the mobile pattern (lines 169-232). The key differences from mobile:

- Uses `EllipsisVertical` instead of `Ellipsis`
- Uses `btn-sm` instead of `btn-xs`
- Container width is fixed `w-10` instead of conditional `w-24`/`w-8`

Replace lines 329-375 with:

```astro
{/* Actions — kebab menu (mirrors mobile dropdown pattern) */}
<div class="flex-shrink-0 w-10 flex justify-end">
  {
    transaction && (
      <div class="dropdown dropdown-end">
        <button
          type="button"
          tabindex={0}
          class="btn btn-ghost btn-sm btn-square"
          aria-label="Transaction actions"
          aria-haspopup="menu"
        >
          <EllipsisVertical size={16} class="stroke-current opacity-40" aria-hidden="true" />
        </button>
        <ul
          tabindex={0}
          class="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-xl w-48 border border-base-300"
          role="menu"
        >
          <li role="none" class:list={[!hasHistory && 'disabled opacity-40']}>
            <button
              type="button"
              role="menuitem"
              class="flex items-center gap-2"
              aria-label={
                hasHistory ? `View edit history for: ${primaryText}` : 'No edit history available'
              }
              aria-disabled={!hasHistory}
              {...(hasHistory ? { 'data-toggle-history': transaction.id } : {})}
            >
              <History size={16} class="stroke-current" aria-hidden="true" />
              View edit history
            </button>
          </li>
          {showActions && !isDeleted && (
            <>
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="flex items-center gap-2"
                  aria-label={`Edit transaction: ${primaryText}`}
                  data-edit-transaction={transaction.id}
                  data-transaction-data={transactionDataJson}
                >
                  <Pencil size={16} class="stroke-current" aria-hidden="true" />
                  Edit
                </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="flex items-center gap-2 text-error"
                  aria-label={`Delete transaction: ${primaryText}`}
                  data-delete-transaction={transaction.id}
                  data-transaction-details={transactionDetailsJson}
                >
                  <Trash2 size={16} class="stroke-current" aria-hidden="true" />
                  Delete
                </button>
              </li>
            </>
          )}
        </ul>
      </div>
    )
  }
</div>
```

**Step 3: Update component docstring**

In `src/components/molecules/TransactionCard.astro`, line 7, update the comment:

```diff
- * - Desktop: Horizontal layout with inline edit/delete buttons
+ * - Desktop: Horizontal layout with kebab dropdown menu for actions
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors, 0 warnings

**Step 5: Visual verification in Chrome**

Navigate to `http://ux-transactions.expenses.local:4320/transactions` and verify:

- Desktop rows show a single `⋮` button instead of 3 inline icons
- Clicking `⋮` opens a dropdown with "View edit history", "Edit", "Delete"
- Delete opens the existing confirmation modal
- Edit opens the transaction drawer
- History toggles the history panel (when available)
- Mobile layout is unchanged (still uses `...` horizontal menu)

**Step 6: Commit**

```bash
git add src/components/molecules/TransactionCard.astro
git commit -m "refactor(transactions): replace desktop inline actions with kebab menu

Replaces the 3 always-visible action icons (history, edit, delete) with
a single kebab menu dropdown on desktop. Reduces visual clutter and
eliminates the always-visible red trash icon.

Closes part of #254"
```

---

### Task 2: Add toolbar visual separator between action groups

**Files:**

- Modify: `src/components/molecules/ActionBar.astro:56-61` (add divider before primary slot)

**Step 1: Add vertical divider before primary slot**

In `src/components/molecules/ActionBar.astro`, replace lines 56-61:

```diff
  {
    hasPrimary && (
-     <div class="order-first md:order-last md:ml-auto shrink-0">
+     <div class="order-first md:order-last md:ml-auto shrink-0 flex items-center gap-2 md:gap-3">
+       <div class="hidden md:block border-l border-base-300 h-6 self-center" aria-hidden="true" />
        <slot name="primary" />
      </div>
    )
  }
```

The divider is:

- `hidden md:block` — only visible on desktop (mobile has different ordering via `order-first`)
- `border-l border-base-300 h-6` — 1px left border, 24px tall, matches base border color
- `self-center` — vertically centered in the flex container
- `aria-hidden="true"` — decorative, not announced by screen readers

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors, 0 warnings

**Step 3: Visual verification in Chrome**

Navigate to `http://ux-transactions.expenses.local:4320/transactions` and verify:

- Desktop: vertical line visible between "Scan Receipt" and "Expense" buttons
- Mobile: no divider visible (buttons still flow naturally)

**Step 4: Commit**

```bash
git add src/components/molecules/ActionBar.astro
git commit -m "fix(toolbar): add visual separator between action groups

Adds a vertical divider on desktop between utility actions (Import,
Export, Scan) and entry shortcuts (Expense, Income) for clearer
visual grouping.

Closes part of #254"
```

---

### Task 3: Improve history tooltip copy in mobile layout

**Files:**

- Modify: `src/components/molecules/TransactionCard.astro:185-197` (mobile menu history item)

**Step 1: Update mobile history menu item text and aria-labels**

In `src/components/molecules/TransactionCard.astro`, update the mobile dropdown history item (lines 185-198):

Replace:

```astro
<li role="none" class:list={[!hasHistory && 'disabled opacity-40']}>
  <button
    type="button"
    role="menuitem"
    class="flex items-center gap-2"
    aria-label={hasHistory ? `View history for: ${primaryText}` : 'No history available'}
    aria-disabled={!hasHistory}
    {...hasHistory ? { 'data-toggle-history': transaction.id } : {}}
  >
    <History size={16} class="stroke-current" aria-hidden="true" />
    History
  </button>
</li>
```

With:

```astro
<li role="none" class:list={[!hasHistory && 'disabled opacity-40']}>
  <button
    type="button"
    role="menuitem"
    class="flex items-center gap-2"
    aria-label={hasHistory ? `View edit history for: ${primaryText}` : 'No edit history available'}
    aria-disabled={!hasHistory}
    {...hasHistory ? { 'data-toggle-history': transaction.id } : {}}
  >
    <History size={16} class="stroke-current" aria-hidden="true" />
    View edit history
  </button>
</li>
```

Changes:

- Menu text: "History" → "View edit history"
- `aria-label`: "View history for" → "View edit history for" / "No history available" → "No edit history available"

Note: The desktop kebab menu (Task 1) already has the updated copy.

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors, 0 warnings

**Step 3: Visual verification in Chrome**

Resize browser to mobile width (~390px), navigate to transactions page, tap `...` menu on a transaction row:

- Menu item should read "View edit history" instead of "History"

**Step 4: Commit**

```bash
git add src/components/molecules/TransactionCard.astro
git commit -m "fix(transactions): improve history tooltip and menu copy

Updates 'History' to 'View edit history' and 'No history' to
'No edit history' in both mobile menu items and aria-labels
for better clarity.

Closes #254"
```

---

### Task 4: Run quality gates

**Step 1: Run all quality gates**

```bash
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
```

Expected: All pass with 0 errors.

**Step 2: Build verification**

```bash
bun run build
```

Expected: Build succeeds with no errors.
