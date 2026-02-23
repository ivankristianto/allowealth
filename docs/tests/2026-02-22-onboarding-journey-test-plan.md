# Onboarding Journey Wizard - Manual Test Plan

**Branch:** `improve-onboarding`
**Date:** 2026-02-22

## Overview

Replaces the old 5-step onboarding checklist with a full-page guided wizard at `/onboarding`. The wizard teaches the envelope budgeting mental model through 5 steps: currency selection, account creation with starting balances, monthly income entry, budget allocation with smart defaults, and first expense recording. Tests cover the complete new-user journey, redirect logic, step progression, back navigation, data persistence, and removal of the old checklist.

## Prerequisites

- Fresh SQLite database: `rm -f .db/dev.db && bun run db:migrate`
- Local dev server running: `bun run dev` on port 4322 → `http://localhost:4322`
- `.env` set with `SIGNUP_MODE=public`
- Dev mode emails log to terminal (watch for verification link)
- **No seed data** — tests require a brand-new workspace

> **Seeded database alternative:** If using seeded data (`bun run db:seed`), log in as `demo@example.com` / `demo123456789`. Onboarding will already be complete — you'll only be able to test redirect-to-dashboard behavior (section 2). For full wizard testing, use a fresh database.

---

## Test Steps

### 1. Signup & Verification (Pre-Onboarding)

> **Critical:** Entry point — failure blocks all subsequent steps.

| Step | Action                                                                                                                  | Expected Result                                          |
| ---- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1.1  | Navigate to `http://localhost:4322`                                                                                     | Landing page loads with sign-up CTA                      |
| 1.2  | Click sign-up CTA, fill: Name=`Test User`, Email=`test@example.com`, Password=`TestPass123456!`, Workspace=`My Finance` | All fields accept input                                  |
| 1.3  | Submit signup form                                                                                                      | Success message displayed                                |
| 1.4  | Copy verification URL from dev server console, navigate to it                                                           | Redirected to `/login?verified=true` with success banner |
| 1.5  | Log in with `test@example.com` / `TestPass123456!`                                                                      | Redirected to `/onboarding` (NOT `/dashboard`)           |

---

### 2. Dashboard Redirect Logic

> **Critical:** Ensures incomplete users cannot bypass onboarding.

**Services under test:** `WorkspaceService.getOnboardingStatus()`, route guard middleware

| Step | Action                                                                                             | Expected Result                                                                        |
| ---- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 2.1  | While logged in with incomplete onboarding, navigate directly to `http://localhost:4322/dashboard` | Redirected to `/onboarding` with step 1 visible                                        |
| 2.2  | Navigate to `http://localhost:4322/transactions`                                                   | Page loads (protected route works, no redirect to onboarding from non-dashboard pages) |
| 2.3  | Navigate to `http://localhost:4322/onboarding` while NOT logged in (open incognito)                | Redirected to `/login?redirect=%2Fonboarding`                                          |

---

### 3. Step 1 — Currency Selection

**Services under test:** `WorkspaceMetaService.setCurrencySettings()`

| Step | Action                                                       | Expected Result                                                                                                                                                |
| ---- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1  | On `/onboarding`, observe the page                           | Progress bar shows "Step 1 of 5, 20%". Title is "What currency do you use?". Explanatory text visible. Primary currency dropdown visible with IDR pre-selected |
| 3.2  | Observe the secondary currency section                       | Checkbox "I also use a second currency" is unchecked. Secondary dropdown is hidden                                                                             |
| 3.3  | Check the "I also use a second currency" checkbox            | Secondary currency dropdown appears                                                                                                                            |
| 3.4  | Select primary=IDR, check secondary, select secondary=USD    | Both dropdowns show selected values                                                                                                                            |
| 3.5  | Uncheck the secondary checkbox                               | Secondary dropdown hides, value cleared                                                                                                                        |
| 3.6  | Re-check secondary, select USD, click "Continue"             | Loading state on button. Page reloads to step 2. Progress bar shows "Step 2 of 5, 40%"                                                                         |
| 3.7  | (Verify persistence) Navigate away and back to `/onboarding` | Step 2 is shown (step 1 already complete)                                                                                                                      |

---

### 4. Step 2 — Account Creation

> **Critical:** Accounts created here persist and affect budget/portfolio views.

**Services under test:** `AccountService.create()`, account categories

