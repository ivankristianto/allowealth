# Recurring UX Review — Design Audit & Verification

**Date:** 2026-03-09
**Scope:** `/recurring` and `/recurring/forecast`
**Method:** Live browser review using Chrome automation. All interactive elements tested.
**Passes:** 2 (initial audit + verification after fixes)

---

## Pass 1 — Initial Audit

### Page: `/recurring` — Recurring Payments

#### Observation

A single-page view combining three functional zones:

1. **Summary KPIs** — Upcoming Income, Upcoming Expense, Net Cashflow for the selected month
2. **Due This Month** — Action queue (Queue/Calendar toggle) with Confirm/Skip CTAs for overdue items
3. **Your Recurring Transactions** — Management table with Edit/Pause/Resume/Cancel actions

#### Issues Found

**Interaction & Affordance**

- **Filter badges are decorative, not interactive.** "Income 3" / "Expenses 3" pills are styled as interactive filter chips (rounded pill, colored border, pointer cursor) but clicking them does nothing. Violates established affordance; users will repeatedly attempt to click.

- **Month picker dropdown only shows past months.** To navigate forward, users must click `>` one month at a time. No way to jump to future months via the picker.

- **"DUE THIS MONTH" heading is always literal.** Browsing April 2026 still shows "DUE THIS MONTH." Should read "DUE IN APRIL" or "UPCOMING IN APRIL" for non-current months.

- **"Available on Mar 15, 2026"** is streaming vocabulary for a bill payment date. Clearer: "Due Mar 15" or just the date.

- **"3 items due" used for income KPI.** Income doesn't become "due" — it arrives. Consider "3 incoming" or "3 items expected."

**Information Architecture**

- **Two "+ New" buttons with different meanings.** The global header button says "+ New Transaction"; the section button says "+ New Recurring." In this context the header CTA is ambiguous.

**New Recurring Form**

- **"End Condition: REQUIRED" defaults to 12 cycles.** For most recurring items (Netflix, salary, rent) there is no end — they run until cancelled. Forcing an arbitrary 12-cycle default teaches bad data hygiene. "No end (ongoing until cancelled)" should be the default; End by count and End by date should be opt-in.

- **REQUIRED / OPTIONAL badges look like API documentation.** Replace with standard form conventions: `*` for required fields, inline validation messaging.

- **Frequency segmented control and Cycle dropdown duplicate each other.** The "Monthly" frequency button sets the same thing as the "Monthly" cycle dropdown. These should be merged.

#### New Recurring Form — Improvement

```
BEFORE:
  FREQUENCY: [Weekly] [Monthly✓] [Quarterly] [Semi-annual] [Annual]
  CYCLE: Monthly ▼  EVERY [1] month(s)

AFTER (merged):
  SCHEDULE: Every [1] [month ▼]
  (preset shortcuts: Weekly / Monthly / Quarterly / Yearly)
```

---

### Page: `/recurring/forecast` — Recurring Forecast

#### Observation

Spreadsheet-style multi-month projection table. Rows are recurring templates; columns are calendar months. A Totals section below shows monthly Income, Expense, Net.

#### Issues Found

**Critical**

- **Split scrollbar — Totals section has its own independent horizontal scroll.** The data rows and TOTALS section were in separate scroll containers. A user who scrolled data rows to Aug–Feb would see Totals frozen at Mar–Aug, creating a financial data misread risk.

**Usability**

- **Account type group labels used raw database enum values.** `CREDIT_CARD`, `MUTUAL_FUND`, `BOND`, `LOAN` shown verbatim in the dropdown. Should be "Credit Card", "Mutual Fund", etc.

- **No date range selector.** Always showed the same fixed window with no way to set 3M vs 24M.

- **No cashflow chart.** Raw numbers with no visual summary of monthly net trend.

- **Two-step filter.** Type and Status dropdowns required a separate "Filter" button click; All Accounts applied immediately. Inconsistent.

- **Status defaults to "Active" with no hidden-item indicator.** Paused items like "Kids Swimming Class" disappeared with no count or note.

- **Redundant "← Recurring Forecast" back button label.** Page is already titled "Recurring Forecast." Back button should name the destination, not the current page.

---

## Pass 2 — Verification After Fixes

### Confirmed Fixed ✅

