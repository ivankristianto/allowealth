# UI Polish: Accounts & Transactions Page Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 4 UI issues: (1) RecurringSkipModal design system alignment, (2) Transaction filter account sorting, (3) Accounts page filter bar redesign, (4) TransactionCard dropdown z-index fix.

**Architecture:** Update existing Astro components following established patterns - use ConfirmationModal as base for RecurringSkipModal, implement account type sorting in TransactionFiltersBar, create new ActionFilterBar component for accounts page, and add CSS z-index fixes for dropdown overflow.

**Tech Stack:** Astro 5.x, Tailwind v4, DaisyUI v5, TypeScript, Lucide icons

---

## Code Review Feedback (Addressed)

**From:** superpowers:code-reviewer subagent

**Status:** APPROVED with revisions

**Changes made based on review:**

1. **Task 3 ActionFilterBar SSR Fix:** Changed `window?.location?.search` to use `currentSearchParams` prop passed from parent. This ensures SSR compatibility in Astro.

2. **Task 4 Z-Index Note:** Added documentation that z-index fix alone may not solve overflow clipping if parent containers have `overflow-hidden`. Alternative solutions documented.

3. **E2E Test Note:** Added reminder to check E2E tests that may reference the removed "All"/"Mine" toggle buttons.

**Reviewer's optional suggestions (not implemented for simplicity):**
- Using `ACCOUNT_TYPE_TO_CLASS` mapping for account sorting (hardcoded list is acceptable for this UI preference)
- Enhancing ConfirmationModal instead of replacing it (current approach provides more design flexibility)

---

## Pre-Implementation

### Task 0: Verify Current State

**Files:**
- Read: `src/components/organisms/RecurringSkipModal.astro`
- Read: `src/components/organisms/TransactionFiltersBar.astro`
- Read: `src/components/organisms/AccountActions.astro`
- Read: `src/components/molecules/TransactionCard.astro`
- Read: `src/components/molecules/ConfirmationModal.astro`
- Read: `src/components/molecules/ActionBar.astro`

**Step 1: Run quality gates baseline**

```bash
cd /Users/ivan/Works/allowealth
bun run typecheck
bun run lint
```

**Step 2: Start dev server to verify issues visually**

```bash
bun run dev &
```

Open Chrome at `http://localhost:4321` and navigate to:
- Recurring page to see skip modal
- Transactions page to see account dropdown order
- Accounts page to see current view toggle

---

## Task 1: Fix RecurringSkipModal Design System Alignment

**Files:**
- Modify: `src/components/organisms/RecurringSkipModal.astro`
- Reference: `src/components/organisms/AccountFormModal.astro:75-92`
- Reference: `src/components/molecules/ConfirmationModal.astro`

**Issue:** The RecurringSkipModal uses ConfirmationModal but the details slot has inconsistent styling with other modals. The header icon and spacing don't match the design system patterns.

**Step 1: Update RecurringSkipModal to match design system**

Replace the content with a properly styled modal that follows AccountFormModal patterns:

```astro
---
import Modal from '@/components/molecules/Modal.astro';
import { CircleMinus } from '@lucide/astro';
---

<Modal id="recurring-skip-modal" size="sm" closable={false} backdropClose={true} ariaLabel="Skip this occurrence">
  <div slot="default" class="flex flex-col gap-6">
    {/* Header with icon */}
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-warning/10 text-warning">
        <CircleMinus size={24} class="stroke-current" aria-hidden="true" />
      </div>
      <div class="flex-1">
        <h2 class="text-2xl font-bold tracking-tight text-primary leading-none" data-modal-title>
          Skip this occurrence?
        </h2>
        <p class="text-neutral text-sm mt-2 font-medium" data-modal-subtitle>
          You can optionally provide a reason for skipping.
        </p>
      </div>
    </div>

    {/* Template name display */}
    <p class="text-sm text-base-content/70" data-skip-template-name></p>

    {/* Reason input */}
    <label class="form-control">
      <span class="label-text text-sm font-medium">Reason (optional)</span>
      <textarea
        class="textarea textarea-bordered min-h-24 rounded-xl"
        maxlength="200"
        placeholder="Add a note for why this occurrence is skipped"
        data-skip-reason
      ></textarea>
      <div class="label">
        <span class="label-text-alt" aria-live="polite" data-skip-counter>
          0 / 200 characters
        </span>
      </div>
    </label>

    {/* Error message */}
    <div
      id="recurring-skip-modal-error"
      class="hidden alert alert-error text-sm rounded-2xl"
      role="alert"
      aria-live="polite"
      data-confirm-error
    >
    </div>

    {/* Actions */}
    <div class="flex gap-4 pt-2">
      <button
        type="button"
        class="btn btn-ghost flex-1 h-14 rounded-2xl font-bold text-base-content hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
        data-confirm-cancel
      >
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-warning flex-1 h-14 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
        data-confirm-action
        data-loading-text="Skipping..."
        data-testid="skip-confirm-btn"
      >
        Skip
      </button>
    </div>
  </div>
</Modal>
```

**Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/components/organisms/RecurringSkipModal.astro
git commit -m "fix(modal): align RecurringSkipModal with design system

- Replace ConfirmationModal wrapper with direct Modal usage
- Add consistent header with warning icon and proper spacing
- Use rounded-2xl buttons per design system button rounding rules
- Add error message container for skip action feedback"
```

---

## Task 2: Transaction Filter - Show Liquid Accounts First

**Files:**
- Modify: `src/components/organisms/TransactionFiltersBar.astro:189-209`
- Read: `src/lib/types/account.ts` (for account type classification)

**Issue:** The account dropdown in TransactionFiltersBar shows accounts in arbitrary order. Users want liquid accounts (bank accounts, credit cards, e-wallets) shown first for easier selection.

**Step 1: Add account sorting logic in TransactionFiltersBar**

Find the `showAccountFilter` block around line 189 and update the items mapping to sort liquid accounts first:

```astro
{
  showAccountFilter && accounts.length > 0 && (
    <MultiSelectDropdown
      id="account"
      label="All Accounts"
      inputName="account_ids"
      selectedIds={accountIds}
      items={accounts
        .map((a) => ({ id: a.id, name: a.name, group: a.type }))
        .sort((a, b) => {
          // Define liquid account types that should appear first
          const liquidTypes = ['cash', 'bank_account', 'e_wallet', 'credit_card'];
          const aIsLiquid = liquidTypes.includes(a.group);
          const bIsLiquid = liquidTypes.includes(b.group);

          // Sort liquid first, then alphabetically by name within each group
          if (aIsLiquid && !bIsLiquid) return -1;
          if (!aIsLiquid && bIsLiquid) return 1;
          return a.name.localeCompare(b.name);
        })}
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

**Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/components/organisms/TransactionFiltersBar.astro
git commit -m "feat(filters): show liquid accounts first in transaction filter dropdown

- Sort accounts by type: liquid (cash, bank, e-wallet, credit card) first
- Alphabetically sort within each group for consistent ordering
- Improves UX by showing most-used accounts at the top"
```

---

## Task 3: Create ActionFilterBar Component for Accounts Page

**Files:**
- Create: `src/components/organisms/ActionFilterBar.astro`
- Modify: `src/pages/accounts/index.astro:347-361`
- Modify: `src/components/organisms/AccountActions.astro:44-76`

**Issue:** The "View all accounts" / "View my accounts" toggle buttons take up space. Users want a dropdown filter instead, combined with search in a single filter bar component.

**Note on E2E Tests:** If there are E2E tests that reference the "All" or "Mine" toggle buttons, they will need to be updated to use the new owner dropdown.

**Step 1: Create ActionFilterBar component**

Create `src/components/organisms/ActionFilterBar.astro`:

```astro
---
/**
 * ActionFilterBar Component
 *
 * Combined filter bar for accounts page with owner dropdown and search input.
 * Replaces the separate view toggle buttons and search input.
 *
 * @param {string} searchValue - Current search value
 * @param {Array} members - Workspace members for owner filter
 * @param {string} userId - Currently selected user ID (empty = all)
 * @param {string} currentUserId - Current logged-in user ID
 * @param {string} currentSearchParams - Current URL search params string
 * @param {string} baseUrl - Base URL for filter links
 * @param {string} className - Additional CSS classes
 */

import { Search, Users, ChevronDown, X } from '@lucide/astro';

export interface Props {
  searchValue?: string;
  members?: Array<{ id: string; name: string }>;
  userId?: string;
  currentUserId?: string;
  currentSearchParams?: string;
  baseUrl?: string;
  className?: string;
}

const {
  searchValue = '',
  members = [],
  userId = '',
  currentUserId = '',
  currentSearchParams = '',
  baseUrl = '/accounts',
  className = '',
} = Astro.props;

// Build URL with current filters (server-safe, no window access)
const buildFilterUrl = (updates: Record<string, string>) => {
  const params = new URLSearchParams(currentSearchParams);

  // Add updates
  Object.entries(updates).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  });

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

const isPersonalView = userId === currentUserId && userId !== '';
const currentOwnerName = isPersonalView
  ? 'My Accounts'
  : userId
    ? members.find((m) => m.id === userId)?.name || 'All Accounts'
    : 'All Accounts';
---

<div class:list={['flex flex-col sm:flex-row gap-3 w-full', className]}>
  {/* Owner Filter Dropdown */}
  <div class="dropdown dropdown-start sm:dropdown-end" id="owner-filter-dropdown">
    <button
      type="button"
      tabindex={0}
      class="flex items-center gap-2 px-4 py-3 text-sm font-semibold border border-base-300 bg-base-100 text-base-content rounded-xl shadow-sm hover:border-base-content/30 transition-colors min-w-[160px] justify-between"
      aria-label="Filter by account owner"
      aria-haspopup="listbox"
      data-owner-trigger
    >
      <span class="flex items-center gap-2">
        <Users size={16} class="stroke-current text-base-content/40" aria-hidden="true" />
        <span class="truncate" data-owner-label>{currentOwnerName}</span>
      </span>
      <ChevronDown size={14} class="stroke-current text-base-content/40 shrink-0" aria-hidden="true" />
    </button>
    <ul
      tabindex={0}
      class="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-xl w-56 border border-base-300 mt-2"
      role="listbox"
      aria-label="Select account owner"
      data-owner-dropdown
    >
      <li role="option" aria-selected={!userId}>
        <a
          href={buildFilterUrl({ user_id: '' })}
          class:list={['rounded-lg', !userId && 'active']}
          data-owner-option
          data-owner-id=""
        >
          All Accounts
        </a>
      </li>
      {currentUserId && (
        <li role="option" aria-selected={isPersonalView}>
          <a
            href={buildFilterUrl({ user_id: currentUserId })}
            class:list={['rounded-lg', isPersonalView && 'active']}
            data-owner-option
            data-owner-id={currentUserId}
          >
            My Accounts
          </a>
        </li>
      )}
      {members
        .filter((member) => member.id !== currentUserId)
        .map((member) => (
          <li role="option" aria-selected={userId === member.id}>
            <a
              href={buildFilterUrl({ user_id: member.id })}
              class:list={['rounded-lg', userId === member.id && 'active']}
              data-owner-option
              data-owner-id={member.id}
            >
              {member.name}
            </a>
          </li>
        ))}
    </ul>
  </div>

  {/* Search Input */}
  <div class="relative flex-1">
    <Search
      size={18}
      class="absolute left-3 top-1/2 -translate-y-1/2 stroke-current text-base-content/40 pointer-events-none"
      aria-hidden="true"
    />
    <input
      type="search"
      data-account-search
      placeholder="Search accounts by name..."
      value={searchValue}
      class="input input-bordered w-full pl-10 pr-10 rounded-xl bg-base-100 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
      aria-label="Search accounts by name"
    />
    {searchValue && (
      <button
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle min-h-[28px] min-w-[28px]"
        aria-label="Clear search"
        data-clear-search
      >
        <X size={14} class="stroke-current text-base-content/40" aria-hidden="true" />
      </button>
    )}
  </div>
</div>

<script>
  // Initialize owner dropdown label on page load
  function initOwnerFilter() {
    const dropdown = document.getElementById('owner-filter-dropdown');
    if (!dropdown) return;

    const label = dropdown.querySelector('[data-owner-label]');
    const trigger = dropdown.querySelector('[data-owner-trigger]');
    const options = dropdown.querySelectorAll('[data-owner-option]');

    // Update label when option is clicked
    options.forEach((option) => {
      option.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const name = target.textContent?.trim() || '';
        if (label) label.textContent = name;
      });
    });
  }

  // Initialize clear search button
  function initClearSearch() {
    const clearBtn = document.querySelector('[data-clear-search]');
    const searchInput = document.querySelector('[data-account-search]') as HTMLInputElement;

    if (clearBtn && searchInput) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus();
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initOwnerFilter();
      initClearSearch();
    });
  } else {
    initOwnerFilter();
    initClearSearch();
  }

  document.addEventListener('astro:page-load', () => {
    initOwnerFilter();
    initClearSearch();
  });
