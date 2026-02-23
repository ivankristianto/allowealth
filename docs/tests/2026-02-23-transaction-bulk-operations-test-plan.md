# Transaction Bulk Operations - Manual Test Plan

**PR:** #272
**Branch:** `transaction-bulk-operation`
**Date:** 2026-02-23

## Overview

Adds multi-select checkboxes to the transaction list with a sticky bottom action bar for three bulk operations: change category, change account, and delete (soft). Selection is page-scoped and managed via Nano Store. Tests cover checkbox interaction, select-all, action bar visibility, each bulk action, filter/pagination clearing selection, error handling, and mobile responsiveness.

## Prerequisites

- Local dev server running (start with `bun run dev` in this worktree, note assigned port)
- Test credentials: `demo@example.com` / `demo123456789`
- Seed data loaded: at least 5+ transactions across multiple date groups, multiple categories, multiple accounts
- At least 2 pages of transactions (to test pagination clearing selection)

---

## Test Steps

### 1. Checkbox Rendering

**Components under test:** `TransactionCard.astro` (checkbox in mobile + desktop layouts)

| Step | Action                                                           | Expected Result                                                                                                 |
| ---- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1.1  | Navigate to `/transactions` and log in                           | Transaction list loads with date-grouped cards                                                                  |
| 1.2  | On desktop (1280px+), inspect a transaction card                 | A checkbox appears as the leftmost element in the horizontal row layout                                         |
| 1.3  | Resize to mobile width (375px), inspect a transaction card       | A checkbox appears to the left of the transaction content in the stacked mobile layout                          |
| 1.4  | Verify the checkbox has an accessible label                      | Checkbox has an `aria-label` containing the transaction description (e.g., "Select transaction: Grocery Store") |
| 1.5  | Verify that deleted/archived transactions do NOT show checkboxes | If any soft-deleted transactions are visible (archive view), they should not have a `data-bulk-select` checkbox |

### 2. Select-All Checkbox

**Components under test:** `TransactionDateGroups.astro` (select-all bar)

| Step | Action                                                            | Expected Result                                                                       |
| ---- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 2.1  | On `/transactions`, look above the first date group               | A "Select all" row is visible with a checkbox and label text "Select all"             |
| 2.2  | Click the "Select all" checkbox                                   | All transaction checkboxes on the page become checked                                 |
| 2.3  | Observe the label text next to the select-all checkbox            | Text changes from "Select all" to "N selected" where N is the total transaction count |
| 2.4  | Uncheck the "Select all" checkbox                                 | All transaction checkboxes become unchecked, label reverts to "Select all"            |
| 2.5  | Check 2 individual transactions, then observe select-all checkbox | Select-all checkbox shows indeterminate state (dash), label shows "2 selected"        |

### 3. Sticky Bottom Action Bar Visibility

**Components under test:** `BulkActionBar.astro`, `BulkActions.client.ts`

> **Critical:** The action bar must appear/disappear reactively based on selection state.

| Step | Action                                                              | Expected Result                                                                                     |
| ---- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 3.1  | With no transactions selected, check the bottom of the viewport     | No action bar is visible                                                                            |
| 3.2  | Check one transaction checkbox                                      | Sticky action bar slides in at the bottom with: X button, "1 selected", Category, Account, Delete   |
| 3.3  | Check two more transaction checkboxes                               | Action bar count updates to "3 selected"                                                            |
| 3.4  | Scroll down the page while transactions are selected                | Action bar remains fixed at the viewport bottom (sticky position)                                   |
| 3.5  | Click the X (clear) button in the action bar                        | All checkboxes uncheck, action bar disappears, select-all checkbox resets                           |
| 3.6  | On mobile (375px), check a transaction and observe the action bar   | Action bar shows icons only for Category/Account/Delete (text labels hidden via `hidden sm:inline`) |
| 3.7  | On desktop (640px+), check a transaction and observe the action bar | Action bar shows both icons and text labels ("Category", "Account", "Delete")                       |

