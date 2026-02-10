# Family UX Research Report

**Date:** 2026-02-09
**App URL:** `http://various-bugs-fixing.expenses.local:4322`
**Viewports:** Desktop 1280x800, Mobile 390x844 (iPhone 14 Pro)

## Methodology

Three AI agents simulated family members using the expenses app on both desktop and mobile viewports. Each persona navigated all pages, attempted real workflows (adding transactions, checking budgets, viewing reports), and documented findings from their unique perspective.

### Personas

| Persona            | Age | Role                                    | Focus Areas                                                  |
| ------------------ | --- | --------------------------------------- | ------------------------------------------------------------ |
| **David** (Father) | 45  | IT Manager, primary breadwinner         | Mortgage, bills, investments, savings, forecast              |
| **Sarah** (Mother) | 42  | Part-time accountant, household manager | Groceries, categories, budget tracking, kids expenses        |
| **Alex** (Teen)    | 16  | High school student, $50/week allowance | Gaming subs, food, saving for laptop, modern UX expectations |

### Pages Tested

- `/dashboard`
- `/transactions`
- `/budget`, `/budget/history`, `/budget/categories`
- `/assets`, `/assets/history`
- `/reports` (monthly, yearly, custom)
- `/forecast`
- `/calculators`
- `/settings`, `/settings/payment-methods`

---

## 1. Bug Report

### Critical

| #   | Bug                                                                                                                                            | Found By           | Pages                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------- |
| B1  | **Forecast chart renders blank** — Wealth Trajectory chart area is empty while summary cards below show data                                   | David, Sarah, Alex | `/forecast`             |
| B2  | **Transaction amounts lose decimals** — Entering `156.32` saves as `Rp156`; entering `9.99` saves as `Rp10`. Decimals silently dropped/rounded | Sarah, Alex        | Transaction drawer      |
| B3  | **Yearly reports render faded/washed out** — All content (text, charts, numbers) has very low opacity, looks like a stuck loading state        | David              | `/reports?range=yearly` |

### Major

| #   | Bug                                                                                                                                                             | Found By     | Pages                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------- |
| B4  | **`/reports/yearly` returns 404** — Route listed in project structure doesn't exist (actual path is query param `?range=yearly`)                                | Sarah        | `/reports/yearly`           |
| B5  | **`/settings/payment-methods` returns 404** — Documented route doesn't exist                                                                                    | Sarah, David | `/settings/payment-methods` |
| B6  | **Validation errors flash after successful transaction save** — Form resets then immediately shows "Amount is required" / "Title is required" on the empty form | Sarah        | Transaction drawer          |
| B7  | **Budget History shows "No data" for current month** — February 2026 shows empty despite active budget data existing                                            | Sarah        | `/budget/history`           |
| B8  | **Budget reallocation advice ignores worst overspends** — Mentions Housekeeper Salary (101%) but ignores House Expenses (209%) and Holiday (130%)               | David        | `/budget`                   |
| B9  | **Mobile add-transaction button uses filter/sort icon** — The green button that opens transaction drawer looks like a filter icon, not "+" add                  | Alex         | Mobile header               |
| B10 | **Calculators page missing from mobile sidebar navigation** — Not discoverable through hamburger menu                                                           | Alex         | Mobile nav                  |

### Minor

| #   | Bug                                                                                                           | Found By           | Pages           |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------------ | --------------- |
| B11 | **Cash flow cards — text/date overlap** — Date and amount collide on dashboard cards                          | Alex               | `/dashboard`    |
| B12 | **Dashboard category names truncated** — "Housekeeper S...", "House Expen..." in pie chart legend             | Sarah, Alex, David | `/dashboard`    |
| B13 | **Calculator tab labels are icon-only on mobile** — No text, user can't tell what each tab does               | Alex               | `/calculators`  |
| B14 | **Transaction date timezone bug** — "Today" entry shows as "Yesterday" in list                                | David              | `/transactions` |
| B15 | **Resource Allocation pie chart initially renders too small** — Thin arc until page scroll triggers re-render | David              | `/reports`      |
| B16 | **Deleted transactions still visible in main list** — Strikethrough items inflate "55 transactions" count     | David              | `/transactions` |

---

## 2. Improvements / Enhancements

### High Impact

