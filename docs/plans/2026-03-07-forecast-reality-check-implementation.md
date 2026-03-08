# Forecast Reality Check Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn `/forecast` into a reality-check view that saves workspace-level assumptions, starts from real historical balances, compares planned growth against actual growth, and defaults to a focused window of 12 months back and 24 months forward.

**Architecture:** Keep the financial math in `src/lib/forecast`, use workspace meta for persisted assumptions, use `ReportService` for monthly `income - expense` aggregation, and have `/api/forecast` return pre-shaped data for the page. Split the UI into a saved assumptions card, a balance comparison chart, a monthly gains chart, and an expandable yearly breakdown table.

**Tech Stack:** Astro 5, TypeScript, Bun test, Chart.js, Drizzle ORM, OpenAPI YAML

---

### Task 1: Persist forecast assumptions in workspace meta

**Files:**
- Modify: `src/lib/constants/workspace-meta-keys.ts`
- Modify: `src/services/workspace-meta.service.ts`
- Create: `src/services/workspace-meta.service.test.ts`

**Step 1: Write the failing test**

Create `src/services/workspace-meta.service.test.ts` with tests that assert:

- a workspace without saved forecast settings falls back to the existing defaults
- saved monthly top-up round-trips as a number
- saved APY round-trips as a number
- invalid negative values are rejected

**Step 2: Run test to verify it fails**

Run: `bun test src/services/workspace-meta.service.test.ts`

Expected: FAIL because the new meta keys and service helpers do not exist yet.

**Step 3: Add the new meta keys and typed settings**

Extend `WORKSPACE_META_KEYS`, `WORKSPACE_META_DEFAULTS`, `WorkspaceSettings`, and `DEFAULT_WORKSPACE_SETTINGS` with:

- `forecast_monthly_topup`
- `forecast_annual_rate`

Add numeric parsing and validation helpers in `WorkspaceMetaService` so callers work with numbers, not raw strings.

**Step 4: Add dedicated getters and setters**

Implement focused helpers such as:

- `getForecastMonthlyTopup()`
- `setForecastMonthlyTopup()`
- `getForecastAnnualRate()`
- `setForecastAnnualRate()`

Also update `getSettings()` so the typed settings object includes both forecast values.

**Step 5: Run the targeted test again**

Run: `bun test src/services/workspace-meta.service.test.ts`

Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/constants/workspace-meta-keys.ts src/services/workspace-meta.service.ts src/services/workspace-meta.service.test.ts
git commit -m "feat: persist forecast assumptions in workspace settings"
```

### Task 2: Expose forecast assumptions through the workspace settings API and OpenAPI

**Files:**
- Modify: `src/pages/api/workspace/settings.ts`
- Create: `src/__tests__/api/workspace-settings-forecast.test.ts`
- Modify: `openapi/schemas/UpdateWorkspaceSettingsRequest.yml`
- Modify: `openapi/schemas/WorkspaceSettings.yml`
- Modify: `openapi/schemas/WorkspaceSettingsResponse.yml`

**Step 1: Write the failing API test**

Create `src/__tests__/api/workspace-settings-forecast.test.ts` that:

- sends `PUT /api/workspace/settings` with `forecastMonthlyTopup` and `forecastAnnualRate`
- asserts both values are forwarded to `workspaceMetaService`
- asserts `GET /api/workspace/settings` returns both values in `data.settings`
- rejects invalid negative input with `400`

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/api/workspace-settings-forecast.test.ts`

Expected: FAIL because the schema and response shape do not include the new fields.

**Step 3: Extend the endpoint schema**

Update `src/pages/api/workspace/settings.ts` to validate:

- `forecastMonthlyTopup` as a non-negative number with the same upper bound as forecast
- `forecastAnnualRate` as a number between `0` and `100`

Wire the validated values to the new `WorkspaceMetaService` methods.

**Step 4: Update the OpenAPI schemas**

Add both forecast fields to the workspace settings request and response schemas.

If these files still omit existing `monthlyIncome`, reconcile that drift while touching them instead of leaving the schema half-correct.

**Step 5: Run the targeted test again**

Run: `bun test src/__tests__/api/workspace-settings-forecast.test.ts`

Expected: PASS

**Step 6: Commit**

```bash
git add src/pages/api/workspace/settings.ts src/__tests__/api/workspace-settings-forecast.test.ts openapi/schemas/UpdateWorkspaceSettingsRequest.yml openapi/schemas/WorkspaceSettings.yml openapi/schemas/WorkspaceSettingsResponse.yml
git commit -m "feat: expose forecast assumptions in workspace settings api"
```

### Task 3: Add monthly actual net savings aggregation

**Files:**
- Modify: `src/services/report.service.ts`
- Modify: `src/services/report.service.test.ts`

**Step 1: Write the failing service test**

Add tests in `src/services/report.service.test.ts` for a new public monthly aggregation method that returns month-keyed:

- `income`
- `expenses`
- `netSavings`

for a workspace and currency range.

Include at least one month where the result is negative.

**Step 2: Run test to verify it fails**

Run: `bun test src/services/report.service.test.ts`

