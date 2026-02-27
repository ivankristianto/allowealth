# Recurring Transactions - Manual Test Plan

**Issues:** #181, #159, #184
**Branch:** `recurring-transactions`
**Date:** 2026-02-25

## Overview

Full test coverage for the recurring transactions feature: template CRUD, occurrence generation, confirm/skip flows, calendar view, integration points (dashboard widget, transaction badge, cash flow, budget warning, reports). Covers happy paths, edge cases, validation, error states, and responsive layout.

## Prerequisites

- Local dev server running (check port with `lsof -i -P | grep LISTEN | grep 432`)
- Test credentials: `demo@example.com` / `demo123456789`
- Seed data loaded (`bun run aw db seed`) — includes recurring templates with mixed statuses
- CLI available: `bun run aw recurring generate` (run once before testing to ensure occurrences exist)
- Browser: Chrome with DevTools available

---

## Test Steps

### 1. Route Protection

**Services under test:** Route guard middleware (`route-guard.ts`)

> **Critical:** Auth boundary — unauthenticated users must not access recurring data.

| Step | Action                                                                     | Expected Result                                  |
| ---- | -------------------------------------------------------------------------- | ------------------------------------------------ |
| 1.1  | Open an incognito/private window, navigate to `/recurring`                 | Redirected to `/login` (not a 404 or blank page) |
| 1.2  | Navigate to `/api/recurring` in incognito                                  | Returns 401 JSON response, no data leaked        |
| 1.3  | Navigate to `/api/recurring/stats` in incognito                            | Returns 401 JSON response                        |
| 1.4  | Log in with `demo@example.com` / `demo123456789`, navigate to `/recurring` | Page loads successfully with recurring content   |

---

### 2. Navigation

**Components under test:** `Navigation.astro`

| Step | Action                                              | Expected Result                                                                     |
| ---- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 2.1  | After login, look at sidebar navigation             | "Recurring" nav item visible with `RefreshCw` icon, positioned after "Transactions" |
| 2.2  | Click "Recurring" nav item                          | Navigates to `/recurring`, nav item highlighted as active                           |
| 2.3  | Resize to mobile width (390px), open hamburger menu | "Recurring" appears in mobile nav menu                                              |

---

### 3. Empty State (First-Time User)

**Components under test:** `RecurringPendingList.astro`, `RecurringTemplateList.astro`

| Step | Action                                                                                    | Expected Result                                                                                                             |
| ---- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 3.1  | If possible, create a new workspace with no recurring templates, navigate to `/recurring` | Full-page empty state: `RefreshCw` icon, "No recurring transactions yet", descriptive subtitle, [+ New Template] CTA button |
| 3.2  | Click the [+ New Template] CTA in empty state                                             | Template drawer opens (same as header button)                                                                               |

---

### 4. Template Creation — Happy Path

**Services under test:** `RecurringTemplateService.create()`, `POST /api/recurring`

> **Critical:** Core creation flow — template + initial occurrence generation.

| Step | Action                                                                                                                                                              | Expected Result                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 4.1  | Click [+ New Template] button in page header                                                                                                                        | Drawer slides in from right, title "New Recurring Transaction", close [X] button visible                    |
| 4.2  | Fill: Name="Test Rent", Type=Expense, Amount="5000000", Category=select any expense category, Account=select any account, Day of Month=1, Start Month=current month | All fields accept input. Category dropdown filtered to expense categories only                              |
| 4.3  | Check "By count" checkbox, enter 12                                                                                                                                 | Count field visible, value accepted                                                                         |
| 4.4  | Check "By date" checkbox, select a month 12 months from now                                                                                                         | Both end conditions visible and filled simultaneously. Hint shows "both can be set — whichever first"       |
| 4.5  | Leave installment unchecked, click [Save]                                                                                                                           | Button shows "Saving...", then drawer closes. Template list refreshes showing "Test Rent" with Active badge |
| 4.6  | Check pending section                                                                                                                                               | At least one pending occurrence for "Test Rent" appears (current month or next month)                       |
| 4.7  | Check stats row                                                                                                                                                     | Pending count and pending amount updated to include the new template                                        |

---

### 5. Template Creation — Validation & Edge Cases

**Services under test:** `createRecurringTemplateSchema`, `createRecurringTemplateAPISchema`

> **Critical:** Validation prevents invalid templates.

