# Browser QA — Consolidate Primary Actions

> Manual verification checklist for the consolidated action hierarchy.
> Test on **desktop (≥ 1024 px)** and **mobile (< 768 px)** viewports.

---

## 1. Transactions Page (`/transactions`)

| #   | Check                                             | Desktop | Mobile |
| --- | ------------------------------------------------- | ------- | ------ |
| 1.1 | No "Add Expense" / "Add Income" buttons visible   | ☐       | ☐      |
| 1.2 | Import & Export buttons visible in secondary area | ☐       | ☐      |
| 1.3 | Overflow menu (⋯) contains "Scan Receipt"         | ☐       | ☐      |
| 1.4 | Primary "+ Add" FAB still present                 | ☐       | ☐      |

## 2. Accounts Page (`/accounts`)

| #   | Check                                                                           | Desktop | Mobile |
| --- | ------------------------------------------------------------------------------- | ------- | ------ |
| 2.1 | Primary "New Account" button visible and enabled (current period)               | ☐       | ☐      |
| 2.2 | Primary "New Account" button disabled in historical mode                        | ☐       | ☐      |
| 2.3 | Categories / Transfer / Bulk Edit visible in secondary area                     | ☐       | ☐      |
| 2.4 | Overflow menu (⋯) contains "Closed Accounts" link                               | ☐       | ☐      |
| 2.5 | Account group card header shows concise subtitle, not paragraph                 | ☐       | ☐      |
| 2.6 | Account row has one inline quick-action + dropdown for Edit/Timeline/Deactivate | ☐       | ☐      |

## 3. Budget Page (`/budget`)

| #   | Check                                                           | Desktop | Mobile |
| --- | --------------------------------------------------------------- | ------- | ------ |
| 3.1 | Categories / Import / Export visible in secondary area          | ☐       | ☐      |
| 3.2 | Overflow menu (⋯) contains "Copy Budget" and "Initialize All"   | ☐       | ☐      |
| 3.3 | "Copy Budget" overflow action opens copy-budget modal           | ☐       | ☐      |
| 3.4 | "Initialize All" overflow action opens initialize-budgets modal | ☐       | ☐      |

## 4. Recurring Transactions Page (`/recurring`)

| #   | Check                                              | Desktop | Mobile |
| --- | -------------------------------------------------- | ------- | ------ |
| 4.1 | Action bar renders correctly with existing actions | ☐       | ☐      |
| 4.2 | No visual regression from hierarchy changes        | ☐       | ☐      |

## 5. Categories Page (`/categories`)

| #   | Check                                              | Desktop | Mobile |
| --- | -------------------------------------------------- | ------- | ------ |
| 5.1 | Action bar renders correctly with existing actions | ☐       | ☐      |
| 5.2 | No visual regression from hierarchy changes        | ☐       | ☐      |

## 6. Cross-cutting

| #   | Check                                                       | Desktop | Mobile |
| --- | ----------------------------------------------------------- | ------- | ------ |
| 6.1 | Overflow menu has `aria-haspopup="menu"` and `role="menu"`  | ☐       | ☐      |
| 6.2 | Visible action cap: ≤ 3 secondary on desktop, ≤ 2 on mobile | ☐       | ☐      |
| 6.3 | All overflow menus close on outside click                   | ☐       | ☐      |
| 6.4 | Keyboard navigation works within overflow menus             | ☐       | ☐      |
