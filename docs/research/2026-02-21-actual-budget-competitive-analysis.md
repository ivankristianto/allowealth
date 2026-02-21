# Allowealth vs. Actual Budget — Design Gap Analysis

**Date:** 2026-02-21
**Author:** Design Review (Claude, senior product design partner)
**Source:** https://actualbudget.org/docs/
**Status:** Draft — for refinement and prioritization

---

## Executive Summary

Allowealth is a well-engineered, feature-complete v1 product. The tech foundations are solid, the design system is coherent, and the data model is thoughtful. But compared to Actual Budget, there are **structural gaps** in how the product thinks about money — not just missing features, but a different _philosophy_ of budgeting that affects every interaction. Actual's advantage isn't any single feature; it's a more honest mental model of personal finance.

The gaps fall into three tiers: **one foundational model gap**, **several missing core workflows**, and **multiple UX friction points**.

---

## 1. The Foundational Gap: Budget Philosophy

This is the most important finding.

**Allowealth's model:** Set a target budget per category. Track spending against it. Get warnings when you approach or exceed the target.

**Actual's model (envelope budgeting):** You have a specific amount of money. You distribute _that actual money_ into envelopes. You can only put what you have. Unspent money rolls over month to month and accumulates.

### Why This Matters for Users

In Allowealth, if you have Rp 15M income this month but budgeted Rp 18M across categories — that's allowed. You're planning against a fiction. In envelope budgeting, you literally cannot budget more than you have. The budget forces financial honesty.

More critically: **rollover behavior**. In Allowealth, January's unspent "Holiday" budget of Rp 10M disappears in February. The user has no easy way to accumulate savings within a category. In Actual, that Rp 10M stays in the Holiday envelope and grows each month you don't spend it. This is how real people save for irregular expenses (vacations, annual insurance, car repairs).

### The Practical Consequence

Allowealth is currently a **spending tracker with budget targets**. Actual is a **zero-based cash allocation system**. These are different products solving different user problems. The first is better for "did I overspend?" The second is better for "can I afford this?" and "am I actually living within my means?"

For the primary persona — a family financial manager tracking 20+ categories — the zero-based model is significantly more powerful and accurate.

**Recommendation:** This doesn't require a full rebuild. Add a "To Be Budgeted" figure at the top of the budget view showing unallocated income. Add category balance rollover as a toggle per category. These two changes alone would shift the mental model dramatically.

---

## 2. Missing Core Workflows

### 2a. No Scheduled / Recurring Transactions

Actual has a full scheduling system: flexible recurrence (daily/weekly/bi-weekly/monthly/yearly), approximate amounts for variable bills (±7.5%), amount ranges, and weekend date shifting. Schedules integrate with rules for auto-categorization.

**User impact:** Most people have 10–20 recurring expenses — rent, utilities, subscriptions, insurance, loan payments. In Allowealth, every one of these must be manually entered each month. There's no way to see upcoming bills before they're due. No planning ahead.

This is the **single highest-frequency pain point** for daily users. Someone paying 15 bills monthly enters 180 identical transactions per year that should be automatic.

**Recommendation:** Build scheduled transactions with at minimum: recurring flag on transactions, selectable frequency, and an "Upcoming" view showing next 30 days. Integrate with the budget view so upcoming scheduled transactions show as "planned" spending.

### 2b. No Payee System / Auto-Categorization

Allowealth transactions have a description field. Actual has **payees** as first-class entities with:

- Smart name matching (catches "AMAZON.COM\*5C7QC7MH0 AM 10/26" → "Amazon")
- Default category per payee
- Category learning (remembers how you categorized this payee)
- Rule-based overrides
- Payee merging (consolidate bank-import variants)

**User impact:** CSV imports from banks produce messy transaction descriptions. Without payees and rules, every imported transaction requires manual category assignment. For someone importing 100 transactions from a bank statement, this is 30–60 minutes of tedious cleanup work.

**Recommendation:** Add a payee/merchant model. When creating a transaction, the payee is a separate searchable field. Store last-used category per payee. When you categorize a transaction for "BCA ATM," every future "BCA ATM" transaction auto-fills that category. Start simple — no complex rules engine needed initially, just last-used-category per payee. Add full rules later.

### 2c. No Split Transactions

