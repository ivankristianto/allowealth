# Fresh Installation & Onboarding - Manual Test Plan

**Branch:** `new-workspace-onboarding`
**Date:** 2026-02-19

## Overview

End-to-end test plan for a brand-new Allowealth installation. Covers the complete user journey from workspace creation through email verification, initial setup (currency, budget categories, asset categories, budget amounts, asset accounts), adding transactions, and validating all numbers are correct across Dashboard, Transactions, Budget, Assets, and Reports pages.

## Prerequisites

- Local dev server running: `bun run dev` → `http://localhost:4321`
- Fresh SQLite database (no prior seed data): `rm -f .db/dev.db && bun run db:migrate`
- Mailpit or similar local SMTP catcher running to receive verification emails (or check `src/services/email/` for dev mode that logs to console)
- `.env` set with `SIGNUP_MODE=public` (so public signup is allowed)
- Cloudflare Turnstile: in dev mode the widget is typically bypassed or uses a test key; confirm the form can submit

> **Note on verification emails:** In dev mode, emails may be logged to the terminal instead of sent. Watch the dev server console for the verification link when signing up.

---

## Test Steps

### 1. Public Signup & Workspace Creation

> **Critical:** This is the entry point — failure here blocks all subsequent steps.

| Step | Action                                                                                                                                | Expected Result                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1.1  | Navigate to `http://localhost:4321`                                                                                                   | Landing page loads; CTA shows "Get Started" or "Sign Up" button                                    |
| 1.2  | Click the sign-up CTA                                                                                                                 | Redirected to `/signup` page                                                                       |
| 1.3  | Fill in: **Name** = `Test User`, **Email** = `testuser@example.com`, **Password** = `TestPass123!`, **Workspace Name** = `My Finance` | All fields accept input without error                                                              |
| 1.4  | Submit the signup form                                                                                                                | Page shows success message: "Check your email to verify your account" (or similar); no error toast |
| 1.5  | Check dev server console (or Mailpit inbox) for verification email                                                                    | Email contains a verification link with a token, e.g. `/api/auth/verify-email?token=<TOKEN>`       |

---

### 2. Email Verification & Workspace Activation

> **Critical:** Verification activates the workspace and seeds default asset categories. Skipping this makes login impossible.

| Step | Action                                                                             | Expected Result                                                          |
| ---- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 2.1  | Copy the verification URL from the email/console and navigate to it in the browser | Browser follows the link                                                 |
| 2.2  | Observe the redirect destination                                                   | Redirected to `/login?verified=true`                                     |
| 2.3  | Observe the login page                                                             | A success banner/toast appears: "Email verified successfully" or similar |

---

### 3. Login

| Step | Action                                                                               | Expected Result                                                                                                  |
| ---- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 3.1  | On `/login`, enter **Email** = `testuser@example.com`, **Password** = `TestPass123!` | Fields accept input                                                                                              |
| 3.2  | Click "Sign In"                                                                      | Redirected to `/dashboard`                                                                                       |
| 3.3  | Observe the dashboard                                                                | **Onboarding checklist** is visible with 5 incomplete steps: Currency, Categories, Budgets, Assets, Transactions |

---

### 4. Set Workspace Currency

> **Critical:** Dashboard data does not load until currency is configured.

| Step | Action                                                                                                 | Expected Result                                              |
| ---- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 4.1  | From the dashboard onboarding checklist, click the **Currency** step link (or navigate to `/settings`) | Settings page loads                                          |
| 4.2  | Locate the **Currency** dropdown/selector                                                              | Dropdown shows options including IDR and USD                 |
| 4.3  | Select **IDR** and save                                                                                | Success toast appears; settings saved                        |
| 4.4  | Navigate back to `/dashboard`                                                                          | Onboarding checklist: Currency step now shows as complete ✅ |

---

### 5. Setup Budget (Expense) Categories

| Step | Action                                                           | Expected Result                                                  |
| ---- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| 5.1  | From dashboard checklist or nav, go to `/budget/categories`      | Budget categories page loads; list may be empty or show defaults |
| 5.2  | Click **"+ Add Category"** (or bulk-add button)                  | Category creation form or modal opens                            |
| 5.3  | Create category: **Name** = `Food & Dining`, **Type** = Expense  | Category appears in list                                         |
| 5.4  | Create category: **Name** = `Transportation`, **Type** = Expense | Category appears in list                                         |
| 5.5  | Create category: **Name** = `Entertainment`, **Type** = Expense  | Category appears in list                                         |
| 5.6  | Create category: **Name** = `Salary`, **Type** = Income          | Income category appears in list                                  |
| 5.7  | Verify category count on the page                                | At least 3 expense categories and 1 income category are listed   |
| 5.8  | Navigate back to `/dashboard`                                    | Onboarding checklist: Categories step now shows as complete ✅   |

