# Accounts Per User - Manual Test Plan

**Branch:** `accounts-per-user`
**Date:** 2026-02-20

## Overview

Test plan for the accounts-per-user feature: personal view toggle (All/Mine), portfolio recalculation in personal view, info banner, admin-only ownership transfer via edit form, and API permission guards on the owner filter.

## Prerequisites

- Local dev server running: `bun run dev` → `http://localhost:4321`
- Seeded database: `bun run db:seed` (provides demo data)
- Two test accounts available:
  - **Admin:** `demo@example.com` / `demo123456789` (role: `admin`)
  - **Member:** `member@example.com` / `demo123456789` (role: `member`)
- At least 2 accounts exist in the workspace (seeder creates multiple)
- All seeded accounts are owned by the admin user (default from seeder)

> **Note:** The member user does not own any accounts initially. To test the "Mine" view showing accounts for the member, you must first transfer at least one account to them via the admin user.

---

## Test Steps

### 1. View Toggle — Default State (All Accounts)

**Services under test:** `AccountService.findAll()`, page SSR

| Step | Action                                                                    | Expected Result                                                                          |
| ---- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1.1  | Log in as `demo@example.com`, navigate to `/accounts`                     | Accounts page loads, URL has no `?view` param                                            |
| 1.2  | Observe the action bar above the account list                             | A two-segment toggle is visible with "All" and "Mine" buttons                            |
| 1.3  | Verify the "All" button is visually active (bold, highlighted background) | "All" button has `aria-current="page"` and active styling; "Mine" button is ghost-styled |
| 1.4  | Verify all seeded accounts are displayed in the list                      | Multiple account groups shown (Liquid, Non-Liquid, Debt as applicable) with all accounts |
| 1.5  | Verify no info banner is shown                                            | No blue `alert-info` banner appears above the action bar                                 |

---

### 2. View Toggle — Personal View (My Accounts)

> **Critical:** Core feature — filtering by owner and URL state.

**Services under test:** `AccountService.findAll({ owner_user_id })`, `countClosed()`, page SSR

| Step | Action                                                            | Expected Result                                                                                                                                                             |
| ---- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | While on `/accounts` (admin user), click the "Mine" toggle button | Page reloads, URL changes to `/accounts?view=mine`                                                                                                                          |
| 2.2  | Verify the "Mine" button is now visually active                   | "Mine" button has `aria-current="page"` and active styling; "All" button is ghost-styled                                                                                    |
| 2.3  | Verify the info banner appears                                    | Blue `alert-info` banner visible below any historical indicator, text reads: "Showing your accounts only. Values reflect your portfolio." with a "View all accounts →" link |
| 2.4  | Verify the account list shows only accounts owned by the admin    | All seeded accounts still visible (since admin created them all) — count matches total                                                                                      |
| 2.5  | Click the "View all accounts →" link in the info banner           | Page reloads, URL returns to `/accounts` (no `?view` param), banner disappears, "All" toggle is active                                                                      |

---

### 3. Portfolio Recalculation in Personal View

> **Critical:** Totals must reflect only the filtered accounts.

**Services under test:** `calculatePortfolioTotals()`, `calculateDebtTotals()`, `calculateAccountAllocation()`

| Step | Action                                                                                        | Expected Result                                                                                                  |
| ---- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 3.1  | On `/accounts`, note the portfolio summary totals (IDR total, USD total, debt totals)         | Record the "All" view totals for comparison                                                                      |
| 3.2  | Click "Mine" to switch to `/accounts?view=mine`                                               | Portfolio summary updates; since admin owns all accounts, totals should match step 3.1                           |
| 3.3  | Transfer one account to the member user (see Section 6), then return to `/accounts?view=mine` | Portfolio totals decrease by the transferred account's balance; the transferred account disappears from the list |
| 3.4  | Click "All" to return to global view                                                          | Portfolio totals return to the full workspace total; the transferred account reappears in the list               |

---

### 4. Personal View with Historical Month

**Services under test:** `AccountService.getSnapshotForMonth({ owner_user_id })`

| Step | Action                                                                  | Expected Result                                                                                                                                                      |
| ---- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1  | Navigate to `/accounts?view=mine`                                       | Personal view with current month data                                                                                                                                |
| 4.2  | Use the period selector to choose a previous month (e.g., January 2026) | URL updates to `/accounts?view=mine&year=2026&month=1`; both the personal view banner and historical view warning are visible                                        |
| 4.3  | Verify account balances reflect snapshot values for that month          | Balances show the historical snapshot amounts, filtered to accounts owned by current user                                                                            |
| 4.4  | Click "All" toggle while in historical view                             | URL changes to `/accounts?year=2026&month=1` (removes `?view=mine` but preserves period params); banner disappears, historical indicator remains, all accounts shown |