| #   | Improvement                                                                                                                                                                                                                    | Personas Affected  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| I1  | **Amount fields need thousand separators** — Entering `2400000` without formatting is error-prone                                                                                                                              | All 3              |
| I2  | **Replace corporate jargon with plain language** — "Resource Velocity", "Retained Capital", "Financial Intelligence", "Distributed Household Wealth" should become "Spending Trends", "Net Savings", "Reports", "Total Assets" | All 3              |
| I3  | **Mobile FAB (Floating Action Button) for quick-add** — Replace center grid nav button (just goes to dashboard) with a "+" for fast transaction entry                                                                          | Sarah, Alex        |
| I4  | **Account dropdown needs grouping/favorites** — 15+ accounts including corporate bonds and crypto shown to everyone; show recent/favorites first                                                                               | Alex, Sarah        |
| I5  | **Budget over-limit alerts need prominence** — Red bars are only visible when you open the budget page; need notification badges or dashboard alert cards                                                                      | Sarah, David       |
| I6  | **Mobile icon buttons need text labels** — Transaction action icons (import/export/scan), header icons, calculator tabs all lack labels                                                                                        | Alex               |
| I7  | **Net Savings negative percentage needs context** — "-428%" in red with no explanation is confusing/alarming; add tooltip or info icon                                                                                         | Sarah, David, Alex |

### Medium Impact

| #   | Improvement                                                                                                   | Personas Affected |
| --- | ------------------------------------------------------------------------------------------------------------- | ----------------- |
| I8  | **Horizontal scroll indicators on mobile tables** — Budget table clips columns with no visual hint to swipe   | Alex              |
| I9  | **Reports pie chart should show all categories** — Only 6 visible in legend when 15+ exist                    | Sarah             |
| I10 | **"Spending per Category" sorting label is jargon** — "Functional Volume" should be "% of Budget Used"        | Sarah             |
| I11 | **Settings page needs more options** — No date format, notification preferences, or currency display settings | David             |
| I12 | **Mobile bottom nav missing key pages** — Forecast, Calculators, Settings only via hamburger menu             | David, Alex       |
| I13 | **Mobile Settings "Save" button at top before form fields** — Should be at bottom after the form              | Alex              |
| I14 | **Missing descriptions on default categories** — "House Expenses", "Misc. Cost", "Pocket Money" show "--"     | Sarah             |
| I15 | **Assets page lacks gain/loss data** — Shows current value but not performance or percentage change           | David             |

---

## 3. Feature Ideas

### Family Finance Management (High Priority)

| #   | Feature                                | Requested By       | Description                                                                                                                                                            |
| --- | -------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **Recurring transactions**             | David, Sarah       | Auto-create monthly mortgage, utilities, housekeeper salary. Set frequency, amount, category. #1 missing feature for bill management.                                  |
| F2  | **Family member tagging**              | Sarah, David       | Tag expenses by family member (Dad/Mom/Kid). Answer "who spent what?" The Members setting hints at this but it's not wired to transactions.                            |
| F3  | **Savings goals with visual progress** | Alex, David, Sarah | Set named goals (laptop $1,200, college fund, vacation) with progress bars, countdown ("18 weeks at current rate"). The calculator tab exists but shows "Coming soon." |
| F4  | **Split transactions**                 | Sarah              | Split one receipt across categories — supermarket trip = groceries + household items.                                                                                  |
| F5  | **Budget alerts via push/email**       | Sarah, David       | Notify at 80%/100% threshold. Don't wait for user to open the app.                                                                                                     |
| F6  | **Sub-categories**                     | David, Sarah       | "House Expenses" to Mortgage, Property Tax, Insurance, Maintenance. "Kids Expenses" to School, Sports, Clothes, Allowance.                                             |

### Reporting & Insights (Medium Priority)

| #   | Feature                               | Requested By | Description                                                                                    |
| --- | ------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| F7  | **Budget vs. actual trend over time** | David        | Month-over-month trend per category — is spending increasing or decreasing?                    |
| F8  | **Weekly spending summary digest**    | Sarah, Alex  | In-app or email weekly recap: "You spent X on groceries, Y on dining. Z% of budget remaining." |
| F9  | **Spending anomaly alerts**           | David        | "You spent 3x more on dining this week than usual" — proactive insight.                        |
| F10 | **Export to PDF**                     | David        | Monthly financial report as downloadable PDF for records/tax filing.                           |
| F11 | **Income categorization**             | David        | Salary vs. Freelance vs. Investment Returns vs. Tax Refund — not just a total.                 |