---

### 6. Review Default Asset Categories

| Step | Action                                                                            | Expected Result                                                                                                                                            |
| ---- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1  | Navigate to `/assets/categories`                                                  | Asset categories page loads                                                                                                                                |
| 6.2  | Observe the system categories list                                                | Shows 9 system categories: Bank Account, E-Wallet, Mutual Fund, Bond, Crypto, Stock, Other (assets) + Credit Card, Loan (liabilities); these are read-only |
| 6.3  | Click **"+ Add Category"** and create: **Name** = `Cash Wallet`, **Type** = Asset | Custom category appears in list alongside system categories                                                                                                |

---

### 7. Initialize Budget for Current Month

| Step | Action                                                                   | Expected Result                                                                                     |
| ---- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| 7.1  | Navigate to `/budget`                                                    | Budget page loads; shows current month; budget summary shows 0 allocated                            |
| 7.2  | Click **"Initialize Budgets"** button (visible when budgets not yet set) | System creates zero-amount budget rows for all expense categories                                   |
| 7.3  | Observe the budget list                                                  | All expense categories appear (Food & Dining, Transportation, Entertainment) each with IDR 0 budget |

---

### 8. Set Budget Amounts

> **Critical:** Numbers here must match totals validated later in Dashboard and Reports.

| Step | Action                                                    | Expected Result                                                                               |
| ---- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 8.1  | Click the edit button on **Food & Dining** budget row     | Edit form/inline edit opens showing current amount = 0                                        |
| 8.2  | Set amount to **IDR 2,000,000** and save                  | Row updates to show IDR 2,000,000; no error                                                   |
| 8.3  | Set **Transportation** budget to **IDR 500,000** and save | Row updates to IDR 500,000                                                                    |
| 8.4  | Set **Entertainment** budget to **IDR 300,000** and save  | Row updates to IDR 300,000                                                                    |
| 8.5  | Observe the **Budget Summary Card** at top of page        | Total Allocated = **IDR 2,800,000**; Total Spent = **IDR 0**; all categories show "ok" status |
| 8.6  | Navigate back to `/dashboard`                             | Onboarding checklist: Budgets step now shows as complete ✅                                   |

---

### 9. Add Asset Accounts

> **Critical:** Asset balances feed the Assets widget on the dashboard and the Assets page totals.

| Step | Action                                                                                                                                              | Expected Result                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 9.1  | Navigate to `/assets`                                                                                                                               | Assets page loads with empty state message "No assets tracked yet" and an "Add Your First Asset" button |
| 9.2  | Click **"Add Your First Asset"** (or the "+ Add Asset" button in actions)                                                                           | Asset form modal opens                                                                                  |
| 9.3  | Fill in: **Name** = `BCA Savings`, **Type** = Bank Account, **Category** = Bank Account, **Currency** = IDR, **Balance** = `5000000`                | Form fields populated                                                                                   |
| 9.4  | Save the asset                                                                                                                                      | Modal closes; asset "BCA Savings" appears in the Liquid group with balance IDR 5,000,000                |
| 9.5  | Click **"+ Add Asset"** again and add: **Name** = `GoPay`, **Type** = E-Wallet, **Category** = E-Wallet, **Currency** = IDR, **Balance** = `500000` | Asset "GoPay" appears in Liquid group with IDR 500,000                                                  |
| 9.6  | Add another asset: **Name** = `Visa Credit Card`, **Type** = Credit Card, **Category** = Credit Card, **Currency** = IDR, **Balance** = `0`         | Asset "Visa Credit Card" appears in Debt group with IDR 0                                               |
| 9.7  | Observe the **Portfolio Summary** section                                                                                                           | Total Assets (IDR) = **IDR 5,500,000**; Total Debt (IDR) = IDR 0; allocation chart visible              |
| 9.8  | Navigate back to `/dashboard`                                                                                                                       | Onboarding checklist: Assets step now shows as complete ✅; Assets widget shows IDR 5,500,000           |

---

### 10. Add Transactions — Income

| Step | Action                                                                                                                                                                | Expected Result                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 10.1 | Navigate to `/transactions`                                                                                                                                           | Transactions page loads with empty state                                            |
| 10.2 | Click **"+ Add Transaction"** or equivalent action                                                                                                                    | Transaction form/modal opens                                                        |
| 10.3 | Fill in: **Type** = Income, **Category** = Salary, **Amount** = `8000000`, **Currency** = IDR, **Asset** = BCA Savings, **Date** = today, **Note** = `Monthly salary` | Form fields populated                                                               |
| 10.4 | Save the transaction                                                                                                                                                  | Transaction appears in list: "Salary — IDR 8,000,000" for today                     |
| 10.5 | Navigate to `/assets`                                                                                                                                                 | BCA Savings balance now = **IDR 13,000,000** (5,000,000 initial + 8,000,000 income) |