You cannot allocate one transaction across multiple categories. A single supermarket receipt might include food, cleaning supplies, and medicine. In Allowealth, you must choose one category or enter multiple transactions manually.

**User impact:** Real purchases are often mixed. Forcing single-category per transaction either inflates one category or creates artificial splits through duplicate data entry.

**Recommendation:** Add split transaction support. When adding/editing a transaction, allow "Add split" to divide the amount across 2+ categories. Display as a parent row with expandable child rows in the transaction list.

### 2d. No Reconciliation Workflow

Reconciliation is the process of matching your records against your bank statement to confirm they agree. Actual tracks each transaction's state: **uncleared** (you entered it), **cleared** (bank shows it), **reconciled** (you've confirmed this period matches).

**User impact:** Without reconciliation:

- You can't tell which transactions haven't appeared in your bank yet
- You can't lock past months to prevent accidental edits
- You can't verify your balance is correct
- You have no confidence in your data accuracy

This is especially critical for credit card users — there's often a lag between when you spend and when it clears.

**Recommendation:** Add a `status` field to transactions: `pending`, `cleared`, `reconciled`. Add a Reconcile workflow page: show cleared balance, let user enter bank statement balance, highlight discrepancies. Lock reconciled transactions from editing.

### 2e. No Bank Import Beyond CSV

Actual supports: CSV, QIF, OFX, QFX, CAMT, plus direct bank sync via SimpleFIN/GoCardless/Pluggy.ai.

OFX/QFX files contain transaction IDs, enabling much more reliable duplicate detection. Direct sync eliminates manual export/import entirely.

**User impact:** Current duplicate detection on CSV relies on date+amount+category matching, which is fragile. Real bank exports often have transactions on similar dates with similar amounts (e.g., two grocery runs of the same amount).

**Recommendation:** Near-term: add OFX/QFX parser (libraries exist for both formats). Long-term: integrate with Indonesian bank APIs or aggregators. For the IDR-primary market, evaluate Brankas, Brick, or open banking APIs from BCA/Mandiri.

---

## 3. Budget View UX Gaps

### 3a. Flat Category List vs. Category Groups

Allowealth has 20+ categories in a flat list. Actual organizes them into **collapsible groups** (Fixed Expenses, Variable Expenses, Savings Goals, Income, etc.). Group headers show aggregate status.

**User impact:** Scanning 20 categories to find your status is cognitively taxing. Groups let you collapse "everything is fine" sections and focus on what needs attention.

**Recommendation:** Add category groups. Data model needs a `group_id` on categories. Budget table needs group headers with rollup totals, expand/collapse toggle, and group-level status indicator.

### 3b. Budget Fill from Averages

Actual lets you auto-fill budget amounts based on 3-month, 6-month, or 12-month averages. Allowealth only supports copying from the previous month.

**User impact:** If January had unusual spending, copying it produces a bad February budget. Averages are more predictive for variable categories like groceries, dining, and utilities.

**Recommendation:** Add an "Average" option to budget initialization. Calculate average spending per category for trailing N months, pre-fill as budget amounts. The service already has the data to compute this.

### 3c. No Multi-Month Budget View

Actual displays multiple months side by side. Allowealth shows one month at a time.

**User impact:** Spotting trends (is dining out creeping up month over month?) requires clicking back and forth. Side-by-side comparison is essential for identifying patterns.

**Recommendation:** Add a "Trend view" toggle to the budget page showing the last 3–6 months side by side per category. Could launch as a report rather than replacing the main budget view.

### 3d. Budget Carryover Not Default

In Allowealth, each month's budget starts clean. Unspent budget is lost.

**User impact:** Saving for annual expenses (holiday, car registration, annual subscriptions) requires manual workarounds or a separate savings account. The budget can't represent "I'm saving 100k/month toward my vacation."

**Recommendation:** Add a `rollover` toggle per category. When enabled, unspent balance carries forward to next month. Show the rollover amount in the budget table as a separate line. This is the "sinking fund" pattern — essential for honest budgeting of irregular expenses.

---

## 4. Transaction List UX Gaps

### 4a. No Bulk Operations

Allowealth has no way to select multiple transactions and operate on them (bulk categorize, delete, mark cleared).

**User impact:** After a CSV import, correcting 30 miscategorized transactions requires 30 individual edits. This is the most common post-import activity and it's brutal without bulk editing.