</script>
```

**Step 2: Update AccountActions to remove view toggle buttons**

Edit `src/components/organisms/AccountActions.astro`:

- Remove lines 44-76 (the View Toggle section with "All" and "Mine" buttons)
- Remove `isPersonalView`, `allAccountsHref`, `myAccountsHref` from Props interface (lines 20-22)
- Remove them from destructuring (lines 30-33)

The component should now start with Categories button as the first item.

**Step 3: Update accounts/index.astro to use ActionFilterBar**

Replace the search input section (lines 347-361) with ActionFilterBar:

```astro
{/* Filter Bar */}
<ActionFilterBar
  searchValue={searchParams.search || ''}
  members={workspaceMembers.map((m) => ({ id: m.id, name: m.name }))}
  userId={ownerUserId || ''}
  currentUserId={user.id}
  currentSearchParams={url.search}
  baseUrl="/accounts"
/>
```

Also add import at the top:
```astro
import ActionFilterBar from '@components/organisms/ActionFilterBar.astro';
```

Remove the now-unused AccountActions props:
- Remove `isPersonalView={isPersonalView}`
- Remove `allAccountsHref={allAccountsHref}`
- Remove `myAccountsHref={myAccountsHref}`

**Step 4: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors

**Step 5: Commit**

```bash
git add src/components/organisms/ActionFilterBar.astro
git add src/components/organisms/AccountActions.astro
git add src/pages/accounts/index.astro
git commit -m "feat(accounts): add ActionFilterBar with owner dropdown and search

