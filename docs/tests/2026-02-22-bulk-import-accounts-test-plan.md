# Bulk Account Import & Account Ownership Transfer - Manual Test Plan

**Branch:** `bulk-import-accounts`
**Date:** 2026-02-22

## Overview

Two new UI features on the accounts pages:

1. **Bulk Add Accounts** — A modal on `/accounts` that lets users create multiple accounts at once by typing comma-separated lines (`Name, Type, Currency[, Balance]`). Reuses existing `POST /api/accounts` endpoint per account.
2. **Transfer Ownership** — An admin-only section on `/accounts/[id]` that reassigns an account to a different workspace member. Reuses existing `PATCH /api/accounts/:id/transfer-owner` endpoint.

## Prerequisites

- Local dev server running at `http://localhost:4323`
- Database seeded: `bun run aw db seed`
- Admin credentials: `demo@example.com` / `demo123456789`
- Member credentials: `member@example.com` / `demo123456789`
- Workspace has two currencies enabled: IDR (primary), USD (secondary)
- Workspace has at least 2 members (admin + member)

---

## Test Steps

### 1. Bulk Add Button Visibility

**Component under test:** `AccountActions.astro` (Bulk Add button)

| Step | Action                                                                      | Expected Result                                            |
| ---- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1.1  | Log in as `demo@example.com`, navigate to `/accounts`                       | Accounts page loads with action bar visible                |
| 1.2  | Look for "Bulk" button in the action bar (between Transfer and New Account) | "Bulk" button with ListPlus icon is visible                |
| 1.3  | Use the period selector to navigate to a previous month (historical view)   | "Bulk" button is hidden (same as Transfer and New Account) |
| 1.4  | Navigate back to current month                                              | "Bulk" button reappears                                    |

---

### 2. Bulk Add Modal — Open and Close

**Component under test:** Bulk Add Accounts modal (`bulk-add-accounts-modal`)

| Step | Action                                                                    | Expected Result                                                                                                                       |
| ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | Click the "Bulk" button in the action bar                                 | Modal opens with title "Bulk Add Accounts", textarea with placeholder showing example format                                          |
| 2.2  | Verify the placeholder text shows the expected format                     | Placeholder shows: `My Savings, bank_account, IDR, 5000000` and similar lines                                                         |
| 2.3  | Verify help text shows valid account types                                | Text below textarea lists all valid types: `cash, bank_account, e_wallet, mutual_fund, bond, crypto, stock, other, credit_card, loan` |
| 2.4  | Click "Cancel" button                                                     | Modal closes, no changes made                                                                                                         |
| 2.5  | Click "Bulk" again, then click the modal backdrop (outside the modal box) | Modal closes                                                                                                                          |

---

### 3. Bulk Add — Live Preview and Validation

> **Critical:** Input parsing and validation determine whether accounts are created correctly or rejected.

**Component under test:** `bulk-add-accounts.client.ts` (parse, validate, preview)

| Step | Action                                                                | Expected Result                                                                                                                            |
| ---- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 3.1  | Open bulk add modal, type: `Test Savings, bank_account, IDR, 1000000` | Preview area appears showing 1 account: Name="Test Savings", Type badge="bank_account", Currency="IDR", Balance="1000000"                  |
| 3.2  | Add a second line: `Test Wallet, e_wallet, IDR`                       | Preview updates to show 2 accounts. Second account has Balance="0" (default). Submit button reads "Create 2 Accounts"                      |
| 3.3  | Add a third line: `USD Cash, cash, USD, 500.50`                       | Preview shows 3 accounts. Third account has Currency="USD", Balance="500.50". Count says "3 accounts"                                      |
| 3.4  | Add an invalid type line: `Bad Account, savings, IDR`                 | Error row appears in preview: "Line 4: Invalid type 'savings'. Must be one of: cash, bank_account, ..." Count still shows 3 valid accounts |
| 3.5  | Add an invalid currency line: `Bad Currency, cash, EUR`               | Error row: "Line 5: Invalid currency 'EUR'. Must be one of: IDR, USD". Count stays at 3                                                    |
| 3.6  | Add a short name: `A, cash, IDR`                                      | Error row: "Line 6: Name must be at least 2 characters"                                                                                    |
| 3.7  | Add a negative balance: `Neg Balance, cash, IDR, -100`                | Error row: "Line 7: Invalid balance '-100'. Must be a non-negative number"                                                                 |
| 3.8  | Add incomplete line: `Only Name`                                      | Error row: "Line 8: Expected at least 3 fields (Name, Type, Currency)"                                                                     |
| 3.9  | Clear all text in textarea                                            | Preview area hides. Submit button text reverts to "Create Accounts"                                                                        |
| 3.10 | Type only invalid lines (no valid accounts)                           | Preview shows errors only. Submit button is disabled                                                                                       |