Expected: FAIL because the new method does not exist yet.

**Step 3: Implement the minimal aggregation method**

Promote the existing monthly trend query pattern into a public method that forecast can reuse without duplicating SQL. Keep the method workspace-scoped and currency-scoped.

**Step 4: Run the targeted test again**

Run: `bun test src/services/report.service.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/report.service.ts src/services/report.service.test.ts
git commit -m "feat: add monthly net savings aggregation for forecast"
```

### Task 4: Rebuild forecast types and calculations around a shared monthly timeline

**Files:**
- Modify: `src/lib/forecast/types.ts`
- Modify: `src/lib/forecast/calculations.ts`
- Modify: `src/lib/forecast/calculations.test.ts`

**Step 1: Write the failing calculation tests**

Replace the current current-month-based assumptions with tests that assert:

- the timeline starts at the earliest historical balance month
- debt accounts are excluded before totals are calculated
- planned balance compounds month by month from the first actual balance month
- current trajectory starts at the latest actual balance month and uses trailing average net savings
- the focused chart window clamps to 12 months before and 24 months after the latest actual month
- yearly grouping produces expandable year buckets with monthly children

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/forecast/calculations.test.ts`

Expected: FAIL because the current helpers only generate a future-only series from today.

**Step 3: Refactor the forecast model**

Introduce types and helpers for:

- monthly actual balance points
- monthly actual net savings points
- planned balance points
- current trajectory points
- chart window metadata
- yearly grouped breakdown rows

Keep the math in `src/lib/forecast/calculations.ts`. Do not move Decimal-based calculation code into client-imported files.

**Step 4: Remove the old 10-year assumptions from the summary**

Replace `year10Target`-style naming with summary fields that match the new fixed 24-month-forward model.

**Step 5: Run the targeted test again**

Run: `bun test src/lib/forecast/calculations.test.ts`

Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/forecast/types.ts src/lib/forecast/calculations.ts src/lib/forecast/calculations.test.ts
git commit -m "refactor: align forecast calculations with real timeline data"
```

### Task 5: Reshape `/api/forecast` around saved settings and the new response contract

**Files:**
- Modify: `src/pages/api/forecast/index.ts`
- Create: `src/__tests__/api/forecast.test.ts`
- Modify: `openapi/paths/forecast.yml`
- Modify: `openapi/schemas/ForecastResponse.yml`

**Step 1: Write the failing API test**

Create `src/__tests__/api/forecast.test.ts` that asserts:

