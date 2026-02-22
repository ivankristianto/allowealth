# Onboarding Journey Wizard — Design

**Date:** 2026-02-22
**Status:** Approved

## Problem

The current onboarding is a 5-step checklist (currencies → categories → budgets → accounts → transactions). It tells users **what** to do but not **why**. Users complete steps mechanically without understanding the envelope budgeting mental model, leading to confusion when they look at budget views later.

## Solution

Replace the checklist with a full-page guided wizard at `/onboarding` that teaches the mental model through 5 educational steps. Each step explains why it matters, not just what to do.

## Approach

**Hybrid server/client rendering** — server-rendered Astro pages for all steps, with client-side interactivity on the budget allocation step (step 4) for real-time updates. View Transitions for smooth step navigation.

## Flow

```
Login → Dashboard → (if incomplete) → /onboarding
                                         │
  Step 1: Currency ──────────────────────▶│
  Step 2: Accounts ──────────────────────▶│
  Step 3: Monthly Income ────────────────▶│
  Step 4: Allocate to Categories ────────▶│
  Step 5: First Expense ─────────────────▶│
                                         │
                              → /dashboard
```

## Steps

### Step 1 — "What currency do you use?"

**Why:** Everything in Allowealth is organized by currency.

**UI:** Currency dropdown (primary required, secondary optional checkbox). Reuses existing currency constants and `WorkspaceMetaService.setCurrency()`.

**Completion:** `workspace_meta` has a `currency` entry.

### Step 2 — "Where does your money live?"

**Why:** Connect your financial world. Starting balances ground the budget in reality.

**UI:** Inline account creation form (name, type, balance, currency). Users can add multiple accounts. Currency dropdown shows only workspace currencies.

**Completion:** 1+ non-deleted account exists.

**Data:** Uses existing `AccountService.create()`. `initial_balance` set automatically.

### Step 3 — "How much do you earn this month?"

**Why:** Establish the pool of money to allocate across categories.

**UI:** Amount input per currency. Explanatory note: "This is a planning number, not a transaction."

**Completion:** `workspace_meta` has a `monthly_income` entry.

**Data:** New `workspace_meta` key `monthly_income` stores JSON `{"IDR": "10000000"}` (or similar per-currency format).

### Step 4 — "Allocate your income" (client-interactive)

**Why:** Every dollar gets a job — this is envelope budgeting.

**UI:** Category list with editable budget amounts. Allocation progress bar showing allocated vs remaining. Pre-filled with smart defaults.

**Smart defaults:** Common percentages applied to income from step 3:

- Housing 30%, Food 20%, Savings 15%, Transport 10%, Personal 10%, Utilities 5%, Entertainment 5%, Health 5%

**Default categories** (auto-created if none exist): Food, Housing, Transport, Utilities, Entertainment, Savings, Health, Personal.

**Client script:** Real-time updates to allocation bar and remaining amount as user edits.

**Completion:** 1+ budget with non-zero amount exists.

**Data:** Uses existing `BudgetService` to create budgets for current month.

### Step 5 — "Record your first expense"

**Why:** Complete the loop — see budgeting in action.

**UI:** Simple expense form (amount, category, account, description, date). Mini budget preview showing impact after entry.

**Completion:** 1+ non-deleted transaction exists.

**Data:** Uses existing `TransactionService.create()`.

## Architecture

### Routing

- New page: `/src/pages/onboarding/index.astro`
- Redirect: `dashboard.astro` redirects to `/onboarding` when incomplete
- Redirect: `/onboarding` redirects to `/dashboard` when complete

### Step State

Purely derived from data (same pattern as today):

1. Currency exists → step 1 complete
2. 1+ account → step 2 complete
3. `monthly_income` meta exists → step 3 complete
4. 1+ non-zero budget → step 4 complete
5. 1+ transaction → step 5 complete → redirect to dashboard

### New Data

Single new `workspace_meta` key: `monthly_income` — stores planning income per currency as JSON string.

Add `monthly_income` to the `WorkspaceMetaService` allowed keys list.

### Component Structure

```
src/pages/onboarding/index.astro           # Wizard container + redirect logic
src/components/organisms/onboarding/
  ├── OnboardingProgress.astro              # Progress bar
  ├── StepCurrency.astro                    # Step 1
  ├── StepAccounts.astro                    # Step 2
  ├── StepIncome.astro                      # Step 3
  ├── StepAllocate.astro                    # Step 4
  ├── StepAllocate.client.ts                # Client interactivity for step 4
  └── StepFirstExpense.astro                # Step 5
```

### Removed

- `OnboardingChecklist.astro` — replaced entirely
- Onboarding query params (`?onboarding=categories`, etc.) — no longer needed

### Modified

- `dashboard.astro` — add redirect to `/onboarding` when incomplete
- `WorkspaceService.getOnboardingStatus()` — add `income` check
- `OnboardingStatus` type — add `income: boolean`
- `WorkspaceMetaService` — add `monthly_income` to allowed meta keys

## Non-Goals

- No income transactions during onboarding (purely a planning number)
- No forex conversion between currencies
- No category creation UI in the wizard (uses defaults or pre-existing)
- No skip/dismiss — wizard must be completed