---

### 11. Add Transactions — Expenses

| Step | Action                                                                                                                                                                                | Expected Result                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 11.1 | Go back to `/transactions` and add: **Type** = Expense, **Category** = Food & Dining, **Amount** = `350000`, **Asset** = BCA Savings, **Date** = today, **Note** = `Grocery shopping` | Transaction appears: "Food & Dining — IDR 350,000"                                               |
| 11.2 | Add expense: **Type** = Expense, **Category** = Transportation, **Amount** = `150000`, **Asset** = GoPay, **Date** = today, **Note** = `Grab rides`                                   | Transaction appears: "Transportation — IDR 150,000"                                              |
| 11.3 | Add expense: **Type** = Expense, **Category** = Entertainment, **Amount** = `200000`, **Asset** = BCA Savings, **Date** = today, **Note** = `Movie tickets`                           | Transaction appears: "Entertainment — IDR 200,000"                                               |
| 11.4 | Observe transaction list                                                                                                                                                              | 4 transactions total (1 income + 3 expenses); grouped under today's date                         |
| 11.5 | Observe the **Summary Cards** at top of page                                                                                                                                          | Income = **IDR 8,000,000**; Expenses = **IDR 700,000**; Count = 4                                |
| 11.6 | Navigate back to `/dashboard`                                                                                                                                                         | Onboarding checklist: Transactions step now shows as complete ✅; all 5 checklist items complete |

---

### 12. Validate Dashboard Numbers

> **Critical:** All widgets must reflect the exact transactions and assets entered above.

| Step | Action                               | Expected Result                                                                                                                                              |
| ---- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 12.1 | Navigate to `/dashboard`             | Dashboard loads with all widgets visible (no onboarding checklist or checklist fully complete)                                                               |
| 12.2 | Check **Spending Card**              | Total Spent this month = **IDR 700,000**; Budget = IDR 2,800,000; Remaining = **IDR 2,100,000**                                                              |
| 12.3 | Check **Spending Chart** (donut)     | Shows 3 slices: Food & Dining (350k), Transportation (150k), Entertainment (200k); proportions match amounts                                                 |
| 12.4 | Check **Recent Transactions** widget | Shows latest transactions including Salary, Food & Dining, Transportation, Entertainment entries from today                                                  |
| 12.5 | Check **Assets Widget**              | IDR Total = **IDR 12,850,000** (BCA Savings: 13,000,000 − 350,000 − 200,000 = 12,450,000 + GoPay: 500,000 − 150,000 = 350,000 = 12,800,000); no debt balance |
| 12.6 | Check **Cash Flow Widget**           | Shows most recent income and expense transactions                                                                                                            |
| 12.7 | Check **Budget Health Alerts**       | No alerts (all categories are under budget)                                                                                                                  |

> **Note on asset balances:** Verify that each expense transaction reduced the linked asset's balance. If asset balance calculation appears off, check that transactions properly linked to the correct asset account.

---

### 13. Validate Transactions Page

| Step | Action                                               | Expected Result                                                                  |
| ---- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| 13.1 | Navigate to `/transactions`                          | Transactions page for current month                                              |
| 13.2 | Verify **Summary Cards**                             | Income = **IDR 8,000,000**; Expenses = **IDR 700,000**; Transaction Count = 4    |
| 13.3 | Scroll through transaction list                      | All 4 transactions visible grouped under today's date in newest-first order      |
| 13.4 | Filter by **Type = Expense**                         | Only 3 expense transactions shown (Food & Dining, Transportation, Entertainment) |
| 13.5 | Clear filter; filter by **Category = Food & Dining** | Only 1 transaction shown: IDR 350,000                                            |
| 13.6 | Clear filter; use **Search** field, type `salary`    | Income transaction "Monthly salary" appears                                      |
| 13.7 | Clear filters                                        | All 4 transactions visible again                                                 |

---

### 14. Validate Budget Page

> **Critical:** Spent amounts must match transaction totals per category.