| Step | Action                                                                                  | Expected Result                                                                                                                                               |
| ---- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1  | On step 2, observe the page                                                             | Title is "Where does your money live?". Explanatory text visible. "Add an account" form visible. No existing accounts listed. "Continue" button is disabled   |
| 4.2  | Observe the account form fields                                                         | Name (text), Type (dropdown with Bank Account, Cash, E-Wallet, Credit Card), Current balance (with currency prefix showing IDR), and "+ Add account" button   |
| 4.3  | Fill: Name=`Main Checking`, Type=Bank Account, Balance=`5000000`, click "+ Add account" | Loading state. Page reloads. Account "Main Checking" appears in the accounts list showing "Rp 5,000,000" and "Bank Account". "Continue" button is now enabled |
| 4.4  | Fill: Name=`Cash Wallet`, Type=Cash, Balance=`500000`, click "+ Add account"            | Second account appears in list. Two accounts shown total                                                                                                      |
| 4.5  | If secondary currency (USD) was set: observe currency selector on balance field         | Currency dropdown shows IDR and USD options                                                                                                                   |
| 4.6  | Click "Back" button                                                                     | Returns to step 1 (currency selection) with previously selected currencies pre-filled                                                                         |
| 4.7  | Click "Continue" from step 1 again (currencies unchanged)                               | Returns to step 2 with both accounts still listed                                                                                                             |
| 4.8  | Click "Continue" on step 2                                                              | Advances to step 3. Progress bar shows "Step 3 of 5, 60%"                                                                                                     |

---

### 5. Step 3 — Monthly Income

**Services under test:** `WorkspaceMetaService.setMonthlyIncome()`, `PUT /api/workspace/settings`

| Step | Action                                      | Expected Result                                                                                                                                                    |
| ---- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 5.1  | On step 3, observe the page                 | Title is "How much do you earn this month?". Explanatory text about "pool of money". Income input with IDR currency prefix. Info tip about planning number visible |
| 5.2  | If secondary currency (USD) was set         | A second income input for USD is shown                                                                                                                             |
| 5.3  | Leave income field empty, click "Continue"  | Error message: "Please enter your monthly income"                                                                                                                  |
| 5.4  | Enter `0` in income field, click "Continue" | Error message (zero is not a valid income)                                                                                                                         |
| 5.5  | Enter `10000000` in IDR income field        | Input formats to `10,000,000` (or locale-appropriate formatting)                                                                                                   |
| 5.6  | Click "Continue"                            | Advances to step 4. Progress bar shows "Step 4 of 5, 80%"                                                                                                          |
| 5.7  | Click "Back" from step 4                    | Returns to step 3 with `10,000,000` pre-filled                                                                                                                     |

---

### 6. Step 4 — Budget Allocation

> **Critical:** This step auto-creates default expense categories if none exist and creates budget records.

**Services under test:** `CategoryService.seedDefaultExpenseCategories()`, `BudgetService`, `StepAllocate.client.ts`

| Step | Action                                                         | Expected Result                                                                                                                                                                  |
| ---- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1  | On step 4, observe the page                                    | Title is "Allocate your income". Explanatory text about envelope budgeting. Allocation bar showing "Income: IDR 10,000,000". 8 default categories listed with pre-filled amounts |
| 6.2  | Verify default categories                                      | Categories shown: Food & Groceries, Housing, Transportation, Utilities, Entertainment, Savings, Health, Personal                                                                 |
| 6.3  | Verify smart defaults                                          | Pre-filled amounts sum approximately to 10,000,000 (Housing 30%=3M, Food 20%=2M, etc.). Allocation bar shows ~100%                                                               |
| 6.4  | Change Food & Groceries amount from `2,000,000` to `3,000,000` | Allocation bar updates in real-time. "Allocated" amount increases by 1,000,000. "Remaining" decreases (may go negative — shown in red)                                           |
| 6.5  | Change Housing amount to `0`                                   | Allocation bar updates. Remaining increases. Bar percentage decreases                                                                                                            |
| 6.6  | Set all amounts to `0` except Food=`100000`                    | Allocation bar shows small percentage. Remaining shows most of income unallocated                                                                                                |
| 6.7  | Click "Continue"                                               | Budgets saved. Advances to step 5. Progress bar shows "Step 5 of 5, 100%"                                                                                                        |
| 6.8  | Navigate to `/budget` in a new tab                             | Budget page shows the categories with the amounts just set for the current month                                                                                                 |

