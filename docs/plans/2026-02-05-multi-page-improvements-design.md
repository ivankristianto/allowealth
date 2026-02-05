# Multi-Page Improvements Design

**Date:** 2026-02-05
**Scope:** Assets, Budget, Transactions, Settings, Security pages

---

## 1. Assets Page

### 1a. Inline Expandable Asset History (Last 10 Changes)

Each asset row gets a clickable toggle (chevron icon or "History" text link). When clicked, a section expands inline below the row showing a compact table:

| Date | Balance | Change | Notes |
| ---- | ------- | ------ | ----- |

**API:** `GET /api/assets/:id/history?limit=10` (add `limit` query param to existing endpoint)

**Behavior:**

- Shows loading skeleton while fetching
- Collapses when clicked again or when another asset's history is expanded
- "Change" column = difference from previous entry (green positive, red negative)
- "View all" link at bottom navigates to `/assets/history/:id`
- Smooth expand/collapse animation using Motion library

**Files to modify:**

- `src/pages/api/assets/[id]/history.ts` — add `limit` query param support
- `src/components/molecules/AssetItemRow.astro` — add expand toggle + history container
- New: `src/components/molecules/AssetInlineHistory.client.ts` — fetch + render logic

### 1b. Asset Transfer (Balance-Only)

New "Transfer" button in assets page header. Opens modal with:

- **From:** Asset dropdown (name + current balance)
- **To:** Asset dropdown (filtered to exclude "from" selection, same currency only)
- **Amount:** Number input with currency prefix
- **Notes:** Optional text field

**API:** `POST /api/assets/transfer`

**Backend logic:**

1. Validate both assets exist and belong to workspace
2. Validate "from" has sufficient balance
3. Deduct from source asset, create asset_history entry
4. Add to target asset, create asset_history entry
5. Use compensating transaction pattern (rollback on failure)

**Files to create/modify:**

- New: `src/components/organisms/AssetTransferModal.astro`
- New: `src/pages/api/assets/transfer.ts`
- `src/services/asset.service.ts` — add `transfer(fromId, toId, amount, notes, workspaceId)` method
- `src/pages/assets/index.astro` — add Transfer button + include modal

### 1c. Remove Cash from System Defaults

Remove "Cash" entry from `DEFAULT_ASSET_CATEGORIES` in `src/lib/constants.ts`. Existing cash assets remain untouched. No schema/migration changes needed.

---

## 2. Budget Page

### 2a. Export Button (CSV)

Add Export button to budget page header matching transaction styling: `btn btn-soft rounded-full px-5 h-12 text-sm font-bold`.

- Uses existing `GET /api/budget/export` endpoint
- Downloads `budget_YYYY-MM-DD.csv`
- CSV columns: `category_name, budget_amount, currency, month, year, notes`
- Respects current month/year filter

**Files to modify:**

- `src/pages/budget/index.astro` — add Export button with client-side download logic

### 2b. Import Button (CSV) with Modal

Import button next to Export, same styling. Opens a modal (simpler than transaction import):

**Step 1:** File upload with drag-and-drop zone
**Step 2:** Preview table + confirmation: "Overwrite existing budgets for this month?" checkbox

- Checked = delete existing budgets for month/year, then import all
- Unchecked = only add new, skip existing category/month combos
  **Step 3:** Results summary (imported, skipped, errors)

**Expected CSV format:** `category_name, budget_amount, currency, month, year, notes`

**API:** `POST /api/budget/import`

**Backend logic:**

- Parse CSV, validate columns
- For each row: look up category by name → if not found, skip with error
- If overwrite: delete existing budgets for that month/year, then insert all valid rows
- If not overwrite: check unique constraint, skip rows where budget exists
- Return `{ imported, skipped, errors: [{ row, message }] }`

**Files to create/modify:**

- New: `src/components/organisms/BudgetImportModal.astro`
- New: `src/pages/api/budget/import.ts`
- `src/services/budget.service.ts` — add `importFromCSV()` method
- `src/pages/budget/index.astro` — add Import button + include modal

### 2c. Category Dropdown Filtering in Add Budget Modal

When "Add Budget" modal opens for a month/year:

- Fetch existing budgets: categories that already have a budget for that month
- Disable those categories in the dropdown (greyed out with "(already set)" suffix)
- Prevents duplicate budget creation (unique constraint violation)

**Files to modify:**

- `src/components/organisms/BudgetFormModal.astro` or equivalent — filter dropdown options

### 2d. Table View Mode Toggle

