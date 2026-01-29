# Reports Backend Integration Plan

**Version:** 1.3.0
**Date:** 2026-01-29
**Status:** ✅ Complete (Phase 1 ✅ | Phase 2 ✅ | Phase 3 ✅ | Phase 4 ✅)

## Executive Summary

Wire the Report pages (monthly/yearly) to backend data sources. Currently using hardcoded mock data. UI/UX layer is complete and follows the interactive pages architecture (002-interactive-pages.md). Need to build service and API layers.

**Scope:** Backend integration only. No UI changes required.

## Current State

### Existing (Complete)

- ✅ Interactive UI with ReportSelector (monthly/yearly toggle)
- ✅ Client-side orchestration (ReportsPage.client.ts)
- ✅ HTML injection renderer (ReportsRenderer.client.ts)
- ✅ Three partials (summary, charts, table)
- ✅ Category drill-down modal

### Built (Phase 1 & 2 Complete)

- ✅ ReportService class (`src/services/report.service.ts`)
- ✅ GET /api/reports endpoint (dual JSON/HTML response)
- ✅ GET /api/reports/category-transactions endpoint
- ✅ Unit tests for ReportService (>80% coverage)
- ✅ Integration tests for both API endpoints (18 test cases)
- ✅ Code review completed (0 P0/P1 security issues)
- ✅ Quality gates passed (lint, format, typecheck)

### Completed (All Phases)

- ✅ Wired src/pages/reports/index.astro to backend API
- ✅ OpenAPI documentation (8 schemas + paths file)
- ✅ Removed deprecated files (yearly.astro, custom.astro)
- ✅ P1 code quality fixes (4 issues resolved)

### To Remove (Phase 3)

- 🗑️ src/pages/reports/yearly.astro (use ?range=yearly instead)
- ✅ src/pages/reports/custom.astro (REMOVED in Phase 1)

## File Structure

```
CREATED (Phase 1 & 2):
├── ✅ src/services/report.service.ts              # Core aggregation logic
├── ✅ src/services/report.service.test.ts         # Unit tests
├── ✅ src/pages/api/reports/index.ts              # Main API endpoint
├── ✅ src/pages/api/reports/category-transactions.ts
└── ✅ src/pages/api/reports/reports.api.integration.test.ts

UPDATED (Phase 1):
└── ✅ src/services/index.ts                       # Exported reportService

TO UPDATE (Phase 3 & 4):
├── ⏳ src/pages/reports/index.astro               # Remove mock data
├── ⏳ openapi/paths/reports.yml                   # API docs
└── ⏳ openapi.yml                                 # Add $ref

DELETED (Phase 1):
└── ✅ src/pages/reports/custom.astro

TO DELETE (Phase 3):
└── ⏳ src/pages/reports/yearly.astro
```

## Data Structure

### Monthly Report

```typescript
{
  totalIncome: string; // Sum for month
  totalExpenses: string; // Sum for month
  netSavings: string; // income - expenses
  budgetHealth: number; // % spent vs budget
  expenseCategories: number; // Count of categories
  expenseByCategory: Array<{
    // Top categories for donut chart
    name: string;
    value: string;
  }>;
  trendData: Array<{
    // Trailing 3 months for bar chart
    name: string; // "Jan", "Feb", "Mar"
    income: string;
    expenses: string;
  }>;
  categoryIntelligence: Array<{
    // Category table
    id: string;
    name: string;
    spent: string;
    budgetLimit: string | null;
    icon: string;
  }>;
}
```

### Yearly Report

Same structure as monthly, but:

- Aggregates full year data
- trendData shows 12 months instead of 3

## API Contract

### GET /api/reports

**Query Params:**

- `range`: 'monthly' | 'yearly' (required)
- `period`: '2024-02' | '2024' (required, format depends on range)
- `_render`: 'json' | 'html' (optional, default: 'json')
- `_partial`: 'all' | 'summary' | 'charts' | 'table' (optional)

**Response (JSON):**

```json
{
  "success": true,
  "data": {
    /* ReportData */
  }
}
```

**Response (HTML):**

```html
<!-- PARTIAL:summary -->
<div class="grid...">...</div>
<!-- PARTIAL:charts -->
<div class="grid...">...</div>
<!-- PARTIAL:table -->
<div data-category-table>...</div>
```

### GET /api/reports/category-transactions

**Query Params:**

- `categoryId`: string (required)
- `period`: string (required)
- `range`: 'monthly' | 'yearly' (required)

**Response:**

```json
{
  "success": true,
  "data": {
    "transactions": [/* Transaction[] */],
    "total": number,
    "categoryName": string
  }
}
```

## Security Checklist

| Risk                         | Severity  | Mitigation                                  |
| ---------------------------- | --------- | ------------------------------------------- |
| Data leakage (wrong userId)  | 🔴 HIGH   | Always filter by userId from auth context   |
| SQL injection (period param) | 🟡 MEDIUM | Zod schema validation: `/^\d{4}(-\d{2})?$/` |
| Invalid dates                | 🟡 MEDIUM | Validate month (1-12), year (2000-2100)     |
| Category access control      | 🟡 MEDIUM | Join categories table, filter by user_id    |
| Decimal precision            | 🟢 LOW    | Use decimal utils, never JS float math      |
| HTML injection               | 🟢 LOW    | Astro auto-escapes (verify chart labels)    |