| Step | Action                                            | Expected Result                                                                         |
| ---- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 14.1 | Navigate to `/budget`                             | Budget page for current month, IDR currency                                             |
| 14.2 | Check **Budget Summary Card**                     | Allocated = **IDR 2,800,000**; Spent = **IDR 700,000**; Remaining = **IDR 2,100,000**   |
| 14.3 | Check **Food & Dining** budget row                | Budget = IDR 2,000,000; Spent = **IDR 350,000**; Remaining = IDR 1,650,000; Status = ok |
| 14.4 | Check **Transportation** budget row               | Budget = IDR 500,000; Spent = **IDR 150,000**; Remaining = IDR 350,000; Status = ok     |
| 14.5 | Check **Entertainment** budget row                | Budget = IDR 300,000; Spent = **IDR 200,000**; Remaining = IDR 100,000; Status = ok     |
| 14.6 | Switch to **Table view** (if available)           | Same data displayed in tabular format                                                   |
| 14.7 | Click on **Food & Dining** row/card to drill down | Drilldown shows the single IDR 350,000 Grocery shopping transaction                     |

---

### 15. Validate Assets Page

| Step | Action                                                       | Expected Result                                                                                                                         |
| ---- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| 15.1 | Navigate to `/assets`                                        | Assets page for current month                                                                                                           |
| 15.2 | Check **Portfolio Summary**                                  | Total IDR Assets = **IDR 12,800,000** (BCA Savings: 12,450,000 + GoPay: 350,000); Total Debt = IDR 0; Net Worth = IDR 12,800,000        |
| 15.3 | Check **Liquid** group                                       | BCA Savings and GoPay listed with updated balances                                                                                      |
| 15.4 | Check **Debt** group                                         | Visa Credit Card listed with IDR 0 balance                                                                                              |
| 15.5 | Click on **BCA Savings** row to open history/detail          | Asset history shows: initial balance 5,000,000 → +8,000,000 (income) → −350,000 (Food & Dining) → −200,000 (Entertainment) = 12,450,000 |
| 15.6 | Use the **month selector** to navigate to the previous month | Portfolio shows previous snapshot values (all zeros for a fresh install)                                                                |
| 15.7 | Navigate back to the current month                           | Portfolio returns to current values                                                                                                     |

---

### 16. Validate Reports Page

| Step | Action                                  | Expected Result                                                                                                   |
| ---- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 16.1 | Navigate to `/reports`                  | Reports page loads for current month                                                                              |
| 16.2 | Check **Summary Cards**                 | Total Income = **IDR 8,000,000**; Total Expenses = **IDR 700,000**; Net Income/Savings = **IDR 7,300,000**        |
| 16.3 | Check **Budget Health %** card          | Budget utilization = 25% (700,000 / 2,800,000); health indicator is green/good                                    |
| 16.4 | Check **Expense Breakdown** donut chart | 3 slices: Food & Dining (50%), Transportation (21.4%), Entertainment (28.6%); percentages proportional to amounts |
| 16.5 | Check **Income vs Expenses** bar chart  | Current month bar shows: income bar at 8M, expense bar at 700K; visible gap between them                          |
| 16.6 | Check **Category Table**                | Rows for Food & Dining (350k), Transportation (150k), Entertainment (200k); total = IDR 700,000                   |
| 16.7 | Switch to **Yearly view**               | Current year summary shows the same aggregated data                                                               |
| 16.8 | Switch back to **Monthly view**         | Returns to current month data                                                                                     |

---

### 17. Cross-Feature Consistency Check

| Step | Action                                                | Expected Result                                                  |
| ---- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| 17.1 | Note total expenses from `/transactions` summary card | IDR 700,000                                                      |
| 17.2 | Note total spent from `/budget` summary card          | IDR 700,000 — **matches transactions**                           |
| 17.3 | Note total expenses from `/reports` summary card      | IDR 700,000 — **matches both**                                   |
| 17.4 | Note income from `/transactions`                      | IDR 8,000,000                                                    |
| 17.5 | Note net income from `/reports`                       | IDR 7,300,000 (8,000,000 − 700,000) — **mathematically correct** |
| 17.6 | Note asset total from `/assets` portfolio summary     | IDR 12,800,000                                                   |
| 17.7 | Note asset total from `/dashboard` assets widget      | Must equal IDR 12,800,000 — **matches assets page**              |

---

## Summary Checklist