### Teen & Young User Features (Growth Opportunity)

| #   | Feature                               | Requested By | Description                                                                                                    |
| --- | ------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------- |
| F12 | **Allowance tracking**                | Alex         | Set "$50 weekly" recurring income with "How much left this week?" visual bar.                                  |
| F13 | **Spending streaks and gamification** | Alex         | "5-day streak under food budget!" Badges, challenges, Duolingo-style motivation.                               |
| F14 | **Wishlists with price tracking**     | Alex         | Add items (laptop, AirPods) and see savings progress toward each.                                              |
| F15 | **Simplified "teen mode"**            | Alex         | Hide irrelevant categories (corporate bonds, housekeeper) and show teen-relevant ones (food, gaming, clothes). |
| F16 | **Quick emoji/photo receipts**        | Alex         | Snap receipt photo or pick emoji tag instead of typing descriptions.                                           |

### Household Management (Nice to Have)

| #   | Feature                                | Requested By | Description                                                                      |
| --- | -------------------------------------- | ------------ | -------------------------------------------------------------------------------- |
| F17 | **Grocery list integration**           | Sarah        | Maintain grocery list in-app, auto-create transaction when shopping done.        |
| F18 | **Bill reminders / due date calendar** | David        | Calendar view of upcoming bills with due dates and reminders.                    |
| F19 | **Shared expense tracking**            | Sarah        | Track who paid what for shared categories — who owes whom.                       |
| F20 | **Debt payoff calculator**             | David        | "If I pay $100 extra/month on mortgage, I save X years and Y interest."          |
| F21 | **Medical/Healthcare category**        | Sarah        | Missing default category for doctor visits, prescriptions, dental.               |
| F22 | **Multi-currency live rates**          | David        | Configurable exchange rates instead of fixed 1 USD = 15,000 IDR.                 |
| F23 | **Theme customization**                | Alex         | Accent colors, custom dashboard backgrounds — personalization for younger users. |

---

## Cross-Persona Pain Points

Issues independently flagged by 2+ family members, representing highest confidence findings:

| #   | Issue                         | Found By     | Type    |
| --- | ----------------------------- | ------------ | ------- |
| 1   | Forecast chart blank          | All 3        | Bug     |
| 2   | Decimal/rounding on amounts   | Sarah, Alex  | Bug     |
| 3   | Category name truncation      | All 3        | Bug     |
| 4   | Corporate jargon in labels    | All 3        | UX      |
| 5   | Account dropdown overwhelming | Sarah, Alex  | UX      |
| 6   | Missing 404 routes            | Sarah, David | Bug     |
| 7   | No savings goals              | All 3        | Feature |
| 8   | Need recurring transactions   | Sarah, David | Feature |
| 9   | Family member tagging         | Sarah, David | Feature |
| 10  | Budget alerts too passive     | Sarah, David | UX      |

---

## Teen "Vibe Check"

> **Positive:** The app is clean, functional, and professional. Dark mode looks good. The transaction entry form with category chips is fast. The donut charts are readable.
>
> **Negative:** It feels like a tool built for parents, not for me. The language is corporate ("resource velocity", "distributed household wealth"). The categories assume I have a housekeeper and corporate bonds. There's no fun, no personality, no gamification. Compared to Venmo or Cash App, this feels like my dad's Excel spreadsheet got a makeover. I'd use it if my parents made me, but I wouldn't show it to my friends.
>
> **What would make me WANT to use it:** Savings goals with visual progress, spending streaks/challenges, quick-add from the home screen, and language that doesn't make me feel like I'm filing taxes.

---

## Notes on Testing Limitations

- **Mobile viewport sharing:** All three agents shared the same browser window. Resizing for mobile testing was affected by concurrent agents resizing back to desktop. Mobile findings are partially based on code inspection rather than pure visual testing. A dedicated mobile testing pass in an isolated window is recommended.
- **Retina DPR:** Browser resize to 390x844 may not trigger mobile CSS breakpoints due to device pixel ratio differences. Some mobile-specific layouts may not have been fully exercised.
- **Authentication state:** All agents used the same logged-in session, so multi-user scenarios (permissions, separate accounts) were not tested.

---

Family UX Research Report — Expenses App