Toggle (Card/Table icons) in budget page header, next to filters.

**Card mode** = existing `BudgetCardGrid` (default)
**Table mode** = new `BudgetTable` component

| Category | Budget | Spent | Remaining | % Used | Status |
| -------- | ------ | ----- | --------- | ------ | ------ |

- Sortable columns (click header to sort)
- Status = colored badge (green=ok, yellow=warning, red=exceeded)
- Category column shows icon + name
- Mobile responsive: cards default on mobile, table on desktop
- Persist preference in `localStorage`

**Files to create/modify:**

- New: `src/components/organisms/BudgetTable.astro`
- `src/pages/budget/index.astro` — add view toggle, conditional render

---

## 3. Transaction Page

### 3a. Wire Import Button to Existing Flow

The import infrastructure already exists and works:

- `CSVImportForm.astro` — 5-stage import form
- `/api/transactions/import` — backend endpoint
- `/transactions/import` — dedicated page

**Fix:** In `TransactionActionsBar.astro`, change import button click handler from showing "coming soon!" toast to `window.location.href = '/transactions/import'`.

**Files to modify:**

- `src/components/molecules/TransactionActionsBar.astro` — line ~123, change toast to navigation

---

## 4. User Profile Settings

### 4a. Fix Profile Save (No POST Triggered)

The profile form redirects without making a POST request.

**Fix:**

- Add client-side `<script>` to intercept form submit via `e.preventDefault()`
- Collect form data (name, email, other fields)
- `POST /api/user/profile` using `csrfFetch`
- On success: show toast "Profile updated successfully"
- On error: show inline form error (new pattern)
- Verify `/api/user/profile` POST endpoint exists; create if needed

**Files to modify:**

- `src/pages/settings/index.astro` — add form submission script
- Possibly new: `src/pages/api/user/profile.ts` — POST endpoint if missing

---

## 5. Security Page

### 5a. Fix Copy Button + Toast Z-Index

1. **Copy button failure:** Likely `navigator.clipboard.writeText()` failing in modal context. Fix with proper async handling and fallback to `document.execCommand('copy')` with a hidden textarea.

2. **Toast behind backdrop:** Ensure toast container z-index is above modal backdrop. Set to `z-[100]` or use a portal that renders outside the modal.

**Files to modify:**

- Security page component (API key section) — fix copy handler
- `src/lib/stores/toastStore.ts` or toast component — ensure z-index > modal

### 5b. Modal Errors → Inline Form Errors (All Modals)

**New pattern for all modal forms:**

- On form submission error, inject `<div class="alert alert-error" role="alert">` at top of form inside the modal
- Do NOT use `addToast()` for modal form errors
- Follows existing pattern from `AssetForm.astro` (`#asset-form-error` div)

**Apply to:** All modal forms across the app (security, budget, asset modals)

### 5c. Rename "API Key" → "MCP Access Token"

- Change all labels, headings, descriptions from "API Key" to "MCP Access Token"
- Update description to mention MCP server authentication
- Update any related API endpoints/services if they reference "api_key" in user-facing text

**Files to modify:**

- Security page component — rename labels and descriptions

### 5d. MCP Setup Instructions Dialog

Add help/info button (Lucide `Info` or `HelpCircle` icon) next to "MCP Access Token" section header.

Opens a dialog containing:

- Brief explanation of what MCP is
- How to configure the MCP server with this token
- Example configuration JSON snippet
- Copy button for the config
- Link to external documentation if available

**Files to create/modify:**

- New: `src/components/organisms/MCPSetupInstructionsModal.astro`
- Security page — add info button + include modal

---

## Implementation Priority (Suggested Order)

1. **Quick fixes first:** 3a (transaction import wire), 4a (profile save), 5a (copy + z-index), 1c (remove cash default)
2. **Rename + UX:** 5c (MCP rename), 5b (inline modal errors)
3. **New features:** 1a (asset inline history), 2c (budget dropdown filter), 2d (budget table view)
4. **Medium features:** 1b (asset transfer), 2a (budget export button), 5d (MCP instructions)
5. **Larger features:** 2b (budget import)

---

## Technical Notes

- All new modals use `<dialog>` element with `showModal()`/`close()` pattern
- All API calls use `csrfFetch` for CSRF protection
- All forms validate with Zod on server side
- Budget import CSV parser follows existing transaction import pattern (no external CSV library)
- Compensating transactions for asset transfer (same pattern as asset balance update)
- Dual SQLite/PostgreSQL: any new endpoints must work with `getActiveSchema()`