| Issue                                      | Resolution                                                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Split scrollbar (Totals desync)            | Single unified scroll container; rows and Totals scroll in perfect sync                                              |
| No cashflow chart                          | Bar chart added (Income/Expenses stacked bars + Net line), with color-coded hover tooltips                           |
| No time range selector                     | 3M / 6M / 12M / 24M buttons; URL-persisted (`?monthCount=N`)                                                         |
| Two-step filter                            | Filter button removed; all filters apply instantly                                                                   |
| Status filter with no visibility indicator | "Include Paused" toggle added; paused rows shown with dimmed text and "Paused" badge, correctly excluded from Totals |
| Redundant back button label                | Replaced with `Recurring > Forecast` breadcrumb                                                                      |
| KPI summary cards                          | Added: N-Month Projected Income / Expenses / Net Cash Flow, updates with time range                                  |

### Partially Fixed ⚠️

| Issue                           | Status                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Raw enum labels (`CREDIT_CARD`) | Underscore removed → `CREDIT CARD`, but still ALL CAPS. Should be Title Case: "Credit Card", "Mutual Fund" |

### Not Fixed ❌

| Issue                                                                 | Location            |
| --------------------------------------------------------------------- | ------------------- |
| Queue filter badges ("Income 3" / "Expenses 3") still non-interactive | `/recurring`        |
| "DUE THIS MONTH" heading doesn't adapt for future months              | `/recurring`        |
| New Recurring form — no "No end (ongoing)" option                     | `/recurring` (form) |
| New Recurring form — REQUIRED/OPTIONAL badges                         | `/recurring` (form) |
| New Recurring form — Frequency + Cycle duplication                    | `/recurring` (form) |

### New Issues Identified in Pass 2

1. **Chart subtitle stale when "Include Paused" is ON.** Text reads "...from your active recurring transactions" even when `status=all`. Should remove the word "active" or adjust dynamically.

2. **Account group labels still ALL CAPS.** `CREDIT CARD`, `MUTUAL FUND` — likely `text-transform: uppercase` on a raw value. One CSS fix and a formatter: `"credit_card" → "Credit Card"`.

3. **Chart has no Y-axis scale.** Bars are proportional but no gridlines or axis labels. Hovering reveals exact values (tooltip works well), but axis labels (e.g., Rp10M / Rp20M / Rp30M) allow scanning without hovering every bar.

4. **Paused rows show projected amounts without an explanatory affordance.** When "Include Paused" is on, Kids Swimming Class shows `-Rp650.000,00` per column but doesn't contribute to the Net. A tooltip or inline note — "Excluded from totals while paused" — would remove the ambiguity.

---

## Prioritized Recommendations

### P1 — Highest Impact

**Fix or remove the affordance on queue filter badges**
_Problem:_ "Income 3" / "Expenses 3" styled as filter chips but non-interactive. Repeated failed clicks.
_Fix A (functional):_ Wire as toggle filters on the queue list.
_Fix B (cosmetic):_ Reskin as plain count text (`3 income · 3 expenses`) with no pill shape or pointer cursor.
_Impact:_ Removes the most frequent interaction confusion on the primary recurring page.

**Add "No end (ongoing)" to the New Recurring form**
_Problem:_ End condition is REQUIRED with a 12-cycle default. Every perpetual subscription gets misconfigured data.
_Fix:_ Add a default-selected "No end (until cancelled)" radio option. Only require count/date when "Treat as installment" is checked.
_Impact:_ Correct data for all non-installment recurring items; reduces form friction.

### P2 — Medium Impact

**Title-case the account group labels**
`CREDIT CARD` → `Credit Card`, `MUTUAL FUND` → `Mutual Fund`. One formatter change; affects every account filter dropdown across the app.

**Adapt "DUE THIS MONTH" heading for non-current months**
`DUE IN ${monthName.toUpperCase()}` when the selected month is not the current month. Single string interpolation.

**Add Y-axis scale to the Cashflow chart**
Two to three gridlines with abbreviated labels (Rp10M, Rp20M, Rp30M) let users scan magnitude without hovering. Tooltip remains for precision.

### P3 — Low Impact / Polish

**Update chart subtitle when "Include Paused" is active**
Swap "active recurring transactions" → "recurring transactions" when `status=all`.

**Add tooltip on paused forecast rows**
Hover copy: "Excluded from totals while paused." Clarifies why values appear but don't affect Net.

**Fix "Available on [date]" copy in the queue**
Replace with "Due [date]" or suppress the verb and show the date directly.

**Fix "3 items due" for income KPI**
Income doesn't become due. Change to "3 incoming" or "3 expected."