---

### 5. URL State Persistence and Browser Navigation

| Step | Action                                               | Expected Result                                                                                               |
| ---- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 5.1  | Navigate to `/accounts?view=mine`                    | Personal view loads with banner and "Mine" toggle active                                                      |
| 5.2  | Click browser Back button                            | Returns to previous page (e.g., `/accounts` without `?view=mine`); "All" toggle is active, no banner          |
| 5.3  | Click browser Forward button                         | Returns to `/accounts?view=mine`; personal view restored with banner                                          |
| 5.4  | Copy `/accounts?view=mine` URL and open in a new tab | New tab loads personal view correctly — banner visible, "Mine" toggle active                                  |
| 5.5  | Navigate to `/accounts?view=mine&currency=IDR`       | Personal view shows only IDR-denominated accounts owned by current user; both filter and view param respected |

---

### 6. Admin Ownership Transfer — Edit Form

> **Critical:** Data mutation — changes account ownership.

**Services under test:** `AccountService.transferOwnership()`, `PATCH /api/accounts/:id/transfer-owner`

| Step | Action                                                         | Expected Result                                                                                               |
| ---- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 6.1  | Log in as admin (`demo@example.com`), go to `/accounts`        | Accounts page loads                                                                                           |
| 6.2  | Click the edit (pencil) icon on any account row                | Edit modal opens with "Edit Account" title; an "Owner" dropdown is visible below the currency/balance fields  |
| 6.3  | Verify the Owner dropdown lists all workspace members          | Dropdown options include the admin user and the member user (at least 2 options)                              |
| 6.4  | Verify the Owner dropdown shows the current owner pre-selected | The admin user's name is selected (since admin created the account)                                           |
| 6.5  | Change the Owner dropdown to the member user                   | Dropdown value changes; no immediate save                                                                     |
| 6.6  | Click "Save Changes"                                           | Modal closes, success toast "Account updated successfully!" appears, page reloads                             |
| 6.7  | Verify the account still appears in the "All" view             | Account is listed with all other accounts                                                                     |
| 6.8  | Switch to "Mine" view (`?view=mine`)                           | The transferred account no longer appears in the admin's personal view; portfolio totals decrease accordingly |

---

### 7. Verify Transfer as Member User

**Services under test:** `AccountService.findAll({ owner_user_id })`, API `owner` param guard

| Step | Action                                                       | Expected Result                                                                                          |
| ---- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 7.1  | Log out and log in as member (`member@example.com`)          | Dashboard loads                                                                                          |
| 7.2  | Navigate to `/accounts`                                      | Accounts page loads; "All" view shows all workspace accounts (including the transferred one)             |
| 7.3  | Click "Mine" toggle                                          | URL changes to `/accounts?view=mine`; banner appears; only the account transferred in Section 6 is shown |
| 7.4  | Verify portfolio totals match the single transferred account | Totals show only that account's balance                                                                  |
| 7.5  | Click edit icon on the transferred account                   | Edit modal opens but **no Owner dropdown** is visible (member is not admin)                              |

---

### 8. Member Cannot Transfer Ownership

| Step | Action                                                                                                                                   | Expected Result                                                                    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 8.1  | While logged in as member, open any account in the edit modal                                                                            | Modal opens with name, category, currency fields; no "Owner" field visible         |
| 8.2  | Open browser DevTools Network tab, then manually call `PATCH /api/accounts/<id>/transfer-owner` with `{ "owner_user_id": "<admin-id>" }` | API returns 403 with error: "Only workspace admins can transfer account ownership" |

---

### 9. Member Cannot Filter by Other User's ID via API

**Services under test:** `GET /api/accounts` owner param guard

| Step | Action                                                                                   | Expected Result                                                                    |
| ---- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 9.1  | While logged in as member, open browser DevTools console                                 | Console ready                                                                      |
| 9.2  | Run `fetch('/api/accounts?owner=<admin-user-id>').then(r => r.json()).then(console.log)` | Response is 403 with error: "Non-admin users can only filter by their own user ID" |
| 9.3  | Run `fetch('/api/accounts?owner=<own-member-id>').then(r => r.json()).then(console.log)` | Response is 200 with only the member's owned accounts                              |

---

### 10. Admin Can Filter by Any User via API