Tested by: David (father, 45), Sarah (mother, 42), Alex (teen, 16)
App URL: http://various-bugs-fixing.expenses.local:4322
Viewports: Desktop 1280x800, Mobile 390x844

---

1. BUG REPORT

Critical
#: B1
Bug: Forecast chart renders blank — Wealth Trajectory chart area is empty while summary cards below show data
Found By: David, Sarah, Alex
Pages: /forecast
────────────────────────────────────────
#: B2
Bug: Transaction amounts lose decimals — Entering 156.32 saves as Rp156; entering 9.99 saves as Rp10. Decimals silently dropped/rounded
Found By: Sarah, Alex
Pages: Transaction drawer
────────────────────────────────────────
#: B3
Bug: Yearly reports render faded/washed out — All content (text, charts, numbers) has very low opacity, looks like a stuck loading state
Found By: David
Pages: /reports?range=yearly
Major
#: B4
Bug: /reports/yearly returns 404 — Route listed in project structure doesn't exist (actual path is query param)
Found By: Sarah
Pages: /reports/yearly
────────────────────────────────────────
#: B5
Bug: /settings/payment-methods returns 404 — Documented route doesn't exist
Found By: Sarah, David
Pages: /settings/payment-methods
────────────────────────────────────────
#: B6
Bug: Validation errors flash after successful transaction save — Form resets then immediately shows "Amount is required" / "Title is required" on the empty form
Found By: Sarah
Pages: Transaction drawer
────────────────────────────────────────
#: B7
Bug: Budget History shows "No data" for current month — February 2026 shows empty despite active budget data existing
Found By: Sarah
Pages: /budget/history
────────────────────────────────────────
#: B8
Bug: Budget reallocation advice ignores worst overspends — Mentions Housekeeper Salary (101%) but ignores House Expenses (209%) and Holiday (130%)
Found By: David
Pages: /budget
────────────────────────────────────────
#: B9
Bug: Mobile add-transaction button uses filter/sort icon — The green button that opens transaction drawer looks like a filter icon, not "+" add
Found By: Alex
Pages: Mobile header
────────────────────────────────────────
#: B10
Bug: Calculators page missing from mobile sidebar navigation — Not discoverable through hamburger menu
Found By: Alex
Pages: Mobile nav
Minor
┌─────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────┬────────────────────┬───────────────┐
│ # │ Bug │ Found By │ Pages │
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────┼───────────────┤
│ B11 │ Cash flow cards — text/date overlap — Date and amount collide on dashboard cards │ Alex │ /dashboard │
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────┼───────────────┤
│ B12 │ Dashboard category names truncated — "Housekeeper S...", "House Expen..." in pie chart legend │ Sarah, Alex, David │ /dashboard │
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────┼───────────────┤
│ B13 │ Calculator tab labels are icon-only on mobile — No text, user can't tell what each tab does │ Alex │ /calculators │
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────┼───────────────┤
│ B14 │ Transaction date timezone bug — "Today" entry shows as "Yesterday" in list │ David │ Transactions │
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────┼───────────────┤
│ B15 │ Resource Allocation pie chart initially renders too small — Thin arc until page scroll triggers re-render │ David │ /reports │
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────┼───────────────┤
│ B16 │ Deleted transactions still visible in main list — Strikethrough items inflate "55 transactions" count │ David │ /transactions │
└─────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────┴────────────────────┴───────────────┘

---

2. IMPROVEMENTS / ENHANCEMENTS

High Impact
#: I1
Improvement: Amount fields need thousand separators — Entering 2400000 without formatting is error-prone
Personas Affected: All 3
────────────────────────────────────────
#: I2
Improvement: Replace corporate jargon with plain language — "Resource Velocity", "Retained Capital", "Financial Intelligence", "Distributed Household Wealth" → "Spending Trends", "Net

    Savings", "Reports", "Total Assets"

