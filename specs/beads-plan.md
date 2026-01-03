# Personal Finance Manager - Beads Issue Tracking Plan

**Created:** January 3, 2026
**Based on:** requirements-specification.md & execution-plan.md

---

## Overview

This plan organizes all work into beads issues with proper dependencies and priorities. The structure follows the execution plan's 5 phases over 12 weeks.

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

## Phase 0: Design System & Setup (Week 1-2)

### Epic: Foundation Setup

**Type:** epic | **Priority:** P0 | **ID:** EPH-001

#### Tasks (in order):

1. **Design Tokens & Color System**
   - Define color palette (DaisyUI theme)
   - Typography scale, spacing, shadows
   - Design tokens file

2. **Core Atomic Components (Storybook)**
   - Button, Input, Label, Badge, Card
   - Loading spinner, Icons
   - Currency, Percentage, Date display components

3. **Project Initialization**
   - Bun + Astro project setup
   - Tailwind v4 + DaisyUI configuration
   - Storybook 8 setup
   - ESLint + Prettier + TypeScript

4. **Layout Components**
   - Main layout, Navigation (sidebar + mobile)
   - Header, Footer, Modal, Toast notifications

5. **Routing & Navigation**
   - Astro routing setup
   - Page stubs for all routes
   - Navigation state management

---

## Phase 1: Authentication & Dashboard (Week 3-4)

### Epic: Authentication System

**Type:** epic | **Priority:** P0 | **ID:** EPH-002

#### Features:

1. **Auth UI Components** → [depends on: EPH-001]
   - Login form (Storybook)
   - Registration form (Storybook)
   - Password input with show/hide
   - Form validation messages

2. **Database & Auth Setup** → [depends on: Auth UI Components]
   - Drizzle ORM setup
   - Users/Sessions schema
   - SQLite dev environment
   - Lucia Auth integration
   - Argon2id password hashing

3. **Authentication Service** → [depends on: Database & Auth Setup]
   - Register, Login, Logout services
   - Session management
   - Auth middleware

### Epic: Dashboard Homepage

**Type:** epic | **Priority:** P1 | **ID:** EPH-003

#### Features:

1. **Dashboard UI Components** → [depends on: EPH-001]
   - Summary cards (total assets, monthly spent)
   - Asset update todo list
   - Recent transactions list
   - Quick action buttons
   - Budget health widget

2. **Dashboard Data Layer** → [depends on: Dashboard UI Components]
   - Dashboard service
   - Aggregate queries
   - Mock data generators

3. **Dashboard Integration** → [depends on: Dashboard Data Layer, EPH-002]
   - Connect to real data
   - Loading/error states
   - User testing

---

## Phase 2: Transactions & Budget (Week 5-6)

### Epic: Transaction Management

**Type:** epic | **Priority:** P0 | **ID:** EPH-004

#### Features:

1. **Transaction UI Components** → [depends on: EPH-001]
   - Transaction form (Storybook)
   - Transaction list item
   - Filter & pagination components
   - CSV upload component

2. **Transaction Data Layer** → [depends on: EPH-002]
   - Categories schema
   - Payment methods schema
   - Transactions schema
   - CRUD service methods

3. **Transaction Features** → [depends on: Transaction Data Layer]
   - Category management page
   - Payment method management page
   - Add transaction page/modal
   - Transaction list with filters
   - Edit/delete functionality
   - CSV import

### Epic: Budget Management

**Type:** epic | **Priority:** P0 | **ID:** EPH-005

#### Features:

1. **Budget Table UI** → [depends on: EPH-001]
   - Budget overview table (replicate screenshot)
   - Color-coded rows (green/yellow/red)
   - Alert badges
   - Responsive design

2. **Budget Logic** → [depends on: EPH-004]
   - Budget calculation service
   - Alert detection (80%, 100% thresholds)
   - Aggregation queries

3. **Budget Pages** → [depends on: Budget Logic]
   - Budget overview page
   - Edit category budgets
   - Budget alert notifications
   - Historical budget view

---

## Phase 3: Assets & Multi-Currency (Week 7-8)

### Epic: Asset Management

**Type:** epic | **Priority:** P1 | **ID:** EPH-006

#### Features:

1. **Asset UI Components** → [depends on: EPH-001]
   - Asset card component
   - Asset form & update modal
   - Asset list with grouping (type, currency)
   - Priority indicators (red/yellow/green)

2. **Asset Data Layer** → [depends on: EPH-002]
   - Assets schema
   - Asset history schema
   - Update reminders schema
   - CRUD service methods

3. **Asset Features** → [depends on: Asset Data Layer]
   - Asset list page (grouped views)
   - Add/edit asset functionality
   - Update balance with history
   - Asset history view (chart + table)
   - Update todo list widget

### Epic: Multi-Currency Support

**Type:** epic | **Priority:** P1 | **ID:** EPH-007

#### Features:

1. **Currency UI Components** → [depends on: EPH-001]
   - Multi-currency display
   - Exchange rate form
   - Currency conversion widget
   - Currency selector

2. **Currency Data Layer** → [depends on: EPH-002]
   - Exchange rates schema
   - User settings schema
   - Currency conversion service

3. **Currency Features** → [depends on: Currency Data Layer, EPH-006]
   - Exchange rate management page
   - Primary currency setting
   - Dashboard multi-currency totals
   - Currency display preferences

---

## Phase 4: Analytics & Reports (Week 9-10)

### Epic: Charts & Visualizations

**Type:** epic | **Priority:** P2 | **ID:** EPH-008

#### Features:

1. **Chart Components** → [depends on: EPH-001]
   - Pie chart (expenses by category)
   - Bar chart (monthly comparison)
   - Line chart (trends)
   - Chart legend & tooltip
   - Responsive chart wrapper

2. **Reporting Service** → [depends on: EPH-004, EPH-005]
   - Monthly overview queries
   - Yearly overview queries
   - Category breakdown
   - Asset distribution
   - Date range filtering

3. **Reports Pages** → [depends on: Chart Components, Reporting Service]
   - Monthly overview page
   - Yearly overview page
   - Custom date range report
   - Category drill-down

### Epic: Financial Forecast

**Type:** epic | **Priority:** P2 | **ID:** EPH-009

#### Features:

1. **Forecast UI Components** → [depends on: EPH-001]
   - Forecast calculator form
   - Forecast table component
   - Projected vs actual comparison
   - Variance visualization

2. **Forecast Data Layer** → [depends on: EPH-006]
   - Asset snapshots schema
   - Snapshot items schema
   - Forecast calculation service

3. **Forecast Features** → [depends on: Forecast Data Layer]
   - Savings forecast calculator page
   - Monthly snapshot entry
   - Projected vs actual comparison
   - Variance analysis

---

## Phase 5: Calculators & Polish (Week 11-12)

### Epic: Calculators

**Type:** epic | **Priority:** P3 | **ID:** EPH-010

#### Features:

1. **Compound Interest Calculator** → [depends on: EPH-001]
   - Calculator UI component
   - Calculation service & tests
   - Year-by-year breakdown
   - Calculator page

### Epic: Polish & Testing

**Type:** epic | **Priority:** P0 | **ID:** EPH-011

#### Features:

1. **UI/UX Refinement** → [depends on: All previous epics]
   - Consistency review
   - Loading states & skeleton screens
   - Error messages improvement
   - WCAG 2.1 accessibility audit
   - Mobile responsive testing

2. **Performance Optimization** → [depends on: All previous epics]
   - Database query optimization
   - Component lazy loading
   - Image optimization
   - Code splitting

3. **Testing & Documentation** → [depends on: All previous epics]
   - Unit test coverage (80%+)
   - Integration testing
   - User documentation
   - Admin documentation

4. **Deployment** → [depends on: All previous epics]
   - Production environment setup
   - MySQL database setup
   - SSL configuration
   - Backup procedures
   - Monitoring setup

---

## Issue Creation Commands

### Epics (Phase Level)

```bash
bd create --title="Phase 0: Design System & Setup" --type=epic --priority=0
bd create --title="Phase 1: Authentication & Dashboard" --type=epic --priority=0
bd create --title="Phase 2: Transactions & Budget" --type=epic --priority=0
bd create --title="Phase 3: Assets & Multi-Currency" --type=epic --priority=1
bd create --title="Phase 4: Analytics & Reports" --type=epic --priority=2
bd create --title="Phase 5: Calculators & Polish" --type=epic --priority=0
```

### Features (Key Examples)

```bash
# Phase 0
bd create --title="Design Tokens & Color System" --type=task --priority=0
bd create --title="Core Atomic Components in Storybook" --type=task --priority=0
bd create --title="Project Initialization (Bun + Astro)" --type=task --priority=0
bd create --title="Layout Components" --type=task --priority=0

# Phase 1
bd create --title="Authentication UI Components" --type=feature --priority=0
bd create --title="Database & Auth Setup" --type=feature --priority=0
bd create --title="Dashboard UI Components" --type=feature --priority=1
bd create --title="Dashboard Integration" --type=feature --priority=1

# Phase 2
bd create --title="Transaction Management System" --type=feature --priority=0
bd create --title="Budget Overview Table" --type=feature --priority=0
bd create --title="Budget Alert System" --type=feature --priority=0

# Phase 3
bd create --title="Asset Management System" --type=feature --priority=1
bd create --title="Multi-Currency Support" --type=feature --priority=1
bd create --title="Exchange Rate Management" --type=feature --priority=1

# Phase 4
bd create --title="Charts & Visualizations" --type=feature --priority=2
bd create --title="Financial Forecast Calculator" --type=feature --priority=2

# Phase 5
bd create --title="Compound Interest Calculator" --type=feature --priority=3
bd create --title="UI/UX Refinement & Polish" --type=feature --priority=0
bd create --title="Performance Optimization" --type=feature --priority=1
bd create --title="Testing & Documentation" --type=feature --priority=0
bd create --title="Production Deployment" --type=feature --priority=0
```

---

## Dependency Graph

```
EPH-001 (Phase 0: Setup)
    ├─→ EPH-002 (Phase 1: Auth)
    │       ├─→ EPH-003 (Phase 1: Dashboard)
    │       └─→ EPH-004 (Phase 2: Transactions)
    │               ├─→ EPH-005 (Phase 2: Budget)
    │               └─→ EPH-006 (Phase 3: Assets)
    │                       └─→ EPH-007 (Phase 3: Currency)
    │                               ├─→ EPH-008 (Phase 4: Charts)
    │                               │       └─→ EPH-009 (Phase 4: Forecast)
    │                               │               └─→ EPH-010 (Phase 5: Calculators)
    │                               └─→ EPH-011 (Phase 5: Polish)
```

---

## Next Steps

1. Run issue creation commands (can parallelize with subagents)
2. Set up dependencies between issues
3. Start with Phase 0 issues (EPH-001 tasks)
4. Use `bd ready` to find workable tasks each day
5. Run `bd sync` after session work

---

**End of Beads Plan**