---

### 4. Bulk Add — Successful Submission

> **Critical:** Data mutation — creates real accounts in the database.

**Component under test:** `bulk-add-accounts.client.ts` (submit) + `POST /api/accounts`

| Step | Action                                                                                                                     | Expected Result                                                                                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 4.1  | Note the current account count on the accounts page                                                                        | Record the number (e.g., 8 accounts)                                                                            |
| 4.2  | Open bulk add modal, enter 2 valid accounts: `Bulk Test One, bank_account, IDR, 100000` and `Bulk Test Two, e_wallet, IDR` | Preview shows 2 valid accounts                                                                                  |
| 4.3  | Click "Create 2 Accounts"                                                                                                  | Button text changes to "Creating...", button becomes disabled                                                   |
| 4.4  | Wait for completion                                                                                                        | Success toast appears: "2 accounts created successfully!". Modal closes. Page refreshes                         |
| 4.5  | Verify accounts appear in the list                                                                                         | "Bulk Test One" appears under Liquid group with balance 100,000 IDR. "Bulk Test Two" appears with balance 0 IDR |
| 4.6  | Verify account count increased                                                                                             | Account count is now original + 2                                                                               |

---

### 5. Bulk Add — Partial Failure

**Component under test:** `bulk-add-accounts.client.ts` (error handling)

| Step | Action                                                                                                                                             | Expected Result                                                                                                               |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 5.1  | Open bulk add modal, enter: valid account line + a duplicate name of an already-existing account (if duplicates are rejected) or mix valid/invalid | At least one line succeeds and one fails                                                                                      |
| 5.2  | Click submit                                                                                                                                       | Toast shows partial result (e.g., "1 created, 1 failed"). Error div in modal shows specific failure message. Modal stays open |
| 5.3  | Fix or remove the failed line, submit again                                                                                                        | Remaining accounts created. Success toast, modal closes                                                                       |

---

### 6. Bulk Add — Empty Submission

| Step | Action                                                             | Expected Result                                                                 |
| ---- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| 6.1  | Open bulk add modal, leave textarea empty, click "Create Accounts" | Error message: "Please enter at least one valid account line." Modal stays open |
| 6.2  | Type whitespace-only lines (spaces, blank lines)                   | Same error message. No accounts created                                         |

---

### 7. Transfer Ownership — Admin Visibility

**Component under test:** Transfer Ownership section on `[id].astro`

| Step | Action                                                                                 | Expected Result                                                                                                                                                              |
| ---- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1  | Log in as `demo@example.com` (admin), navigate to `/accounts`, click on any account    | Account detail page loads with Transfer Ownership section visible at the bottom                                                                                              |
| 7.2  | Verify section content                                                                 | Shows "Transfer Ownership" heading with UserRoundCog icon. Shows "Current owner: Demo User". Dropdown lists all workspace members. "Transfer" button is present but disabled |
| 7.3  | Log out, log in as `member@example.com` (member), navigate to same account detail page | Transfer Ownership section is NOT visible. No dropdown, no transfer button                                                                                                   |

---

### 8. Transfer Ownership — Dropdown Behavior

**Component under test:** Transfer Ownership dropdown + button state

| Step | Action                                | Expected Result                                                                                |
| ---- | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 8.1  | As admin, open account detail page    | Current owner is pre-selected in dropdown with "(current)" suffix. Transfer button is disabled |
| 8.2  | Change dropdown to a different member | Transfer button becomes enabled                                                                |
| 8.3  | Change dropdown back to current owner | Transfer button becomes disabled again                                                         |