- Create new ActionFilterBar component combining owner filter and search
- Replace view toggle buttons (All/Mine) with dropdown filter
- Support filtering by any workspace member
- Add clear search button for better UX
- Remove personal view toggle from AccountActions component"
```

---

## Task 4: Fix TransactionCard Dropdown Z-Index

**Files:**
- Modify: `src/components/molecules/TransactionCard.astro:233-245` (mobile dropdown)
- Modify: `src/components/molecules/TransactionCard.astro:442-455` (desktop dropdown)

**Issue:** When the TransactionCard is the last item in a container and the kebab menu dropdown opens, it gets cut off because the dropdown is positioned below the trigger but is constrained by the parent's overflow boundaries.

**Step 1: Update mobile dropdown to use dropdown-top when needed**

The dropdown already has `z-50` but the issue is container overflow. The fix is to use DaisyUI's `dropdown-top` class for the last few cards, or ensure the dropdown opens upward when near the bottom.

Since we can't dynamically detect position easily, we'll update the CSS to ensure dropdowns can escape overflow containers by using fixed positioning strategy.

Update the mobile dropdown (around line 233):

```astro
{transaction && (
  <div class="dropdown dropdown-end shrink-0 -mr-1.5" data-transaction-actions>
    <button
      type="button"
      tabindex={0}
      class="btn btn-ghost btn-xs btn-square min-h-[44px] min-w-[44px]"
      aria-label="Transaction actions"
      aria-haspopup="menu"
    >
      <Ellipsis size={16} class="stroke-current opacity-40" aria-hidden="true" />
    </button>
    <ul
      tabindex={0}
      class="dropdown-content z-[100] menu p-2 shadow-lg bg-base-100 rounded-xl w-40 border border-base-300"
      role="menu"
    >
```

Key changes:
- Change `z-50` to `z-[100]` for higher stacking context
- Add `data-transaction-actions` for potential JS positioning

**Step 2: Update desktop dropdown similarly**

Update the desktop dropdown (around line 442):

```astro
{transaction && (
  <div class="dropdown dropdown-end" data-transaction-actions>
    <button
      type="button"
      tabindex={0}
      class="btn btn-ghost btn-sm btn-square min-h-[44px] min-w-[44px]"
      aria-label="Transaction actions"
      aria-haspopup="menu"
    >
      <EllipsisVertical size={16} class="stroke-current opacity-40" aria-hidden="true" />
    </button>
    <ul
      tabindex={0}
      class="dropdown-content z-[100] menu p-2 shadow-lg bg-base-100 rounded-xl w-48 border border-base-300"
      role="menu"
    >
```

**Step 3: Add CSS to ensure dropdowns escape overflow containers**

Add to the script section at the bottom of TransactionCard.astro (before closing tag):

```astro
<style>
  /* Ensure transaction dropdowns can escape overflow containers */
  [data-transaction-actions].dropdown.dropdown-open .dropdown-content,
  [data-transaction-actions].dropdown:focus-within .dropdown-content {
    position: fixed;
  }
</style>
```

Wait - this won't work well because fixed positioning breaks the dropdown alignment. Instead, we need to ensure the parent containers don't clip.

**Better approach:**

The real fix is to ensure parent containers have `overflow-visible` or use a portal approach. But the simplest fix that works with DaisyUI is to use `dropdown-top` for items that might be at the bottom.

Since we can't know which card is last at render time, let's use a different strategy: add a global CSS fix that allows dropdowns to overflow their containers.

Replace the style approach with adding this to the page's CSS or as a global style. For now, let's just increase z-index and ensure proper positioning:

```astro
<style is:global>
  /* Transaction card dropdowns should escape overflow containers */
  [data-transaction-card] .dropdown-content {
    position: fixed;
    margin-top: 0;
    transform: translateY(-100%);
    top: auto;
    bottom: 100%;
  }
</style>
```

Actually, DaisyUI dropdowns use absolute positioning. The issue is that if a parent has `overflow-hidden`, the dropdown gets clipped. The solution is to use `dropdown-top` class which positions the menu above the trigger.

Let me reconsider: The simplest fix without complex JS is to always use `dropdown-top` for the last N items, or detect overflow and flip. But a better approach for now is to just ensure the dropdown has a high enough z-index and document that parent containers need `overflow-visible`.

For immediate fix, just update the z-index:

**Revised Step 1 & 2:** Change `z-50` to `z-[100]` in both dropdowns (mobile and desktop).

**Step 3: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors

**Note on Z-Index Fix:** Increasing z-index from 50 to 100 helps with stacking context issues but may not fully resolve overflow clipping if parent containers have `overflow-hidden`. If the issue persists, consider:
1. Ensuring parent containers use `overflow-visible`
2. Using `dropdown-top` class for items at the bottom of lists
3. Implementing a portal-based dropdown that renders outside the container

**Step 4: Commit**

```bash
git add src/components/molecules/TransactionCard.astro
git commit -m "fix(ui): increase transaction card dropdown z-index to prevent cutoff

- Change z-index from z-50 to z-[100] for both mobile and desktop dropdowns
- May require parent container overflow changes for complete fix
- Adds data-transaction-actions attribute for potential future positioning"
```

---

## Post-Implementation

### Task 5: Run Full Quality Gates

**Step 1: Run all quality gates**

```bash
cd /Users/ivan/Works/allowealth
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: All pass

**Step 2: Build for production**

```bash
bun run build
```

Expected: Build succeeds without errors

**Step 3: Visual verification checklist**

Open Chrome and verify:

1. **RecurringSkipModal:**
   - [ ] Navigate to recurring page, click skip on any item
   - [ ] Modal has warning icon in header
   - [ ] Buttons are rounded-2xl
   - [ ] Spacing matches other modals (gap-6)

2. **Transaction Account Filter:**
   - [ ] Go to transactions page
   - [ ] Open account dropdown filter
   - [ ] Liquid accounts (cash, bank, e-wallet, credit card) appear first
   - [ ] Within each group, accounts are alphabetically sorted

3. **Accounts Page ActionFilterBar:**
   - [ ] Go to accounts page
   - [ ] See ActionFilterBar with owner dropdown and search
   - [ ] Click owner dropdown, see "All Accounts", "My Accounts", other members
   - [ ] Select different owner, page filters correctly
   - [ ] Search input filters accounts in real-time
   - [ ] Clear search button appears when typing

4. **TransactionCard Dropdown:**
   - [ ] Go to transactions page
   - [ ] Scroll to bottom of list
   - [ ] Click kebab menu on last transaction
   - [ ] Dropdown is fully visible, not cut off

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: quality gates and formatting fixes"
```

---

## Summary

This plan addresses 4 UI issues:

1. **RecurringSkipModal** - Aligns with design system by using consistent header pattern with icon, proper spacing (gap-6), and rounded-2xl buttons

2. **Transaction Account Filter** - Sorts accounts with liquid types (cash, bank_account, e_wallet, credit_card) first, then alphabetically within groups

3. **ActionFilterBar** - New component combining owner filter dropdown and search, replacing the "All"/"Mine" toggle buttons for cleaner UI and better filtering capability

4. **TransactionCard Z-Index** - Increases dropdown z-index from 50 to 100 to prevent cutoff in overflow containers

All changes follow existing patterns in the codebase and maintain WCAG 2.1 AA accessibility compliance.

---

## Implementation Update (Completed)

Implemented on branch `ui-polish-accounts-transactions` with all planned tasks completed.

- ✅ **Task 1:** `RecurringSkipModal` rebuilt using `Modal` with design-system header/icon/actions and skip-specific fields.
- ✅ **Task 2:** Transaction account filter ordering now prioritizes liquid account groups before alphabetical ordering.
- ✅ **Task 3:** New `ActionFilterBar` added and wired into accounts page; old `All/Mine` toggles removed from `AccountActions`.
- ✅ **Task 4:** Transaction action dropdowns updated with higher z-index and parent transaction list card set to `overflow-visible` to prevent clipping.
- ✅ **Review triage:** Findings from `requesting-code-review` and Codex review were triaged and valid issues were fixed (owner-filter empty-state recovery, filter semantics, transaction filter sort behavior).
- ✅ **Verification:** Ran lint, stylelint, targeted formatting for changed files, typecheck, build, and full test suite successfully.