---

### 7. Step 5 — First Expense

> **Critical:** Creates a real transaction that affects account balances and budget tracking.

**Services under test:** `TransactionService.create()`, `POST /api/transactions`

| Step | Action                                                                                                             | Expected Result                                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1  | On step 5, observe the page                                                                                        | Title is "Record your first expense". Explanatory text. Form with: Amount, Category (dropdown), Account (dropdown), Description, Date fields. "Finish Setup" button                                |
| 7.2  | Observe dropdowns                                                                                                  | Category dropdown shows the 8 expense categories from step 4. Account dropdown shows "Main Checking" and "Cash Wallet" from step 2                                                                 |
| 7.3  | Fill: Amount=`50000`, Category=Food & Groceries, Account=Main Checking, Description=`Coffee and lunch`, Date=today | All fields accept input                                                                                                                                                                            |
| 7.4  | Observe mini budget preview (if implemented)                                                                       | Shows Food & Groceries budget impact: e.g., "50,000 / 100,000"                                                                                                                                     |
| 7.5  | Click "Finish Setup"                                                                                               | Loading state. Transaction created. **Redirected to `/dashboard`**                                                                                                                                 |
| 7.6  | Observe the dashboard                                                                                              | No onboarding checklist visible. Dashboard widgets load with real data: account totals include the created accounts, recent transactions show "Coffee and lunch", spending card shows 50,000 spent |

---

### 8. Post-Onboarding Verification

**Services under test:** Dashboard redirect logic, data integrity

| Step | Action                                 | Expected Result                                                                                               |
| ---- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 8.1  | Navigate to `/onboarding` directly     | Redirected to `/dashboard` (onboarding already complete)                                                      |
| 8.2  | Check `/accounts` page                 | Both accounts listed: Main Checking (IDR 4,950,000 — reduced by 50,000 expense) and Cash Wallet (IDR 500,000) |
| 8.3  | Check `/budget` page for current month | Budget categories visible with amounts set in step 4. Food & Groceries shows 50,000 spent of 100,000 budget   |
| 8.4  | Check `/transactions` page             | "Coffee and lunch" transaction listed, amount IDR 50,000, category Food & Groceries, account Main Checking    |
| 8.5  | Check `/settings` page                 | Primary currency shows IDR, secondary shows USD (if set)                                                      |

---

### 9. Edge Cases & Error Handling

| Step | Action                                                                  | Expected Result                                                 |
| ---- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| 9.1  | On step 2, try to add account with empty name, click "+ Add account"    | Error message: "Account name is required". Account not created  |
| 9.2  | On step 2, try to continue with zero accounts                           | "Continue" button is disabled and un-clickable                  |
| 9.3  | Open `/onboarding` in two tabs. Complete step 1 in tab A. Refresh tab B | Tab B shows step 2 (state is server-derived, not client-stored) |
| 9.4  | On step 4, enter a very large budget amount (e.g., `999999999999`)      | Amount accepted or appropriate max-length validation            |
| 9.5  | On step 5, submit expense with amount=`0`                               | Error validation prevents zero-amount transactions              |
| 9.6  | Kill dev server during step submission, restart, refresh                | Page shows the correct step based on what was already saved     |

---

### 10. Old Onboarding Checklist Removal

| Step | Action                                                           | Expected Result                                                                                       |
| ---- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 10.1 | With seeded data (complete onboarding), navigate to `/dashboard` | Dashboard loads normally with widgets. **No** "Set up your workspace" checklist card visible anywhere |
| 10.2 | Search page source for "onboarding-checklist"                    | Not present in DOM                                                                                    |
| 10.3 | Navigate to `/budget?onboarding=budgets`                         | Page loads normally. The `?onboarding=budgets` param has no special effect (old behavior removed)     |
| 10.4 | Navigate to `/accounts?onboarding=add-account`                   | Page loads normally. No special onboarding mode triggered                                             |

---

## Summary Checklist

_Last run: 2026-02-23_