Personas Affected: All 3
────────────────────────────────────────
#: I3
Improvement: Mobile FAB (Floating Action Button) for quick-add — Replace center grid nav button (just goes to dashboard) with a "+" for fast transaction entry
Personas Affected: Sarah, Alex
────────────────────────────────────────
#: I4
Improvement: Account dropdown needs grouping/favorites — 15+ accounts including corporate bonds and crypto shown to everyone; show recent/favorites first
Personas Affected: Alex, Sarah
────────────────────────────────────────
#: I5
Improvement: Budget over-limit alerts need prominence — Red bars are only visible when you open the budget page; need notification badges or dashboard alert cards
Personas Affected: Sarah, David
────────────────────────────────────────
#: I6
Improvement: Mobile icon buttons need text labels — Transaction action icons (import/export/scan), header icons, calculator tabs all lack labels
Personas Affected: Alex
────────────────────────────────────────
#: I7
Improvement: Net Savings negative percentage needs context — "-428%" in red with no explanation is confusing/alarming; add tooltip or info icon
Personas Affected: Sarah, David, Alex
Medium Impact
┌─────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────┬───────────────────┐
│ # │ Improvement │ Personas Affected │
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤
│ I8 │ Horizontal scroll indicators on mobile tables — Budget table clips columns with no visual hint to swipe │ Alex │
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤
│ I9 │ Reports pie chart should show all categories — Only 6 visible in legend when 15+ exist │ Sarah │
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤
│ I10 │ "Spending per Category" sorting label is jargon — "Functional Volume" → "% of Budget Used" │ Sarah │
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤
│ I11 │ Settings page needs more options — No date format, notification preferences, or currency display settings │ David │
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤
│ I12 │ Mobile bottom nav missing key pages — Forecast, Calculators, Settings only via hamburger menu │ David, Alex │
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤
│ I13 │ Mobile Settings "Save" button at top before form fields — Should be at bottom after the form │ Alex │
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤
│ I14 │ Missing descriptions on default categories — "House Expenses", "Misc. Cost", "Pocket Money" show "--" │ Sarah │
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────┤
│ I15 │ Assets page lacks gain/loss data — Shows current value but not performance or percentage change │ David │
└─────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────┴───────────────────┘

---

3. FEATURE IDEAS

