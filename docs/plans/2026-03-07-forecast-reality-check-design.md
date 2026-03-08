# Forecast Reality Check Design

**Problem**

The current forecast page does not match the product intent or the UX feedback in GitHub issue `#258`. It hardcodes the default assumptions, starts the model from the current month, hides the assumptions inside the chart card, uses a 120-row monthly table as the primary detail view, and does not show a trustworthy comparison between planned growth and actual portfolio behavior.

**Goals**

- Save forecast assumptions to workspace settings.
- Start the forecast model from the earliest historical balance month we have.
- Show wealth growth month to month.
- Compare planned growth against actual balance growth.
- Compare forecast interest against actual net savings.
- Focus the default chart window on the useful range: 12 months back and 24 months forward.
- Replace the default monthly wall of rows with a yearly summary that can expand into monthly detail.

**Approved UX**

Keep the layout header title only. Remove the duplicate `Forecast` heading from the page body.

Add a dedicated `Forecast Assumptions` card above the charts. It contains:

- `Monthly Top-Up`
- `Expected APY`
- helper copy that explains the values are saved to workspace settings
- lightweight save status feedback

Show two charts instead of putting every comparison into one chart:

- `Wealth Growth`
  - `Planned Balance`
  - `Actual Balance`
  - `Current Trajectory`
- `Monthly Gains`
  - `Forecast Interest`
  - `Actual Net Savings`

The chart data model starts at the earliest historical balance month. The default visible range clamps to a focused window around the latest actual month:

- 12 months back
- latest actual month
- 24 months forward

Show a yearly summary table by default. Each year row can expand to show monthly rows for that year.

**Data Scope**

Forecast data is scoped to the workspace primary currency.

Debt accounts are excluded. This keeps the forecast aligned with the rest of the product, where portfolio totals and debt totals are treated separately.

Forecast assumptions are stored in workspace meta:

- `forecast_monthly_topup`
- `forecast_annual_rate`

**Calculation Rules**

Build one shared monthly timeline from the earliest historical balance month through the forecast horizon.

For each month:

- `Actual Balance` comes from aggregated account balance history snapshots.
- `Actual Net Savings` is defined as `income - expense` for that month.
- `Planned Balance` starts from the first historical balance month and compounds forward using:
  - prior planned balance
  - monthly APY-derived interest
  - saved monthly top-up

`Current Trajectory` starts from the latest actual balance and projects forward using:

- the same APY
- a trailing average of actual monthly net savings

This creates two different comparisons:

- planned growth vs actual balance growth
- forecast interest vs actual net savings

`Actual Net Savings` is the approved label for the simplified real-world monthly comparison. This change does not attempt to derive true realized investment interest from balance history.

**API Shape**

The forecast API should return enough data for the page to render without client-side recomputation:

- saved assumptions
- full monthly timeline
- focused chart window indices or keys
- yearly grouped breakdown data
- summary metrics

The workspace settings API should support reading and updating the saved forecast assumptions.

**Edge Cases**

If the workspace has no account history, show an empty state that explains forecast needs historical balances.

If historical balances exist but monthly transactions do not, still show `Actual Balance`. `Actual Net Savings` may be `0` or absent, but the UI must make that state clear.

If assumption saves fail, keep the local input values, show inline error feedback, and do not reset the form.

**Non-Goals**

- Debt payoff forecasting
- Cross-currency conversion inside forecast
- Tax, inflation, or fee modeling
- Deriving true realized interest from account snapshots
- Expanding this change into a broader settings redesign

**Expected Outcome**

The forecast page becomes a reality-check tool instead of a detached compound-interest demo. Users can save their planning assumptions, see how their portfolio actually grew, compare that against the planned path, and inspect the result through a readable chart window and an expandable yearly breakdown.