### 4. Bulk Change Category

**Services under test:** `TransactionService.bulkUpdateCategory()`, `POST /api/transactions/bulk`

> **Critical:** Data mutation — must verify transactions actually update and audit trail is preserved.

| Step | Action                                                             | Expected Result                                                                                     |
| ---- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| 4.1  | Select 3 expense transactions using checkboxes                     | Action bar shows "3 selected"                                                                       |
| 4.2  | Click the "Category" button in the action bar                      | A dropdown opens upward listing categories grouped by Expense and Income sections                   |
| 4.3  | Select a different expense category from the dropdown              | Dropdown closes, loading state briefly shown, success toast appears: "3 transactions recategorized" |
| 4.4  | Verify the selected transactions now show the new category         | All 3 transactions display the newly assigned category name                                         |
| 4.5  | Verify the action bar disappeared and all checkboxes are unchecked | Selection cleared, action bar hidden                                                                |
| 4.6  | Reload the page                                                    | The 3 transactions still show the updated category (change persisted)                               |
| 4.7  | Navigate to one of the updated transactions' history/audit log     | Audit log shows individual category change entries for each transaction with field-level diffs      |

### 5. Bulk Change Account

**Services under test:** `TransactionService.bulkUpdateAccount()`, `POST /api/transactions/bulk`

> **Critical:** Data mutation — must verify account assignment changes correctly.

| Step | Action                                                    | Expected Result                                                      |
| ---- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| 5.1  | Select 2 transactions using checkboxes                    | Action bar shows "2 selected"                                        |
| 5.2  | Click the "Account" button in the action bar              | A dropdown opens upward listing all active accounts                  |
| 5.3  | Select a different account from the dropdown              | Success toast appears: "2 transactions updated"                      |
| 5.4  | Verify the selected transactions now show the new account | Both transactions display the newly assigned account name            |
| 5.5  | Verify selection is cleared                               | All checkboxes unchecked, action bar hidden                          |
| 5.6  | Reload the page                                           | The 2 transactions still show the updated account (change persisted) |

### 6. Bulk Delete

**Services under test:** `TransactionService.bulkDelete()`, `POST /api/transactions/bulk`

> **Critical:** Destructive action — must show confirmation modal before proceeding. Soft delete only.

| Step | Action                                                    | Expected Result                                                                                                                                           |
| ---- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1  | Note the current transaction count in the summary cards   | Record the count (e.g., "25 transactions")                                                                                                                |
| 6.2  | Select 2 transactions using checkboxes                    | Action bar shows "2 selected"                                                                                                                             |
| 6.3  | Click the "Delete" button in the action bar               | A confirmation modal appears with title "Delete Transactions" and message "Are you sure you want to delete 2 transactions? This action cannot be undone." |
| 6.4  | Click "Cancel" in the confirmation modal                  | Modal closes, selection is preserved (checkboxes still checked, action bar still visible)                                                                 |
| 6.5  | Click "Delete" in the action bar again                    | Confirmation modal reappears                                                                                                                              |
| 6.6  | Click "Delete All" (confirm button) in the modal          | Modal closes, loading state briefly shown, success toast: "2 transactions deleted"                                                                        |
| 6.7  | Verify the deleted transactions are no longer in the list | Transaction count decreases by 2, the specific transactions are removed from the visible list                                                             |
| 6.8  | Verify selection is cleared                               | All checkboxes unchecked, action bar hidden                                                                                                               |
| 6.9  | Reload the page                                           | Deleted transactions remain absent (soft delete persisted)                                                                                                |

### 7. Filter and Pagination Interaction

**Client script under test:** `TransactionsPage.client.ts` (clearSelection on filter/page change)