Family Finance Management (High Priority)
┌─────┬──────────────────────────────┬─────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ # │ Feature │ Requested By │ Description │
├─────┼──────────────────────────────┼─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ F1 │ Recurring transactions │ David, Sarah │ Auto-create monthly mortgage, utilities, housekeeper salary. Set frequency, amount, category. #1 missing feature for bill │
│ │ │ │ management. │
├─────┼──────────────────────────────┼─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ F2 │ Family member tagging │ Sarah, David │ Tag expenses by family member (Dad/Mom/Kid). Answer "who spent what?" The Members setting hints at this but it's not wired │
│ │ │ │ to transactions. │
├─────┼──────────────────────────────┼─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ F3 │ Savings goals with visual │ Alex, David, │ Set named goals (laptop $1,200, college fund, vacation) with progress bars, countdown ("18 weeks at current rate"). The │
│ │ progress │ Sarah │ calculator tab exists but shows "Coming soon." │
├─────┼──────────────────────────────┼─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ F4 │ Split transactions │ Sarah │ Split one receipt across categories — supermarket trip = groceries + household items. │
├─────┼──────────────────────────────┼─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ F5 │ Budget alerts via push/email │ Sarah, David │ Notify at 80%/100% threshold. Don't wait for user to open the app. │
├─────┼──────────────────────────────┼─────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ F6 │ Sub-categories │ David, Sarah │ "House Expenses" → Mortgage, Property Tax, Insurance, Maintenance. "Kids Expenses" → School, Sports, Clothes, Allowance. │
└─────┴──────────────────────────────┴─────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
Reporting & Insights (Medium Priority)
┌─────┬───────────────────────────────────┬──────────────┬────────────────────────────────────────────────────────────────────────────────────────────────┐
│ # │ Feature │ Requested By │ Description │
├─────┼───────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
│ F7 │ Budget vs. actual trend over time │ David │ Month-over-month trend per category — is spending increasing or decreasing? │
├─────┼───────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
│ F8 │ Weekly spending summary digest │ Sarah, Alex │ In-app or email weekly recap: "You spent X on groceries, Y on dining. Z% of budget remaining." │
├─────┼───────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
│ F9 │ Spending anomaly alerts │ David │ "You spent 3x more on dining this week than usual" — proactive insight. │
├─────┼───────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
│ F10 │ Export to PDF │ David │ Monthly financial report as downloadable PDF for records/tax filing. │
├─────┼───────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
│ F11 │ Income categorization │ David │ Salary vs. Freelance vs. Investment Returns vs. Tax Refund — not just a total. │
└─────┴───────────────────────────────────┴──────────────┴────────────────────────────────────────────────────────────────────────────────────────────────┘
Teen & Young User Features (Growth Opportunity)
┌─────┬─────────────────────────────────┬──────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ # │ Feature │ Requested By │ Description │
├─────┼─────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ F12 │ Allowance tracking │ Alex │ Set "$50 weekly" recurring income with "How much left this week?" visual bar. │
├─────┼─────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ F13 │ Spending streaks & gamification │ Alex │ "5-day streak under food budget!" Badges, challenges, Duolingo-style motivation. │
├─────┼─────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ F14 │ Wishlists with price tracking │ Alex │ Add items (laptop, AirPods) and see savings progress toward each. │
├─────┼─────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ F15 │ Simplified "teen mode" │ Alex │ Hide irrelevant categories (corporate bonds, housekeeper) and show teen-relevant ones (food, gaming, clothes). │
├─────┼─────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ F16 │ Quick emoji/photo receipts │ Alex │ Snap receipt photo or pick emoji tag instead of typing descriptions. │
└─────┴─────────────────────────────────┴──────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
Household Management (Nice to Have)
┌─────┬────────────────────────────────────┬──────────────┬──────────────────────────────────────────────────────────────────────────────────┐
│ # │ Feature │ Requested By │ Description │
├─────┼────────────────────────────────────┼──────────────┼──────────────────────────────────────────────────────────────────────────────────┤
│ F17 │ Grocery list integration │ Sarah │ Maintain grocery list in-app, auto-create transaction when shopping done. │
├─────┼────────────────────────────────────┼──────────────┼──────────────────────────────────────────────────────────────────────────────────┤
│ F18 │ Bill reminders / due date calendar │ David │ Calendar view of upcoming bills with due dates and reminders. │
├─────┼────────────────────────────────────┼──────────────┼──────────────────────────────────────────────────────────────────────────────────┤
│ F19 │ Shared expense tracking │ Sarah │ Track who paid what for shared categories — who owes whom. │
├─────┼────────────────────────────────────┼──────────────┼──────────────────────────────────────────────────────────────────────────────────┤
│ F20 │ Debt payoff calculator │ David │ "If I pay $100 extra/month on mortgage, I save X years and Y interest." │
├─────┼────────────────────────────────────┼──────────────┼──────────────────────────────────────────────────────────────────────────────────┤
│ F21 │ Medical/Healthcare category │ Sarah │ Missing default category for doctor visits, prescriptions, dental. │
├─────┼────────────────────────────────────┼──────────────┼──────────────────────────────────────────────────────────────────────────────────┤
│ F22 │ Multi-currency live rates │ David │ Configurable exchange rates instead of fixed 1 USD = 15,000 IDR. │
├─────┼────────────────────────────────────┼──────────────┼──────────────────────────────────────────────────────────────────────────────────┤
│ F23 │ Theme customization │ Alex │ Accent colors, custom dashboard backgrounds — personalization for younger users. │
└─────┴────────────────────────────────────┴──────────────┴──────────────────────────────────────────────────────────────────────────────────┘

---

Cross-Persona Pain Points (Found by 2+ family members)

These issues were independently flagged by multiple personas, making them highest confidence findings:

1. Forecast chart blank — All 3 found it
2. Decimal/rounding on amounts — Sarah + Alex
3. Category name truncation — All 3
4. Corporate jargon in labels — All 3
5. Account dropdown overwhelming — Sarah + Alex
6. Missing 404 routes — Sarah + David
7. No savings goals — All 3
8. Need recurring transactions — Sarah + David
9. Family member tagging — Sarah + David
10. Budget alerts too passive — Sarah + David

---

Now let me clean up the team.

⏺ Teammate @father-david shut down gracefully

⏺ Team cleaned up. The report above is the consolidated output from all three personas. The top 10 cross-persona pain points at the bottom represent the highest-confidence findings
since they were independently discovered by multiple simulated users.

Key takeaways:

- 3 critical bugs need immediate attention (blank forecast chart, decimal truncation, faded yearly reports)
- 7 major bugs including missing routes and misleading mobile icons
- The app's language feels too corporate/enterprise for a family tool — all three personas flagged this
- Recurring transactions and savings goals are the most-wanted missing features
- The mobile experience has significant discoverability issues (unlabeled icons, hidden pages, misleading button icons)