---

### 9. Transfer Ownership — Successful Transfer

> **Critical:** Data mutation — changes account ownership permanently.

**Component under test:** Transfer Ownership submit + `PATCH /api/accounts/:id/transfer-owner`

| Step | Action                                                      | Expected Result                                                                                                                        |
| ---- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 9.1  | As admin, open an account owned by "Demo User"              | Current owner shows "Demo User"                                                                                                        |
| 9.2  | Select "Demo Member" from the dropdown, click "Transfer"    | Warning confirmation appears: "Are you sure you want to transfer ownership of this account?" with "Yes, Transfer" and "Cancel" buttons |
| 9.3  | Click "Cancel"                                              | Confirmation hides. No changes made                                                                                                    |
| 9.4  | Click "Transfer" again, then click "Yes, Transfer"          | Button text changes to "Transferring...". Success toast: "Ownership transferred successfully!". Page reloads                           |
| 9.5  | Verify owner changed                                        | Current owner label now shows "Demo Member". Dropdown has "Demo Member" selected with "(current)" suffix                               |
| 9.6  | Navigate to `/accounts`, switch to "Mine" view              | The transferred account no longer appears in admin's personal view                                                                     |
| 9.7  | Transfer the account back to "Demo User" (to restore state) | Ownership reverts successfully                                                                                                         |

---

### 10. Transfer Ownership — Non-Admin API Protection

| Step | Action                                                                                                                  | Expected Result                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 10.1 | Log in as `member@example.com`, open browser dev tools Network tab                                                      | Ready to observe API calls                                                          |
| 10.2 | Manually send `PATCH /api/accounts/{id}/transfer-owner` with body `{"owner_user_id": "admin-id"}` via dev tools console | API returns 403 with message "Only workspace admins can transfer account ownership" |

---

### 11. Clean Up Test Data

| Step | Action                                                            | Expected Result                                     |
| ---- | ----------------------------------------------------------------- | --------------------------------------------------- |
| 11.1 | Navigate to `/accounts`, find "Bulk Test One" and "Bulk Test Two" | Test accounts are visible                           |
| 11.2 | Delete both test accounts via the existing delete flow            | Accounts removed. Account count returns to original |

---

## Summary Checklist

| #   | Area                   | Key Assertion                                                           | Pass |
| --- | ---------------------- | ----------------------------------------------------------------------- | ---- |
| 1   | Bulk button visibility | Button appears in current view, hidden in historical view               | [ ]  |
| 2   | Modal open/close       | Modal opens on click, closes on Cancel and backdrop                     | [ ]  |
| 3   | Input parsing          | Valid lines show in preview, invalid lines show specific error messages | [ ]  |
| 4   | Successful creation    | All valid accounts appear in list after submission                      | [ ]  |
| 5   | Partial failure        | Success count + error messages shown, modal stays open                  | [ ]  |
| 6   | Empty submission       | Error message, no accounts created                                      | [ ]  |
| 7   | Admin visibility       | Transfer section visible for admin, hidden for member                   | [ ]  |
| 8   | Dropdown behavior      | Button disabled for current owner, enabled for different selection      | [ ]  |
| 9   | Successful transfer    | Owner changes, page reloads, account moves to new owner's personal view | [ ]  |
| 10  | API protection         | Non-admin gets 403 on transfer API                                      | [ ]  |

**Critical paths:** Steps 3, 4, 7, and 9 are highest priority.

## Automated Test Coverage

No new automated tests in this branch yet. The features reuse existing service and API code that already has coverage:

| Suite              | Tests    | File                                            |
| ------------------ | -------- | ----------------------------------------------- |
| Account service    | existing | `src/services/account.service.test.ts`          |
| Account API (POST) | existing | covered by E2E                                  |
| Transfer owner API | existing | `src/pages/api/accounts/[id]/transfer-owner.ts` |

Client-side parsing logic (`bulk-add-accounts.client.ts`) would benefit from unit tests for `parseLine()` and `parseTextarea()` functions.