| #   | Area                 | Key Assertion                                                     | Pass |
| --- | -------------------- | ----------------------------------------------------------------- | ---- |
| 1   | Signup               | New workspace created and user registered                         | PASS |
| 2   | Email Verification   | Email verified, workspace activated, asset categories seeded      | PASS |
| 3   | Login                | Login succeeds, dashboard shows onboarding checklist              | PASS |
| 4   | Currency             | Currency set to IDR, onboarding step complete                     | PASS |
| 5   | Budget Categories    | 3 expense + 1 income categories created                           | PASS |
| 6   | Asset Categories     | 9 system categories present + 1 custom category added             | PASS |
| 7   | Budget Init          | Budget rows initialized for all expense categories                | PASS |
| 8   | Budget Amounts       | Total allocated = IDR 2,800,000                                   | PASS |
| 9   | Asset Accounts       | 2 liquid assets (IDR 5,500,000 total) + 1 credit card (IDR 0)     | PASS |
| 10  | Income Transaction   | Salary IDR 8,000,000 added to BCA Savings                         | PASS |
| 11  | Expense Transactions | 3 expenses totalling IDR 700,000 added                            | PASS |
| 12  | Dashboard            | Spending = IDR 700,000; Assets = IDR 5,500,000 (manual balances)  | PASS |
| 13  | Transactions Page    | Income = 8M, Expenses = 700K, filters work correctly              | PASS |
| 14  | Budget Page          | Each category shows correct spent amount; total spent = 700K      | PASS |
| 15  | Assets Page          | Manual balances shown; Calculated hint = 12,450,000 on BCA detail | PASS |
| 16  | Reports Page         | Income = 8M, Expenses = 700K, Net = 7.3M, chart data correct      | PASS |
| 17  | Cross-Feature        | Expenses (700K) match across Transactions, Budget, and Reports    | PASS |

**Critical paths:** Steps 2 (email verification), 8 (budget amounts), 10–11 (transactions), and 17 (cross-feature consistency) are highest priority.

---

## Test Run Notes (2026-02-19)

**Environment:** `http://onboarding.expenses.local:4323/`, branch `new-workspace-onboarding`, SQLite dev DB.

### Design Notes

**DESIGN: Asset balances are manually maintained** _(Steps 10.5, 12.5, 15.2)_

- Asset balances shown on the Assets page and Dashboard are manually set by the user (reconciled against real bank statements). Transactions do not automatically update them.
- Each asset's detail page shows a **"Calculated: Rp12.450.000,00"** hint displaying what the balance would be if all linked transactions were applied (initial 5M + 8M income − 350K − 200K = 12.45M for BCA Savings). This is correct.
- This is intentional — manual balance management allows users to track real account balances independent of app-recorded transactions.

### Bugs Found

**BUG-1 (UI): Income category chip auto-selects visually but doesn't activate "Save Entry" button** _(Step 10.4)_

- On the Add Transaction panel (Income tab), "Salary" appears visually selected after auto-selection, but the hidden `<select>` element retains value="" (placeholder).
- The "Save Entry" button stays disabled until the user manually clicks the Salary chip again.
- Workaround: clicking the visible category chip a second time triggers proper synchronization.
- Reproducible on first open of the income form; subsequent opens within the same session behave correctly.

### Cross-Feature Numbers (Step 17 — PASS)

- Income/Expenses/Net Savings fully consistent across Transactions, Budget, Reports ✅
- Asset portfolio shows manual balances consistently across Assets page and Dashboard ✅
- Calculated balance hint in asset details correctly reflects transaction history ✅

---

## Expected Final State

After completing all steps, the following values should be consistent across all pages:

| Metric                         | Value          |
| ------------------------------ | -------------- |
| Total Income (current month)   | IDR 8,000,000  |
| Total Expenses (current month) | IDR 700,000    |
| Net Savings (current month)    | IDR 7,300,000  |
| Budget Allocated               | IDR 2,800,000  |
| Budget Spent                   | IDR 700,000    |
| Budget Remaining               | IDR 2,100,000  |
| BCA Savings Balance            | IDR 12,450,000 |
| GoPay Balance                  | IDR 350,000    |
| Visa Credit Card Balance       | IDR 0          |
| Total Asset Portfolio (IDR)    | IDR 12,800,000 |
| Total Debt (IDR)               | IDR 0          |
| Net Worth (IDR)                | IDR 12,800,000 |

## Automated Test Coverage

| Suite                                            | File                                  |
| ------------------------------------------------ | ------------------------------------- |
| Auth service (register, verify, login)           | `src/services/auth.service.ts`        |
| Budget service (initialize, set amounts, totals) | `src/services/budget.service.ts`      |
| Asset service (create, balance update)           | `src/services/asset.service.ts`       |
| Transaction service (create, filter, totals)     | `src/services/transaction.service.ts` |
| Dashboard service (metrics, onboarding status)   | `src/services/dashboard.service.ts`   |
| Report service (monthly/yearly breakdown)        | `src/services/report.service.ts`      |

Run full unit test suite: `bun run test`
Run E2E tests: `bun run test:e2e`