- unauthenticated requests still return `401`
- the endpoint uses saved workspace assumptions when query params are absent
- only primary-currency, non-debt accounts feed the forecast
- actual net savings comes from monthly `income - expense`
- the response includes chart window metadata and yearly grouped data

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/api/forecast.test.ts`

Expected: FAIL because the endpoint still builds a future-only series from hardcoded query defaults.

**Step 3: Implement the new endpoint flow**

Update `src/pages/api/forecast/index.ts` to:

- load workspace settings for `forecastMonthlyTopup` and `forecastAnnualRate`
- filter accounts to primary currency and `account_class !== 'debt'`
- fetch monthly actual net savings from `reportService`
- build the new monthly timeline and yearly groups with the forecast calculation helpers
- return the pre-shaped response the UI needs

Leave `years` out of the page contract. The approved page uses a fixed 24-month-forward horizon.

**Step 4: Update the OpenAPI docs**

Revise the path and schema docs so they describe:

- saved assumptions
- fixed horizon behavior
- chart window metadata
- yearly grouped breakdown rows
- `Actual Net Savings` semantics instead of fake historical interest

**Step 5: Run the targeted test again**

Run: `bun test src/__tests__/api/forecast.test.ts`

Expected: PASS

**Step 6: Commit**

```bash
git add src/pages/api/forecast/index.ts src/__tests__/api/forecast.test.ts openapi/paths/forecast.yml openapi/schemas/ForecastResponse.yml
git commit -m "feat: rebuild forecast api around saved assumptions and real timeline data"
```

### Task 6: Rebuild the forecast page shell and saved assumptions UI

**Files:**
- Modify: `src/pages/forecast/index.astro`
- Create: `src/components/organisms/ForecastAssumptions.astro`
- Create: `src/components/organisms/ForecastAssumptions.client.ts`
- Create: `src/components/organisms/ForecastAssumptions.test.ts`

**Step 1: Write the failing UI source test**

Create `src/components/organisms/ForecastAssumptions.test.ts` that asserts the new assumptions component contains:

- `Monthly Top-Up`
- `Expected APY`
- helper text that says the values are saved to workspace settings
- a save-status surface

**Step 2: Run test to verify it fails**

Run: `bun test src/components/organisms/ForecastAssumptions.test.ts`

Expected: FAIL because the component does not exist yet.

**Step 3: Build the assumptions card**

Create `ForecastAssumptions.astro` and `ForecastAssumptions.client.ts` with:

- debounced save to `PUT /api/workspace/settings`
- inline `Saving...` and `Saved` feedback
- inline error feedback that does not wipe local values

Update `src/pages/forecast/index.astro` to:

- remove the duplicate in-body page heading
- stop hardcoding `5000000` and `7`
- render the new assumptions card ahead of the charts
- fetch the first payload from `/api/forecast` without duplicating business logic in the page

**Step 4: Run the targeted test again**

Run: `bun test src/components/organisms/ForecastAssumptions.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/forecast/index.astro src/components/organisms/ForecastAssumptions.astro src/components/organisms/ForecastAssumptions.client.ts src/components/organisms/ForecastAssumptions.test.ts
git commit -m "feat: add saved forecast assumptions ui"
```

### Task 7: Refactor the wealth growth chart for planned vs actual vs current trajectory

**Files:**
- Modify: `src/components/organisms/WealthTrajectory.astro`
- Modify: `src/components/organisms/WealthTrajectory.client.ts`
- Modify: `src/components/organisms/WealthTrajectory.test.ts`

**Step 1: Write the failing chart source test**

Extend `src/components/organisms/WealthTrajectory.test.ts` to assert the chart source includes the approved legend labels:

- `Planned Balance`
- `Actual Balance`
- `Current Trajectory`

Also assert the inline assumption inputs are no longer rendered inside this component.

**Step 2: Run test to verify it fails**

Run: `bun test src/components/organisms/WealthTrajectory.test.ts`

Expected: FAIL because the component still renders top-up and APY inputs and only two datasets.

**Step 3: Implement the chart refactor**

Update the chart to:

- read the focused chart window from the API payload
- render three balance lines
- make `Current Trajectory` visually distinct with a dashed stroke
- keep the tooltip and theme logic aligned with the design system

Use the focused window instead of dumping the full history into the default viewport.

**Step 4: Run the targeted test again**

Run: `bun test src/components/organisms/WealthTrajectory.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/organisms/WealthTrajectory.astro src/components/organisms/WealthTrajectory.client.ts src/components/organisms/WealthTrajectory.test.ts
git commit -m "feat: compare planned and actual balance growth on forecast chart"
```

### Task 8: Add the monthly gains chart and the expandable yearly breakdown

**Files:**
- Create: `src/components/organisms/ForecastMonthlyGains.astro`
- Create: `src/components/organisms/ForecastMonthlyGains.test.ts`
- Modify: `src/components/organisms/LedgerProjections.astro`
- Create: `src/components/organisms/LedgerProjections.test.ts`
- Modify: `src/pages/forecast/index.astro`

**Step 1: Write the failing source tests**

Create tests that assert:

- `ForecastMonthlyGains.astro` contains `Forecast Interest` and `Actual Net Savings`
- `LedgerProjections.astro` contains yearly summary rows plus expansion hooks for monthly rows

**Step 2: Run tests to verify they fail**

Run: `bun test src/components/organisms/ForecastMonthlyGains.test.ts src/components/organisms/LedgerProjections.test.ts`

Expected: FAIL because the gains chart does not exist and the table is still a flat 120-row monthly view.

**Step 3: Implement the new components**

Create the monthly gains chart and refactor `LedgerProjections.astro` so it:

- defaults to year rows
- expands a year row to reveal monthly rows
- shows planned vs actual ending balance
- shows forecast interest vs actual net savings totals

Wire both new surfaces into `src/pages/forecast/index.astro`.

**Step 4: Run the targeted tests again**

Run: `bun test src/components/organisms/ForecastMonthlyGains.test.ts src/components/organisms/LedgerProjections.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/organisms/ForecastMonthlyGains.astro src/components/organisms/ForecastMonthlyGains.test.ts src/components/organisms/LedgerProjections.astro src/components/organisms/LedgerProjections.test.ts src/pages/forecast/index.astro
git commit -m "feat: add forecast monthly gains chart and yearly breakdown"
```

### Task 9: Update docs and run the verification gates

**Files:**
- Modify: `docs/sites/src/content/docs/end-users/forecast.md`

**Step 1: Update the user docs**

Replace the outdated documentation that still describes:

- the old 10-year table
- the old chart behavior
- the old assumptions model

Document the new saved assumptions, balance comparison, actual net savings comparison, and yearly expandable breakdown.

**Step 2: Run targeted tests**

Run:

```bash
bun test src/services/workspace-meta.service.test.ts
bun test src/__tests__/api/workspace-settings-forecast.test.ts
bun test src/services/report.service.test.ts
bun test src/lib/forecast/calculations.test.ts
bun test src/__tests__/api/forecast.test.ts
bun test src/components/organisms/ForecastAssumptions.test.ts
bun test src/components/organisms/WealthTrajectory.test.ts
bun test src/components/organisms/ForecastMonthlyGains.test.ts
bun test src/components/organisms/LedgerProjections.test.ts
```

Expected: PASS

**Step 3: Run the quality gates**

Run:

```bash
bun run build
bun run typecheck
bun run lint:fix
bun run stylelint:fix
bun run format:fix
```

Expected: PASS

**Step 4: Commit**

```bash
git add docs/sites/src/content/docs/end-users/forecast.md
git commit -m "docs: update forecast user guide for reality-check flow"
```