**Recommendation:** Add checkboxes to transaction rows. "Select all" on current page. Bulk actions: change category, change payment method, delete, mark cleared.

### 4b. No Saved Filters

Filters are transient — they're lost on navigation. Actual lets users save frequently-used filter combinations.

**User impact:** If you always want to see "BCA Credit Card expenses this month," you recreate that filter every time you visit the page.

**Recommendation:** Add a "Save filter" button. Store named filters per user. Show them as quick-access chips on the filter bar.

### 4c. Transaction Cleared State

No way to mark which transactions have cleared the bank vs. are still pending. Related to reconciliation gap above.

**Recommendation:** Add `status` column with `pending` / `cleared` / `reconciled`. Show cleared vs. uncleared balance in account header.

---

## 5. Reporting Gaps

### 5a. No Explicit Net Worth View

Allowealth tracks assets and shows history, but there's no clean "Net Worth over Time" chart. Actual's Net Worth report explicitly shows assets minus liabilities plotted over time.

**User impact:** Net worth is the most motivating personal finance number. Watching it grow over years is what keeps people engaged. Burying this in asset history charts is a missed emotional hook.

**Recommendation:** Create a dedicated Net Worth page (or prominent dashboard widget): single line chart, total assets minus total liabilities (debt accounts), plotted monthly from first snapshot. Show the number prominently. Make it the hero metric for long-term users.

### 5b. No Liabilities / Debt Tracking

Allowealth tracks assets (bank accounts, investments). There's no explicit "debt" account type — credit card balances, loans, mortgages.

**User impact:** Net worth is meaningless without tracking what you owe. Someone with Rp 100M in assets and Rp 80M in debt has very different financial health than someone with the same assets and Rp 0 in debt.

**Recommendation:** Add a `liability` account type (credit card, mortgage, car loan, personal loan). Include in net worth calculation as a negative. Show debt paydown over time as a positive trend on the net worth chart.

### 5c. No Custom / Saved Reports

Reports are fixed templates (monthly, yearly, custom range). Actual lets users create custom reports with flexible date ranges, groupings, and visualizations, and save them for reuse.

**User impact:** Power users need different views — "show me all food spending excluding restaurants across the last 6 months" or "compare utilities costs year over year."

**Recommendation:** Add a report builder with: date range picker, category multi-select filter, visualization type toggle (bar/line/table), and save-as-named-report. The data foundation exists; this is primarily a UI feature.

### 5d. No Budget vs. Actual Over Time Report

Current reports show spending by category and period. Missing: a report showing budget adherence trends — which categories consistently overspend, which are chronically under-budgeted.

**Recommendation:** Add a "Budget Adherence" report: for each category, show monthly budget amount vs. actual spending as a bar chart per month. Highlight months in red where actual > budget. This tells users where their budget assumptions are systematically wrong.

---

## 6. Onboarding Gaps

### 6a. Onboarding is a Checklist, Not a Journey

Allowealth has an onboarding checklist. Actual guides users through a conceptual journey: understand envelope budgeting → add income → allocate to envelopes → record spending.

**User impact:** Without understanding the mental model, users add transactions but don't understand why the budget view shows what it shows. Churn at this point is high in financial apps.

**Recommendation:** Add a 3-step onboarding flow:

1. "Add your income for this month" (establishes the pool)
2. "Allocate that income to categories" (teaches the model)
3. "Record your first expense" (completes the loop)

Each step should explain _why_, not just _what_.

### 6b. No Starting Balance Concept

When a new user joins, there's no concept of "what do you currently have in each account?" The budget starts in a vacuum.

**Recommendation:** In account creation, ask for the current balance. Show it as a "Starting Balance" transaction (system-generated, dated before all others). This grounds the first budget in reality.

---

## 7. Allowealth's Advantages to Protect and Extend

These are areas where Allowealth leads Actual. They are the product's moat.

**Multi-currency (IDR/USD):** Actual has very limited multi-currency support. Allowealth's exchange rate management and dual-currency display is significantly better. This is table stakes for the Indonesian market and expats.

**Asset/Investment Tracking:** Actual tracks account balances. Allowealth tracks balance _history_ for investments with update reminders and snapshot system. This is genuinely more useful for someone with mutual funds and stocks requiring manual balance updates.

**Family Workspace Model:** Actual's sharing model is simpler. Allowealth's workspace + roles + member spending reports is a real differentiator for families.