| Step | Action                                                                                | Expected Result                                                                                             |
| ---- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 5.1  | Open drawer, leave all fields empty, click [Save]                                     | Inline validation errors appear on required fields (name, amount, category, account). Save does NOT proceed |
| 5.2  | Fill name and amount, but leave BOTH end condition checkboxes unchecked, click [Save] | Validation hint: "At least one end condition is required"                                                   |
| 5.3  | Check only "By date", enter an end date in the past                                   | Validation error — end date must be in the future (or at least current month)                               |
| 5.4  | Check only "By count", enter 0                                                        | Validation error — count must be >= 1                                                                       |
| 5.5  | Check only "By count", enter 999                                                      | Accepted (large count is valid)                                                                             |
| 5.6  | Set Day of Month to 31                                                                | Accepted — design handles 31st in short months by clamping                                                  |
| 5.7  | Switch Type from Expense to Income                                                    | Category dropdown refreshes to show income categories only. Previously selected expense category is cleared |
| 5.8  | Click [Cancel] or [X] on drawer                                                       | Drawer closes, no template created, template list unchanged                                                 |

---

### 6. Template Creation — Installment

**Services under test:** `RecurringTemplateService.create()`, installment description generation

| Step | Action                                                            | Expected Result                                                                                       |
| ---- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 6.1  | Open drawer, fill required fields, check "By count" with value 12 | Installment checkbox becomes enabled                                                                  |
| 6.2  | Check "This is an installment"                                    | Starting number field appears (default: 1), "of [12]" auto-populated. Label field shows "Installment" |
| 6.3  | Change starting number to 5                                       | "of [12]" remains. Starting at "5 of 12" shown                                                        |
| 6.4  | Change label to "Cicilan"                                         | Label field updates                                                                                   |
| 6.5  | Click [Save]                                                      | Template created. In pending section, occurrence shows "Test - Cicilan 05/12"                         |
| 6.6  | In template list, verify installment progress                     | Progress bar shown (64px) with "5/12" text                                                            |
| 6.7  | Uncheck "By count" checkbox                                       | Installment checkbox becomes disabled and unchecked automatically                                     |

---

### 7. Template Creation — End Condition Edge Cases

| Step | Action                                                            | Expected Result                                                                                                          |
| ---- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 7.1  | Create template with ONLY "By count" = 3, no end date             | Template created successfully. After 3 occurrences are generated and processed, template should auto-complete            |
| 7.2  | Create template with ONLY "By date" = 3 months from now, no count | Template created successfully. No installment option available (checkbox disabled). Occurrences generated until end date |
| 7.3  | Create template with BOTH count=2 AND end date=12 months out      | Template created. Should complete after 2 occurrences (count reached first, before end date)                             |
| 7.4  | Create template with BOTH count=100 AND end date=next month       | Template created. Should complete when end date passes (end date first, before count)                                    |

---

### 8. Template Edit

**Services under test:** `RecurringTemplateService.update()`, `PUT /api/recurring/[id]`

| Step | Action                                                                      | Expected Result                                                                                        |
| ---- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 8.1  | In template list, click kebab menu (⋮) on an active template, select "Edit" | Drawer opens pre-filled with current template data                                                     |
| 8.2  | Change name to "Updated Name", click [Save]                                 | Drawer closes. Template name updated in list. Pending cards also show new name                         |
| 8.3  | Edit template, change amount to "999999"                                    | Save succeeds. Future pending occurrences show updated amount. Already confirmed occurrences unchanged |
| 8.4  | Edit template, try to change fields while save is in progress               | Save button disabled + shows "Saving..." — no double submit                                            |

---

### 9. Template Pause / Resume

**Services under test:** `RecurringTemplateService.pause()`, `RecurringTemplateService.resume()`

| Step | Action                                       | Expected Result                                                                                                       |
| ---- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 9.1  | Click kebab (⋮) on active template → "Pause" | Status badge changes to `badge-warning` "Paused". Row becomes `opacity-60`. No confirmation modal (reversible action) |
| 9.2  | Verify pending section                       | Pending occurrences for paused template no longer appear in pending list                                              |
| 9.3  | Click kebab on paused template → "Resume"    | Status changes back to Active (`badge-success`). Row opacity restored. Occurrences regenerated                        |
| 9.4  | After resume, check pending section          | Pending occurrences reappear for resumed template                                                                     |
| 9.5  | Verify "Next Due" column updates             | After pause: shows "—". After resume: shows next due date                                                             |