| Step | Action                                                                | Expected Result                                                 |
| ---- | --------------------------------------------------------------------- | --------------------------------------------------------------- |
| 7.1  | Select 3 transactions                                                 | Action bar shows "3 selected"                                   |
| 7.2  | Change the category filter dropdown                                   | Selection clears, all checkboxes uncheck, action bar disappears |
| 7.3  | Select 2 transactions again                                           | Action bar shows "2 selected"                                   |
| 7.4  | Change the month filter                                               | Selection clears, all checkboxes uncheck, action bar disappears |
| 7.5  | Select 2 transactions, then type in the search field                  | Selection clears as search triggers re-fetch                    |
| 7.6  | Select 1 transaction, then click page 2 in pagination                 | Selection clears on page navigation, action bar disappears      |
| 7.7  | On page 2, select a transaction, then click "Reset filters"           | Selection clears along with filter reset                        |
| 7.8  | Select transactions, then change the type filter (Expense/Income/All) | Selection clears                                                |
| 7.9  | Select transactions, then change the account filter                   | Selection clears                                                |

### 8. Error Handling

**Services under test:** Error paths in `BulkActions.client.ts`, API validation

| Step | Action                                                                                          | Expected Result                                                                       |
| ---- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 8.1  | Open DevTools Network tab, select 2 transactions, trigger a category change while offline       | Error toast appears with message (e.g., "Bulk operation failed"), selection preserved |
| 8.2  | Re-enable network, retry the same category change                                               | Success toast, selection clears, transactions updated                                 |
| 8.3  | (If testable) Trigger a partial failure (e.g., one selected transaction deleted by another tab) | Warning toast: "N updated, 1 failed"                                                  |

### 9. Mobile Responsiveness

**Components under test:** All bulk operation UI on mobile viewport

| Step | Action                                               | Expected Result                                                                   |
| ---- | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| 9.1  | Set viewport to 375px width                          | Transaction list renders in mobile card layout                                    |
| 9.2  | Checkboxes are visible and tappable on each card     | Checkbox appears to the left of the transaction content, adequate tap target size |
| 9.3  | Select 2 transactions                                | Action bar appears at bottom with icon-only buttons                               |
| 9.4  | Tap the Category icon button in the action bar       | Dropdown opens upward (dropdown-top) without clipping at bottom of screen         |
| 9.5  | Select a category from the dropdown                  | Success toast, transactions updated, selection cleared                            |
| 9.6  | Select 1 transaction, tap Delete icon button         | Confirmation modal opens, readable and properly sized for mobile                  |
| 9.7  | Confirm delete                                       | Transaction removed, toast shown                                                  |
| 9.8  | Set viewport to 768px (tablet), repeat steps 9.2-9.5 | Layout works correctly at tablet breakpoint                                       |

---

## Summary Checklist

| #   | Area            | Key Assertion                                                                   | Pass    |
| --- | --------------- | ------------------------------------------------------------------------------- | ------- |
| 1   | Checkboxes      | Checkbox visible on every transaction card in both mobile and desktop layouts   | PASS    |
| 2   | Select All      | Select-all toggles all visible checkboxes and shows indeterminate state         | PASS    |
| 3   | Action Bar      | Appears on first selection, disappears on clear, sticky at bottom               | PASS    |
| 4   | Change Category | Bulk recategorize works, toast shown, transactions updated, audit log preserved | PASS    |
| 5   | Change Account  | Bulk account change works, toast shown, transactions updated                    | PASS    |
| 6   | Bulk Delete     | Confirmation modal shown, soft delete works, transactions removed from list     | PASS    |
| 7   | Filter Clear    | Any filter/page change clears selection                                         | PASS    |
| 8   | Error Handling  | Network errors show error toast, selection preserved for retry                  | PASS    |
| 9   | Mobile          | All bulk operations usable on 375px viewport                                    | PARTIAL |

**Critical paths:** Steps 4, 5, and 6 are highest priority (data mutations with audit trail). All PASS.

## Automated Test Coverage

| Suite                     | Tests | File                                       |
| ------------------------- | ----- | ------------------------------------------ |
| TransactionService (bulk) | 7     | `src/services/transaction.service.test.ts` |

Full suite: run `bun test src/services/transaction.service.test.ts` — all tests should pass.
