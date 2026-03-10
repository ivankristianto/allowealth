# Personal Finance Manager - Requirements Specification

**Version:** 1.0  
**Date:** January 3, 2026  
**Author:** Ivan (Human Made)  
**Project Type:** Personal/Family Financial Application (MVP → Public SaaS)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Vision](#product-vision)
3. [User Personas](#user-personas)
4. [User Experience Requirements](#user-experience-requirements)
5. [Functional Requirements](#functional-requirements)
6. [Technical Requirements](#technical-requirements)
7. [Data Models](#data-models)
8. [Security Requirements](#security-requirements)
9. [Performance Requirements](#performance-requirements)
10. [Future Considerations](#future-considerations)

---

## Executive Summary

A self-hosted personal finance management application designed for families to track expenses, income, assets, and budgets across multiple currencies (IDR & USD). The system prioritizes user experience with a clean, intuitive interface while maintaining flexibility for future growth into a public SaaS platform.

**Core Value Proposition:**

- Comprehensive financial tracking in one place
- Multi-currency support (IDR/USD)
- Budget management with soft limits and visual alerts
- Financial forecasting with actual vs. projected tracking
- Beautiful, user-friendly interface built on modern web standards

---

## Product Vision

### Primary Goals

1. Provide a **delightful daily financial tracking experience**
2. Enable **informed financial decisions** through clear visualizations
3. Reduce **cognitive load** with smart defaults and helpful nudges
4. Build for **family collaboration** while maintaining individual clarity
5. Create a **scalable foundation** for future public release

### Design Philosophy

- **Clarity over complexity:** Every screen should have a clear purpose
- **Data entry should be fast:** Optimize for daily use patterns
- **Visual feedback is immediate:** Users should always know their status
- **Respectful of user time:** No unnecessary clicks or navigation
- **Progressive disclosure:** Advanced features don't clutter basic workflows

---

## User Personas

### Primary Persona: Ivan (Family Financial Manager)

**Background:**

- Technical professional working at Human Made
- Manages family finances across multiple accounts and currencies
- Currently uses spreadsheets (as evidenced by budget screenshot)
- Makes daily financial entries
- Needs to track 20+ budget categories
- Has assets in IDR and USD

**Goals:**

- Quick daily transaction entry (< 2 minutes)
- Clear visibility of budget status at a glance
- Track asset growth over time
- Plan future savings with forecasting tools
- Monitor family spending patterns

**Pain Points:**

- Spreadsheets require manual calculations
- No visual alerts for budget overruns
- Difficult to track assets across currencies
- Manual exchange rate updates are tedious
- No historical trend analysis

**Technical Comfort:** High (comfortable with CLI, APIs, automation)

### Secondary Persona: Family Members

**Background:**

- Other adults in household who share financial responsibilities
- May be less technically inclined
- Need to enter their own transactions
- Want to see overall family financial health

**Goals:**

- Simple transaction entry
- Understand budget status
- See their contribution to household finances

**Pain Points:**

- Don't want to learn complex systems
- Need mobile access for on-the-go entry
- Want reassurance they're entering data correctly

---

## User Experience Requirements

### UX-1: Information Architecture

```
Dashboard (Home)
├── Financial Summary
│   ├── Total Assets (by currency + converted)
│   ├── This Month's Budget Status
│   ├── Asset Update Todo List
│   └── Quick Actions (Add Transaction, Add Income)
│
├── Transactions
│   ├── Transaction List (filterable)
│   ├── Add Transaction
│   ├── Import from CSV
│   └── Monthly View
│
├── Budget
│   ├── Current Month Overview (table view)
│   ├── Budget Alerts
│   ├── Category Management
│   └── Historical Comparison
│
├── Assets
│   ├── Asset List (grouped by type)
│   ├── Add/Update Assets
│   ├── Asset History Charts
│   ├── Monthly Snapshot Entry
│   └── Distribution Charts
│
├── Reports
│   ├── Monthly Overview
│   ├── Yearly Overview
│   ├── Custom Date Range
│   └── Category Breakdown Charts
│
├── Forecast
│   ├── Savings Forecast Calculator
│   ├── Projected vs Actual Comparison
│   └── Goal Tracking
│
├── Calculators
│   ├── Compound Interest
│   └── (Future: Loan, Deposit, etc.)
│
└── Settings
    ├── Profile
    ├── Categories
    ├── Payment Methods
    ├── Exchange Rates
    ├── Preferences (currency, display options)
    └── Data Import/Export
```

### UX-2: Design System Requirements

#### Color Palette (using DaisyUI themes)

**Primary Actions:** Financial growth (green tones)
**Warnings:** Budget alerts (yellow/orange)
**Errors:** Over budget (red)
**Neutral:** Data display (gray scale)
**Success:** Confirmations (green)

#### Typography Hierarchy

- **Display:** Dashboard totals, key metrics (large, bold)
- **Heading 1:** Page titles
- **Heading 2:** Section headers
- **Heading 3:** Card titles
- **Body:** Regular content
- **Small:** Meta information, timestamps
- **Mono:** Currency values, numbers

#### Spacing System (Tailwind)

- Consistent use of Tailwind spacing scale
- Cards: p-6 (24px padding)
- Sections: gap-8 (32px between major sections)
- Forms: gap-4 (16px between fields)

#### Component States

Every interactive component must have:

- Default state
- Hover state
- Active/pressed state
- Disabled state
- Loading state
- Error state (for forms)

### UX-3: Navigation Requirements

#### Primary Navigation (Sidebar/Top Nav)

- Always visible on desktop
- Collapsible on mobile (hamburger menu)
- Active state clearly indicated
- Keyboard navigable (tab order)

#### Breadcrumbs

- Show current location in hierarchy
- Clickable path back to parent pages
- Optional for MVP, recommended for Phase 2

#### Quick Actions

- Floating action button (FAB) for "Add Transaction" on mobile
- Keyboard shortcuts for power users (Phase 2)
  - `N` - New transaction
  - `I` - New income
  - `A` - Add asset
  - `/` - Focus search

### UX-4: Dashboard Requirements

**Purpose:** Give users immediate financial status at a glance

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Dashboard                                    [Settings] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Welcome back, Ivan!                    January 2026    │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Total Assets │  │ This Month   │  │ Budget       │ │
│  │              │  │ Spent        │  │ Health       │ │
│  │ IDR: 100M    │  │ 40.6M / 101M │  │ ⚠️ 2 alerts  │ │
│  │ USD: 5,000   │  │              │  │              │ │
│  │ ─────────    │  │ [Progress]   │  │ [View →]     │ │
│  │ ~105M IDR    │  │ 40% used     │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📋 Asset Updates Needed                         │   │
│  │ ─────────────────────────────────────────────── │   │
│  │ 🔴 BCA Mutual Fund    (45 days since update)    │   │
│  │ 🟡 Crypto Wallet      (18 days since update)    │   │
│  │ 🟢 BCA Savings        (Updated yesterday)       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Quick Actions                                   │   │
│  │ [+ Add Expense]  [+ Add Income]  [📊 Reports]   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Recent Transactions                       [All→] │   │
│  │ ─────────────────────────────────────────────── │   │
│  │ Jan 3  Food & Groceries     -250,000 IDR  Cash  │   │
│  │ Jan 2  Reina Expenses    -2,800,000 IDR  BCA    │   │
│  │ Jan 1  Monthly Salary   +15,000,000 IDR  Bank   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Requirements:**

- Total assets displayed in both individual currencies AND converted total
- Quick glance at monthly budget status
- Visual priority indicators (🔴🟡🟢) for asset updates
- Budget alerts badge count (with ability to click through)
- Recent transactions (last 5) with quick view
- Quick action buttons for common tasks
- Responsive grid layout (3 columns → 1 column on mobile)

### UX-5: Transaction Entry Flow

**Design Principle:** Optimize for speed and accuracy

**Form Layout (Modal or Page):**

```
Add Transaction
─────────────────────────────────────────
Type:        ( ) Expense  (•) Income

Date:        [Jan 3, 2026  ▼]           Today shortcut

Amount:      [IDR] [____________] .00    Large input field
                                         Number pad on mobile

Category:    [Food & Groceries  ▼]      Searchable dropdown
                                         Show budget remaining

Payment:     [Cash              ▼]      Recent methods first

Description: [Weekly groceries shopping]
             (Optional)

             [Cancel]  [Save Transaction]
─────────────────────────────────────────

✓ Autofocus on amount field
✓ Tab order: Type → Date → Amount → Category → Payment → Description
✓ Enter key submits form
✓ Success message: "Transaction saved! Budget remaining: 5.75M IDR"
```

**Smart Features:**

- Remember last used category/payment method per transaction type
- Show budget remaining for expense categories
- Quick date picker with "Today", "Yesterday" shortcuts
- Category autocomplete/search
- Validate amount > 0
- Show running total for the day (optional)

### UX-6: Budget Overview Table

**Requirement:** Replicate and enhance the spreadsheet experience from the screenshot

**Desktop View:**

```
Budget Overview - January 2026                    [Edit Categories]
────────────────────────────────────────────────────────────────────
No  Category         %      Budget (IDR)   Expense (IDR)   Balance
────────────────────────────────────────────────────────────────────
1   Holiday          9.00%  10,000,000.00      0.00        10,000,000.00
2   Food & Groceries 5.00%   6,000,000.00    250,000.00     5,750,000.00
3   Dine Out         0.90%   1,000,000.00      0.00         1,000,000.00
...
17  Belanja Rumah    0.00%     500,000.00  1,679,000.00 ⚠️  -1,179,000.00
────────────────────────────────────────────────────────────────────
    Total          100.00%  101,942,000.00 40,647,000.00    61,295,000.00
────────────────────────────────────────────────────────────────────

⚠️ 2 categories need attention
🔴 Belanja Rumah exceeded budget by 1,179,000 IDR
🟡 Ivan Expenses at 81% of budget
```

**Visual Indicators:**

- **Green row:** Balance positive, under 80% spent
- **Yellow row:** 80-99% spent (warning)
- **Red row:** Over budget (negative balance)
- **Badge icons:** Next to category name for quick scanning
- **Percentage bar:** Visual progress bar in balance column (optional)

**Interactions:**

- Click category name → View transactions for that category
- Click expense amount → Filter transactions
- Hover over balance → Show detailed breakdown
- Sort by any column (click header)
- Export to CSV

**Mobile View:**

- Card layout instead of table
- Swipe to see full details
- Color-coded cards for status

### UX-7: Asset Management Interface

**Asset List View:**

```
Assets                                         [+ Add Asset]
─────────────────────────────────────────────────────────────

By Currency
───────────
IDR Total: 95,000,000
USD Total: $5,000
Converted: ~100,500,000 IDR (Rate: 15,100, Updated: Jan 2)

By Type
───────
┌─────────────────────────────────────────────────────────┐
│ 💰 Bank Accounts (IDR 50,000,000)                       │
│ ───────────────────────────────────────────────────     │
│ BCA Savings          45,000,000    Updated 2 days ago   │
│ Mandiri Savings       5,000,000    Updated 2 days ago   │
│                                            [Update All] │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 📈 Investments (IDR 30,000,000)                         │
│ ───────────────────────────────────────────────────     │
│ Bibit Mutual Fund    20,000,000    🔴 45 days overdue   │
│ Stocks Portfolio     10,000,000    🟡 18 days old       │
│                                            [Update All] │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 💵 Foreign Currency ($5,000)                            │
│ ───────────────────────────────────────────────────     │
│ USD Savings Account   $5,000       Updated yesterday    │
│                                            [Update All] │
└─────────────────────────────────────────────────────────┘
```

**Update Asset Modal:**

```
Update Asset: BCA Mutual Fund
─────────────────────────────────────────
Current Balance:  20,000,000 IDR
Last Updated:     Nov 20, 2024 (45 days ago)

New Balance:      [____________] IDR

Notes (optional): [Quarter end valuation]

Set Reminder:     (•) Monthly  ( ) Quarterly  ( ) Weekly

                  [Cancel]  [Update Balance]
─────────────────────────────────────────
```

**Asset Update Todo List (Dashboard Widget):**

- Sorted by priority (days since last update)
- One-click update from list
- Dismiss/snooze option
- Visual priority indicators

### UX-8: Charts and Visualizations

**Required Charts:**

1. **Monthly Expense Breakdown (Pie Chart)**
   - Color-coded by category
   - Hover shows percentage + amount
   - Click slice → Filter to that category
   - Legend with category names

2. **Asset Distribution (Pie Chart)**
   - By asset type (Bank, Investments, Crypto, etc.)
   - Show both IDR and USD separately or combined
   - Drill-down to individual assets

3. **Budget Progress Bars**
   - Horizontal bars for each category
   - Color changes at 80% (yellow) and 100% (red)
   - Show actual amount vs budget

4. **Yearly Trend (Line Chart)**
   - Income vs Expenses over 12 months
   - Net savings line
   - Hover tooltips with exact values

5. **Forecast Comparison (Dual Line Chart)**
   - Projected balance (calculated)
   - Actual balance (from snapshots)
   - Variance area shading

**Chart Library:** Chart.js or Recharts (React)

**Design Requirements:**

- Consistent color palette across all charts
- Responsive (adapt to screen size)
- Accessible (keyboard navigation, screen reader support)
- Export as image option (Phase 2)
- Print-friendly

### UX-9: Forms and Validation

**Form Design Principles:**

1. **Clear labels above fields** (not placeholder text)
2. **Inline validation** (show errors as user types after first blur)
3. **Required fields** marked with asterisk (\*)
4. **Help text** below fields when needed
5. **Logical tab order** for keyboard navigation
6. **Submit button** disabled until form valid
7. **Loading state** on submit (prevent double-submit)
8. **Success feedback** after save
9. **Error summary** at top if multiple errors

**Validation Rules:**

- Amount: Must be > 0, max 2 decimal places
- Date: Cannot be future date (for transactions)
- Category: Required for all transactions
- Email: Valid email format (user registration)
- Password: Min 12 characters, strong password check

**Error Messages:**

- ❌ Bad: "Invalid input"
- ✅ Good: "Amount must be greater than 0"
- ✅ Good: "Please select a category for this expense"

### UX-10: Responsive Design Requirements

**Breakpoints (Tailwind defaults):**

- **Mobile:** < 640px (sm)
- **Tablet:** 640px - 1024px (md-lg)
- **Desktop:** > 1024px (xl)

**Mobile-Specific Features:**

- Bottom navigation bar (instead of sidebar)
- Swipe gestures for navigation
- Native number keyboard for amount entry
- Larger tap targets (min 44x44px)
- Pull-to-refresh on lists
- Sticky headers when scrolling

**Tablet Optimizations:**

- Two-column layouts where appropriate
- Sidebar can be collapsed to icons only
- Charts fill available width
- Table becomes scrollable horizontally

**Desktop Enhancements:**

- Three-column dashboard layout
- Keyboard shortcuts
- Hover states for all interactive elements
- Sidebar always visible
- Multi-select in transaction lists

### UX-11: Empty States

**When to Show:**

- No transactions yet
- No assets configured
- No data for selected filter/date range

**Design:**

```
┌─────────────────────────────────────────┐
│                                         │
│            [Illustration]               │
│                                         │
│     No transactions this month          │
│     Start tracking by adding your       │
│     first expense or income             │
│                                         │
│        [+ Add Transaction]              │
│                                         │
└─────────────────────────────────────────┘
```

**Requirements:**

- Friendly, encouraging tone
- Clear call-to-action
- Simple illustration or icon
- Contextual help text
- Easy path to create first item

### UX-12: Loading States

**Skeleton Screens:**

- Use for initial page load
- Show layout structure with loading placeholders
- Prevent layout shift when data loads

**Spinners:**

- Use for actions (submitting forms, updating data)
- Positioned at point of action
- Disable interactive elements while loading

**Progress Indicators:**

- Use for CSV import or batch operations
- Show percentage complete
- Allow cancellation if possible

### UX-13: Notifications and Feedback

**Success Messages:**

- Toast notification (top-right corner)
- Auto-dismiss after 3 seconds
- Green checkmark icon
- Example: "Transaction saved successfully!"

**Error Messages:**

- Toast notification (top-right)
- Require user dismissal
- Red error icon
- Clear, actionable message

**Warning Messages:**

- Yellow/orange color
- Used for budget alerts
- Can be persistent (badge count)

**Info Messages:**

- Blue color
- Non-critical information
- Example: "Exchange rate updated 2 days ago"

### UX-14: Accessibility Requirements

**WCAG 2.1 Level AA Compliance:**

- Color contrast ratio ≥ 4.5:1 for text
- All interactive elements keyboard accessible
- Focus indicators visible
- Alt text for all images/icons
- ARIA labels for screen readers
- Skip navigation links
- Form labels properly associated
- Error messages announced to screen readers

**Keyboard Navigation:**

- Tab through all interactive elements
- Enter to activate buttons/links
- Escape to close modals
- Arrow keys for navigation in lists/menus

**Screen Reader Support:**

- Semantic HTML (heading hierarchy)
- ARIA landmarks (navigation, main, complementary)
- Live regions for dynamic content
- Status messages announced

### UX-15: Onboarding Flow (First-Time User)

**Step 1: Welcome**

```
┌─────────────────────────────────────────┐
│                                         │
│   Welcome to Finance Manager! 👋        │
│                                         │
│   Let's get your finances organized     │
│   in just a few steps.                  │
│                                         │
│   [Get Started] [Import from CSV]       │
│                                         │
└─────────────────────────────────────────┘
```

**Step 2: Set Primary Currency**

```
What's your primary currency?

( ) IDR - Indonesian Rupiah
( ) USD - US Dollar

This will be used for conversions and totals.
You can track assets in both currencies.

[Back] [Continue]
```

**Step 3: Create First Categories**

```
Let's set up your budget categories

We've pre-filled common categories. Edit or add your own:

✓ Food & Groceries
✓ Transportation
✓ Utilities
+ Add category

[Back] [Continue]
```

**Step 4: Add First Income/Asset (Optional)**

```
Would you like to add your current balance?

This helps us calculate accurate budgets.

[Skip for now] [Add Current Balance]
```

**Step 5: Complete**

```
You're all set! 🎉

Here's what you can do next:
• Add your first transaction
• Set up monthly budgets
• Import historical data from CSV

[Go to Dashboard]
```

**Onboarding Requirements:**

- Skippable steps (except currency selection)
- Progress indicator (Step 2 of 5)
- Ability to go back
- "Skip tutorial" option
- Can be re-accessed from settings

### UX-16: CSV Import Experience

**Upload Interface:**

```
Import Transactions from CSV
─────────────────────────────────────────

[Drag & drop CSV file here or click to browse]

Supported format:
date,type,category,amount,currency,payment_method,description

[Download sample CSV template]

Selected file: transactions_jan2024.csv (125 rows)

Map columns:
Date        → [date          ▼]
Type        → [type          ▼]
Category    → [category      ▼]
Amount      → [amount        ▼]
Currency    → [currency      ▼]
Payment     → [payment_method▼]
Description → [description   ▼]

Preview (first 5 rows):
[Table showing preview]

[Cancel] [Import 125 Transactions]
─────────────────────────────────────────

Import Progress:
[████████████████░░░░] 80% (100/125)
Processing...
```

**Post-Import:**

```
Import Complete! ✓

Successfully imported: 122 transactions
Skipped (duplicates): 2
Errors: 1 (invalid category)

[View Import Log] [Go to Transactions]
```

---

## Functional Requirements

### FR-1: User Management

**FR-1.1 User Registration**

- User can create account with email and password
- Email validation required
- Password must meet security requirements (min 12 chars, complexity)
- Automatic login after registration
- Welcome email sent (optional for MVP)

**FR-1.2 User Authentication**

- Login with email/password
- Session management (remember me option)
- Logout functionality
- Password reset via email (Phase 2)

**FR-1.3 User Profile**

- Update name, email
- Change password
- Set primary currency preference
- Set display preferences

**FR-1.4 Multi-User Access (MVP Scope)**

- Multiple users can register independently
- Each user has isolated data
- No data sharing between users in MVP
- Foundation for future family accounts feature

### FR-2: Category Management

**FR-2.1 Create Category**

- User can create expense or income category
- Required fields: name, type (expense/income), currency
- Optional fields: budget percentage, budget amount
- Category name must be unique per user

**FR-2.2 Edit Category**

- Update category name, budget allocation
- Update percentage and/or absolute budget amount
- System recalculates totals if percentage changes

**FR-2.3 Delete Category**

- Soft delete (mark as inactive)
- Cannot delete category with existing transactions
- Show warning with transaction count before delete
- Option to reassign transactions to different category

**FR-2.4 Budget Allocation**

- User can set budget as percentage or absolute amount
- System allows total allocation > 100% (soft limit)
- Show warning if total > 100%
- Budget can be set per currency

**FR-2.5 Category List**

- View all categories
- Filter by type (expense/income)
- Sort by name, budget amount, or percentage
- See transaction count per category

### FR-3: Payment Method Management

**FR-3.1 Create Payment Method**

- Required fields: name, type
- Types: cash, credit_card, debit_card, bank_transfer, e_wallet
- User can add custom types (Phase 2)

**FR-3.2 Edit Payment Method**

- Update name and type
- Update status (active/inactive)

**FR-3.3 Delete Payment Method**

- Soft delete (mark as inactive)
- Cannot delete if used in transactions
- Option to reassign transactions

**FR-3.4 Payment Method List**

- View all payment methods
- See usage count per method
- Mark as default (auto-select in forms)

### FR-4: Transaction Management

**FR-4.1 Create Transaction**

- Required fields: type, date, amount, currency, category, payment_method
- Optional fields: description
- Amount must be > 0
- Date cannot be in future
- Category must match transaction type
- Auto-calculate budget remaining after save

**FR-4.2 Edit Transaction**

- Update any field
- Re-validate all fields
- Update budget calculations

**FR-4.3 Delete Transaction**

- Soft delete (mark as deleted)
- Show confirmation dialog
- Update budget calculations

**FR-4.4 Transaction List**

- View all transactions
- Default sort: newest first
- Filter by:
  - Date range
  - Category
  - Payment method
  - Type (expense/income)
  - Currency
- Search by description
- Pagination (50 per page)

**FR-4.5 CSV Import**

- Upload CSV file
- Map columns to fields
- Preview first 5 rows
- Validate all rows before import
- Show progress during import
- Report success/failure per row
- Provide import log for errors
- Skip duplicate transactions (same date, amount, category)

**FR-4.6 CSV Export**

- Export filtered transactions to CSV
- Include all fields
- Filename: transactions_YYYY-MM-DD.csv

### FR-5: Budget Overview

**FR-5.1 Monthly Budget Table**

- Display all categories with:
  - Category name
  - Budget percentage
  - Budget amount
  - Total expenses to date
  - Balance (budget - expenses)
- Calculate totals row
- Show alerts for:
  - Categories ≥ 80% spent (warning)
  - Categories > 100% spent (exceeded)
  - Total allocation > 100%

**FR-5.2 Budget Alerts**

- Count of categories needing attention
- Color-coded badges (yellow warning, red exceeded)
- Alert message with specific amounts
- Click to view category transactions

**FR-5.3 Budget History**

- View previous months' budget performance
- Compare month-over-month
- Export budget report (Phase 2)

### FR-6: Asset Management

**FR-6.1 Create Asset**

- Required fields: name, type, balance, currency
- Types: bank_account, mutual_fund, bond, crypto, stock, other
- Optional: notes, reminder frequency

**FR-6.2 Update Asset**

- Update balance (creates history entry)
- Update name, type
- Add notes for the update
- Timestamp auto-recorded

**FR-6.3 Delete Asset**

- Soft delete
- Confirm before delete
- Archive history data

**FR-6.4 Asset List**

- Group by type
- Group by currency
- Show last update date
- Show days since last update
- Total by currency
- Total converted to primary currency

**FR-6.5 Asset Update Reminders**

- Set reminder frequency per asset
- Show todo list of overdue updates
- Priority based on days overdue:
  - High (red): > 30 days
  - Medium (yellow): > 14 days
  - Low (green): > 7 days
- Dismiss/snooze reminder

**FR-6.6 Asset History**

- View balance over time (list and chart)
- Filter by date range
- Export to CSV

### FR-7: Financial Forecast

**FR-7.1 Forecast Calculator**

- Input fields:
  - Current balance
  - Monthly savings amount
  - Annual interest rate (%)
  - Number of months
  - Currency
- Calculate projected balance per month:
  - Monthly installment (savings)
  - Interest earned
  - Running balance
- Display as table with monthly breakdown

**FR-7.2 Monthly Snapshots**

- User can create snapshot at end of month
- Snapshot includes all asset balances
- One snapshot per month per user
- Cannot modify past snapshots (only view)

**FR-7.3 Projected vs Actual Comparison**

- Display forecast alongside actual snapshots
- Calculate variance (actual - projected)
- Show variance percentage
- Highlight months where actual < projected
- Chart view (dual line graph)

**FR-7.4 Goal Tracking (Phase 2)**

- Set savings goal
- Calculate months to reach goal
- Track progress against goal

### FR-8: Calculators

**FR-8.1 Compound Interest Calculator**

- Input fields:
  - Principal amount
  - Annual interest rate (%)
  - Compounding frequency (monthly, quarterly, yearly)
  - Time period (years)
  - Additional monthly contribution (optional)
- Calculate:
  - Future value
  - Total interest earned
  - Year-by-year breakdown
- Display as table and chart

**FR-8.2 Future Calculators (Post-MVP)**

- Loan EMI calculator
- Fixed deposit calculator
- SIP (Systematic Investment Plan) calculator

### FR-9: Reports and Analytics

**FR-9.1 Monthly Overview**

- Total income by category
- Total expenses by category
- Net savings (income - expenses)
- Budget adherence percentage
- Expense breakdown pie chart
- Income breakdown pie chart

**FR-9.2 Yearly Overview**

- Sum of transactions per category (12 months)
- Year-over-year comparison (Phase 2)
- Asset position at start and end of year
- Net worth growth
- Expense trends (line chart)
- Asset distribution (pie chart)

**FR-9.3 Custom Date Range**

- Select any start and end date
- Generate same reports as monthly/yearly
- Export to PDF (Phase 2)

**FR-9.4 Category Drill-Down**

- Click category in any report
- View all transactions for that category
- Filter by date range
- See trend over time

### FR-10: Exchange Rate Management

**FR-10.1 Manual Exchange Rate Entry**

- Add exchange rate: USD to IDR
- Set effective date
- Rate used for conversions on/after that date
- Historical rates preserved (don't update past conversions)

**FR-10.2 Exchange Rate History**

- View all historical rates
- Filter by date range
- Edit future rates only
- Delete unused rates

**FR-10.3 Currency Conversion**

- Convert amounts between currencies
- Use latest rate before transaction date
- Display both original and converted amounts
- Indicate conversion rate and date used

**FR-10.4 Multi-Currency Display**

- Show totals in each currency separately
- Show converted total in primary currency
- Clearly label conversion rate and date
- User can toggle between views

### FR-11: Data Import/Export

**FR-11.1 CSV Transaction Import**

- See FR-4.5 for details
- Template download available
- Column mapping interface
- Duplicate detection

**FR-11.2 CSV Transaction Export**

- Export all or filtered transactions
- Include all fields
- Proper CSV formatting

**FR-11.3 Full Data Export (Phase 2)**

- Export all data (transactions, assets, categories, etc.)
- JSON format for backup/migration
- Encrypted export option

**FR-11.4 Data Import from Export (Phase 2)**

- Import full backup
- Merge or replace options
- Validate data integrity

---

## Technical Requirements

### TR-1: Technology Stack

**Frontend:**

- Framework: Astro 4.x
- UI Framework: React 18+ (for interactive islands)
- Styling: Tailwind CSS v4 + DaisyUI
- Component Library: Custom (documented in design system docs)
- Charts: Chart.js or Recharts
- Forms: React Hook Form + Valibot validation
- State Management: Zustand or Nanostores
- Build Tool: Bun

**Backend:**

- Runtime: Bun 1.x
- Database: SQLite (development) / Cloudflare D1 (production)
- ORM: Drizzle ORM
- Authentication: Lucia Auth
- Password Hashing: Argon2id
- Validation: Valibot
- API Pattern: Internal service layer (not REST for MVP)

**Development Tools:**

- Component Development: Astro component previews + manual QA
- Testing: Bun test + Vitest
- Code Quality: ESLint + Prettier
- Type Checking: TypeScript 5.x
- Version Control: Git

**Deployment:**

- Hosting: Self-hosted (VPS/Docker)
- Database: Cloudflare D1
- Reverse Proxy: Nginx or Caddy
- SSL: Let's Encrypt

### TR-2: Architecture Patterns

**Middle Layer API:**

- Service-oriented architecture
- Clear separation of concerns:
  - Controllers (handle HTTP/form requests)
  - Services (business logic)
  - Repositories (data access)
- Services consumed by:
  - Web forms (Astro/React)
  - Future REST API
  - Future CLI
  - Future Bot interfaces (WhatsApp/Telegram)
  - Future automation (Zapier/n8n)
  - Future MCP integrations

**Atomic UI Design:**

- Atoms: Basic components (Button, Input, Label)
- Molecules: Simple composites (FormField, TransactionRow)
- Organisms: Complex components (TransactionForm, BudgetTable)
- Templates: Page layouts
- Pages: Complete views

**Component Requirements:**

- Every component documented with usage examples
- Props documented with TypeScript
- Multiple states demonstrated
- Accessibility notes included
- Usage examples provided

### TR-3: Database Requirements

**Database Strategy:**

- Development: SQLite (single file, no setup)
- Production: Cloudflare D1
- Use Drizzle ORM with a shared SQLite-compatible schema
- Environment configuration switches between local SQLite and D1

**Schema Design:**

- Normalized tables (3NF)
- Foreign key constraints
- Indexed columns for common queries
- Soft deletes (deleted_at timestamp)
- Timestamps (created_at, updated_at) on all tables
- UUIDs for primary keys (user-facing IDs)

**Data Integrity:**

- Transactions for multi-table updates
- Validation at application and database level
- Cascade deletes where appropriate
- Prevent orphaned records

### TR-4: Security Requirements

**Authentication:**

- Argon2id password hashing (min cost: 3)
- Session-based authentication
- HTTP-only cookies
- CSRF protection on all forms
- Session timeout: 30 days (configurable)
- Secure password reset flow (Phase 2)

**Authorization:**

- Users can only access their own data
- All queries filtered by user_id
- Server-side validation on all operations
- No client-side authorization checks

**Data Protection:**

- HTTPS required in production
- Environment variables for secrets
- No credentials in code
- Encrypted database backups (Phase 2)
- Optional field-level encryption for sensitive data (Phase 2)

**Input Validation:**

- Validate all user input server-side
- Sanitize HTML input
- SQL injection prevention (ORM parameterized queries)
- XSS prevention (escape output)
- File upload validation (CSV only, size limits)

**Rate Limiting:**

- Limit login attempts (5 per 15 minutes)
- Limit API calls per user (Phase 2)
- Prevent brute force attacks

### TR-5: Performance Requirements

**Page Load Times:**

- First Contentful Paint (FCP): < 1.5s
- Time to Interactive (TTI): < 3s
- Largest Contentful Paint (LCP): < 2.5s

**Database Queries:**

- Indexed columns for common filters
- Limit query results (pagination)
- Eager load related data
- Cache frequently accessed data (Phase 2)

**Frontend Optimization:**

- Code splitting (Astro islands)
- Lazy load charts/heavy components
- Optimize images
- Minify CSS/JS
- Use CDN for static assets (Phase 2)

**Scalability Targets (Future):**

- Support 10,000+ users per instance
- 100,000+ transactions per user
- < 100ms average API response time
- Database connection pooling

### TR-6: Testing Requirements

**Unit Tests:**

- All service methods tested
- All utility functions tested
- Edge cases covered
- Minimum 80% code coverage

**Component Tests:**

- All UI components tested
- User interactions tested
- Props validation tested
- Accessibility tested

**Integration Tests:**

- Full user flows tested
- Database operations tested
- Form submissions tested

**E2E Tests (Phase 2):**

- Critical user paths
- Cross-browser testing
- Mobile device testing

**Testing Strategy:**

- Write tests alongside features
- TDD for complex business logic
- Automated tests in CI/CD
- Manual QA before releases

### TR-7: Data Models

See detailed database schema in [Data Models](#data-models) section below.

---

## Data Models

### Database Schema (Drizzle ORM)

#### Users Table

```typescript
export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});
```

#### User Settings Table

```typescript
export const userSettings = pgTable('user_settings', {
  user_id: varchar('user_id', { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  primary_currency: pgEnum('primary_currency', ['IDR', 'USD']).default('IDR').notNull(),
  show_converted_totals: boolean('show_converted_totals').default(true).notNull(),
  show_individual_currencies: boolean('show_individual_currencies').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});
```

#### Categories Table

```typescript
export const categories = pgTable(
  'categories',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    user_id: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    type: pgEnum('type', ['expense', 'income']).notNull(),
    percentage: decimal('percentage', { precision: 5, scale: 2 }).default('0').notNull(),
    budget_amount: decimal('budget_amount', { precision: 15, scale: 2 }).default('0').notNull(),
    currency: pgEnum('currency', ['IDR', 'USD']).notNull(),
    is_active: boolean('is_active').default(true).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.user_id),
    uniqueUserCategory: unique('unique_user_category').on(table.user_id, table.name),
  })
);
```

#### Payment Methods Table

```typescript
export const paymentMethods = pgTable(
  'payment_methods',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    user_id: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    type: pgEnum('type', [
      'cash',
      'credit_card',
      'debit_card',
      'bank_transfer',
      'e_wallet',
    ]).notNull(),
    is_active: boolean('is_active').default(true).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.user_id),
  })
);
```

#### Transactions Table

```typescript
export const transactions = pgTable(
  'transactions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    user_id: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category_id: varchar('category_id', { length: 36 })
      .notNull()
      .references(() => categories.id),
    payment_method_id: varchar('payment_method_id', { length: 36 })
      .notNull()
      .references(() => paymentMethods.id),
    type: pgEnum('type', ['expense', 'income']).notNull(),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    currency: pgEnum('currency', ['IDR', 'USD']).notNull(),
    description: text('description'),
    transaction_date: date('transaction_date').notNull(),
    deleted_at: timestamp('deleted_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.user_id),
    transactionDateIdx: index('transaction_date_idx').on(table.transaction_date),
    categoryIdIdx: index('category_id_idx').on(table.category_id),
    typeIdx: index('type_idx').on(table.type),
  })
);
```

#### Assets Table

```typescript
export const assets = pgTable(
  'assets',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    user_id: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    type: pgEnum('type', [
      'bank_account',
      'mutual_fund',
      'bond',
      'crypto',
      'stock',
      'other',
    ]).notNull(),
    balance: decimal('balance', { precision: 15, scale: 2 }).notNull(),
    currency: pgEnum('currency', ['IDR', 'USD']).notNull(),
    last_updated: timestamp('last_updated').defaultNow().notNull(),
    deleted_at: timestamp('deleted_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.user_id),
    typeIdx: index('type_idx').on(table.type),
  })
);
```

#### Asset History Table

```typescript
export const assetHistory = pgTable(
  'asset_history',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    asset_id: varchar('asset_id', { length: 36 })
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    balance: decimal('balance', { precision: 15, scale: 2 }).notNull(),
    notes: text('notes'),
    recorded_at: timestamp('recorded_at').defaultNow().notNull(),
  },
  (table) => ({
    assetIdIdx: index('asset_id_idx').on(table.asset_id),
    recordedAtIdx: index('recorded_at_idx').on(table.recorded_at),
  })
);
```

#### Asset Update Reminders Table

```typescript
export const assetUpdateReminders = pgTable(
  'asset_update_reminders',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    user_id: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    asset_id: varchar('asset_id', { length: 36 })
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    frequency: pgEnum('frequency', ['weekly', 'monthly', 'quarterly']).default('monthly').notNull(),
    last_updated: timestamp('last_updated'),
    next_reminder: date('next_reminder'),
    is_dismissed: boolean('is_dismissed').default(false).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.user_id),
    assetIdIdx: index('asset_id_idx').on(table.asset_id),
    uniqueUserAsset: unique('unique_user_asset').on(table.user_id, table.asset_id),
  })
);
```

#### Asset Snapshots Table

```typescript
export const assetSnapshots = pgTable(
  'asset_snapshots',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    user_id: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    snapshot_date: date('snapshot_date').notNull(),
    month: int('month').notNull(), // 1-12
    year: int('year').notNull(),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.user_id),
    uniqueUserMonth: unique('unique_user_month').on(table.user_id, table.month, table.year),
  })
);
```

#### Asset Snapshot Items Table

```typescript
export const assetSnapshotItems = pgTable(
  'asset_snapshot_items',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    snapshot_id: varchar('snapshot_id', { length: 36 })
      .notNull()
      .references(() => assetSnapshots.id, { onDelete: 'cascade' }),
    asset_id: varchar('asset_id', { length: 36 })
      .notNull()
      .references(() => assets.id),
    balance: decimal('balance', { precision: 15, scale: 2 }).notNull(),
    currency: pgEnum('currency', ['IDR', 'USD']).notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('snapshot_id_idx').on(table.snapshot_id),
  })
);
```

#### Exchange Rates Table

```typescript
export const exchangeRates = pgTable(
  'exchange_rates',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    from_currency: pgEnum('from_currency', ['IDR', 'USD']).notNull(),
    to_currency: pgEnum('to_currency', ['IDR', 'USD']).notNull(),
    rate: decimal('rate', { precision: 15, scale: 4 }).notNull(),
    effective_date: date('effective_date').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    effectiveDateIdx: index('effective_date_idx').on(table.effective_date),
    uniqueCurrencyDate: unique('unique_currency_date').on(
      table.from_currency,
      table.to_currency,
      table.effective_date
    ),
  })
);
```

#### Sessions Table (for Lucia Auth)

```typescript
export const sessions = pgTable(
  'sessions',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    user_id: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires_at: timestamp('expires_at').notNull(),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.user_id),
  })
);
```

---

## Security Requirements

### SEC-1: Password Security

- Use Argon2id hashing algorithm
- Minimum password length: 12 characters
- Require mix of uppercase, lowercase, numbers, special characters
- Check against common password lists (Phase 2)
- No password in plaintext logs or error messages

### SEC-2: Session Management

- HTTP-only cookies for session tokens
- Secure flag enabled in production (HTTPS only)
- SameSite attribute set to 'Lax'
- Session timeout: 30 days (configurable)
- Automatic session cleanup for expired sessions

### SEC-3: CSRF Protection

- CSRF tokens on all forms
- Validate token on all POST/PUT/DELETE requests
- Tokens expire with session
- Double-submit cookie pattern

### SEC-4: Input Validation

- Server-side validation on all inputs
- Use Valibot schemas for validation
- Sanitize HTML in user-generated content
- Validate file uploads (type, size, content)
- Reject malformed requests

### SEC-5: SQL Injection Prevention

- Use ORM (Drizzle) with parameterized queries
- Never construct SQL from user input
- Validate all query parameters

### SEC-6: XSS Prevention

- Escape all user-generated output
- Use React's built-in XSS protection
- Content Security Policy headers (Phase 2)
- Sanitize rich text (if added in future)

### SEC-7: Data Access Control

- All queries filtered by authenticated user_id
- No direct object reference (use UUIDs)
- Authorization checks in every service method
- Prevent privilege escalation

### SEC-8: HTTPS Enforcement

- Force HTTPS in production
- HSTS headers
- Redirect HTTP to HTTPS
- Let's Encrypt for SSL certificates

### SEC-9: Rate Limiting

- Limit login attempts: 5 per 15 minutes per IP
- Limit API calls: 1000 per hour per user (Phase 2)
- Block suspicious IPs (Phase 2)
- CAPTCHA after failed attempts (Phase 2)

### SEC-10: Secrets Management

- Environment variables for all secrets
- No secrets in version control
- Rotate secrets regularly (Phase 2)
- Use secret manager for production (Phase 2)

---

## Performance Requirements

### PERF-1: Page Load Metrics

- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3s
- Cumulative Layout Shift (CLS): < 0.1
- First Input Delay (FID): < 100ms

### PERF-2: Database Performance

- Index all foreign keys
- Index commonly filtered columns
- Query execution time: < 50ms for simple queries
- Use pagination (50 records per page)
- Eager load related data to avoid N+1 queries

### PERF-3: API Response Times

- Average response time: < 100ms
- 95th percentile: < 200ms
- 99th percentile: < 500ms
- Timeout after 5 seconds

### PERF-4: Frontend Optimization

- Code splitting with Astro islands
- Lazy load non-critical components
- Image optimization (WebP format, responsive sizes)
- Minify CSS/JS in production
- Use compression (gzip/brotli)

### PERF-5: Caching Strategy

- Browser cache for static assets (1 year)
- Service worker for offline support (Phase 2)
- Cache frequently accessed data in memory (Phase 2)
- Cache exchange rates (update daily)

### PERF-6: Scalability Targets

- Support 10,000+ concurrent users per instance
- 100,000+ transactions per user without degradation
- Database size: handle 100+ GB
- Horizontal scaling capability (Phase 2)

---

## Future Considerations

### Phase 2 Features (Post-MVP)

1. **REST API for External Integrations**
   - Standard REST endpoints
   - API key authentication
   - Rate limiting
   - Documentation (Swagger/OpenAPI)

2. **CLI Interface**
   - Add transactions from terminal
   - View budget status
   - Export reports
   - Automation scripts

3. **Bot Interfaces**
   - WhatsApp bot for transaction entry
   - Telegram bot for quick queries
   - SMS reminders (optional)

4. **Automation Integrations**
   - Zapier integration
   - n8n integration
   - IFTTT triggers
   - Webhook support

5. **MCP (Model Context Protocol) Support**
   - AI assistant integration
   - Natural language queries
   - Smart suggestions

6. **Bank API Integrations**
   - Automatic transaction import
   - Real-time balance sync
   - Indonesian bank APIs (BCA, Mandiri, etc.)

7. **Advanced Forecasting**
   - Machine learning predictions
   - Scenario planning
   - Monte Carlo simulations
   - Goal tracking with milestones

8. **Family Account Features**
   - Shared budgets
   - Permission levels (admin, member, view-only)
   - Individual expense tracking within family
   - Family reports

9. **Mobile Apps**
   - Native iOS app
   - Native Android app
   - Offline mode
   - Push notifications

10. **Advanced Analytics**
    - Spending patterns analysis
    - Anomaly detection
    - Budget recommendations
    - Category insights

### Multi-Tenancy Architecture (SaaS)

- Tenant isolation at database level
- Separate schema per tenant or shared schema with tenant_id
- Subscription management
- Usage-based billing
- Admin dashboard for all tenants

### Compliance (for Public Release)

- GDPR compliance (data export, right to be forgotten)
- Data retention policies
- Privacy policy
- Terms of service
- Cookie consent
- Audit logs

### Infrastructure Scaling

- Load balancing
- Database replication (read replicas)
- Redis cache layer
- CDN for static assets
- Multi-region deployment
- Backup and disaster recovery

---

## Appendix

### A. Glossary

- **Asset:** Any financial holding (bank account, investment, crypto, etc.)
- **Budget Allocation:** Percentage or amount assigned to a category
- **Category:** Classification for transactions (e.g., Food, Transportation)
- **Exchange Rate:** Conversion rate between currencies
- **Forecast:** Projected financial position based on assumptions
- **Payment Method:** How a transaction was paid (cash, card, etc.)
- **Snapshot:** Point-in-time record of all asset balances
- **Soft Delete:** Marking record as deleted without removing from database
- **Soft Limit:** Warning threshold that can be exceeded
- **Transaction:** Income or expense entry

### B. References

- **Tailwind CSS:** https://tailwindcss.com
- **DaisyUI:** https://daisyui.com
- **Astro:** https://astro.build
- **Drizzle ORM:** https://orm.drizzle.team
- **Lucia Auth:** https://lucia-auth.com
- **WCAG 2.1:** https://www.w3.org/WAI/WCAG21/quickref/

### C. Changelog

**Version 1.0** (January 3, 2026)

- Initial requirements specification
- UI/UX focus with detailed mockups
- Complete functional requirements
- Technical architecture defined
- Database schema documented

---

**End of Requirements Specification**