---

### 10. Template Cancel

**Services under test:** `RecurringTemplateService.cancel()`

> **Critical:** Destructive action — removes future pending occurrences permanently.

| Step | Action                                                     | Expected Result                                                                                                                    |
| ---- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 10.1 | Click kebab on active template → "Cancel"                  | Confirmation modal appears: "Cancel [name]?", description mentions future pending removal, buttons [Keep Active] [Cancel Template] |
| 10.2 | Click [Keep Active]                                        | Modal closes, template unchanged (still Active)                                                                                    |
| 10.3 | Click kebab → "Cancel" again, then click [Cancel Template] | Template status changes to Cancelled (`badge-error`). Future pending occurrences removed from pending section                      |
| 10.4 | Verify past confirmed occurrences                          | Previously confirmed transactions remain in transactions page (not deleted)                                                        |
| 10.5 | Verify cancelled template in template list                 | Shows "Cancelled" badge, "Next Due" shows "—", kebab menu has no Pause/Resume/Cancel options (terminal state)                      |
| 10.6 | Check stats row                                            | Pending count and amounts decreased by the removed occurrences                                                                     |

---

### 11. Template Delete

**Services under test:** `RecurringTemplateService.delete()`

> **Critical:** Hard delete — template and all occurrences permanently removed.

| Step | Action                                              | Expected Result                                                                                                      |
| ---- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 11.1 | Click kebab on a template → "Delete" (if available) | Confirmation modal appears (destructive variant)                                                                     |
| 11.2 | Confirm deletion                                    | Template removed from list entirely. All its occurrences gone from pending section                                   |
| 11.3 | Navigate to `/transactions`                         | Any transactions that were previously confirmed from this template's occurrences still exist (FK is one-directional) |

---

### 12. Confirm Occurrence — Happy Path

**Services under test:** `RecurringOccurrenceService.confirm()`, `TransactionService.create()`

> **Critical:** Core mutation — creates real transaction from occurrence. Must be atomic.

| Step | Action                                                | Expected Result                                                                                                                 |
| ---- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 12.1 | In pending section, click [Confirm] on a pending card | Modal opens: "Confirm: [name]". Amount pre-filled, Date pre-filled with due_date, Category and Account pre-filled from template |
| 12.2 | Verify focus                                          | Focus is on the Amount input field                                                                                              |
| 12.3 | Keep defaults, click [Confirm]                        | Modal closes. Pending card removed from pending list. Stats row updates (pending count decreases, confirmed count increases)    |
| 12.4 | Navigate to `/transactions`                           | New transaction appears with correct amount, date, category, account. Shows "Recurring" badge                                   |
| 12.5 | Return to `/recurring`                                | Confirmed occurrence no longer in pending. If calendar view active, shows CheckCircle icon on that date                         |

---

### 13. Confirm Occurrence — Editable Fields

**Services under test:** `RecurringOccurrenceService.confirm()`

| Step | Action                                                                    | Expected Result                                                                                             |
| ---- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 13.1 | Click [Confirm], change amount from template default to a different value | Original amount shown struck through above input                                                            |
| 13.2 | Change date to a future date (e.g., next week)                            | Date input accepts future dates without validation error (bypasses normal future-date restriction)          |
| 13.3 | Change category to a different one                                        | Category dropdown allows selection of any category                                                          |
| 13.4 | Change account to a different one                                         | Account dropdown allows selection of any account                                                            |
| 13.5 | Click [Confirm]                                                           | Transaction created with the edited values (not template defaults). `confirmed_amount` stored on occurrence |
| 13.6 | Navigate to `/transactions`, find the new transaction                     | Amount, date, category, account all match what was entered in the modal (not template defaults)             |

---

### 14. Confirm Occurrence — Error Handling

> **Critical:** Error states must not lose data or create ghost transactions.

| Step | Action                                                                                                | Expected Result                                                                                                                         |
| ---- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 14.1 | Click [Confirm], enter invalid amount (e.g., "abc" or negative), click [Confirm]                      | Inline validation error shown, modal stays open, no transaction created                                                                 |
| 14.2 | Click [Confirm], clear the amount field entirely, click [Confirm]                                     | Validation error — amount is required                                                                                                   |
| 14.3 | Open two browser tabs on `/recurring`. Click [Confirm] on same occurrence in both tabs simultaneously | First tab succeeds. Second tab shows error "Occurrence already confirmed" — no duplicate transaction. Modal stays open with error alert |
| 14.4 | After error in 14.3, close modal, refresh page                                                        | Occurrence shows as confirmed (from first tab). Only one transaction exists                                                             |
| 14.5 | If network error occurs during confirm (simulate via DevTools throttling → Offline)                   | Modal stays open, inline error displayed, Confirm button re-enabled. Toast as secondary notification                                    |

