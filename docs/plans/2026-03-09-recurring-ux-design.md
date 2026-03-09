# Recurring UX Improvements

Improve `/recurring` first. Leave `/recurring/forecast` polish for a later pass.

## Triage Outcome

This pass will address the highest-value issues on the main recurring page:

1. Make the queue's `Income` and `Expenses` pills real filters.
2. Make the section heading adapt to the selected month.
3. Replace awkward queue copy such as `Available on Mar 15`.
4. Simplify the recurring form's schedule controls.
5. Make `No end` the default end behavior.
6. Remove documentation-style `Required` and `Optional` badges from the form.

This pass will not include the remaining forecast polish items. Those items are lower risk, and the current forecast page already received its structural fixes.

## Problems

The main recurring page still asks users to guess. The queue pills look clickable, but they do nothing. The heading says `Due This Month` even when the user browses a future month. The form defaults every new recurring item to a twelve-cycle ending, which misstates common cases such as salary, rent, and subscriptions.

The form also repeats the same concept twice. Users choose a preset such as `Monthly`, and then choose `Monthly` again in the `Cycle` field. The `Required` and `Optional` badges add noise without helping completion.

## Design

### 1. Queue filters

Keep the current queue component and make the two pills functional. Add a lightweight client-side filter with three states: `all`, `income`, and `expense`.

The pills will behave like toggles:

- Default state: both types visible.
- Tap `Income`: show income items only.
- Tap `Expenses`: show expense items only.
- Tap the active pill again: return to `all`.

The same filter will apply to both render paths:

- mobile cards in `RecurringPendingCard`
- desktop rows in `RecurringPendingList`

No API change is needed. The server will continue to render the full queue. The client will only show or hide existing items.

### 2. Queue heading and copy

The queue heading should match the selected month:

- current month: `Due This Month`
- future or past month: `Due in {MONTH}`

Use the existing selected month label as the source of truth so the heading and header subtitle stay aligned.

Update queue copy to use payment language:

- replace `Available on {date}` with `Due {date}`
- keep `Overdue` and `Ready to process` for actionable states
- update income-facing count copy so income is framed as arriving or expected, not "due"

### 3. Schedule control

Merge `Frequency` and `Cycle` into one control named `Schedule`.

The primary control will read:

`Every [interval_count] [week|month]`

Keep the existing quick presets because they are fast:

- Weekly
- Monthly
- Quarterly
- Semi-annual
- Annual

Preset clicks will continue to update the underlying frequency and interval values. The form will keep its current weekly-vs-monthly behavior:

- weekly schedules use start date
- monthly schedules use day of month and start month

This keeps the current backend contract intact while removing duplicate UI.

### 4. End behavior and installment rules

Make `No end` the default choice. Present end behavior as a single-choice group:

- `No end`
- `End by count`
- `End by date`

Only the selected option will reveal its input. `No end` reveals nothing.

Installment support stays, but it depends on `End by count`. When the user switches away from `End by count`, the UI will:

- disable installment mode
- clear installment-only fields
- show the guidance that installment tracking requires a count

This keeps the current installment capability for loans and device payments, but removes the bad default for ordinary recurring items.

### 5. Form language

Remove the `Required` and `Optional` badges. Use standard form signals instead:

- labels
- required field attributes
- inline validation text only when needed

Keep the copy plain and specific. The rules section should explain what the user is deciding, not label the section like API documentation.

## Data Flow

The queue filter will live in the existing recurring page client script. It will read filter state from the rendered queue and re-apply after list refreshes. Partial HTML refreshes for month changes, confirm, and skip will continue to use the existing endpoints.

The form will keep the same submission shape:

- `frequency`
- `interval_count`
- `start_month` or `start_date_input`
- `total_occurrences`
- `end_date`
- installment fields

The UI will change how users reach those values, but it will not require a new API contract.

## Validation and error handling

Validation stays explicit:

- `No end` requires no extra field.
- `End by count` requires `total_occurrences >= 1`.
- `End by date` requires a valid date.
- installment fields remain unavailable unless count-based ending is active.

The client should surface the same visible errors the form already uses. Do not add silent fallbacks.

## Testing

Add focused coverage for the changed structure and defaults:

- recurring form source-based tests for the new schedule and end-state markers
- recurring queue source-based tests for filter markers and copy changes
- relevant page and component verification through repo quality gates

## Out of scope

Defer these items to a later forecast-focused pass:

- title-casing any remaining forecast account labels
- dynamic chart subtitle when paused items are included
- Y-axis labels on the forecast chart
- paused-row explanatory tooltip in the forecast table
