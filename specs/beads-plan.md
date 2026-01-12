# Personal Finance Manager - Beads Issue Tracking Plan

**Updated:** January 12, 2026
**Based on:** requirements-specification.md & execution-plan.md
**Current Phase:** Phase 1 (Authentication & Dashboard) - 80% Complete

---

## Overview

This plan organizes all remaining work into beads issues with proper dependencies and priorities. The structure reflects actual progress made and what remains to complete the MVP.

### Priority Levels (Beads Format)

- **P0** (0): Critical - blocks other work or release
- **P1** (1): High - core features
- **P2** (2): Medium - important features
- **P3** (3): Low - nice-to-have
- **P4** (4): Backlog - future work

### Issue Types

- **epic**: Large phase-level initiatives
- **feature**: Major functionality areas
- **task**: Specific implementation work
- **bug**: Defects (created as needed)

---

## Current Status Summary

| Phase                                   | Status         | Completion |
| --------------------------------------- | -------------- | ---------- |
| **Phase 0: Design System & Setup**      | ✅ Complete    | 100%       |
| **Phase 1: Authentication & Dashboard** | 🚧 In Progress | 80%        |
| **Phase 2: Transactions & Budget**      | 🚧 Started     | 20%        |
| **Phase 3: Assets & Multi-Currency**    | 🚧 Started     | 20%        |
| **Phase 4: Analytics & Reports**        | ❌ Not Started | 5%         |
| **Phase 5: Calculators & Polish**       | ❌ Not Started | 0%         |

---

## Phase 1: Authentication & Dashboard (IN PROGRESS)

### ✅ Completed (No Action Needed)

- Database schema (users, sessions, password-reset-tokens)
- Authentication UI (LoginForm, RegistrationForm, ForgotPasswordForm)
- Auth service (register, login, logout, forgot-password)
- Lucia Auth integration with Argon2id
- Session middleware and protected routes
- Dashboard UI components (SummaryCards, AssetUpdateTodoList, RecentTransactionsList)
- Dashboard page with auth protection

### 🚧 Remaining Work

#### 1. Dashboard Service Implementation → [P0] **BLOCKING**

**ID:** expenses-dash-service
**Type:** task | **Priority:** P0

**Tasks:**

- Implement `dashboardService.getDashboardData(userId)` with:
  - Total assets calculation (by currency + converted)
  - This month's total spending
  - Budget health alerts count
  - Recent transactions (last 5)
  - Asset update todo list
- Write unit tests for calculations
- Add mock data generator for development

**Dependencies:** None

---

#### 2. Quality Gates Setup → [P1] **IN PROGRESS**

**ID:** expenses-quality-gates
**Type:** task | **Priority:** P1

**Current Beads:**

- expenses-d1e (P1) - Implement Astro type checking
- expenses-57u (P0) - Fix test infrastructure - dependency injection
- expenses-7n5 (P1) - ESLint 100% pass
- expenses-c5t (P1) - Prettier 100% pass
- expenses-3zz (P1) - Test suite 100% pass
- expenses-786 (P1) - GitHub Actions for quality gates

**Tasks:**

- Fix TypeScript errors in test files
- Implement dependency injection for tests
- Configure CI pipeline
- Ensure all quality gates pass before commits

---

## Phase 2: Transactions & Budget (20% Complete)

### ✅ Completed

- Database schema (categories, payment-methods, transactions)
- Transaction form UI component (TransactionForm)
- Transaction list item component
- API endpoint stubs

### 🚧 Remaining Work

#### 3. Transaction Service Implementation → [P0] **BLOCKING**

**ID:** expenses-txn-service
**Type:** feature | **Priority:** P0
**Depends on:** expenses-quality-gates

**Tasks:**

- Implement transaction CRUD operations:
  - `createTransaction(userId, data)` - with validation
  - `getTransactions(userId, filters)` - with pagination
  - `getTransactionById(id, userId)`
  - `updateTransaction(id, userId, data)`
  - `deleteTransaction(id, userId)` - soft delete
- Budget recalculation after transaction
- CSV import validation and processing
- Unit tests for all operations

---

#### 4. Transaction List Page → [P0]

**ID:** expenses-txn-list
**Type:** feature | **Priority:** P0
**Depends on:** expenses-txn-service

**Tasks:**

- Implement transaction list with filters:
  - Date range picker
  - Category filter
  - Payment method filter
  - Type filter (income/expense)
  - Search by description
- Pagination (50 per page)
- Click to edit/delete
- Export to CSV

---

#### 5. Category & Payment Method Management → [P1]

**ID:** expenses-categories
**Type:** feature | **Priority:** P1
**Depends on:** expenses-quality-gates

**Tasks:**

- Category management page:
  - List all categories
  - Add/edit/delete categories
  - Set budget percentage or amount
  - Mark as active/inactive
- Payment method management page:
  - List all payment methods
  - Add/edit/delete payment methods
  - Set as default
  - Mark as active/inactive

---

#### 6. Budget Overview Table → [P0] **HIGH PRIORITY**