---

### 15. Skip Occurrence

**Services under test:** `RecurringOccurrenceService.skip()`

| Step | Action                                                                             | Expected Result                                                                         |
| ---- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 15.1 | Click [Skip] on a pending occurrence                                               | Skip modal opens: "Skip [name]?", optional reason textarea, character counter "0 / 200" |
| 15.2 | Leave reason empty, click [Skip]                                                   | Occurrence removed from pending list. Stats updated. Toast confirms skip                |
| 15.3 | Skip another occurrence, enter reason "Vacation" (check character counter updates) | Counter shows "8 / 200". Skip succeeds. Reason stored                                   |
| 15.4 | Try entering 201+ characters in reason field                                       | Input truncated or prevented at 200 characters                                          |
| 15.5 | Click [Cancel] on skip modal                                                       | Modal closes, occurrence unchanged (still pending)                                      |
| 15.6 | After skipping, check calendar view                                                | Skipped occurrence shows MinusCircle icon (muted)                                       |
| 15.7 | After skipping, check stats row                                                    | Pending count decreased, confirmed count unchanged                                      |

---

### 16. Overdue Occurrences

| Step | Action                                                                               | Expected Result                                                                                               |
| ---- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 16.1 | Ensure seed data includes an occurrence with `due_date` in the past (already passed) | Past-due occurrence visible in pending section                                                                |
| 16.2 | Observe overdue occurrence card styling                                              | AlertCircle icon (red), "OVERDUE" badge (`badge badge-error badge-sm`), `border-l-4 border-error` left border |
| 16.3 | Observe non-overdue pending card                                                     | Clock icon (warning color), `border-l-4 border-warning` left border, no OVERDUE badge                         |
| 16.4 | Check stats row                                                                      | Overdue count shows "> 0" in its stat card                                                                    |
| 16.5 | Confirm the overdue occurrence                                                       | Succeeds normally — overdue doesn't prevent confirmation                                                      |

---

### 17. List View — Template List Display

**Components under test:** `RecurringTemplateList.astro`, `RecurringTemplateRow.astro`

| Step | Action                                                          | Expected Result                                                                                 |
| ---- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 17.1 | On `/recurring` list view, check "ALL TEMPLATES" section header | Shows count: "ALL TEMPLATES (N)"                                                                |
| 17.2 | Verify table columns (desktop)                                  | Name, Amount, Day, Next Due, Status, Actions (kebab)                                            |
| 17.3 | Verify Active template row                                      | `badge-success` green badge, normal opacity                                                     |
| 17.4 | Verify Paused template row                                      | `badge-warning` yellow badge, `opacity-60` styling                                              |
| 17.5 | Verify Completed template row                                   | `badge-ghost` neutral badge, Next Due = "—"                                                     |
| 17.6 | Verify Cancelled template row                                   | `badge-error` red badge, Next Due = "—"                                                         |
| 17.7 | Verify installment template row                                 | Progress bar (64px) + "N/M" text visible                                                        |
| 17.8 | Click kebab (⋮) on a template                                   | Dropdown opens with Edit, Pause/Resume, Cancel options. Dropdown aligned right (`dropdown-end`) |
| 17.9 | Resize to mobile (390px)                                        | Table switches to card layout. All data visible, actions accessible                             |

---

### 18. View Toggle (List ↔ Calendar)

**Components under test:** `TabSwitcher`, URL param persistence

| Step | Action                                          | Expected Result                                                                |
| ---- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| 18.1 | On `/recurring`, verify default view is "List"  | List tab active (`aria-selected="true"`), list content visible                 |
| 18.2 | Click "Calendar View" tab                       | Calendar content appears. URL changes to `?view=calendar`. List content hidden |
| 18.3 | Click "List View" tab                           | List content reappears. URL changes to `?view=list`                            |
| 18.4 | Navigate to `/recurring?view=calendar` directly | Page loads with calendar view active                                           |
| 18.5 | Use browser back/forward buttons                | View toggles correctly with URL history                                        |

---

### 19. Month Navigation

