# Phase 2 Actionable Tickets (Refined Draft)

Context

- Source alignment: specs/beads-plan.md, specs/execution-plan.md (Phase 2), specs/requirements-specification.md (UX-5, UX-6).
- Codebase status: services + API routes exist for transactions, categories, payment methods, and budget; UI pages still use mock data or are placeholders.
- Priorities mirror beads plan (P0/P1/P2). Update as needed before creating beads tasks.
- Implementation order per constitution: UI → Service → API → CLI → Seeder. Services/API exist; most work is UI wiring and UX behaviors.

## Transactions

TXN-001 (P0) - Wire transaction list page to real data

- Dependencies: none
- Effort: M
- Complexity: M
- Files: src/pages/transactions/index.astro, src/components/organisms/TransactionList.astro
- Scope:
  - Replace mock transactions/categories/payment methods with service-backed data.
  - Use transactionService.findAll + count with pagination and filters from query params.
  - Align filters: `category_id`, `payment_method_id`, `start_date`, `end_date`, `search`, `type`, `currency`.
- Acceptance:
  - List and pagination reflect DB state.
  - Filters update the query and results correctly.

TXN-002 (P0) - Implement create transaction flow

- Dependencies: TXN-007
- Effort: L
- Complexity: M
- Split recommended: yes (split into UI wiring + API submit + budget-remaining UX)
- Files: src/pages/transactions/add.astro, src/components/molecules/TransactionForm.astro, src/pages/api/transactions/index.ts
- Scope:
  - Populate categories/payment methods via services.
  - Submit to API; render validation errors in the form.
  - For expense categories, show budget remaining via budgetService.getCategoryRemaining.
- Acceptance:
  - Transaction persists; redirect to list.
  - Field errors render per validation response.
  - Budget warning updates for selected category.

TXN-003 (P0) - Implement edit transaction flow

- Dependencies: TXN-001, TXN-007
- Effort: M
- Complexity: M
- Files: new route src/pages/transactions/edit/[id].astro; reuse TransactionForm; API route already exists.
- Scope:
  - Load transaction by id; prefill form.
  - Submit update; handle errors.
- Acceptance:
  - Edits persist and appear in list/detail.

TXN-004 (P0) - Implement delete flow using <dialog>

- Dependencies: TXN-001, TXN-007
- Effort: S
- Complexity: S
- Files: src/components/organisms/TransactionList.astro, src/components/molecules/TransactionRow.astro
- Scope:
  - Replace confirm() with <dialog> per constitution.
  - Call delete endpoint; refresh list.
- Acceptance:
  - Soft delete removes item from list.
  - Confirmation uses <dialog>.

TXN-005 (P1) - CSV import UI + API wiring

- Dependencies: TXN-007, CAT-001, PAY-001
- Effort: L
- Complexity: M
- Split recommended: yes (split into upload/parse + preview/mapping + import execution)
- Files: src/pages/transactions/import.astro, src/components/molecules/CSVImportForm.astro, src/pages/api/transactions/import/index.ts
- Scope:
  - File upload → parse → preview → column mapping → import.
  - Surface row-level errors and duplicate skips from service.
- Acceptance:
  - Valid CSV imports successfully; errors and skips displayed.

TXN-006 (P1) - CSV export UI + API wiring

- Dependencies: TXN-007
- Effort: S
- Complexity: S
- Files: src/pages/transactions/export.astro, src/pages/api/transactions/export/index.ts
- Scope:
  - Pass filters into export URL.
  - Show export CTA and download status.
- Acceptance:
  - Exported CSV matches filter set and filename format.

TXN-007 (P0) - Replace API auth placeholder with real session lookup

- Dependencies: none
- Effort: M
- Complexity: M
- Files: src/lib/api-utils.ts
- Scope:
  - Use Lucia session from request cookies and return user id.
  - Require auth returns 401 without a valid session.
- Acceptance:
  - Transaction/category/payment-method endpoints reject unauthenticated requests.

## Categories

CAT-001 (P1) - Categories management UI (CRUD + budget fields)

- Dependencies: TXN-007
- Effort: L
- Complexity: M
- Split recommended: yes (split into list view + create/edit modal + deactivate flow)
- Files: src/pages/settings/categories.astro (+ new UI components as needed)
- Scope:
  - List categories with status (active/inactive).
  - Add/edit/delete (soft delete via is_active).
  - Fields: name, type, currency, percentage, budget_amount.
- Acceptance:
  - Changes persist; inactive categories are not offered in transaction forms.

## Payment Methods

PAY-001 (P1) - Payment methods management UI (CRUD)

- Dependencies: TXN-007
- Effort: M
- Complexity: S
- Files: src/pages/settings/payment-methods.astro (+ new UI components as needed)
- Scope:
  - List methods with status.
  - Add/edit/delete (soft delete via is_active).
  - Fields: name, type.
- Acceptance:
  - Changes persist; inactive methods are not offered in transaction forms.

## Budget

BUD-001 (P1) - Fix budget-to-transactions filter link

- Dependencies: TXN-001
- Effort: XS
- Complexity: S
- File: src/components/organisms/BudgetOverviewTable.astro
- Scope:
  - Use `category_id` query param instead of `category` when linking to transactions.
- Acceptance:
  - Clicking a category filters the transaction list correctly.

BUD-002 (P1) - Add budget alerts detail list on overview

- Dependencies: none
- Effort: S
- Complexity: S
- Files: src/pages/budget/index.astro
- Scope:
  - Render “needs attention” list using budgetService.getAlerts.
- Acceptance:
  - Warning/exceeded categories listed with amounts and status.

BUD-003 (P1) - Budget overview sorting + export

- Dependencies: none
- Effort: M
- Complexity: M
- Files: src/components/organisms/BudgetOverviewTable.astro, src/pages/budget/index.astro
- Scope:
  - Enable sorting by columns (client or server).
  - Add CSV export action for current month/currency.
- Acceptance:
  - Table sorts as expected; export matches current view.

BUD-004 (P1) - Budget editing entry point

- Dependencies: CAT-001
- Effort: M
- Complexity: M
- Files: src/pages/budget/index.astro or settings/categories flow
- Scope:
  - Add quick edit entry point (link or inline) for budget percentage/amount.
- Acceptance:
  - Edits persist and recalc totals/alerts.

## Tests and Docs

TEST-001 (P1) - Fix transaction service tests to avoid real DB

- Dependencies: TXN-007 (if auth affects tests)
- Effort: M
- Complexity: M
- Files: src/services/transaction.service.test.ts (+ helper/mocks)
- Scope:
  - Use module mocks or DI to isolate db and dependent services.
- Acceptance:
  - Tests run consistently without DB.

DOC-001 (P2) - OpenAPI audit for Phase 2 endpoints

- Dependencies: TXN-001..006, CAT-001, PAY-001, BUD-002..003
- Effort: S
- Complexity: S
- File: openapi.yml
- Scope:
  - Ensure all implemented endpoints and schemas are documented.
- Acceptance:
  - Spec matches actual API behavior.
