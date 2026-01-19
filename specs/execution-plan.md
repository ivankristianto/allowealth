# Personal Finance Manager - Execution Plan

**Version:** 1.1
**Date:** January 19, 2026
**Project Duration:** 12 weeks (MVP)
**Approach:** UI/UX-First Development

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Development Approach](#development-approach)
3. [Project Phases](#project-phases)
4. [Detailed Sprint Plan](#detailed-sprint-plan)
5. [UI/UX Design Process](#uiux-design-process)
6. [Technical Implementation Strategy](#technical-implementation-strategy)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Plan](#deployment-plan)
9. [Risk Management](#risk-management)
10. [Success Metrics](#success-metrics)

---

## Executive Summary

This execution plan outlines a **UI/UX-first development approach** for building the Personal Finance Manager application. We prioritize user interface design and user experience validation before implementing backend logic.

### Key Principles

1. **Design First:** Create and validate all UI components before building features
2. **Iterative Development:** Build in small, testable increments
3. **Continuous Feedback:** Test with real users (you and family) throughout
4. **Component-Driven:** Build reusable components documented in Storybook
5. **Quality Over Speed:** Ensure each feature is polished before moving forward

### Timeline Overview

- **Phase 0:** Design System & Setup (Week 1-2)
- **Phase 1:** Core UI Components (Week 3-4)
- **Phase 2:** Transaction & Budget Features (Week 5-6)
- **Phase 3:** Assets & Analytics (Week 7-8)
- **Phase 4:** Forecasting & Reports (Week 9-10)
- **Phase 5:** Polish & Deployment (Week 11-12)

---

## Current Progress Status

**Last Updated:** January 19, 2026

### Overall Progress: ~70% Complete

| Phase                            | Status         | Completion | Notes                                                    |
| -------------------------------- | -------------- | ---------- | -------------------------------------------------------- |
| Phase 0: Design System & Setup   | ✅ Complete    | 100%       | All atomic components, layouts, routing done             |
| Phase 1: Auth & Dashboard        | ✅ Complete    | 100%       | Dashboard & User Settings fully functional               |
| Phase 2: Transactions & Budget   | 🚧 In Progress | 95%        | Budget editing & Transaction UX done. CSV Import pending |
| Phase 3: Assets & Multi-Currency | 🚧 In Progress | 60%        | Services done, pages need UI wiring                      |
| Phase 4: Analytics & Reports     | ❌ Not Started | 10%        | Schema done, no charts/reports implemented               |
| Phase 5: Calculators & Polish    | 🚧 Started     | 20%        | User profile & settings features pulled forward & done   |

### What's Working ✅

**User Management & Settings:**

- User registration, login, logout
- Password reset flow
- **Profile updates (Name, Email)**
- **Password change with security validation**
- **Primary currency configuration**
- **Session management with Lucia Auth**

**Dashboard:**

- Total assets display (IDR + USD with conversion)
- Monthly spending vs budget
- Budget health alerts
- Asset update reminders with priority indicators
- Recent transactions list

**Transactions:**

- Add/edit/delete transactions
- **Smart form with budget remaining display**
- **"Remember last used" category/payment method**
- Transaction list with filters (type, category, payment method, currency, date range, search)
- Pagination
- CSV export

**Budget:**

- Budget overview table with all categories
- Month navigation
- Currency switching (IDR/USD)
- Budget alerts (warning at 80%, exceeded at 100%)
- Budget history view
- CSV export
- **Inline Budget Edit (modal wired to API)**
- **Auto-calculation of budget percentage**

**Categories & Payment Methods:**

- Full CRUD operations
- Management pages at /settings/categories and /settings/payment-methods

### What Needs Work 🔧

**High Priority (P0):**

- **CSV Import** - UI exists but needs full API wiring
- **Asset Management Pages** - Service exists but no UI for adding/editing assets
- **Exchange Rate Management** - Page not implemented

**Medium Priority (P1):**

- Charts and visualizations
- Reports pages (monthly/yearly/custom)
- Forecast calculator
- Compound interest calculator

**Low Priority (P2):**

- Unit tests for older services (Dashboard)
- Deployment scripts
- Production environment setup

### Next Steps

1.  **CSV Import Integration** - Finish wiring the transaction CSV import feature.
2.  **Asset Management UI** - Implement the Add/Edit Asset pages and list views (Phase 3).
3.  **Exchange Rates** - Build the exchange rate management interface.

---

## Development Approach

### UI/UX-First Methodology

```
┌─────────────────────────────────────────────────────────┐
│                   Development Cycle                      │
└─────────────────────────────────────────────────────────┘

1. DESIGN
   ├── Wireframe the feature
   ├── Create high-fidelity mockup
   ├── Validate with user (you)
   └── Document interaction patterns
              ↓
2. BUILD COMPONENTS (Storybook)
   ├── Atoms (buttons, inputs)
   ├── Molecules (form fields, cards)
   ├── Organisms (forms, tables)
   └── Test all states
              ↓
3. IMPLEMENT LOGIC
   ├── Create data models
   ├── Build service layer
   ├── Write unit tests
   └── Connect to UI
              ↓
4. INTEGRATE & TEST
   ├── Connect components to data
   ├── Test user flows
   ├── Fix bugs
   └── Performance check
              ↓
5. VALIDATE & REFINE
   ├── User testing (daily use)
   ├── Gather feedback
   ├── Make adjustments
   └── Document learnings
              ↓
        [Repeat for next feature]
```

### Why UI/UX First?

**Benefits:**

- **Faster iterations:** No need to rebuild backend when UI changes
- **Better UX:** Focus on user experience without technical constraints
- **Component reuse:** Build once, use everywhere
- **Visual validation:** See progress immediately
- **Reduced waste:** Don't build features users don't need

**Example Flow:**
Instead of:

```
❌ Database → API → UI → "Oh, this doesn't work well"
```

We do:

```
✅ UI Design → Validation → Components → Backend → Integration
```

---

## Project Phases

### Phase 0: Design System & Project Setup (Week 1-2) ✅ **COMPLETE**

**Goal:** Establish design foundation and development environment

**Status:** All deliverables complete (20+ atomic components, full layout system, routing)

#### Week 1: Design System ✅

**Day 1-2: Design Tokens & Color System** ✅

- [x] Define color palette (DaisyUI theme customization)
- [x] Typography scale (font sizes, weights, line heights)
- [x] Spacing system (using Tailwind scale)
- [x] Border radius values
- [x] Shadow system
- [x] Create design tokens file

**Day 3-4: Core Atoms in Storybook** ✅

- [x] Button component (all variants, states)
- [x] Input component (text, number, date, select)
- [x] Label component
- [x] Badge component (for alerts)
- [x] Card component
- [x] Loading spinner
- [x] Icon system setup

**Day 5: Atomic Components** ✅

- [x] Currency display component
- [x] Percentage display component
- [x] Date picker component
- [x] Error message component
- [x] Empty state component

#### Week 2: Project Setup & Layout ✅

**Day 1-2: Development Environment** ✅

- [x] Initialize Bun + Astro project
- [x] Configure Tailwind v4 + DaisyUI
- [x] Set up Storybook 8
- [x] Configure TypeScript
- [x] Set up ESLint + Prettier
- [x] Create folder structure
- [x] Set up Git repository

**Day 3-4: Layout Components** ✅

- [x] Main layout template
- [x] Navigation component (sidebar + mobile)
- [x] Header component
- [x] Footer component
- [x] Page container component
- [x] Modal component
- [x] Toast notification component

**Day 5: Navigation & Routing** ✅

- [x] Set up Astro routing
- [x] Create all page stubs (empty pages)
- [x] Implement navigation state
- [x] Mobile menu functionality
- [x] Breadcrumb component

**Deliverables:** ✅

- ✅ Complete Storybook with all atoms documented
- ✅ Working layout with navigation
- ✅ Design system documentation
- ✅ Component usage guidelines

---

### Phase 1: Authentication & Dashboard (Week 3-4) ✅ **COMPLETE**

**Goal:** Create functional authentication and dashboard homepage

**Status:**

- ✅ Authentication system fully functional (login, register, password reset)
- ✅ Database schema complete (users, sessions, password-reset-tokens)
- ✅ Auth UI components complete with validation
- ✅ Dashboard UI components complete with Storybook stories
- ✅ Dashboard service fully implemented with aggregate queries
- ✅ Dashboard page fully wired to service
- ✅ User settings & profile management implemented (pulled from Phase 5)

#### Week 3: Authentication UI & Logic ✅ **COMPLETE**

**Day 1-2: Auth Forms in Storybook** ✅

- [x] Login form component
- [x] Registration form component
- [x] Password input with show/hide
- [x] Form validation messages
- [x] Loading states for forms
- [x] Success/error feedback

**Day 3: Database Setup** ✅

- [x] Install Drizzle ORM
- [x] Create database schema (users, sessions, password-reset-tokens)
- [x] Set up SQLite for development
- [x] Create migration scripts
- [x] Database connection module

**Day 4-5: Authentication Implementation** ✅

- [x] Set up Lucia Auth
- [x] Implement password hashing (Argon2id)
- [x] Create auth service (register, login, logout, forgot-password)
- [x] Create auth middleware
- [x] Session management
- [ ] Write unit tests for auth

#### Week 4: Dashboard Design & Implementation ✅ **COMPLETE**

**Day 1-2: Dashboard UI Components** ✅

- [x] Summary card component (total assets, monthly spent)
- [x] Asset update todo list component
- [x] Recent transactions list component
- [x] Quick action buttons
- [x] Budget health widget
- [x] All components in Storybook with mock data

**Day 3: Dashboard Data Layer** ✅

- [x] Create dashboard service
- [x] Implement aggregate queries for summaries (total assets, monthly spent)
- [x] Implement budget health queries with alerts
- [x] Implement asset update reminder calculations
- [x] Implement recent transactions query
- [x] Mock data generators for testing
- [ ] Unit tests for calculations

**Day 4-5: Dashboard Integration** ✅

- [x] Connect components to real data
- [x] Implement dashboard page (with auth protection)
- [x] Add loading states
- [x] Error handling with error boundary
- [x] Transform service data to component formats
- [x] Add responsive layout
- [ ] User testing & refinement

**Deliverables:**

- ✅ Working authentication system
- ✅ Dashboard fully functional with real data
- ✅ All components documented in Storybook
- ✅ User profile & settings functional

---

### Phase 2: Transactions & Budget (Week 5-6) 🚧 **95% COMPLETE**

**Goal:** Enable daily transaction entry and budget tracking

**Status:**

- ✅ Database schema complete (categories, payment-methods, transactions)
- ✅ TransactionService fully implemented (CRUD + CSV import/export)
- ✅ Transaction pages fully wired (list, add, edit)
- ✅ Transaction form enhanced with budget checks & history
- ✅ BudgetService fully implemented with all calculations
- ✅ Budget overview page fully wired with alerts
- ✅ Budget inline editing fully functional
- ✅ API endpoints implemented (transactions, budget, categories, payment-methods)
- ❌ CSV import page not fully implemented
- ❌ Unit tests for transaction/budget services pending

#### Week 5: Transaction Management ✅ **COMPLETE**

**Day 1-2: Transaction UI Components** ✅

- [x] Transaction form component (Storybook)
  - All input fields
  - Validation states
  - Success/error feedback
- [x] Transaction list item component
- [x] Transaction filter component
- [x] Pagination component (in TransactionList)
- [x] TransactionForm molecule component

**Day 3: Transaction Data Layer** ✅

- [x] Categories table schema
- [x] Payment methods table schema
- [x] Transactions table schema
- [x] Run migrations
- [x] TransactionService CRUD methods fully implemented
- [x] TransactionService.findAll with filters
- [x] TransactionService.count for pagination
- [x] TransactionService.importFromCSV
- [x] TransactionService.exportToCSV
- [ ] Unit tests

**Day 4-5: Transaction Features** ✅

- [x] Category management page (settings/categories)
- [x] Payment method management page (settings/payment-methods)
- [x] Add transaction page with budget display
- [x] Transaction list page with filters
- [x] Edit transaction page
- [x] CSV export page wired to API
- [ ] CSV import page (UI exists, needs API wiring)

#### Week 6: Budget Management ✅ **COMPLETE**

**Day 1-2: Budget Table UI** ✅

- [x] Budget overview table component (BudgetOverviewTable)
  - Replicate screenshot layout
  - Color-coded rows (ok/warning/exceeded)
  - Alert badges
  - Responsive design
  - Sortable columns
- [x] Budget alert component (in budget page)
- [x] Category edit modal (quick-edit-budget-modal)

**Day 3: Budget Logic** ✅

- [x] BudgetService calculation methods
- [x] Alert detection logic (80%, 100%, total > 100%)
- [x] Budget aggregation queries (getMonthlyOverview)
- [x] Category remaining calculation (getCategoryRemaining)
- [x] Budget history queries (getBudgetHistory)
- [x] Budget export to CSV
- [ ] Unit tests for calculations

**Day 4-5: Budget Pages** ✅

- [x] Budget overview page with currency selector
- [x] Month navigation (previous/next)
- [x] Budget alerts display section
- [x] Budget overview table with sorting
- [x] Historical budget view (budget/history page)
- [x] Edit category budgets (Modal wired to API)
- [ ] User testing & refinement

**Deliverables:**

- ✅ Transaction pages fully functional with smart features
- ✅ Transaction CRUD service complete
- ✅ Budget overview page fully functional with inline editing
- ✅ Budget calculations working
- ❌ CSV import not working

---

### Phase 3: Assets & Multi-Currency (Week 7-8) 🚧 **60% COMPLETE**

**Goal:** Track assets across currencies with update reminders

**Status:**

- ✅ Database schema complete (assets, asset-history, asset-update-reminders, exchange-rates, user-settings)
- ✅ AssetService fully implemented (CRUD, history, update tracking)
- ✅ Asset API endpoints implemented
- ✅ Asset update todo list UI component (for dashboard)
- ✅ Exchange rate conversion utility functions
- ✅ Multi-currency support in dashboard (IDR/USD)
- ❌ Asset management pages not implemented
- ❌ Exchange rate management page not implemented

#### Week 7: Asset Management 🚧 **60% COMPLETE**

**Day 1-2: Asset UI Components** 🚧

- [ ] Asset card component (Storybook)
- [ ] Asset form component
- [ ] Asset update modal
- [ ] Asset list with grouping (by type, currency)
- [x] Update todo list component (for dashboard)
- [x] Priority indicators (red/yellow/green)

**Day 3: Asset Data Layer** ✅

- [x] Assets table schema
- [x] Asset history table schema
- [x] Asset update reminders table schema
- [x] Run migrations
- [x] AssetService CRUD methods
- [x] Asset history tracking
- [x] Update reminder calculations
- [ ] Unit tests

**Day 4-5: Asset Features** 🚧

- [x] Asset list page (exists, needs data wiring)
- [ ] Add/edit asset functionality
- [ ] Update asset balance (creates history)
- [ ] Asset history view (chart + table)
- [x] Update todo list widget (functional in dashboard)
- [ ] Reminder frequency settings

#### Week 8: Multi-Currency & Exchange Rates 🚧 **50% COMPLETE**

**Day 1-2: Currency UI Components**

- [ ] Multi-currency display component
- [ ] Exchange rate form component
- [ ] Currency conversion widget
- [ ] Currency selector component

**Day 3: Currency Data Layer** ✅

- [x] Exchange rates table schema
- [x] User settings table schema
- [x] Run migrations
- [x] Currency conversion utility functions
- [x] Exchange rate service methods (getLatestExchangeRate)
- [ ] Unit tests

**Day 4-5: Currency Features** 🚧

- [ ] Exchange rate management page
- [x] Primary currency setting (API & UI done)
- [x] Dashboard with multi-currency totals (IDR/USD)
- [x] Converted total calculation
- [ ] Currency display preferences
- [ ] User testing & refinement

**Deliverables:**

- 🚧 Asset service complete, pages need wiring
- ✅ Multi-currency support working in dashboard
- ✅ Update reminders functional
- ✅ Asset history tracking service implemented

---

### Phase 4: Analytics & Reports (Week 9-10) 🚧 **10% COMPLETE**

**Goal:** Visualize financial data with charts and reports

**Status:**

- ✅ Asset snapshots database schema complete
- ✅ BudgetService includes CSV export functionality
- ✅ TransactionService includes CSV export functionality
- ❌ No chart components implemented
- ❌ No dedicated reporting service
- ❌ Forecast functionality not started

#### Week 9: Charts & Visualizations ❌ **NOT STARTED**

**Day 1-2: Chart Components (Storybook)**

- [ ] Pie chart component (expenses by category)
- [ ] Bar chart component (monthly comparison)
- [ ] Line chart component (trends)
- [ ] Chart legend component
- [ ] Chart tooltip component
- [ ] Responsive chart wrapper

**Day 3: Reporting Service**

- [ ] Monthly overview query
- [ ] Yearly overview query
- [ ] Category breakdown query
- [ ] Asset distribution query
- [ ] Date range filtering
- [ ] Unit tests

**Day 4-5: Reports Pages**

- [ ] Monthly overview page
  - Income breakdown (pie chart)
  - Expense breakdown (pie chart)
  - Net savings calculation
  - Top categories
- [ ] Yearly overview page
  - 12-month trend (line chart)
  - Category totals (table)
  - Asset position (start vs end)
  - Year-over-year comparison
- [ ] Custom date range report

#### Week 10: Financial Forecast 🚧 **10% COMPLETE**

**Day 1-2: Forecast UI Components**

- [ ] Forecast calculator form (Storybook)
- [ ] Forecast table component
- [ ] Projected vs actual comparison table
- [ ] Variance visualization
- [ ] Month snapshot entry form

**Day 3: Forecast Data Layer** ✅

- [x] Asset snapshots table schema
- [x] Asset snapshot items table schema
- [x] Run migrations
- [ ] Forecast calculation service
- [ ] Snapshot service
- [ ] Unit tests

**Day 4-5: Forecast Features** ❌

- [ ] Savings forecast calculator page
- [ ] Monthly snapshot entry
- [ ] Projected vs actual comparison page
- [ ] Variance analysis
- [ ] User testing & refinement

**Deliverables:**

- ✅ Budget and transaction CSV export working
- ❌ Charts not implemented
- ❌ Financial forecast functionality not started
- ❌ Snapshot tracking not implemented

---

### Phase 5: Calculators & Polish (Week 11-12) 🚧 **STARTED**

**Goal:** Add calculators and polish entire application

**Status:** User settings and profile management completed early.

#### Week 11: Calculators & Additional Features 🚧

**Day 1-2: Calculator UI**

- [ ] Compound interest calculator component
- [ ] Calculator result display
- [ ] Year-by-year breakdown table
- [ ] Calculator form validation

**Day 3: Calculator Logic**

- [ ] Compound interest calculation service
- [ ] Monthly contribution calculations
- [ ] Result formatting
- [ ] Unit tests

**Day 4-5: Final Features**

- [ ] Compound interest calculator page
- [x] CSV export functionality (transactions, budgets)
- [x] User settings page (API & UI done)
- [x] Profile management (API & UI done)
- [x] Password change (API & UI done)
- [ ] Data export/backup

#### Week 12: Polish & Testing ❌

**Day 1-2: UI/UX Refinement**

- [ ] Review all pages for consistency
- [ ] Fix alignment/spacing issues
- [ ] Improve loading states
- [ ] Add skeleton screens
- [ ] Enhance error messages
- [ ] Accessibility audit (WCAG 2.1)
- [ ] Mobile responsive testing

**Day 3: Performance Optimization**

- [ ] Optimize database queries
- [ ] Add database indexes
- [ ] Lazy load components
- [ ] Optimize images
- [ ] Code splitting
- [ ] Performance testing

**Day 4: Testing & Documentation**

- [ ] Write missing unit tests
- [ ] Integration testing
- [ ] User acceptance testing
- [ ] Create user documentation
- [ ] Create admin documentation
- [ ] API documentation (for future)

**Day 5: Deployment Preparation**

- [ ] Production environment setup
- [ ] MySQL database setup
- [ ] Environment variable configuration
- [ ] SSL certificate setup
- [ ] Deployment scripts
- [ ] Backup procedures

**Deliverables:**

- ❌ Complete, polished application
- ❌ All features working end-to-end
- ❌ Comprehensive test coverage
- ❌ Production-ready deployment
- ❌ Documentation complete

---

## UI/UX Design Process

### Design Workflow for Each Feature

```
1. DISCOVER
   └── Understand user need
   └── Review existing patterns
   └── Research best practices

2. SKETCH
   └── Quick wireframes (paper or Figma)
   └── Explore 2-3 layout options
   └── Get feedback

3. DESIGN
   └── High-fidelity mockup in Figma
   └── Define all states (default, hover, active, error, loading)
   └── Annotate interactions
   └── Validate with user

4. BUILD IN STORYBOOK
   └── Create component in isolation
   └── Implement all states
   └── Add documentation
   └── Test accessibility
   └── Get approval

5. INTEGRATE
   └── Use component in feature
   └── Connect to real data
   └── Test in context
   └── Refine as needed
```

### Design Tools

**Figma (Optional but Recommended):**

- Create mockups before coding
- Maintain design system
- Share with stakeholders
- Export assets

**Storybook (Required):**

- Component playground
- Documentation
- Visual regression testing
- Shareable component library

**Browser DevTools:**

- Test responsive layouts
- Inspect accessibility
- Performance profiling
- Debug issues

### User Testing Protocol

**Daily Use Testing:**

- You (Ivan) use the app daily for real transactions
- Note any friction points
- Test on both desktop and mobile
- Track time to complete tasks

**Weekly Reviews:**

- Review week's transactions
- Check budget accuracy
- Test asset updates
- Validate reports

**Feature Validation:**

- Before marking feature "done", use it for 3 days
- Have family member test (if applicable)
- Fix critical issues
- Document known limitations

---

## Technical Implementation Strategy

### Folder Structure

```
finance-app/
├── src/
│   ├── components/          # React components
│   │   ├── atoms/
│   │   ├── molecules/
│   │   ├── organisms/
│   │   └── templates/
│   ├── pages/              # Astro pages (routes)
│   ├── layouts/            # Page layouts
│   ├── services/           # Business logic
│   │   ├── auth.service.ts
│   │   ├── transaction.service.ts
│   │   ├── budget.service.ts
│   │   ├── asset.service.ts
│   │   └── ...
│   ├── db/                 # Database
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   └── connection.ts
│   ├── lib/                # Utilities
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── constants.ts
│   ├── types/              # TypeScript types
│   └── stores/             # State management (Zustand/Nanostores)
├── .storybook/             # Storybook config
├── stories/                # Component stories
├── tests/                  # Test files
│   ├── unit/
│   └── integration/
├── public/                 # Static assets
└── scripts/                # Build/deploy scripts
```

### Development Workflow

**Daily Routine:**

1. Pull latest changes
2. Run `bun dev` (start dev server)
3. Run `bun storybook` (component development)
4. Work on current sprint task
5. Write unit tests
6. Commit with descriptive message
7. Push to Git

**Git Workflow:**

- Main branch: `main` (always deployable)
- Feature branches: `feature/transaction-form`
- Commit messages: Conventional Commits format
- PR review before merge (self-review for solo)

**Code Quality Checklist:**

- [ ] TypeScript types defined
- [ ] Component documented in Storybook
- [ ] Unit tests written and passing
- [ ] ESLint/Prettier passing
- [ ] Accessibility checked
- [ ] Mobile responsive
- [ ] Loading/error states handled

### Database Migration Strategy

**Development (SQLite):**

```bash
# Create migration
bun run db:generate

# Apply migration
bun run db:migrate

# Seed test data
bun run db:seed
```

**Production (MySQL):**

```bash
# Backup before migration
bun run db:backup

# Run migration
NODE_ENV=production bun run db:migrate

# Verify data integrity
bun run db:verify
```

**Migration Checklist:**

- [ ] Test migration on dev database
- [ ] Backup production database
- [ ] Run migration on staging (if available)
- [ ] Monitor for errors
- [ ] Verify data integrity
- [ ] Rollback plan ready

---

## Testing Strategy

### Unit Testing

**What to Test:**

- Service methods (business logic)
- Utility functions
- Validation schemas
- Calculation functions
- Data transformations

**Testing Framework:** Bun test + Vitest

**Example Test:**

```typescript
describe('BudgetService', () => {
  it('should calculate budget alerts correctly', () => {
    const budget = 1000000;
    const spent = 850000;
    const result = calculateBudgetStatus(budget, spent);

    expect(result.percentage).toBe(85);
    expect(result.status).toBe('warning'); // >= 80%
  });

  it('should detect exceeded budget', () => {
    const budget = 1000000;
    const spent = 1200000;
    const result = calculateBudgetStatus(budget, spent);

    expect(result.status).toBe('exceeded');
    expect(result.overage).toBe(200000);
  });
});
```

**Test Coverage Goal:** 80% minimum

### Component Testing

**What to Test:**

- Props validation
- User interactions
- Conditional rendering
- Accessibility (ARIA labels, keyboard nav)

**Testing Framework:** Vitest + Testing Library

**Example Test:**

```typescript
describe('TransactionForm', () => {
  it('should validate amount is positive', async () => {
    const { getByLabelText, getByText } = render(<TransactionForm />);
    const amountInput = getByLabelText('Amount');

    await userEvent.type(amountInput, '-100');
    await userEvent.click(getByText('Save'));

    expect(getByText('Amount must be greater than 0')).toBeInTheDocument();
  });

  it('should show budget remaining for expense categories', async () => {
    const { getByLabelText, getByText } = render(<TransactionForm />);
    const categorySelect = getByLabelText('Category');

    await userEvent.selectOptions(categorySelect, 'Food & Groceries');

    expect(getByText(/Budget remaining:/)).toBeInTheDocument();
  });
});
```

### Integration Testing

**User Flows to Test:**

1. **Registration → Login → Dashboard**
2. **Add Category → Add Transaction → View Budget**
3. **Add Asset → Update Balance → View Dashboard**
4. **Set Budget → Add Expenses → Check Alerts**
5. **Create Forecast → Add Snapshot → Compare**

**Testing Framework:** Playwright (optional, Phase 2)

### Manual Testing Checklist

**Before Each Release:**

- [ ] All pages load without errors
- [ ] Forms submit correctly
- [ ] Validation works as expected
- [ ] Loading states display
- [ ] Error messages are clear
- [ ] Mobile layout correct
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Data persists correctly
- [ ] Calculations accurate

---

## Deployment Plan

### Development Environment

**Local Development:**

```bash
# Install dependencies
bun install

# Start dev server
bun dev

# Start Storybook
bun storybook

# Run tests
bun test

# Run linter
bun lint
```

**Environment Variables (.env.development):**

```
NODE_ENV=development
DATABASE_URL=file:./dev.db
SESSION_SECRET=dev-secret-change-in-production
PORT=4321
```

### Production Environment

**Server Requirements:**

- VPS or dedicated server
- Ubuntu 22.04 LTS or later
- Minimum 2GB RAM, 2 CPU cores
- 20GB storage (expandable)
- Nginx or Caddy reverse proxy
- MySQL 8.x

**Production Setup:**

1. **Install Dependencies:**

   ```bash
   # Install Bun
   curl -fsSL https://bun.sh/install | bash

   # Install MySQL
   sudo apt install mysql-server

   # Install Nginx
   sudo apt install nginx
   ```

2. **Clone Repository:**

   ```bash
   git clone <repository-url>
   cd finance-app
   bun install --production
   ```

3. **Configure Database:**

   ```bash
   mysql -u root -p
   CREATE DATABASE finance_app;
   CREATE USER 'finance_user'@'localhost' IDENTIFIED BY 'secure_password';
   GRANT ALL ON finance_app.* TO 'finance_user'@'localhost';
   ```

4. **Environment Variables (.env.production):**

   ```
   NODE_ENV=production
   DATABASE_URL=mysql://finance_user:secure_password@localhost:3306/finance_app
   SESSION_SECRET=<generate-secure-random-string>
   PORT=3000
   DOMAIN=finance.yourdomain.com
   ```

5. **Run Migrations:**

   ```bash
   NODE_ENV=production bun run db:migrate
   ```

6. **Build Application:**

   ```bash
   bun run build
   ```

7. **Process Manager (PM2):**

   ```bash
   npm install -g pm2
   pm2 start bun --name finance-app -- run start
   pm2 startup
   pm2 save
   ```

8. **Nginx Configuration:**

   ```nginx
   server {
       listen 80;
       server_name finance.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

9. **SSL Certificate (Let's Encrypt):**

   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d finance.yourdomain.com
   ```

10. **Firewall:**
    ```bash
    sudo ufw allow 22    # SSH
    sudo ufw allow 80    # HTTP
    sudo ufw allow 443   # HTTPS
    sudo ufw enable
    ```

### Backup Strategy

**Database Backups:**

```bash
# Daily automated backup
0 2 * * * /usr/local/bin/backup-db.sh

# backup-db.sh:
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u finance_user -p finance_app > /backups/db_$DATE.sql
find /backups -name "db_*.sql" -mtime +7 -delete  # Keep 7 days
```

**File Backups:**

- User-uploaded CSV files
- Exported reports
- Application logs

**Backup Storage:**

- Local: 7 days
- Offsite: AWS S3 or similar (optional)

### Monitoring

**Application Monitoring:**

- PM2 logs: `pm2 logs finance-app`
- Error tracking: Sentry (Phase 2)
- Uptime monitoring: UptimeRobot (Phase 2)

**Database Monitoring:**

- Slow query log enabled
- Connection pool monitoring
- Disk space alerts

**Server Monitoring:**

- CPU/RAM usage
- Disk space
- Network traffic

---

## Risk Management

### Potential Risks & Mitigation

#### Risk 1: Scope Creep

**Impact:** High  
**Probability:** Medium

**Mitigation:**

- Strict adherence to MVP feature list
- "Nice to have" features documented for Phase 2
- Weekly scope review
- Time-box each sprint

#### Risk 2: UI/UX Changes Mid-Development

**Impact:** Medium  
**Probability:** High

**Mitigation:**

- Design in Storybook first (low cost to change)
- User validation before backend implementation
- Component-driven architecture (easy to swap)
- Accept that some iteration is healthy

#### Risk 3: Database Performance Issues

**Impact:** High  
**Probability:** Low

**Mitigation:**

- Proper indexing from start
- Pagination on all lists
- Performance testing with large datasets
- Query optimization before production

#### Risk 4: Security Vulnerabilities

**Impact:** Critical  
**Probability:** Low

**Mitigation:**

- Follow OWASP best practices
- Use established libraries (Lucia Auth, Argon2id)
- Regular security audits
- Dependency updates
- Penetration testing before public release

#### Risk 5: Data Loss

**Impact:** Critical  
**Probability:** Low

**Mitigation:**

- Automated daily backups
- Soft deletes (data not removed immediately)
- Database transaction rollbacks
- Backup restoration testing

#### Risk 6: Browser Compatibility

**Impact:** Medium  
**Probability:** Low

**Mitigation:**

- Modern browser targets (last 2 versions)
- Progressive enhancement
- Graceful degradation
- Testing on Chrome, Firefox, Safari, Edge

#### Risk 7: Mobile Usability Issues

**Impact:** Medium  
**Probability:** Medium

**Mitigation:**

- Mobile-first design approach
- Regular testing on actual devices
- Touch-friendly UI elements (min 44x44px)
- Responsive design validation

---

## Success Metrics

### MVP Success Criteria

**Functional Completeness:**

- [ ] All Phase 1-5 features implemented
- [ ] All user flows working end-to-end
- [ ] Zero critical bugs
- [ ] < 5 minor bugs

**Performance:**

- [ ] Dashboard loads in < 2 seconds
- [ ] Forms submit in < 500ms
- [ ] All pages mobile responsive
- [ ] Lighthouse score > 90

**Code Quality:**

- [ ] 80%+ test coverage
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] All components documented in Storybook

**User Experience:**

- [ ] Transaction entry takes < 2 minutes
- [ ] Daily use is sustainable (tested over 2 weeks)
- [ ] No confusion on any UI element
- [ ] Mobile experience equals desktop

**Security:**

- [ ] All passwords hashed with Argon2id
- [ ] HTTPS enforced
- [ ] CSRF protection working
- [ ] SQL injection tests passing

### Post-MVP Metrics (Ongoing)

**Usage Metrics:**

- Daily active users
- Transactions per user per week
- Time spent in app per session
- Feature adoption rate

**Performance Metrics:**

- Average page load time
- API response times
- Database query times
- Error rate (< 1%)

**User Satisfaction:**

- Task completion rate
- Feature requests (prioritize for Phase 2)
- Bug reports (fix within 1 week)
- User feedback (qualitative)

---

## Sprint Breakdown (2-Week Sprints)

### Sprint 0: Foundation (Week 1-2)

**Focus:** Design system & project setup

**Goals:**

- Complete design system
- All atoms in Storybook
- Development environment ready
- Navigation working

**Daily Tasks:**

- Day 1: Color palette, typography
- Day 2: Spacing, shadows, buttons
- Day 3: Inputs, labels, badges
- Day 4: Cards, spinners, icons
- Day 5: Project setup (Bun, Astro, Tailwind)
- Day 6: Storybook configuration
- Day 7: Layout components
- Day 8: Navigation component
- Day 9: Modal, toast notifications
- Day 10: Documentation & review

**Definition of Done:**

- [ ] 15+ atoms in Storybook
- [ ] All atoms documented
- [ ] Project compiles without errors
- [ ] Navigation works on desktop/mobile
- [ ] Git repository set up

---

### Sprint 1: Auth & Dashboard (Week 3-4)

**Focus:** User authentication & dashboard

**Goals:**

- Users can register/login
- Dashboard displays summary data
- Components in Storybook

**Daily Tasks:**

- Day 1: Login form (Storybook)
- Day 2: Registration form (Storybook)
- Day 3: Database schema (users, sessions)
- Day 4: Auth service & Lucia setup
- Day 5: Auth pages (login, register)
- Day 6: Dashboard summary cards (Storybook)
- Day 7: Todo list component (Storybook)
- Day 8: Dashboard service & queries
- Day 9: Dashboard page integration
- Day 10: Testing & polish

**Definition of Done:**

- [ ] User can register & login
- [ ] Session persists across reloads
- [ ] Dashboard shows mock summaries
- [ ] All components in Storybook
- [ ] Unit tests passing

---

### Sprint 2: Transactions (Week 5-6)

**Focus:** Transaction entry & management

**Goals:**

- Users can add/edit/delete transactions
- Categories and payment methods manageable
- CSV import working

**Daily Tasks:**

- Day 1: Transaction form (Storybook)
- Day 2: Transaction list item (Storybook)
- Day 3: Category/payment method schema
- Day 4: Transaction schema & migrations
- Day 5: Transaction service (CRUD)
- Day 6: Category management page
- Day 7: Add transaction page
- Day 8: Transaction list page
- Day 9: CSV import feature
- Day 10: Testing & refinement

**Definition of Done:**

- [ ] Full transaction CRUD working
- [ ] CSV import functional
- [ ] Categories & payment methods manageable
- [ ] Budget calculations accurate
- [ ] Daily use validated (3 days)

---

### Sprint 3: Budget (Week 5-6 continued)

**Focus:** Budget overview & alerts

**Goals:**

- Budget table matches screenshot
- Alerts working (80%, 100%)
- Monthly budget view

**Daily Tasks:**

- Day 1: Budget table component (Storybook)
- Day 2: Budget alert component
- Day 3: Budget calculation service
- Day 4: Budget overview page
- Day 5: Alert detection & display
- Day 6: Edit category budgets
- Day 7: Historical budget view
- Day 8: Mobile responsive table
- Day 9: Testing with real data
- Day 10: User testing & fixes

**Definition of Done:**

- [ ] Budget table identical to screenshot
- [ ] Alerts display correctly
- [ ] Budget edits update immediately
- [ ] Mobile layout works
- [ ] Calculations verified

---

### Sprint 4: Assets (Week 7-8)

**Focus:** Asset tracking & reminders

**Goals:**

- Users can track assets
- Update reminders working
- Multi-currency display

**Daily Tasks:**

- Day 1: Asset card component (Storybook)
- Day 2: Asset form & update modal
- Day 3: Asset schema & migrations
- Day 4: Asset service & history
- Day 5: Asset list page (grouped)
- Day 6: Add/edit asset functionality
- Day 7: Update todo list widget
- Day 8: Asset history chart
- Day 9: Reminder frequency settings
- Day 10: Testing & polish

**Definition of Done:**

- [ ] Asset CRUD working
- [ ] Update reminders display
- [ ] History tracking functional
- [ ] Grouping by type/currency works
- [ ] Todo list updates correctly

---

### Sprint 5: Multi-Currency (Week 7-8 continued)

**Focus:** Currency handling & exchange rates

**Goals:**

- Multi-currency display working
- Exchange rates manageable
- Conversions accurate

**Daily Tasks:**

- Day 1: Multi-currency display component
- Day 2: Exchange rate form
- Day 3: Exchange rate schema & migrations
- Day 4: Currency service & conversions
- Day 5: Exchange rate management page
- Day 6: Dashboard multi-currency view
- Day 7: User settings (primary currency)
- Day 8: Currency preferences
- Day 9: Testing conversions
- Day 10: User testing & refinement

**Definition of Done:**

- [ ] Exchange rates editable
- [ ] Conversions accurate
- [ ] Dashboard shows both currencies
- [ ] Primary currency setting works
- [ ] All displays consistent

---

### Sprint 6: Reports & Charts (Week 9-10)

**Focus:** Analytics and visualizations

**Goals:**

- Charts display correctly
- Monthly/yearly reports working
- Data accurate

**Daily Tasks:**

- Day 1: Pie chart component (Storybook)
- Day 2: Line chart component
- Day 3: Chart wrapper & legend
- Day 4: Reporting service & queries
- Day 5: Monthly overview page
- Day 6: Yearly overview page
- Day 7: Custom date range report
- Day 8: Chart responsiveness
- Day 9: Category drill-down
- Day 10: Testing & polish

**Definition of Done:**

- [ ] All charts working
- [ ] Reports accurate
- [ ] Charts responsive
- [ ] Drill-down functional
- [ ] Export to CSV (optional)

---

### Sprint 7: Forecast (Week 9-10 continued)

**Focus:** Financial forecasting

**Goals:**

- Forecast calculator working
- Snapshots trackable
- Comparison view functional

**Daily Tasks:**

- Day 1: Forecast form (Storybook)
- Day 2: Forecast table component
- Day 3: Snapshot schema & migrations
- Day 4: Forecast calculation service
- Day 5: Forecast calculator page
- Day 6: Snapshot entry form
- Day 7: Projected vs actual page
- Day 8: Variance visualization
- Day 9: Testing calculations
- Day 10: User testing & refinement

**Definition of Done:**

- [ ] Forecast calculations accurate
- [ ] Snapshots save correctly
- [ ] Comparison view works
- [ ] Variance displays correctly
- [ ] Math validated

---

### Sprint 8: Calculators & Polish (Week 11-12)

**Focus:** Final features and refinement

**Goals:**

- Compound interest calculator working
- All pages polished
- App production-ready

**Daily Tasks:**

- Day 1: Calculator component (Storybook)
- Day 2: Calculator service & tests
- Day 3: Calculator page
- Day 4: User settings page
- Day 5: Profile management
- Day 6: CSV export
- Day 7: UI consistency review
- Day 8: Accessibility audit
- Day 9: Performance optimization
- Day 10: Mobile testing

**Definition of Done:**

- [ ] Calculator functional
- [ ] All settings editable
- [ ] CSV export working
- [ ] UI consistent across app
- [ ] WCAG 2.1 AA compliance

---

### Sprint 9: Testing & Deployment (Week 11-12 continued)

**Focus:** Testing, documentation, deployment

**Goals:**

- All tests passing
- Documentation complete
- App deployed to production

**Daily Tasks:**

- Day 1: Write missing unit tests
- Day 2: Integration testing
- Day 3: User acceptance testing
- Day 4: Create user docs
- Day 5: Create admin docs
- Day 6: Production environment setup
- Day 7: Database migration to MySQL
- Day 8: Deploy to server
- Day 9: SSL setup & monitoring
- Day 10: Final verification & launch

**Definition of Done:**

- [ ] 80%+ test coverage
- [ ] All tests passing
- [ ] Documentation complete
- [ ] App running in production
- [ ] Backups configured
- [ ] SSL working
- [ ] Monitoring active

---

## Daily Standup Template

**What did I accomplish yesterday?**

- [List completed tasks]

**What will I work on today?**

- [List planned tasks]

**Any blockers or challenges?**

- [List issues, if any]

**UI/UX feedback from testing:**

- [Note any usability issues]

---

## Weekly Review Template

**Completed this week:**

- [ ] Feature X completed
- [ ] Component Y in Storybook
- [ ] Tests written for Z

**User testing insights:**

- What worked well?
- What needs improvement?
- Any unexpected issues?

**Next week's focus:**

- Sprint goal
- Key deliverables
- Potential challenges

**Metrics:**

- Code coverage: X%
- Storybook components: X
- Pages completed: X of Y

---

## Appendix

### A. Useful Commands

**Development:**

```bash
bun dev              # Start dev server
bun storybook        # Start Storybook
bun test             # Run tests
bun test:watch       # Watch mode
bun lint             # Lint code
bun format           # Format code
```

**Database:**

```bash
bun db:generate      # Generate migration
bun db:migrate       # Run migrations
bun db:studio        # Open Drizzle Studio
bun db:seed          # Seed test data
bun db:reset         # Reset database
```

**Build:**

```bash
bun run build        # Production build
bun run preview      # Preview production build
bun run start        # Start production server
```

### B. Resources

**Documentation:**

- [Astro Docs](https://docs.astro.build)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [DaisyUI](https://daisyui.com/components)
- [Drizzle ORM](https://orm.drizzle.team/docs)
- [Lucia Auth](https://lucia-auth.com)
- [Storybook](https://storybook.js.org/docs)

**Design Inspiration:**

- [Dribbble - Finance Apps](https://dribbble.com/search/finance-app)
- [Mobbin - Finance Category](https://mobbin.com/browse/ios/apps?category=finance)
- [Really Good UX - Banking](https://reallygoodux.io/categories/banking)

**Component Libraries (Reference):**

- [shadcn/ui](https://ui.shadcn.com)
- [Headless UI](https://headlessui.com)
- [Radix UI](https://www.radix-ui.com)

### C. Checklist: Before Going Live

**Pre-Launch Checklist:**

- [ ] All MVP features complete and tested
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Mobile responsive on all pages
- [ ] Error handling in place
- [ ] Loading states on all async operations
- [ ] Empty states for all lists/pages
- [ ] Form validation comprehensive
- [ ] Database indexed properly
- [ ] Backups configured and tested
- [ ] SSL certificate installed
- [ ] Environment variables secured
- [ ] Monitoring set up
- [ ] Documentation complete
- [ ] User tested for 2+ weeks
- [ ] No critical or high-priority bugs
- [ ] Production environment tested
- [ ] Rollback plan documented
- [ ] Post-launch support plan ready

**Post-Launch:**

- [ ] Monitor error logs daily (first week)
- [ ] Track performance metrics
- [ ] Gather user feedback
- [ ] Plan Phase 2 features
- [ ] Schedule regular backups verification
- [ ] Update documentation based on learnings

---

## Conclusion

This execution plan provides a **structured, UI/UX-first approach** to building your Personal Finance Manager. By prioritizing design and user experience validation before implementation, we ensure that the final product is not only functional but delightful to use.

**Key Takeaways:**

1. **Design in Storybook first** - validate UI before building logic
2. **Iterate quickly** - small sprints, frequent testing
3. **Test with real data** - use the app daily during development
4. **Maintain quality** - never skip tests or accessibility checks
5. **Document everything** - future you will thank present you

**Remember:** This is a living document. Adjust timelines and priorities based on what you learn during development. The goal is a polished MVP that solves your real needs, not checking off boxes.

Good luck, and enjoy building! 🚀

---

**End of Execution Plan**