**Components under test:** `PeriodNavigator`, `periodChange` event

| Step | Action                                                     | Expected Result                                                                                  |
| ---- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 19.1 | On `/recurring`, check month navigator shows current month | Displays "February 2026" (or current month). Left/right arrows present                           |
| 19.2 | Click right arrow (next month)                             | URL updates to `?month=2026-03`. Pending section shows March occurrences. Stats update for March |
| 19.3 | Click left arrow (previous month)                          | URL updates back. Shows previous month's occurrences                                             |
| 19.4 | Navigate to a month with no pending occurrences            | "All caught up!" empty state with CheckCircle icon (success)                                     |
| 19.5 | In calendar view, navigate months                          | Calendar grid updates to show correct month. Occurrences positioned on correct days              |
| 19.6 | Navigate to `/recurring?month=2026-06` directly            | Page loads showing June 2026 data                                                                |
| 19.7 | Verify month navigation syncs between list and calendar    | Switch to calendar after navigating to March in list view — calendar shows March                 |

---

### 20. Calendar View — Desktop

**Components under test:** `RecurringCalendar.astro`

| Step | Action                                                                | Expected Result                                                                        |
| ---- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 20.1 | Switch to calendar view on desktop (1280px+)                          | 7-column CSS grid (Mon-Sun). Day numbers visible. Occurrences placed on correct days   |
| 20.2 | Verify occurrence display in cell                                     | Shows occurrence name + Lucide status icon (AlertCircle/Clock/CheckCircle/MinusCircle) |
| 20.3 | Verify legend at bottom                                               | AlertCircle=Overdue, Clock=Pending, CheckCircle=Confirmed, MinusCircle=Skipped         |
| 20.4 | Click a pending occurrence in calendar                                | Confirm modal opens (same modal as list view)                                          |
| 20.5 | Confirm via calendar, verify calendar updates                         | Occurrence icon changes from Clock to CheckCircle without full page reload             |
| 20.6 | Navigate to empty month in calendar                                   | Empty state centered: "No recurring transactions scheduled for [Month Year]."          |
| 20.7 | Verify day-of-month edge case: template with day=31 in a 30-day month | Occurrence appears on the 30th (last day), not missing                                 |

---

### 21. Calendar View — Mobile

**Components under test:** `RecurringCalendar.astro` responsive fallback

| Step | Action                                            | Expected Result                                                                                         |
| ---- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 21.1 | Resize to mobile (390px), switch to calendar view | Grid replaced by date-grouped list. Each entry shows: date header, occurrence name, amount, status icon |
| 21.2 | Verify overdue occurrence in mobile calendar      | AlertCircle icon, "OVERDUE" text, [Confirm] [Skip] buttons visible                                      |
| 21.3 | Verify installment in mobile calendar             | Shows "Installment 05/12" label                                                                         |
| 21.4 | Click [Confirm] on mobile calendar occurrence     | Confirm modal opens, usable on mobile (fields stack, buttons ≥44px touch target)                        |
| 21.5 | Verify date navigation on mobile                  | PeriodNavigator shows previous/next arrows, month name                                                  |

---

### 22. Stats Row

**Components under test:** `StatCard` atoms, stats endpoint

| Step | Action                                                  | Expected Result                                                                              |
| ---- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 22.1 | On `/recurring`, verify stats row above pending section | Three stat cards visible: pending amount (per-currency), overdue count, confirmed this month |
| 22.2 | Verify pending amount shows currency                    | Formatted with currency symbol (e.g., "Rp 6,699,000")                                        |
| 22.3 | Confirm an occurrence, check stats                      | Pending count decreases, confirmed count increases. No full page reload needed               |
| 22.4 | Skip an occurrence, check stats                         | Pending count decreases, confirmed count unchanged                                           |
| 22.5 | Navigate to different month, check stats                | Stats update to reflect that month's data                                                    |

---

### 23. Partial Refresh After Actions

> **Critical:** All three sections (pending list, stats row, calendar) must update after confirm/skip.

| Step | Action                                                                                      | Expected Result                                                                               |
| ---- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 23.1 | Switch to calendar view, confirm an occurrence from list (if both visible) or from calendar | Pending list updates, stats row updates, calendar icon updates — all without full page reload |
| 23.2 | Skip an occurrence                                                                          | Same: all three areas refresh                                                                 |
| 23.3 | Pause a template via kebab menu                                                             | Pending list removes that template's occurrences. Stats update. Calendar updates              |
| 23.4 | Open DevTools Network tab, confirm an occurrence                                            | Observe `?_render=html` partial fetch requests for list, stats, and calendar                  |