| Step | Action                                                                                    | Expected Result                                                 |
| ---- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 10.1 | Log in as admin, open DevTools console                                                    | Console ready                                                   |
| 10.2 | Run `fetch('/api/accounts?owner=<member-user-id>').then(r => r.json()).then(console.log)` | Response is 200 with only accounts owned by the member user     |
| 10.3 | Run `fetch('/api/accounts?owner=<admin-user-id>').then(r => r.json()).then(console.log)`  | Response is 200 with only accounts owned by the admin user      |
| 10.4 | Run `fetch('/api/accounts').then(r => r.json()).then(console.log)`                        | Response is 200 with all workspace accounts (no filter applied) |

---

### 11. Transfer to Invalid User

> **Critical:** Security — validates workspace membership.

| Step | Action                                                                                                                                                                                                                                     | Expected Result                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| 11.1 | As admin, open DevTools console                                                                                                                                                                                                            | Console ready                                    |
| 11.2 | Run `fetch('/api/accounts/<valid-account-id>/transfer-owner', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner_user_id: 'nonexistent-user-id' }) }).then(r => r.json()).then(console.log)` | Response is 404 with error code `USER_NOT_FOUND` |

---

### 12. Closed Accounts Count Respects Owner Filter

**Services under test:** `AccountService.countClosed(workspaceId, ownerUserId)`

| Step | Action                                                                        | Expected Result                                                                                                          |
| ---- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 12.1 | Ensure at least one closed account exists (close an account via UI if needed) | Closed count badge visible on "Closed" button in action bar                                                              |
| 12.2 | Note the closed count in "All" view                                           | Badge shows total closed accounts for workspace                                                                          |
| 12.3 | Switch to "Mine" view                                                         | Closed count badge updates to show only closed accounts owned by current user (may be 0 if closed account was not yours) |

---

### 13. Empty State — Member With No Accounts

| Step | Action                                                      | Expected Result                                                                                                                              |
| ---- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 13.1 | Log in as member before any transfers are done (fresh seed) | Dashboard loads                                                                                                                              |
| 13.2 | Navigate to `/accounts?view=mine`                           | Empty state shown: "No accounts tracked yet" with "Add Your First Account" button; personal view banner is NOT shown (no accounts to filter) |

> **Note:** This test must be run on a fresh seed before any transfers. Alternatively, transfer all member-owned accounts back to admin first.

---

## Summary Checklist

| #   | Area                     | Key Assertion                                                 | Pass |
| --- | ------------------------ | ------------------------------------------------------------- | ---- |
| 1   | Default view             | "All" toggle active, no banner, all accounts shown            | PASS |
| 2   | Personal view            | "Mine" toggle active, banner visible, URL has `?view=mine`    | PASS |
| 3   | Portfolio recalculation  | Totals change when toggling between All/Mine after transfer   | PASS |
| 4   | Historical + personal    | Both indicators visible, snapshot respects owner filter       | PASS |
| 5   | URL persistence          | Back/forward/bookmark all preserve view state                 | PASS |
| 6   | Admin ownership transfer | Owner dropdown in edit form, transfer succeeds, account moves | PASS |
| 7   | Member personal view     | Shows only transferred accounts, no owner dropdown            | PASS |
| 8   | Member cannot transfer   | No owner dropdown, API returns 403                            | PASS |
| 9   | API owner param guard    | Member blocked from filtering by other user IDs (403)         | PASS |
| 10  | Admin API access         | Admin can filter by any user ID                               | PASS |
| 11  | Invalid user transfer    | 404 USER_NOT_FOUND for non-workspace user                     | PASS |
| 12  | Closed count filter      | Badge count changes between All/Mine views                    | PASS |
| 13  | Empty state              | Member with no accounts sees empty state                      | PASS |

**Critical paths:** Steps 2, 3, 6, and 11 are highest priority.

## Automated Test Coverage

| Suite                            | Tests | File                                                        |
| -------------------------------- | ----- | ----------------------------------------------------------- |
| findAll owner filter             | 2     | `src/services/__tests__/account-owner-filter.test.ts`       |
| getSnapshotForMonth owner filter | 1     | `src/services/__tests__/account-owner-filter.test.ts`       |
| countClosed owner filter         | 1     | `src/services/__tests__/account-owner-filter.test.ts`       |
| transferOwnership                | 4     | `src/services/__tests__/account-transfer-ownership.test.ts` |

Full suite: **8 tests, 0 failures** (`bun test src/services/__tests__/account-owner-filter.test.ts src/services/__tests__/account-transfer-ownership.test.ts`).