**Required Pattern:**

```typescript
export const GET: APIRoute = async (context) => {
  // 1. Authenticate
  const userId = getAuthenticatedUser(context);

  // 2. Validate input
  const params = schema.parse(/* ... */);

  // 3. Call service with userId
  const data = await reportService.getReport(userId, params);

  // 4. Return response
  return render.json(data);
};
```

## Implementation Phases

### Phase 1: Service Layer ✅ COMPLETE

- [x] #1 - Audit current architecture
- [x] #2 - Create ReportService class
- [x] #10 - Export from services/index.ts
- [x] #11 - Write unit tests (>80% coverage)
- [x] #6 - Remove custom.astro

**Status:** ✅ Complete - Service layer fully implemented with comprehensive unit tests

### Phase 2: API Layer ✅ COMPLETE

- [x] #30 - Create /api/reports endpoint (JSON + HTML dual response)
- [x] #31 - Create /api/reports/category-transactions endpoint
- [x] #32 - Quality gates (lint, stylelint, format, typecheck)
- [x] #33 - Code review (0 P0/P1 issues, P2/P3 documented)
- [x] #34 - Write integration tests (18 test cases)
- [x] #35 - Run tests and fix issues

**Status:** ✅ Complete - API endpoints production-ready with security validation

**Security Review Results:**

- 🟢 0 Critical (P0) vulnerabilities
- 🟢 0 Important (P1) issues
- 📝 P2/P3 improvements documented in code TODOs

**Quality Gates:** All passed ✅

- ESLint: No errors
- Stylelint: No errors
- Prettier: All files formatted
- TypeScript: 0 errors
- No bun: imports in production code

### Phase 3: UI Integration ✅ COMPLETE

- [x] #4 - Wire index.astro to backend API
- [x] #5 - Remove yearly.astro
- [x] #22 - Update client-side code to use backend API
- [x] #23 - Remove deprecated page files

**Status:** ✅ Complete - UI successfully wired to backend with type safety and error handling

**Quality Review Results:**

- 🟢 0 Critical (P0) vulnerabilities
- 🟢 0 Important (P1) issues (all fixed)
- 📝 P2/P3 improvements documented in code TODOs

**P1 Fixes Applied:**

1. Added explicit type annotations (ReportData type import)
2. Implemented safeParseDecimal helper for decimal parsing
3. Refactored to event delegation pattern (eliminated memory leaks)

**Quality Gates:** All passed ✅

- ESLint: No errors
- Prettier: All files formatted
- TypeScript: 0 errors

### Phase 4: Polish ✅ COMPLETE

- [x] #44 - Create OpenAPI schemas (8 files)
- [x] #45 - Create OpenAPI paths for reports endpoints
- [x] #46 - Update main openapi.yml with reports references
- [x] #47 - Replace custom sr-only CSS with Tailwind
- [x] #48 - Run final quality gates
- [x] #49 - Final code review checkpoint
- [x] #51-54 - Fix all P1 issues from code review
- [x] #55 - Second code review (verified fixes)
- [ ] #56 - Update OpenAPI docs with missing error codes (follow-up)

**Status:** ✅ Complete - All core tasks finished, 1 minor documentation follow-up

## Design Decisions

| Decision            | Choice                                   | Rationale                                       |
| ------------------- | ---------------------------------------- | ----------------------------------------------- |
| Yearly view routing | `/reports?range=yearly`                  | Reuses interactive architecture, no duplication |
| Trend chart period  | 3 months (monthly)<br>12 months (yearly) | Good visual balance, sufficient context         |
| Custom date range   | Not implemented                          | Monthly + yearly cover 90% of use cases         |
| Currency handling   | User's primary currency                  | Consistent with dashboard, simpler UX           |

## References

- [Interactive Pages Architecture](../architecture/002-interactive-pages.md)
- [Development Constitution](../constitution.md)
- Existing pattern: `src/services/dashboard.service.ts`
- API pattern: `src/pages/api/budget/alerts.ts`

## Success Criteria

### Completed ✅

- [x] **Phase 1 & 2:** Service layer and API endpoints implemented
- [x] **Security:** All quality gates pass (lint, typecheck, format)
- [x] **Testing:** Unit tests coverage >80%
- [x] **Testing:** Integration tests for both endpoints (18 test cases)
- [x] **Security:** Code review completed (0 P0/P1 issues)
- [x] **Security:** Authentication enforced on all endpoints
- [x] **Security:** SQL injection prevention (parameterized queries)
- [x] **Security:** Input validation (regex, range checks)
- [x] **Security:** User data isolation (userId filtering)
- [x] **Security:** Category access control validated

### Phase 3 & 4 Completion ✅

- [x] **Phase 3:** No hardcoded data in report pages
- [x] **Phase 3:** ReportSelector switches between monthly/yearly
- [x] **Phase 3:** Category drill-down modal shows real transactions
- [x] **Phase 4:** OpenAPI docs created (8 schemas + paths file)
- [x] **Phase 4:** P1 code quality issues fixed (4 issues)
- [ ] **Follow-up:** Complete OpenAPI error code documentation (P1.5)