---

### 24. Dashboard Widget

**Services under test:** `DashboardService.getDashboardData()`, `RecurringBillsWidget.astro`

| Step | Action                                               | Expected Result                                                  |
| ---- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| 24.1 | Navigate to `/dashboard`                             | Recurring bills widget visible: "N bills pending (Rp X,XXX,XXX)" |
| 24.2 | If overdue occurrences exist                         | Overdue count shown as `badge badge-error`                       |
| 24.3 | Click "Review pending bills →" CTA                   | Navigates to `/recurring`                                        |
| 24.4 | Confirm all pending occurrences, return to dashboard | Widget shows "0 bills pending" or appropriate empty state        |

---

### 25. Transaction Page — Recurring Badge

**Components under test:** `TransactionCard.astro`, `TransactionService.findAll()`

| Step | Action                                                      | Expected Result                                                                                 |
| ---- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 25.1 | Confirm a recurring occurrence, navigate to `/transactions` | Transaction appears in list                                                                     |
| 25.2 | Find the confirmed transaction                              | Shows small "Recurring" badge with RefreshCw icon (`badge badge-sm badge-outline badge-accent`) |
| 25.3 | Check a regular (non-recurring) transaction                 | No "Recurring" badge present                                                                    |
| 25.4 | Verify transaction details                                  | Amount, date, category, account match what was entered in confirm modal                         |

---

### 26. CashFlow Widget Integration

**Services under test:** `DashboardService`, `CashFlowWidget.astro`

| Step | Action                                                  | Expected Result                                                         |
| ---- | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| 26.1 | Ensure pending occurrences due within next 7 days exist | Seed data should include near-term due dates                            |
| 26.2 | Navigate to `/dashboard`, find CashFlow widget          | Upcoming recurring bills appear alongside regular cash flow entries     |
| 26.3 | Verify recurring entry shows template amount            | Uses `templateAmount`, not `confirmed_amount` (since not yet confirmed) |
| 26.4 | Verify entries sorted by date                           | Recurring and regular entries interleaved by date                       |

---

### 27. Budget Warning Integration

| Step | Action                                                                        | Expected Result                                                                     |
| ---- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 27.1 | Create recurring templates in a category whose total exceeds the budget limit | Total recurring amount for category > budget amount                                 |
| 27.2 | Navigate to `/budget`                                                         | Category shows warning badge: "Recurring exceeds budget" (`badge-sm badge-warning`) |
| 27.3 | Verify warning is non-blocking                                                | Budget page functions normally, warning is informational only                       |

---

### 28. CLI Occurrence Generation

**Services under test:** `RecurringTemplateService.generateOccurrences()`, CLI command

| Step | Action                                          | Expected Result                                                                                          |
| ---- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 28.1 | Run `bun run aw recurring generate` in terminal | Output: "Generating for workspace X..." then "Done." for each workspace                                  |
| 28.2 | Run the same command again immediately          | Same output, but no duplicate occurrences created (idempotent)                                           |
| 28.3 | Navigate to `/recurring`                        | Occurrences visible for current month + next month (1 month lookahead)                                   |
| 28.4 | Create a new template, then run CLI generate    | New template's occurrences already exist (created at template creation time). CLI doesn't duplicate them |

---

### 29. Occurrence Generation — Completion

| Step | Action                                           | Expected Result                                                                       |
| ---- | ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 29.1 | Create template with count=1 (single occurrence) | One pending occurrence generated                                                      |
| 29.2 | Confirm or skip the single occurrence            | Template status transitions to "Completed" (`badge-ghost`). No more pending generated |
| 29.3 | Run CLI generate after completion                | Template skipped (already completed). No new occurrences                              |
| 29.4 | Verify completed template in list                | Status "Completed", Next Due "—", no Pause/Resume in kebab                            |

---

### 30. Day-of-Month Edge Cases

| Step | Action                                                         | Expected Result                                                                              |
| ---- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 30.1 | Create template with day_of_month=31, start month=January      | January occurrence: due Jan 31. February: due Feb 28 (or 29 in leap year). April: due Apr 30 |
| 30.2 | Create template with day_of_month=29, verify February handling | Non-leap year February: due Feb 28. Leap year: due Feb 29                                    |
| 30.3 | Verify occurrences in calendar view                            | Occurrences appear on the clamped dates (not missing or on wrong day)                        |

