# Reporting Income Design

**Problem**

The current `/reports` experience treats income mostly as supporting context for expense analysis. It already shows total income and an income-vs-expense trend, but the dominant charts, drill-downs, tables, and category intelligence are expense-first. Users now need a clearer way to review past income, especially active income such as salary and passive income such as investments, without making the main reporting experience heavier or slower.

**Goals**

- Keep the reporting landing page focused on overall financial health across income and expenses.
- Give income a first-class detail experience instead of leaving it as a secondary metric.
- Differentiate income reporting from expense reporting by question, structure, and visuals.
- Support historical income analysis by source group, detailed source category, and household member.
- Protect reporting performance by avoiding one oversized response that loads every detail at once.
- Reuse the current reports architecture where it already works well: shared filters, server-rendered partials, decimal-safe aggregation, and multi-currency handling.

**Non-Goals**

- Introduce a separate `incomes` table or a brand-new transaction model.
- Redesign forecast in the same change.
- Add tax, payroll, or employer-specific modeling.
- Merge all income and expense detail into one long, all-purpose page.
- Build cross-currency reporting beyond the existing workspace currency rules.

**Approved Direction**

Keep `/reports` as a lightweight Overview page, then add sibling detail pages at `/reports/expenses` and `/reports/income`.

The Overview page remains the first stop for the question, "How healthy are we overall?" The detail pages answer different follow-up questions: Expense explains where money went, while Income explains where money came from and how much was active versus passive.

**Information Architecture**

- `/reports`
  - Overview only.
  - Shows compact cross-ledger summary cards such as total income, total expenses, net savings, and savings rate.
  - Shows one combined trend view for income versus expenses.
  - Shows small preview modules that link into the Income and Expense detail pages instead of embedding all detail on the landing page.
- `/reports/expenses`
  - Holds the current category-heavy expense analysis.
  - Keeps expense mix, budget health, recurring versus one-time analysis, category drill-down, and member expense breakdowns.
- `/reports/income`
  - Becomes a source-heavy income analysis page.
  - Shows total income, active income, passive income, period-over-period change, source mix, income trend, member income breakdown, and historical income transactions.
- Shared report navigation
  - Use a consistent secondary navigation under Reports: `Overview`, `Expenses`, and `Income`.
  - Keep report filter state in the URL so switching pages preserves range, period, and optional member selection.
  - Preserve currency through the existing global header behavior instead of duplicating a currency selector inside report pages.

This split keeps the mental model clear: Overview is for health, Expense is for outflow diagnosis, and Income is for inflow analysis.

**Income Source Model**

Income should continue to use the existing `transactions` plus `categories` structure. To support the new reporting questions, income categories should gain a lightweight reporting classification with values such as:

- `active`
- `passive`
- `other`

Each income transaction inherits its source group from its category. This keeps reporting queries simple, avoids duplicating transaction concepts, and lets the product distinguish salary-like income from investment-like income without creating a separate income entity.

If an income category is missing a source classification, it must not disappear from reporting. It should roll into an explicit `Other income` bucket so the totals stay trustworthy and users can later fix categorization.

**Data Flow and Performance**

Keep the existing interactive reports pattern: server-render the initial page, then refresh page sections through HTML partial responses when filters change.

Split the backend payloads by page responsibility:

- `Overview` payload
  - Runs only lightweight, cross-ledger aggregate queries.
  - Returns summary metrics, the main income-vs-expense trend, and small preview data.
- `Expense` payload
  - Keeps the heavier expense-specific queries such as category intelligence, budget-related analysis, and detailed expense breakdowns.
- `Income` payload
  - Runs income-only queries such as source-group totals, source-category mix, active-versus-passive trends, member income totals, and historical income transactions.

Each page should continue to parallelize its own queries, but pages should not fetch each other's detail data. This is the main performance safeguard: the Overview stays fast because it does not load Expense and Income detail together.

Historical income data should be paginated on the Income page instead of rendering the full transaction history in one response. Large tables and drill-down details should remain scoped to the detail pages, not the Overview.

Existing transaction indexes already support the core filters on workspace, transaction type, currency, and date. The design should rely on those first and only add new indexing if benchmark results show a real need.

**UX and Components**

All three report pages should share one report-level filter bar with:

- range toggle
- period selector
- optional member filter if the current reports flow already supports it

Currency should remain in the existing global header or workspace-level control. Do not move or duplicate currency selection inside the report page filter bar.

The Overview page should stay compact. It should not repeat the full Expense or Income experience. Instead, it should provide:

- headline metrics
- one cross-ledger trend
- a small income preview
- a small expense preview
- clear calls to action into the detail pages

The Income page should be intentionally different from the Expense page. Its primary modules should be:

- income summary cards
- source mix chart
- active-versus-passive trend chart
- member income table
- paginated historical income table
- income drill-downs by source category that reuse the existing `CategoryDrillDownModal` pattern

The income history table should honor any optional member, source-group, or source-category filter already present in page state. Source-group and source-category filters can be introduced through drill-down and URL state rather than by expanding the always-visible top-level filter bar.

The Expense page can remain close to the existing design, but with its role made explicit as the deep-dive destination for outflow analysis.

**Error Handling and Empty States**

- If the workspace has no income data for the selected range, show an Income-specific empty state instead of a generic blank report.
- If some income categories are unclassified, show them under `Other income` and make that bucket visible in the UI.
- Keep loading, empty, and error states isolated per page so a slow or failed Income request does not break the Overview or Expense pages.
- Surface page and API failures as local report states instead of redirecting away from the current report or silently collapsing into a generic empty payload.
- Preserve existing decimal-safe calculations and multi-currency rules so income totals remain consistent with the rest of the product.

**Testing**

Add verification for the new reporting shape at multiple levels:

- unit tests for income source-group aggregation, active/passive totals, period-over-period comparisons, and `Other income` fallback behavior
- integration tests for shared filter persistence across Overview, Expense, and Income pages
- service and API tests for Overview, Expense, and Income partial responses, including invalid member-filter rejection
- performance benchmarks for the Overview payload and the new Income payload
- end-to-end coverage for navigating from Overview to Income, keeping filter context, and drilling into historical income details

**Expected Outcome**

The reporting landing page becomes easier to scan because it focuses on overall health instead of trying to host every analysis mode at once. Expense and Income become clearly different tools, each optimized for a distinct financial question. Users get a dedicated historical income report for active and passive income without paying the performance cost of loading both deep-dive experiences on every visit.