## Implementation Summary

### Phase 1: Service Layer (Complete ✅)

**Files Created:**

- `src/services/report.service.ts` - Core business logic
- `src/services/report.service.test.ts` - Comprehensive unit tests

**Key Features:**

- Monthly and yearly report aggregation
- Category transaction drill-down
- Decimal precision for all currency calculations
- Budget health percentage calculations
- Trend data generation (3 months for monthly, 12 for yearly)
- Category intelligence with budget limits
- Proper error handling with safe defaults

**Test Coverage:** >80%

### Phase 2: API Layer (Complete ✅)

**Files Created:**

- `src/pages/api/reports/index.ts` - Main reports endpoint
- `src/pages/api/reports/category-transactions.ts` - Drill-down endpoint
- `src/pages/api/reports/reports.api.integration.test.ts` - Integration tests

**Key Features:**

- Dual response format (JSON + HTML partials)
- Comprehensive input validation
- Authentication enforcement
- SQL injection prevention
- Format-aware error responses
- Partial rendering support (summary, charts, table)

**Security Validation:**

- ✅ 0 P0 (Critical) vulnerabilities
- ✅ 0 P1 (Important) issues
- ✅ All inputs validated
- ✅ All queries filtered by userId
- ✅ Category ownership enforced

**Test Coverage:** 18 integration test cases

### Phase 3: UI Integration (Complete ✅)

**Files Modified:**

- `src/pages/reports/index.astro` - Wired to backend API
- `src/components/organisms/ReportsPage.client.ts` - Dynamic period generation
- Deleted: `src/pages/reports/yearly.astro`

**Key Changes:**

- Replaced hardcoded mock data with backend API integration
- Added authentication check and redirect for unauthenticated users
- Implemented dynamic period generation (12 months for monthly, 4 years for yearly)
- Implemented safeParseDecimal helper for type-safe decimal parsing
- Refactored to event delegation pattern to eliminate memory leaks
- Removed deprecated yearly.astro file

**Quality Review Results:**

- 🟢 0 Critical (P0) vulnerabilities
- 🟢 0 Important (P1) issues (all fixed during review)
- 📝 P2/P3 improvements documented in code TODOs

**Quality Gates:** All passed ✅

- ESLint: No errors
- Prettier: All files formatted
- TypeScript: 0 errors

### Phase 4: Polish & Code Quality (Complete ✅)

**Files Created:**

- `openapi/schemas/CategoryExpense.yml`
- `openapi/schemas/TrendDataPoint.yml`
- `openapi/schemas/CategoryIntelligence.yml`
- `openapi/schemas/ReportData.yml`
- `openapi/schemas/ReportResponse.yml`
- `openapi/schemas/CategoryTransaction.yml`
- `openapi/schemas/CategoryTransactionsData.yml`
- `openapi/schemas/CategoryTransactionsResponse.yml`
- `openapi/paths/reports.yml`
- `src/lib/utils/period-validation.ts`

**Files Modified:**

- `openapi.yml` - Added Reports tag and 10 path/schema references
- `src/styles/globals.css` - Removed custom sr-only CSS
- `src/components/organisms/SpendingChart.astro` - Removed custom sr-only CSS
- `src/components/organisms/ResourceAllocationChart.astro` - Removed custom sr-only CSS
- `src/components/organisms/FinancialVelocityChart.astro` - Removed custom sr-only CSS
- `src/lib/utils/decimal.ts` - Added safeParseDecimal utility
- `src/pages/api/reports/index.ts` - Added error codes, period validation utility
- `src/pages/api/reports/category-transactions.ts` - Added error codes, period validation utility
- `src/services/report.service.ts` - Using shared period validation utility
- `src/pages/reports/index.astro` - Using shared safeParseDecimal utility

**P1 Fixes Applied:**

1. **safeParseDecimal Utility** - Extracted to shared utility for consistent error handling
2. **Period Validation Utility** - Created shared utility to eliminate code duplication (3 files)
3. **Error Codes** - Added 18 error codes across 2 API endpoints (INVALID_RANGE, MISSING_PERIOD, INVALID_PERIOD_FORMAT, INVALID_MONTH, INVALID_YEAR, INVALID_CURRENCY, INVALID_PARTIAL, MISSING_CATEGORY_ID, CATEGORY_NOT_FOUND, UNAUTHORIZED, INTERNAL_ERROR)
4. **\_partial Parameter Validation** - Added explicit validation with type-safe enum

**Code Review Results:**

- 🟢 0 Critical (P0) vulnerabilities
- 🟢 0 Important (P1) issues (all fixed)
- 📝 2 P1.5 improvements identified (OpenAPI docs, error mapping refactoring)

**Quality Gates:** All passed ✅

- ESLint: No errors
- Stylelint: No errors
- Prettier: All files formatted
- TypeScript: 0 errors

### Follow-up Items

**P1.5 Priority:**

- Update OpenAPI documentation with 5 missing error codes (Task #56)