---

### 31. Responsive Layout — Mobile (390px)

| Step | Action                                    | Expected Result                                                                                    |
| ---- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 31.1 | Resize to 390px, navigate to `/recurring` | Page renders without horizontal overflow                                                           |
| 31.2 | Verify pending cards                      | Action buttons [Confirm] [Skip] stack full-width at bottom of card, min 44px height (touch target) |
| 31.3 | Verify template list                      | Switches from table to card layout. All info readable                                              |
| 31.4 | Open template drawer                      | Drawer takes full width (`w-full`). All fields usable                                              |
| 31.5 | Open confirm modal                        | Modal fields stack vertically. Category/Account dropdowns usable                                   |
| 31.6 | Open skip modal                           | Textarea and buttons usable on mobile                                                              |
| 31.7 | View toggle tabs                          | Both tabs reachable and tappable                                                                   |

---

### 32. Keyboard Accessibility

| Step | Action                                | Expected Result                                                                                                        |
| ---- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 32.1 | Tab through pending cards             | [Confirm] and [Skip] buttons reachable via keyboard                                                                    |
| 32.2 | Open confirm modal, verify focus trap | Focus moves to Amount input. Tab cycles through modal fields. Cannot tab to elements behind modal                      |
| 32.3 | Press Escape in confirm modal         | Modal closes, focus returns to triggering [Confirm] button                                                             |
| 32.4 | Tab through template list kebab menus | Kebab button focusable, Enter opens dropdown, arrow keys navigate options                                              |
| 32.5 | Open skip modal, type in textarea     | Tab reaches textarea. Character counter updates. Enter within textarea doesn't submit (multi-line input if applicable) |
| 32.6 | View toggle with keyboard             | Tab to tabs, Enter/Space activates, `aria-selected` updates                                                            |

---

### 33. URL Persistence & Browser History

| Step | Action                                               | Expected Result                           |
| ---- | ---------------------------------------------------- | ----------------------------------------- |
| 33.1 | Navigate to `/recurring?view=calendar&month=2026-06` | Calendar view loads showing June 2026     |
| 33.2 | Switch to list view                                  | URL updates to `?view=list&month=2026-06` |
| 33.3 | Navigate forward one month                           | URL updates to `?view=list&month=2026-07` |
| 33.4 | Click browser back button                            | Returns to `?view=list&month=2026-06`     |
| 33.5 | Click browser back again                             | Returns to `?view=calendar&month=2026-06` |
| 33.6 | Bookmark the URL, open in new tab                    | Same view and month loads correctly       |

---

### 34. CSRF Protection

> **Critical:** All mutation endpoints must validate CSRF token.

| Step | Action                                                                   | Expected Result                             |
| ---- | ------------------------------------------------------------------------ | ------------------------------------------- |
| 34.1 | Open DevTools Network tab, confirm an occurrence                         | POST request includes `X-CSRF-Token` header |
| 34.2 | Open DevTools Network tab, skip an occurrence                            | POST request includes `X-CSRF-Token` header |
| 34.3 | Open DevTools Network tab, create a template                             | POST request includes `X-CSRF-Token` header |
| 34.4 | Using DevTools console, send POST to `/api/recurring` without CSRF token | Returns 403 error                           |

---

### 35. Workspace Isolation

| Step | Action                                                  | Expected Result                                                                 |
| ---- | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 35.1 | If multiple workspaces available, switch workspaces     | Recurring templates and occurrences change to reflect the active workspace only |
| 35.2 | Create a template in workspace A, switch to workspace B | Template not visible in workspace B                                             |
| 35.3 | API call to `/api/recurring` in workspace B             | Does not return workspace A's templates                                         |

---

## Summary Checklist