**ID:** expenses-budget-table
**Type:** feature | **Priority:** P0
**Depends on:** expenses-categories

**Tasks:**

- Budget calculation service:
  - Budget vs actual spending per category
  - Balance calculation
  - Alert detection (80% warning, 100% exceeded)
- Budget overview page (replicate screenshot):
  - Table with No, Category, %, Budget, Expense, Balance
  - Color-coded rows (green/yellow/red)
  - Alert badges
  - Responsive design (cards on mobile)
- Historical budget view

---

## Phase 3: Assets & Multi-Currency (20% Complete)

### ✅ Completed

- Database schema (assets, asset-history, asset-update-reminders, exchange-rates, user-settings)
- Asset update todo list UI component (for dashboard)
- API endpoint stubs

### 🚧 Remaining Work

#### 7. Asset Service Implementation → [P0]

**ID:** expenses-asset-service
**Type:** feature | **Priority:** P0
**Depends on:** expenses-quality-gates

**Tasks:**

- Implement asset CRUD operations:
  - `createAsset(userId, data)`
  - `getAssets(userId)` - grouped by type/currency
  - `getAssetById(id, userId)`
  - `updateAsset(id, userId, data)`
  - `deleteAsset(id, userId)`
- Asset balance update with history tracking
- Asset update reminder calculation
- Unit tests

---

#### 8. Asset Management Pages → [P1]

**ID:** expenses-asset-pages
**Type:** feature | **Priority:** P1
**Depends on:** expenses-asset-service

**Tasks:**

- Asset list page:
  - Group by currency view
  - Group by type view
  - Total calculations (IDR, USD, converted)
  - Click to add/edit asset
- Add/edit asset modal:
  - Name, type, balance, currency
  - Notes
  - Reminder frequency
- Asset history page:
  - Balance over time chart
  - History table

---

#### 9. Exchange Rate & Currency Service → [P1]

**ID:** expenses-currency-service
**Type:** feature | **Priority:** P1
**Depends on:** expenses-quality-gates

**Tasks:**

- Exchange rate service:
  - `addExchangeRate(from, to, rate, effectiveDate)`
  - `getExchangeRate(from, to, date)` - get latest before date
  - `convertAmount(amount, from, to, date)`
  - Exchange rate history
- User settings service:
  - Set primary currency
  - Display preferences
- Exchange rate management page
- Update dashboard with multi-currency totals

---

## Phase 4: Analytics & Reports (5% Complete)

### ✅ Completed

- Database schema (asset-snapshots, asset-snapshot-items)

### 🚧 Remaining Work

#### 10. Chart Components → [P2]

**ID:** expenses-chart-components
**Type:** feature | **Priority:** P2
**Depends on:** EPH-001 (Phase 0 Complete)

**Tasks:**

- Pie chart component (expenses by category)
- Bar chart component (monthly comparison)
- Line chart component (trends over time)
- Chart legend and tooltip
- Responsive chart wrapper
- All components in Storybook

---

#### 11. Reporting Service → [P2]

**ID:** expenses-reports-service
**Type:** feature | **Priority:** P2
**Depends on:** expenses-txn-service, expenses-budget-table

**Tasks:**

- Monthly overview query:
  - Total income by category
  - Total expenses by category
  - Net savings
  - Budget adherence
- Yearly overview query:
  - 12-month trend
  - Category totals
  - Asset position start/end
- Category breakdown query
- Date range filtering

---

#### 12. Reports Pages → [P2]

**ID:** expenses-reports-pages
**Type:** feature | **Priority:** P2
**Depends on:** expenses-reports-service, expenses-chart-components

**Tasks:**

- Monthly overview page with charts
- Yearly overview page with trends
- Custom date range report
- Category drill-down (click to view transactions)

---

#### 13. Financial Forecast → [P2]

**ID:** expenses-forecast
**Type:** feature | **Priority:** P2
**Depends on:** expenses-asset-service

**Tasks:**

- Forecast calculation service:
  - Compound interest with monthly contributions
  - Month-by-month projection
- Snapshot service:
  - Create monthly snapshot
  - Get snapshots for user
  - Projected vs actual comparison
- Savings forecast calculator page
- Monthly snapshot entry form
- Projected vs actual comparison page

---

## Phase 5: Calculators & Polish (Not Started)

### 🚧 Remaining Work

#### 14. Compound Interest Calculator → [P3]

**ID:** expenses-calculator
**Type:** feature | **Priority:** P3
**Depends on:** EPH-001 (Phase 0 Complete)

**Tasks:**

- Calculator UI component (Storybook)
- Calculation service & tests
- Year-by-year breakdown table
- Calculator page

---

#### 15. User Settings & Profile → [P1]

**ID:** expenses-user-settings
**Type:** feature | **Priority:** P1
**Depends on:** expenses-quality-gates

**Tasks:**

- User profile page:
  - Update name, email
  - Change password
- Settings page:
  - Primary currency
  - Display preferences (show converted, show individual)
  - Category management
  - Payment method management

---

#### 16. UI/UX Refinement → [P0]