**MCP / AI Integration:** No personal finance app at this level has MCP integration. Natural language queries ("how much did I spend on food in Q4?") will become a baseline user expectation. This could be a significant differentiator.

**Forecasting / Calculators:** Actual has no forecasting tools. The compound interest calculator and savings projector are genuinely useful for financial planning beyond "did I stick to my budget?"

---

## 8. Priority Roadmap

### Phase 1 — Fix the Foundation (High impact, medium effort)

| #   | Feature                                                  | Notes                                                          |
| --- | -------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | "To Be Budgeted" available balance at top of budget view | Shows unallocated income; teaches zero-based model             |
| 2   | Budget carryover / rollover toggle per category          | Enables sinking funds; requires balance tracking schema change |
| 3   | Scheduled / recurring transactions                       | Highest-frequency daily pain point                             |
| 4   | Split transactions                                       | One purchase → multiple categories                             |
| 5   | Bulk transaction operations                              | Essential post-import workflow                                 |

### Phase 2 — Reduce Friction (High impact, lower effort)

| #   | Feature                                     | Notes                            |
| --- | ------------------------------------------- | -------------------------------- |
| 6   | Payee system with last-used category memory | Start simple, add rules later    |
| 7   | Category groups with collapsible headers    | Needs `group_id` on categories   |
| 8   | Liability / debt account type               | Required for accurate net worth  |
| 9   | Explicit Net Worth chart (hero metric)      | Uses existing snapshot data      |
| 10  | OFX/QFX import format support               | Better duplicate detection       |
| 11  | Budget fill from averages                   | Complement to copy-from-previous |

### Phase 3 — Close Power-User Gaps

| #   | Feature                                             | Notes                         |
| --- | --------------------------------------------------- | ----------------------------- |
| 12  | Reconciliation workflow (cleared/reconciled states) | Adds `status` to transactions |
| 13  | Saved filters                                       | Stored per user               |
| 14  | Budget vs. Actual adherence report                  | New report type               |
| 15  | Multi-month budget comparison view                  | Trend view toggle             |
| 16  | Custom report builder                               | Flexible date/category/viz    |

### Protect the moat

- Invest in multi-currency — make it the best in class for IDR/USD
- Expand asset tracking with investment-specific features (yield, cost basis)
- MCP integration: make natural language queries actually useful for daily use
- Evaluate Indonesian bank API integrations (Brick, Brankas, BCA open banking)

---

## Summary Comparison Table

| Gap                                | Impact | Effort | Priority |
| ---------------------------------- | ------ | ------ | -------- |
| "To Be Budgeted" available balance | High   | Low    | P1       |
| Budget carryover (sinking funds)   | High   | Medium | P1       |
| Scheduled recurring transactions   | High   | Medium | P1       |
| Split transactions                 | High   | Medium | P1       |
| Bulk transaction operations        | High   | Low    | P1       |
| Payee system + auto-categorization | High   | Medium | P2       |
| Category groups                    | Medium | Low    | P2       |
| Liability / debt accounts          | High   | Medium | P2       |
| Net Worth chart (dedicated)        | High   | Low    | P2       |
| OFX/QFX import formats             | High   | Low    | P2       |
| Budget fill from averages          | Medium | Low    | P2       |
| Reconciliation workflow            | Medium | Medium | P3       |
| Saved filters                      | Low    | Low    | P3       |
| Budget vs. Actual report           | Medium | Medium | P3       |
| Multi-month budget view            | Medium | Medium | P3       |
| Custom report builder              | Medium | High   | P3       |

---

## References

- Actual Budget docs: https://actualbudget.org/docs/
- Actual Budget tour: https://actualbudget.org/docs/tour
- Scheduled transactions: https://actualbudget.org/docs/schedules
- Payee management: https://actualbudget.org/docs/transactions/payees
- Transaction importing: https://actualbudget.org/docs/transactions/importing
- Category management: https://actualbudget.org/docs/budgeting/categories
- Budget view tour: https://actualbudget.org/docs/tour/budget
- Reports tour: https://actualbudget.org/docs/tour/reports
- Rules tour: https://actualbudget.org/docs/tour/rules
- Experimental features: https://actualbudget.org/docs/experimental/
- Migration/import: https://actualbudget.org/docs/migration/