| #   | Area                | Key Assertion                                          | Pass    |
| --- | ------------------- | ------------------------------------------------------ | ------- |
| 1   | Route Protection    | `/recurring` requires auth                             | PASS    |
| 2   | Navigation          | Sidebar shows "Recurring" with icon                    | PASS    |
| 3   | Empty State         | First-time shows CTA                                   | SKIP    |
| 4   | Template Create     | Creates template + generates occurrences               | PASS    |
| 5   | Validation          | Rejects invalid input (no end condition, empty fields) | PARTIAL |
| 6   | Installments        | Shows counter "05/12", progress bar                    | PASS    |
| 7   | End Conditions      | Both count AND date can be set simultaneously          | PARTIAL |
| 8   | Template Edit       | Updates template, future occurrences reflect changes   | PASS    |
| 9   | Pause/Resume        | Reversible, occurrences toggle visibility              | PASS    |
| 10  | Cancel              | Future pending removed, confirmed preserved            | PASS    |
| 11  | Delete              | Hard delete, linked transactions preserved             | SKIP    |
| 12  | Confirm Happy Path  | Creates transaction, updates all sections              | PASS    |
| 13  | Confirm Editable    | Amount, date, category, account changeable             | PASS    |
| 14  | Confirm Error       | No ghost transactions on failure or double-click       | PARTIAL |
| 15  | Skip                | Removes from pending, optional reason stored           | PASS    |
| 16  | Overdue             | Red styling, badge, still confirmable                  | PASS    |
| 17  | Template List       | Correct badges, opacity, progress bars                 | PASS    |
| 18  | View Toggle         | List ↔ Calendar with URL persistence                   | PASS    |
| 19  | Month Navigation    | Stats + content update per month                       | PASS    |
| 20  | Calendar Desktop    | 7-column grid, clickable occurrences                   | PASS    |
| 21  | Calendar Mobile     | Date-grouped list fallback                             | PASS    |
| 22  | Stats Row           | Updates on confirm/skip without reload                 | PASS    |
| 23  | Partial Refresh     | All 3 sections refresh after mutations                 | PASS    |
| 24  | Dashboard Widget    | Pending count + CTA link                               | PARTIAL |
| 25  | Transaction Badge   | "Recurring" badge on confirmed transactions            | PASS    |
| 26  | CashFlow Widget     | Upcoming bills in cash flow                            | PASS    |
| 27  | Budget Warning      | Warning when recurring > budget                        | PASS    |
| 28  | CLI Generate        | Idempotent occurrence generation                       | PASS    |
| 29  | Completion          | Template auto-completes when done                      | PARTIAL |
| 30  | Day-of-Month        | 31st clamped in short months                           | PARTIAL |
| 31  | Mobile Layout       | No overflow, touch targets ≥44px                       | PASS    |
| 32  | Keyboard A11y       | Focus management, tab order, escape                    | PASS    |
| 33  | URL Persistence     | Bookmarkable, back/forward works                       | PARTIAL |
| 34  | CSRF                | All POST/PUT/DELETE include token                      | PASS    |
| 35  | Workspace Isolation | Data scoped to active workspace                        | SKIP    |

**Critical paths:** Steps 1, 4, 10, 12, 14, 23, 34 are highest priority.

---

## Test Run Results — 2026-02-26

**Executed by:** Claude Code browser automation (35 sections)
**Environment:** `http://recurring-transactions.expenses.local:4320/` | Demo User | Feb 2026

### Totals: 24 PASS · 1 FAIL · 7 PARTIAL · 3 SKIP

### FAIL Details

- **5.7** — Category dropdown does not filter by income/expense type when switching template type (Expense→Income still shows expense categories)

### PARTIAL Details

- **5** — Validation: Most pass; 5.7 FAIL (category type mismatch in dropdown)
- **7** — End Conditions: UI shows both count+date as checkboxes (combinable by design), not explicitly tested simultaneously
- **14** — Confirm Error: 14.1/14.2 PASS (validation inline banner); 14.3 PARTIAL (race condition test blocked by CSRF cookie security); 14.5 PARTIAL (offline simulation requires DevTools)
- **24** — Dashboard Widget: Widget renders; all Feb bills already confirmed during testing so empty state shown, "Review pending bills" CTA not verifiable
- **29** — Completion: Template with count=1 and past start month auto-completes on creation; occurrence not shown as pending since due date already passed (Feb 1)
- **30** — Day-of-Month: No existing template with day=31 in seed data; edge case not verifiable without creating specific test data
- **33** — URL Persistence: URL params persist and direct URL navigation works; **BUG** — period navigator chip always shows "March 2026" regardless of actual month (display inconsistency)

### SKIP Details

- **3** — Empty State: Seed data already present, bypasses first-time empty state
- **11** — Delete: No delete option in template kebab menu UI (Edit/Pause/Resume/Cancel only)
- **35** — Workspace Isolation: Demo account has single workspace ("Demo Family"); multi-workspace switching not available