**ID:** expenses-ui-polish
**Type:** feature | **Priority:** P0
**Depends on:** All features complete

**Tasks:**

- Consistency review across all pages
- Loading states & skeleton screens
- Error messages improvement
- WCAG 2.1 accessibility audit
- Mobile responsive testing
- Empty states for all lists/pages

---

#### 17. Performance Optimization → [P1]

**ID:** expenses-performance
**Type:** feature | **Priority:** P1
**Depends on:** expenses-ui-polish

**Tasks:**

- Database query optimization
- Add missing database indexes
- Component lazy loading
- Image optimization
- Code splitting
- Performance testing

---

#### 18. Testing & Documentation → [P0]

**ID:** expenses-testing-docs
**Type:** feature | **Priority:** P0
**Depends on:** All features complete

**Tasks:**

- Write missing unit tests (80%+ coverage)
- Integration testing for key flows
- User documentation
- Admin documentation
- API documentation (OpenAPI spec)

---

#### 19. Production Deployment → [P0]

**ID:** expenses-deployment
**Type:** feature | **Priority:** P0
**Depends on:** expenses-testing-docs

**Tasks:**

- Production environment setup
- MySQL database configuration
- Environment variable setup
- SSL certificate (Let's Encrypt)
- Deployment scripts
- Backup procedures
- Monitoring setup

---

## Dependency Graph

```
expenses-quality-gates (CI/CD + Type fixes)
    ├─→ expenses-dash-service (Dashboard data)
    │       └─→ (Dashboard complete)
    ├─→ expenses-txn-service (Transaction CRUD)
    │       ├─→ expenses-txn-list (Transaction list page)
    │       └─→ expenses-categories (Category/Payment mgmt)
    │               └─→ expenses-budget-table (Budget overview)
    │                       └─→ expenses-reports-service (Reports)
    ├─→ expenses-asset-service (Asset CRUD)
    │       ├─→ expenses-asset-pages (Asset pages)
    │       ├─→ expenses-currency-service (Currency)
    │       └─→ expenses-forecast (Forecast)
    └─→ expenses-user-settings (Settings)

expenses-chart-components
    └─→ expenses-reports-service
            └─→ expenses-reports-pages

expenses-calculator (Standalone)

expenses-ui-polish (All features → Polish)
    └─→ expenses-performance
            └─→ expenses-testing-docs
                    └─→ expenses-deployment
```

---

## Immediate Next Steps (Priority Order)

1. **expenses-quality-gates** - Fix CI/CD and type checking (IN PROGRESS)
2. **expenses-dash-service** - Complete dashboard for first "real" data view
3. **expenses-txn-service** - Enable daily transaction entry (CORE FEATURE)
4. **expenses-budget-table** - Budget tracking (CORE FEATURE)
5. **expenses-categories** - Category/payment management for transactions

---

## Beads Commands to Run

### Create New Issues

```bash
# Dashboard completion
bd create --title="Implement dashboard service with real data" --type=task --priority=0

# Transaction management
bd create --title="Implement transaction service CRUD operations" --type=feature --priority=0
bd create --title="Build transaction list page with filters" --type=feature --priority=0
bd create --title="Create category and payment method management pages" --type=feature --priority=1

# Budget management
bd create --title="Build budget overview table (replicate screenshot)" --type=feature --priority=0
bd create --title="Implement budget calculation and alert service" --type=feature --priority=0

# Asset management
bd create --title="Implement asset service CRUD operations" --type=feature --priority=0
bd create --title="Build asset management pages" --type=feature --priority=1
bd create --title="Implement exchange rate and currency service" --type=feature --priority=1

# Reports & analytics
bd create --title="Create chart components (pie, bar, line)" --type=feature --priority=2
bd create --title="Implement reporting service" --type=feature --priority=2
bd create --title="Build reports pages" --type=feature --priority=2
bd create --title="Implement financial forecast calculator" --type=feature --priority=2

# Final polish
bd create --title="UI/UX refinement and polish" --type=feature --priority=0
bd create --title="Performance optimization" --type=feature --priority=1
bd create --title="Testing and documentation" --type=feature --priority=0
bd create --title="Production deployment" --type=feature --priority=0
```

### Set Up Dependencies

```bash
# After creating issues, set up dependencies
# Example: transactions depend on quality gates
bd dep add expenses-txn-service expenses-quality-gates

# Budget depends on categories and transactions
bd dep add expenses-budget-table expenses-categories
bd dep add expenses-budget-table expenses-txn-service

# Reports depend on transactions and budget
bd dep add expenses-reports-service expenses-txn-service
bd dep add expenses-reports-service expenses-budget-table

# Polish depends on all features
bd dep add expenses-ui-polish expenses-reports-pages
bd dep add expenses-ui-polish expenses-forecast
```

---

## Current Open Beads (Actionable Now)

Check current status with:

```bash
bd ready          # Show unblocked tasks
bd show <id>      # View details
bd update <id> --status in_progress  # Claim work
```

---

**End of Updated Beads Plan**