| #   | Area                | Key Assertion                                                               | Pass    |
| --- | ------------------- | --------------------------------------------------------------------------- | ------- |
| 1   | Signup → Onboarding | New user redirected to `/onboarding` after login, not `/dashboard`          | PASS    |
| 2   | Dashboard redirect  | `/dashboard` redirects to `/onboarding` when incomplete                     | PASS    |
| 3   | Step 1 Currency     | Primary + optional secondary currency saved to workspace meta               | PASS    |
| 4   | Step 2 Accounts     | Accounts created with correct starting balances and types                   | FAIL    |
| 5   | Step 3 Income       | Monthly income saved as planning number per currency                        | PARTIAL |
| 6   | Step 4 Allocation   | Default categories seeded, smart defaults pre-filled, real-time bar updates | PASS    |
| 7   | Step 4 Budgets      | Budget records created for current month with user-set amounts              | PASS    |
| 8   | Step 5 Expense      | Transaction created, account balance reduced, budget spending updated       | PASS    |
| 9   | Completion          | After step 5, redirected to dashboard with full data                        | PASS    |
| 10  | Old checklist       | OnboardingChecklist no longer renders anywhere                              | PASS    |
| 11  | Back nav            | Back buttons return to previous steps with data pre-filled                  | PASS    |
| 12  | Guard               | `/onboarding` requires auth; complete onboarding redirects to dashboard     | PASS    |

**Critical paths:** Steps 2 (redirect), 4 (accounts), 6-7 (allocation + budgets), 7.5 (expense + redirect).

## Findings — 2026-02-23 Run

### FAIL — #4 Step 2 Accounts: Balance input fields missing thousands-separator formatting

Account balance input fields display raw integers (`Rp 5000000`) instead of formatted values (`Rp 5,000,000`). This affects both the account form during entry and the back-navigation pre-fill on step 2. The accounts page after onboarding displays values correctly formatted. Root cause: the input fields do not apply locale-aware number formatting on render.

**Fixed 2026-02-23:** `StepAccounts.astro` — added `attachAmountFormatter` on `#account-balance` input (formats on type and auto-formats pre-filled back-nav values); added `formatAmountForDisplay` import to frontmatter for server-side balance display in the accounts list; currency select change syncs formatter via `formatter.updateCurrency()`.

### PARTIAL — #5 Step 3 Income: Validation messages differ from spec

- **5.3 (empty field):** Blocked by HTML5 `required` attribute (browser-native tooltip), no inline custom error message rendered in page.
- **5.4 (zero value):** Shows `"Please enter your monthly income"` — correct message to block zero income but the spec expected `"Please enter a positive amount"` for the zero-specifically case.
- **5.7 (back-nav pre-fill):** Pre-fills with unformatted `10000000` instead of `10,000,000`.

**Fixed 2026-02-23:** `StepIncome.astro` — added `attachAmountFormatter` on all `[data-amount-input]` fields (fixes 5.7 pre-fill and typing formatting); added `novalidate` to form so custom JS validation handles empty fields (fixes 5.3); separated empty-field check (`"Please enter your monthly income"`) from zero-value check (`"Please enter a positive amount"`) (fixes 5.4).

### BUG — Step 1 Currency: `[object Object]` rendered when navigating back from step 2

When on step 2 (accounts) and clicking Back → `/onboarding?reset=currency`, the currency step renders `[object Object]` as an error string below the form, blocking Continue. Navigating directly to `/onboarding` (without the reset param) correctly advances to the next incomplete step, providing a usable workaround. Root cause: `ApiResponse.error` is `{ message: string }` (an object), not a plain string — `new Error(data.error)` stringifies the object.

**Fixed 2026-02-23:** `StepCurrency.astro` — changed `data.error || 'Failed...'` to `data.error?.message || 'Failed...'` to correctly extract the message string. Same fix applied in `StepAccounts.astro` for the account creation error path.

### SKIP — Section 9 Edge Cases: Requires incomplete onboarding state

All Section 9 edge case tests (9.1–9.6) require the onboarding wizard to be in an incomplete state. After full completion, `?reset=` params redirect to `/dashboard` instead of re-opening wizard steps. To re-test these, start a fresh database.

## Automated Test Coverage

| Suite            | Tests | File                                               |
| ---------------- | ----- | -------------------------------------------------- |
| OnboardingStatus | 6     | `src/services/__tests__/onboarding-status.test.ts` |

After implementation, run: `bun test src/services/__tests__/onboarding-status.test.ts`

Full suite: `bun run test` — all tests should pass with 0 failures.
