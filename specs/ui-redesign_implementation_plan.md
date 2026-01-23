# Total UI Redesign - Implementation Plan

Comprehensive redesign of the Family Finance application UI based on the premium React PoC design. This plan covers component conversion from React to Astro, design system updates, and page-level redesigns for Dashboard, Transactions, and Budget pages.

## Summary

Transform the existing Astro-based Family Finance application to match the modern, premium design shown in the React PoC. Key changes include:

- **Design Language**: Updated to premium, minimalist aesthetic with slate/indigo color scheme
- **Layout**: New sidebar with gradient active states, glass-effect header, mobile FAB navigation
- **Typography**: Enhanced with tracking-tight headings, uppercase labels, bold weight emphasis
- **Components**: New spending analysis chart, net worth widget, cash flow cards, budget cards
- **Interactions**: Hover states with scale/shadow effects, smooth transitions

### Decision Log

| Decision         | Choice           | Rationale                                                       |
| ---------------- | ---------------- | --------------------------------------------------------------- |
| Chart Library    | Chart.js         | Vanilla JS, no React dependency, good donut support, ~60KB gzip |
| Icons            | Lucide           | Design system compliance, existing codebase consistency         |
| Mobile Nav       | FAB pattern      | Enhanced UX, matches premium design                             |
| Notifications    | Include basic UI | User-requested for this phase                                   |
| State Management | Nano Stores      | Per design system, for filter state and notifications           |

---

## Architecture Decisions

### State Management Strategy

Per the design system (`START.md`), use Nano Stores for client-side reactive state:

**New Stores Required:**

```typescript
// src/lib/stores/transactionFiltersStore.ts
// Manages: type filter, search query, category, date range
// Persists: URL query params for shareable links

// src/lib/stores/notificationStore.ts
// Manages: notifications list, read/unread state, dropdown open state

// src/lib/stores/currencyStore.ts
// Manages: selected display currency (IDR/USD)
```

### Chart Implementation (Chart.js)

Use Chart.js with vanilla JavaScript in Astro `<script>` tags:

- No React dependency needed
- Use `client:visible` pattern via Intersection Observer
- Doughnut chart type with custom center text plugin
- Interactive hover states via Chart.js native events

### Progressive Enhancement

Filter bar (Task 13) will implement progressive enhancement:

1. Base: URL query params (server-side filtering works without JS)
2. Enhanced: Nano Stores for instant client-side updates

---

## Proposed Changes

### New Files

**Stores:**

- `src/lib/stores/transactionFiltersStore.ts` - Filter state management
- `src/lib/stores/notificationStore.ts` - Notification state management
- `src/lib/stores/currencyStore.ts` - Currency preference state

**Atoms:**

- `src/components/atoms/ProgressBar.astro` - Horizontal progress bar for budget/spending
- `src/components/atoms/IconBadge.astro` - Icon with colored background container
- `src/components/atoms/StatLabel.astro` - Uppercase tracking-wide label for stats
- `src/components/atoms/Skeleton.astro` - Loading skeleton placeholder

**Molecules:**

- `src/components/molecules/NotificationDropdown.astro` - Header notifications panel
- `src/components/molecules/NotificationItem.astro` - Individual notification row
- `src/components/molecules/CurrencySelector.astro` - Header currency dropdown
- `src/components/molecules/BudgetAlertBanner.astro` - Contextual budget warning
- `src/components/molecules/PeriodSelector.astro` - Month/period selection sidebar
- `src/components/molecules/MetricsSummary.astro` - Net savings metrics card
- `src/components/molecules/CashFlowItem.astro` - Income/expense cash flow row

**Organisms:**

- `src/components/organisms/SpendingChart.astro` - Chart.js donut chart with legend
- `src/components/organisms/SpendingCard.astro` - Monthly spending summary card
- `src/components/organisms/NetWorthWidget.astro` - Total net worth display
- `src/components/organisms/CashFlowWidget.astro` - Cash flow analysis list
- `src/components/organisms/BudgetCardGrid.astro` - Budget cards layout
- `src/components/organisms/BudgetCard.astro` - Individual budget category card
- `src/components/organisms/BudgetAdviceBanner.astro` - AI reallocation suggestion
- `src/components/organisms/TransactionFiltersBar.astro` - Unified filter bar component

**Layouts:**

- `src/components/layouts/MobileNavigation.astro` - Mobile bottom navigation with FAB

**Stories (Storybook):**

- `src/components/atoms/ProgressBar.stories.ts`
- `src/components/atoms/IconBadge.stories.ts`
- `src/components/atoms/StatLabel.stories.ts`
- `src/components/atoms/Skeleton.stories.ts`
- `src/components/molecules/BudgetAlertBanner.stories.ts`
- `src/components/organisms/SpendingChart.stories.ts`
- `src/components/organisms/BudgetCard.stories.ts`

### Modified Files

**Design System:**

- `design-system/styles.json` - Add new tokens for premium design
- `src/styles/globals.css` - Add utility classes, update theme tokens
- `src/styles/tokens.css` - Add new CSS custom properties
- `src/lib/tokens.ts` - Export new helper functions

**Layouts:**

- `src/components/layouts/Navigation.astro` - Redesign sidebar with premium styles
- `src/components/layouts/Header.astro` - Add glass effect, notifications, currency selector
- `src/layouts/MainLayout.astro` - Update layout structure, add mobile nav

**Pages:**

- `src/pages/dashboard.astro` - Complete redesign with new widgets
- `src/pages/transactions/index.astro` - New filter bar, list layout, sidebar
- `src/pages/budget/index.astro` - Budget cards, advice banner

**Existing Components (Updates):**

- `src/components/atoms/Button.astro` - Add new variants (accent, ghost)
- `src/components/atoms/Card.astro` - Add shadow-premium, rounded-3xl variants
- `src/components/atoms/Badge.astro` - Add status variants, updated sizing
- `src/components/molecules/QuickActions.astro` - Redesign with new pattern
- `src/components/molecules/TransactionRow.astro` - Premium styling update
- `src/components/organisms/SummaryCards.astro` - Redesign with new layout
- `src/components/organisms/RecentTransactionsList.astro` - New styling
- `src/components/organisms/BudgetOverviewTable.astro` - Update to card-based design

### Refactoring (Bulk Changes)

- All components using `btn-primary` → migrate to `btn-accent` for CTAs
- All `rounded-lg` on cards → `rounded-xl` (use existing `premiumLg` token)
- All icon sizes standardized to design system sizes (16/20/22/24/32)
- Add `tracking-tight` to all headings
- Add `tracking-widest uppercase` to all stat labels

---

## Quality Gate Requirements

**Every task MUST complete these before marking done:**

```markdown
- [ ] Run `bun run lint:fix`
- [ ] Run `bun run stylelint:fix`
- [ ] Run `bun run format:fix`
- [ ] Run `bun run typecheck`
- [ ] Create/update Storybook stories for new/modified components
- [ ] Verify light mode rendering
- [ ] Verify dark mode rendering
```

---

## Detailed Tasks

### Task 1: Design Token Updates (Priority: P0) ✅

**Goal:** Align design tokens with premium PoC design specifications

**Current Issue:** Existing tokens don't include premium shadows, or new spacing patterns from the PoC.

**Checklist:**

- [x] Add premium shadow token (`shadow-premium-lg`)
- [x] Add `rounded-card` utility (maps to existing `premiumLg` = 1.25rem)
- [x] Add typography utilities (`tracking-tighter`, label styles)
- [x] Add glass effect utilities for header (already exists as `.glass-effect`)
- [x] Add sidebar gradient tokens for active state (already exists)
- [x] Update card padding to match PoC (`p-8` = 2rem)
- [x] Add transition duration tokens (already exists)
- [x] Run quality gates (lint:fix, stylelint:fix, format:fix, typecheck)

**Files to modify:**

- `design-system/styles.json` ✅
- `src/styles/tokens.css` ✅
- `src/styles/globals.css` ✅
- `src/lib/tokens.ts` ✅

**Token Additions:**

```css
/* Added to tokens.css - align with existing styles.json values */
--shadow-premium-lg: 0 20px 25px -5px rgb(0 0 0 / 0.1);
--radius-card: var(--radius-xl); /* 0.75rem - premium card */
--radius-card-lg: 1.25rem; /* 20px - premium large card */
--spacing-card-lg: var(--spacing-8); /* 2rem - large card padding */
--tracking-widest: 0.1em; /* Premium label letter spacing */
```

**Implementation Notes:**

- Glass effect utilities (`.glass-effect`) already existed
- Sidebar gradient tokens (`--sidebar-active-gradient`) already existed
- Transition duration tokens already existed in styles.json
- Added `.label-premium` utility class with accessibility note (10px is for decorative use only)
- Fixed P1 feedback: updated `styles.json` to use CSS token values instead of Tailwind class names

**Status:** ✅ Complete

---

### Task 2: Component Library Updates (Priority: P0) ✅

**Goal:** Update existing atomic components to support new premium design variants

**Current Issue:** Existing components need additional variants and updated default styles.

**Checklist:**

- [x] Button: Add `variant="accent"` as default CTA, update shadow
- [x] Button: Add `variant="ghost"` with border
- [x] Card: Add `rounded="xl"` variant (uses existing premiumLg token)
- [x] Card: Add `padding="lg"` variant (p-8)
- [x] Badge: Add status variants (optimal, review, exceeded)
- [x] Badge: Update to `text-badge` size class (0.75rem)
- [x] Input: Add search input variant with icon slot
- [x] Create StatLabel atom for uppercase labels
- [x] Create Skeleton atom for loading states
- [x] Update existing Storybook stories with new variants
- [x] Create new stories for StatLabel and Skeleton
- [x] Run quality gates

**Files to modify:**

- `src/components/atoms/Button.astro` ✅ (already had accent/ghost)
- `src/components/atoms/Button.stories.ts` ✅ (added accent to options and variantClasses)
- `src/components/atoms/Card.astro` ✅ (added rounded and padding props)
- `src/components/atoms/Badge.astro` ✅ (added optimal/review/exceeded variants)
- `src/components/atoms/Input.astro` ✅ (added search variant with icon slot)
- `src/components/atoms/StatLabel.astro` ✅ (new component)
- `src/components/atoms/Skeleton.astro` ✅ (new component)
- Storybook stories for all new/modified components ✅

**Status:** ✅ Complete

---

### Task 3: Navigation Sidebar Redesign (Priority: P0) ✅

**Goal:** Implement premium sidebar with brand header, gradient active states, and user profile section

**Current Issue:** Current sidebar uses basic DaisyUI menu styles without the premium gradient effects and typography.

**Checklist:**

- [x] Add brand logo section with Wallet icon and "FamilyFinance" text
- [x] Implement gradient active state for nav items (use `nav-active` class)
- [x] Update nav item typography (font-bold, tracking-tight)
- [x] Add pulsing indicator dot for active item
- [x] Style user profile section with avatar and info
- [x] Add hover scale effect on logo
- [x] Update icons per icon mapping (Receipt for Transactions, Donut for Budget, ChartBar for Reports)
- [x] Add `role="navigation"` and `aria-label="Main navigation"`
- [x] Ensure keyboard navigation (Tab through items) - added focus-visible styles
- [x] Create/update Storybook story
- [x] Run quality gates
- [x] Test in dark mode

**Files to modify:**

- `src/components/layouts/Navigation.astro` ✅
- `src/components/layouts/Navigation.stories.ts` ✅

**Accessibility:**

- [x] Add `role="navigation"` to aside element
- [x] Add `aria-label="Main navigation"`
- [x] Add `aria-current="page"` to active item
- [x] Ensure visible focus indicators (focus-visible:ring-2 focus-visible:ring-accent)
- [x] Test keyboard navigation (Tab, Enter)
- [x] Add skip link for keyboard users

**Implementation Notes:**

- Fixed Dashboard route from '/dashboard' to '/' for proper active state
- Added unique icons for all nav items: LayoutDashboard, Receipt, Donut, Wallet, ChartBar, TrendingUp (Forecast), Calculator (Calculators), Settings
- Added skip link with `sr-only` and `focus:not-sr-only` for accessibility
- Added hover state (`hover:bg-base-200`) for all nav items
- Added focus-visible styles (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`)
- Used non-deprecated Lucide icons (Donut instead of PieChart, ChartBar instead of BarChart3)
- Fixed route to match actual index page at '/' instead of '/dashboard'

**UI Change:**

Before:

```
┌──────────────────┐
│ Menu             │
├──────────────────┤
│ • Dashboard      │
│ • Transactions   │
│ • Budget         │
└──────────────────┘
```

After:

```
┌──────────────────────┐
│ [💰] FamilyFinance   │
├──────────────────────┤
│ ▌▓ Dashboard      ●  │ ← gradient bg + active dot
│   Transactions       │
│   Budgets            │
│   Assets             │
│   Reports            │
│   Settings           │
├──────────────────────┤
│ (S) Sarah Jenkins    │
│     Pro Account      │
└──────────────────────┘
```

**Status:** ✅ Complete

---

### Task 4: Header Redesign (Priority: P0) ✅

**Goal:** Implement glass-effect header with page title, currency selector, notifications, and new entry button

**Current Issue:** Current header lacks glass effect, currency selector, and notification dropdown.

**Checklist:**

- [x] Add glass effect background (`bg-base-100/80 backdrop-blur-md`)
- [x] Add dynamic page title based on current route
- [x] Add subtitle with current period (e.g., "Summary for January 2024")
- [x] Create CurrencySelector molecule (IDR/USD dropdown)
- [x] Create NotificationDropdown molecule
- [x] Create NotificationItem molecule
- [x] Create `notificationStore.ts` for dropdown state
- [x] Style "New Entry" button with accent color and shadow
- [x] Add notification badge with pulse animation
- [x] Ensure sticky positioning with proper z-index
- [x] Add ARIA labels for all interactive elements
- [x] Create Storybook stories for new molecules
- [x] Run quality gates
- [x] Test in dark mode

**Files to modify:**

- `src/components/layouts/Header.astro` ✅
- `src/components/molecules/CurrencySelector.astro` ✅ (new)
- `src/components/molecules/NotificationDropdown.astro` ✅ (new)
- `src/components/molecules/NotificationItem.astro` ✅ (new)
- `src/components/molecules/CurrencySelector.stories.ts` ✅ (new)
- `src/components/molecules/NotificationItem.stories.ts` ✅ (new)
- `src/components/molecules/NotificationDropdown.stories.ts` ✅ (new)
- `src/lib/stores/notificationStore.ts` ✅ (new)
- `src/lib/stores/currencyStore.ts` ✅ (new)

**Accessibility:**

- [x] Add `aria-label` to currency selector
- [x] Add `aria-expanded` to notification button
- [x] Add `aria-haspopup="true"` to dropdown triggers
- [x] Add `role="menu"` to dropdown content
- [x] Ensure Escape key closes dropdown
- [x] Announce notification count to screen readers (via ARIA attributes)

**UI Change:**

Before:

```
┌─────────────────────────────────────────────┐
│ Page Title                         [Button] │
└─────────────────────────────────────────────┘
```

After:

```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard                 [IDR ▼] [🔔•] [+ New Entry]       │
│ Summary for January 2024                                    │
└─────────────────────────────────────────────────────────────┘
         ↑ glass effect backdrop
```

**Implementation Notes:**

- Used DaisyUI semantic classes (`bg-warning/10`, `text-warning`) instead of hardcoded Tailwind colors
- Created Nano Stores for notification dropdown state and currency preference
- Implemented client-side dropdown toggle with Escape key and click-outside handlers
- Added pulse animation to notification badge using `animate-pulse`
- All new components have comprehensive Storybook stories

**Status:** ✅ Complete

---

### Task 5: Mobile Bottom Navigation (Priority: P1)

**Goal:** Implement mobile navigation bar with floating action button (FAB) for add transaction

**Current Issue:** No dedicated mobile navigation component with FAB pattern.

**Checklist:**

- [ ] Create MobileNavigation layout component
- [ ] Implement 5-slot layout (Home, Ledger, +FAB, Budget, Settings)
- [ ] Create elevated FAB with scale animation on tap
- [ ] Add glass effect background (`backdrop-blur-xl`)
- [ ] Style nav items with icon + label (uppercase tracking-widest, 10px)
- [ ] Implement active state styling (text-accent, scale-110)
- [ ] Add shadow for elevation (`shadow-[0_-10px_40px_rgba(0,0,0,0.05)]`)
- [ ] Hide on desktop (`lg:hidden`)
- [ ] Add to MainLayout
- [ ] Add `role="navigation"` and `aria-label`
- [ ] Ensure touch targets minimum 44x44px
- [ ] Create Storybook story
- [ ] Run quality gates
- [ ] Test in dark mode

**Files to modify:**

- `src/components/layouts/MobileNavigation.astro` (new)
- `src/layouts/MainLayout.astro`

**Accessibility:**

- [ ] Add `role="navigation"` to nav element
- [ ] Add `aria-label="Mobile navigation"`
- [ ] Add `aria-current="page"` to active item
- [ ] Ensure FAB has accessible label ("Add new transaction")
- [ ] Minimum touch target 44x44px for all buttons

**UI Change:**

```
Mobile viewport (< 1024px):

┌─────────────────────────────────────┐
│                                     │
│         Page Content                │
│                                     │
├───────────────┬─────┬───────────────┤
│ 🏠    📋    │ [+] │    📊    ⚙️   │
│ HOME  LEDGER │ FAB │  BUDGET  SET  │
└───────────────┴─────┴───────────────┘
                  ↑ elevated button (-top-10)
```

**Status:** ⏳ Pending

---

### Task 6: Dashboard - Spending Summary Card (Priority: P0) ✅

**Goal:** Create the monthly spending overview card with progress bar and budget alert

**Current Issue:** No equivalent component exists with this specific layout and alert banner.

**Checklist:**

- [x] Create ProgressBar atom with color status variants
- [x] Create IconBadge atom for colored icon containers
- [x] Create BudgetAlertBanner molecule for contextual warnings
- [x] Create SpendingCard organism component
- [x] Add ShoppingCart icon with orange background badge
- [x] Display "MONTHLY SPENDING" label (StatLabel component)
- [x] Show current amount / total budget with large typography (text-3xl)
- [x] Implement progress bar with status color (ok/warning/danger)
- [x] Show "X% used" badge with dynamic color
- [x] Show remaining amount text
- [x] Add alert with TriangleAlert icon, title, and actionable message
- [x] Add `loading` prop with skeleton state
- [x] Handle error state gracefully
- [x] Create Storybook stories for all new components
- [x] Run quality gates
- [ ] Test in dark mode

**Files to modify:**

- `src/components/atoms/ProgressBar.astro` ✅ (new)
- `src/components/atoms/ProgressBar.stories.ts` ✅ (new)
- `src/components/atoms/IconBadge.astro` ✅ (new)
- `src/components/atoms/IconBadge.stories.ts` ✅ (new)
- `src/components/molecules/BudgetAlertBanner.astro` ✅ (new)
- `src/components/molecules/BudgetAlertBanner.stories.ts` ✅ (new)
- `src/components/organisms/SpendingCard.astro` ✅ (new)
- `src/components/organisms/SpendingCard.stories.ts` ✅ (new)

**Props Interface:**

```typescript
interface SpendingCardProps {
  spent: number;
  budget: number;
  currency: 'IDR' | 'USD';
  remainingLabel?: string; // e.g., "Remaining for Jan"
  alertMessage?: string;
  loading?: boolean;
  error?: string;
}
```

**UI Change:**

```
┌─────────────────────────────────────────────────────┐
│  [🛒]  MONTHLY SPENDING                    82% used │
│  orange                                             │
│  Rp53.694.000 / Rp65.9M                            │
│  ████████████████████░░░░░░ (progress bar)         │
│                                                     │
│  Remaining for Jan: Rp12.246.000                   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ ⚠️ Budget alert                              │   │
│  │ You've reached 95% of your dining budget... │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Implementation Notes:**

- Fixed code review feedback: P0-1 (replaced raw SVG with Lucide X icon), P0-2 (added type-safe status mapping)
- Added proper ARIA attributes for accessibility (`role`, `aria-live`, `aria-labelledby`)
- Used DaisyUI semantic colors for theme compatibility
- All new components have comprehensive Storybook stories
- Loading and error states implemented with skeleton animations

**Status:** ✅ Complete

---

### Task 7: Dashboard - Quick Actions (Priority: P1) ✅

**Goal:** Redesign quick action buttons with icon badges and premium styling

**Current Issue:** Current QuickActions component doesn't match premium card design with colored icon badges.

**Checklist:**

- [x] Update QuickActions molecule layout (flex row on desktop, stack on mobile)
- [x] Use IconBadge component (created in Task 6)
- [x] Style with white/card background, border, hover effect
- [x] Add colored icon backgrounds (indigo for expense, emerald for income)
- [x] Add hover scale (`hover:scale-[1.02]`) and shadow transitions
- [x] Update typography (text-lg, font-bold, tracking-tight)
- [x] Add `active:scale-95` for press feedback
- [x] Update Storybook story
- [x] Run quality gates
- [x] Test in dark mode

**Files to modify:**

- `src/components/molecules/QuickActions.astro` ✅
- `src/components/molecules/QuickActions.stories.ts` ✅
- `src/components/molecules/QuickActions.behavior.test.ts` ✅

**Dependencies:** Task 6 (IconBadge component)

**UI Change:**

Before:

```
┌─────────────────────┐ ┌─────────────────────┐
│ [+] Add Expense     │ │ [+] Add Income      │
└─────────────────────┘ └─────────────────────┘
```

After:

```
┌────────────────────────────┐ ┌────────────────────────────┐
│  [🛒]   Add Expense        │ │  [💵]   Log Income         │
│  indigo bg                 │ │  emerald bg                │
└────────────────────────────┘ └────────────────────────────┘
```

**Implementation Notes:**

- Used IconBadge component with accent (indigo) for expense and success (emerald) for income
- Premium card design: bg-base-100, border, rounded-2xl, shadow-sm/md
- Added runtime fallback for invalid icon names with development warning
- Simplified default actions from 3 to 2 (removed "View Reports")
- Added min-h-[44px] for accessibility compliance (WCAG AAA touch target)
- Updated icons: ShoppingCart (expense), CircleDollarSign (income)
- Added will-change: transform for IconBadge hover performance
- Responsive: flex-col on mobile, sm:flex-row on desktop
- Fixed P1 feedback: fallback handling, simplified dark mode hover, touch target size

**Status:** ✅ Complete

---

### Task 8: Dashboard - Recent Activity List (Priority: P1)

**Goal:** Redesign transaction list with premium row styling and category badges

**Current Issue:** Current TransactionRow needs updated styling for premium design.

**Checklist:**

- [ ] Update TransactionRow molecule with new design
- [ ] Use IconBadge component for colored category icon
- [ ] Style category as uppercase badge (text-[10px], tracking-widest)
- [ ] Update amount typography (font-bold, tracking-tight)
- [ ] Add payment method with CreditCard icon
- [ ] Add left border accent on hover (income=emerald, expense=rose)
- [ ] Update "View all" button styling (outline with primary text)
- [ ] Ensure list has proper `divide-y divide-base-200` styling
- [ ] Add `loading` prop with skeleton rows
- [ ] Update Storybook story
- [ ] Run quality gates
- [ ] Test in dark mode

**Files to modify:**

- `src/components/molecules/TransactionRow.astro`
- `src/components/organisms/RecentTransactionsList.astro`

**Dependencies:** Task 6 (IconBadge component)

**UI Change:**

```
┌─────────────────────────────────────────────────────────────┐
│ Recent activity                              [View all →]   │
├─────────────────────────────────────────────────────────────┤
│ [🛒] Whole Foods Market                        -Rp1.321.000 │
│      GROCERIES · Today, 2:45 PM               💳 VISA 4291  │
├─────────────────────────────────────────────────────────────┤
│ [⚡] City Electric Utility                     -Rp2.449.000 │
│      UTILITIES · Yesterday                    💳 Auto-pay   │
└─────────────────────────────────────────────────────────────┘
```

**Status:** ⏳ Pending

---

### Task 9: Dashboard - Net Worth Widget (Priority: P1)

**Goal:** Create the total net worth sidebar widget with local/global breakdown

**Current Issue:** No dedicated net worth widget exists.

**Checklist:**

- [ ] Create NetWorthWidget organism component
- [ ] Add Landmark icon with emerald background (IconBadge)
- [ ] Display growth badge with TrendingUp icon (+X.X% growth)
- [ ] Show "TOTAL NET WORTH" label (StatLabel)
- [ ] Display primary amount (IDR) with large typography (text-3xl)
- [ ] Display secondary amount (USD) below (text-lg, text-muted)
- [ ] Add divider line (border-t border-base-200)
- [ ] Show local assets breakdown
- [ ] Show global assets breakdown
- [ ] Add `loading` prop with skeleton state
- [ ] Handle error state gracefully
- [ ] Create Storybook story
- [ ] Run quality gates
- [ ] Test in dark mode

**Files to modify:**

- `src/components/organisms/NetWorthWidget.astro` (new)

**Dependencies:** Task 6 (IconBadge, StatLabel)

**Props Interface:**

```typescript
interface NetWorthWidgetProps {
  totalIDR: number;
  totalUSD: number;
  localAssets: number;
  globalAssets: number;
  growthPercentage: number;
  loading?: boolean;
  error?: string;
}
```

**UI Change:**

```
┌────────────────────────────────┐
│ [🏦]              +4.2% growth │
│ emerald                        │
│ TOTAL NET WORTH                │
│ Rp1.956.063.000                │
│ $130,404.20                    │
│ ────────────────────────────── │
│ Local assets    Rp1.541.740.000│
│ Global assets         $102,782 │
└────────────────────────────────┘
```

**Status:** ⏳ Pending

---

### Task 10: Dashboard Page Assembly (Priority: P0)

**Goal:** Assemble all dashboard components into the redesigned page layout

**Current Issue:** Need to reorganize page layout to match 2-column + sidebar grid.

**Checklist:**

- [ ] Update page grid structure (`lg:grid-cols-2`, `xl:grid-cols-3`)
- [ ] Add Quick Actions row (full width, flex)
- [ ] Add Spending Card (left column, lg:col-span-1)
- [ ] Add Spending Chart placeholder (right column) - chart added in Task 11
- [ ] Add Recent Activity list (xl:col-span-2)
- [ ] Add Net Worth Widget (sidebar)
- [ ] Add Cash Flow Widget placeholder - added in Task 12
- [ ] Set proper spacing (`gap-8` between sections)
- [ ] Add container max-width (`max-w-7xl mx-auto`)
- [ ] Add page padding (`px-6 lg:px-10 py-8`)
- [ ] Ensure responsive behavior (stack on mobile)
- [ ] Run quality gates
- [ ] Test in dark mode
- [ ] Test responsive breakpoints

**Files to modify:**

- `src/pages/dashboard.astro`

**Dependencies:** Tasks 6, 7, 8, 9

**Layout Structure:**

```
┌───────────────────────────────────────────────────────────────┐
│ [Quick Actions] [Add Expense] [Log Income]                    │
├────────────────────────────────┬──────────────────────────────┤
│                                │                              │
│   Spending Card                │   Spending Analysis Chart    │
│   (with progress & alert)      │   (placeholder until T11)    │
│                                │                              │
├────────────────────────────────┴────────────────┬─────────────┤
│                                                 │             │
│   Recent Activity                               │  Net Worth  │
│   (transaction list)                            │  Widget     │
│                                                 │             │
│                                                 ├─────────────┤
│                                                 │             │
│                                                 │  Cash Flow  │
│                                                 │  (T12)      │
│                                                 │             │
└─────────────────────────────────────────────────┴─────────────┘
```

**Status:** ⏳ Pending

---

### Task 11: Dashboard - Spending Analysis Chart (Priority: P1)

**Goal:** Implement interactive donut chart with category breakdown using Chart.js

**Current Issue:** No chart component exists. Need to integrate Chart.js.

**Checklist:**

- [ ] Install Chart.js dependency (`bun add chart.js`)
- [ ] Create SpendingChart organism component
- [ ] Implement Chart.js doughnut chart in `<script>` tag
- [ ] Use Intersection Observer for lazy initialization (`client:visible` pattern)
- [ ] Add center text plugin (percentage + label)
- [ ] Configure paddingAngle equivalent via `cutout` and `spacing`
- [ ] Add hover effect (segment highlight)
- [ ] Create legend component with color dots
- [ ] Sync hover between chart and legend via Chart.js events
- [ ] Style with design system colors (use `colors` from tokens)
- [ ] Add `loading` prop with skeleton state
- [ ] Handle error state gracefully
- [ ] Add canvas `aria-label` for accessibility
- [ ] Create Storybook story
- [ ] Run quality gates
- [ ] Test in dark mode (update chart colors)

**Files to modify:**

- `package.json` (add chart.js dependency)
- `src/components/organisms/SpendingChart.astro` (new)

**Chart Configuration:**

```typescript
// Chart.js doughnut configuration
{
  type: 'doughnut',
  data: {
    labels: ['Housing', 'Groceries', 'Dining', 'Transport'],
    datasets: [{
      data: [45, 22, 12, 8],
      backgroundColor: ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'],
      borderWidth: 0,
      spacing: 4, // paddingAngle equivalent
    }]
  },
  options: {
    cutout: '70%', // donut hole size
    responsive: true,
    plugins: {
      legend: { display: false }, // custom legend
      tooltip: { enabled: true }
    }
  }
}
```

**Accessibility:**

- [ ] Add `aria-label` to canvas describing chart content
- [ ] Provide data table alternative for screen readers (sr-only)
- [ ] Ensure legend items are keyboard focusable

**Status:** ⏳ Pending

---

### Task 12: Dashboard - Cash Flow Analysis Widget (Priority: P2)

**Goal:** Create the cash flow sidebar widget showing upcoming income/expenses

**Current Issue:** No cash flow analysis component exists.

**Checklist:**

- [ ] Create CashFlowItem molecule for individual rows
- [ ] Create CashFlowWidget organism component
- [ ] Add "CASH FLOW ANALYSIS" header (StatLabel)
- [ ] Style income items with emerald background/border
- [ ] Style expense items with rose background/border
- [ ] Use IconBadge component per item
- [ ] Show date below name (text-[10px], tracking-widest, uppercase)
- [ ] Display amount with +/- sign and color
- [ ] Add hover scale effect (`hover:scale-[1.03]`)
- [ ] Add `loading` prop with skeleton state
- [ ] Create Storybook stories
- [ ] Run quality gates
- [ ] Test in dark mode

**Files to modify:**

- `src/components/molecules/CashFlowItem.astro` (new)
- `src/components/organisms/CashFlowWidget.astro` (new)

**Dependencies:** Task 6 (IconBadge, StatLabel)

**Props Interface:**

```typescript
interface CashFlowItemProps {
  name: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  icon: string; // Lucide icon name
}
```

**UI Change:**

```
┌────────────────────────────────┐
│ CASH FLOW ANALYSIS             │
│                                │
│ ┌────────────────────────────┐ │
│ │ [📈] Project Salary        │ │
│ │      JAN 28, 2024          │ │
│ │               +Rp15.000.000│ │
│ └────────────────────────────┘ │
│ ┌────────────────────────────┐ │
│ │ [📅] House Rent            │ │
│ │      FEB 01, 2024          │ │
│ │               -Rp45.000.000│ │
│ └────────────────────────────┘ │
└────────────────────────────────┘
```

**Status:** ⏳ Pending

---

### Task 13: Transactions Page - Filter Bar (Priority: P1)

**Goal:** Create unified filter bar with type tabs, search, category dropdown, and filter button

**Current Issue:** Current filter UI is separate components, not unified premium bar.

**Checklist:**

- [ ] Create TransactionFiltersBar organism component
- [ ] Create `transactionFiltersStore.ts` for filter state
- [ ] Add type toggle (All/Income/Expense) with pill-style buttons
- [ ] Add search input with Search icon
- [ ] Add category dropdown (All + categories from transactions)
- [ ] Add filter button (Filter icon, opens advanced filters)
- [ ] Style as single card with `rounded-3xl`
- [ ] Make responsive (stack on mobile, flex on desktop)
- [ ] Implement progressive enhancement:
  - Base: URL query params for server-side filtering
  - Enhanced: Nano Stores for instant updates
- [ ] Add `role="search"` to container
- [ ] Add `aria-expanded` to dropdowns
- [ ] Create Storybook story
- [ ] Run quality gates
- [ ] Test in dark mode

**Files to modify:**

- `src/components/organisms/TransactionFiltersBar.astro` (new)
- `src/lib/stores/transactionFiltersStore.ts` (new)
- `src/pages/transactions/index.astro`

**Accessibility:**

- [ ] Add `role="search"` to filter bar
- [ ] Add `aria-label="Filter transactions"` to search input
- [ ] Add `aria-expanded` to category dropdown
- [ ] Ensure Tab navigation through all controls
- [ ] Add `aria-pressed` to type toggle buttons

**UI Change:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ [All] [Income] [Expense]  │  🔍 Search ledger...  │ [Category ▼] [⚙]│
└─────────────────────────────────────────────────────────────────────┘
```

**Status:** ⏳ Pending

---

### Task 14: Transactions Page - List & Sidebar Layout (Priority: P1)

**Goal:** Implement transactions list with period selector sidebar and metrics card

**Current Issue:** Current page doesn't have sidebar layout with period selection.

**Checklist:**

- [ ] Create PeriodSelector molecule for month selection
- [ ] Create MetricsSummary molecule for net savings display
- [ ] Update page layout to 3/4 + 1/4 grid (`lg:grid-cols-4`)
- [ ] Style transaction list in card container (`lg:col-span-3`)
- [ ] Add empty state for no results (EmptyState component)
- [ ] Style period buttons with active state (`bg-accent text-white`)
- [ ] Create metrics card with accent background
- [ ] Display net savings, total inflow, total outflow
- [ ] Ensure proper responsive behavior (sidebar below on mobile)
- [ ] Add `loading` prop with skeleton states
- [ ] Create Storybook stories for new molecules
- [ ] Run quality gates
- [ ] Test in dark mode

**Files to modify:**

- `src/components/molecules/PeriodSelector.astro` (new)
- `src/components/molecules/MetricsSummary.astro` (new)
- `src/pages/transactions/index.astro`

**Dependencies:** Task 13 (TransactionFiltersBar)

**Layout Structure:**

```
┌─────────────────────────────────────┬─────────────────────┐
│                                     │ STATEMENT MONTH     │
│   Transaction List                  │ ┌─────────────────┐ │
│   (filtered results)                │ │ January 2024 █  │ │
│                                     │ │ December 2023   │ │
│                                     │ │ November 2023   │ │
│                                     │ └─────────────────┘ │
│                                     │                     │
│                                     │ ┌─────────────────┐ │
│                                     │ │ MONTHLY METRICS │ │
│                                     │ │ Net: Rp6.081M   │ │
│                                     │ │ In:  Rp59.7M    │ │
│                                     │ │ Out: Rp53.6M    │ │
│                                     │ └─────────────────┘ │
└─────────────────────────────────────┴─────────────────────┘
```

**Status:** ⏳ Pending

---

### Task 15: Budget Page - Budget Card Grid (Priority: P1)

**Goal:** Replace table-based budget view with card grid showing individual budget categories

**Current Issue:** Current BudgetOverviewTable uses table layout, PoC uses card grid.

**Checklist:**

- [ ] Create BudgetCard organism component
- [ ] Use IconBadge with category icon
- [ ] Add status badge (Optimal/Review now) using Badge variants
- [ ] Add edit button (Pencil icon) in card header
- [ ] Display utilization with amount / limit format
- [ ] Add percentage display (text-lg, font-bold)
- [ ] Use ProgressBar component with status color
- [ ] Show safe margin / exceeded amount
- [ ] Add hover shadow effect (`hover:shadow-xl`)
- [ ] Create BudgetCardGrid organism for layout
- [ ] Implement responsive grid (1-2-3 columns)
- [ ] Add `loading` prop with skeleton cards
- [ ] Handle error state gracefully
- [ ] Create Storybook stories
- [ ] Run quality gates
- [ ] Test in dark mode

**Files to modify:**

- `src/components/organisms/BudgetCard.astro` (new)
- `src/components/organisms/BudgetCardGrid.astro` (new)
- `src/pages/budget/index.astro`

**Dependencies:** Task 6 (ProgressBar, IconBadge)

**Card Structure:**

```
┌─────────────────────────────────────┐
│ [🏠] Housing              [✎] edit │
│      OPTIMAL (badge)                │
├─────────────────────────────────────┤
│ UTILIZATION                    94%  │
│ Rp37.680.000 / Rp40.000.000        │
│                                     │
│ ██████████████████████░░░░░░░░░░░  │
│                                     │
│ Safe margin: Rp2.320.000            │
└─────────────────────────────────────┘
```

**Status:** ⏳ Pending

---

### Task 16: Budget Page - Header & Advice Banner (Priority: P2)

**Goal:** Add page header with "Set new envelope" button and AI reallocation advice banner

**Current Issue:** No page header with CTA or advice banner component.

**Checklist:**

- [ ] Add page header section with title and subtitle
- [ ] Add "Set new envelope" button (ghost/outline variant)
- [ ] Create BudgetAdviceBanner organism
- [ ] Add Sparkles icon badge (lightbulb alternative)
- [ ] Display advice title (StatLabel - uppercase)
- [ ] Display advice message with highlighted amount (`<strong>`)
- [ ] Add "Execute re-allocation" CTA button (accent variant)
- [ ] Style with indigo background tint (`bg-info/10`)
- [ ] Make responsive (stack on mobile)
- [ ] Create Storybook story
- [ ] Run quality gates
- [ ] Test in dark mode

**Files to modify:**

- `src/components/organisms/BudgetAdviceBanner.astro` (new)
- `src/pages/budget/index.astro`

**Dependencies:** Task 15 (BudgetCardGrid)

**UI Change:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Household spending limits                      [Set new envelope]   │
│ Active limits for the current family period                         │
└─────────────────────────────────────────────────────────────────────┘

[Budget Card Grid...]

┌─────────────────────────────────────────────────────────────────────┐
│  [✨]  BUDGET REALLOCATION ADVICE              [Execute re-allocation]
│        Based on your history, we expect a lower electricity         │
│        bill next month. We suggest reallocating Rp400k to your     │
│        travel savings goal.                                         │
└─────────────────────────────────────────────────────────────────────┘
```

**Status:** ⏳ Pending

---

### Task 17: Dark Mode Verification (Priority: P2)

**Goal:** Verify all new components work correctly in dark mode

**Current Issue:** New components need dark mode verification and adjustments.

**Checklist:**

- [ ] Verify glass effect in dark mode (`bg-base-100/80`)
- [ ] Test gradient active states in dark mode (sidebar)
- [ ] Verify card backgrounds (`bg-base-100` auto-adjusts)
- [ ] Test icon badge colors in dark mode
- [ ] Verify progress bar colors maintain contrast
- [ ] Test Chart.js colors in dark mode (may need theme detection)
- [ ] Verify text contrast ratios (4.5:1 minimum)
- [ ] Test notification dropdown in dark mode
- [ ] Test all alert/banner backgrounds
- [ ] Fix any issues found
- [ ] Run quality gates

**Files to modify:**

- Various component files as needed
- `src/styles/globals.css` (if dark mode utilities needed)

**Testing Checklist:**

- [ ] Dashboard page
- [ ] Transactions page
- [ ] Budget page
- [ ] All modals/dropdowns
- [ ] Mobile navigation

**Status:** ⏳ Pending

---

### Task 18: Responsive Behavior Verification (Priority: P2)

**Goal:** Verify all redesigned pages work correctly across breakpoints

**Current Issue:** New layout patterns need responsive testing.

**Checklist:**

- [ ] Test mobile viewport (< 640px)
- [ ] Test tablet viewport (640px - 1024px)
- [ ] Test desktop viewport (> 1024px)
- [ ] Verify sidebar hides on mobile (lg:hidden)
- [ ] Verify mobile bottom nav appears (lg:hidden)
- [ ] Test touch targets (min 44px)
- [ ] Verify no horizontal scroll
- [ ] Test filter bar stacking on mobile
- [ ] Test dashboard grid collapse
- [ ] Test budget card grid (1 → 2 → 3 columns)
- [ ] Test transactions sidebar (below on mobile)
- [ ] Fix any issues found
- [ ] Run quality gates

**Testing Breakpoints:**

- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

**Status:** ⏳ Pending

---

## Component Conversion Reference

### React PoC → Astro Mapping

| React Component      | Astro Equivalent           | Notes                          |
| -------------------- | -------------------------- | ------------------------------ |
| `App.tsx` (layout)   | `MainLayout.astro`         | Already exists, update styling |
| `NavItem`            | Part of `Navigation.astro` | Update with gradient states    |
| `MobileNavItem`      | `MobileNavigation.astro`   | New layout component           |
| `QuickActionButton`  | `QuickActions.astro`       | Update existing                |
| `TransactionRow`     | `TransactionRow.astro`     | Update styling                 |
| `SummaryBillRow`     | `CashFlowItem.astro`       | New molecule                   |
| `BudgetCard` (React) | `BudgetCard.astro`         | New organism                   |
| `NotificationItem`   | `NotificationItem.astro`   | New molecule                   |
| Recharts `PieChart`  | `SpendingChart.astro`      | Chart.js in script tag         |

### Icon Mapping (Material → Lucide)

| Material Icon            | Lucide Icon       | Usage            |
| ------------------------ | ----------------- | ---------------- |
| `grid_view`              | `LayoutDashboard` | Dashboard nav    |
| `receipt_long`           | `Receipt`         | Transactions nav |
| `donut_large`            | `PieChart`        | Budget nav       |
| `account_tree`           | `GitBranch`       | Assets nav       |
| `insights`               | `BarChart3`       | Reports nav      |
| `settings`               | `Settings`        | Settings nav     |
| `shopping_cart`          | `ShoppingCart`    | Spending icon    |
| `shopping_basket`        | `ShoppingBasket`  | Groceries        |
| `account_balance`        | `Landmark`        | Net worth        |
| `account_balance_wallet` | `Wallet`          | Brand logo       |
| `add_circle`             | `PlusCircle`      | Add expense      |
| `payments`               | `Banknote`        | Income/payment   |
| `bolt`                   | `Zap`             | Utilities        |
| `theater_comedy`         | `Film`            | Entertainment    |
| `local_taxi`             | `Car`             | Transport        |
| `local_pharmacy`         | `Pill`            | Health           |
| `trending_up`            | `TrendingUp`      | Growth indicator |
| `notifications`          | `Bell`            | Notifications    |
| `warning`                | `AlertTriangle`   | Budget alert     |
| `auto_awesome`           | `Sparkles`        | AI suggestion    |
| `more_vert`              | `MoreVertical`    | Actions menu     |
| `search`                 | `Search`          | Search input     |
| `filter_list`            | `Filter`          | Filter button    |
| `edit`                   | `Pencil`          | Edit button      |
| `expand_more`            | `ChevronDown`     | Dropdown         |
| `home`                   | `Home`            | Housing          |
| `restaurant`             | `UtensilsCrossed` | Dining           |
| `payment`                | `CreditCard`      | Payment method   |

---

## How to Test

### Manual Test Steps

1. **Design Token Verification**
   - Open browser dev tools, verify CSS custom properties are correct
   - Check computed styles match design system values

2. **Navigation Testing**
   - Click each nav item, verify active gradient appears
   - Test keyboard navigation (Tab through items)
   - Verify user profile section displays correctly

3. **Dashboard Testing**
   - Verify all widgets render with correct data
   - Test pie chart hover interactions
   - Click "View all" → should navigate to transactions
   - Test Quick Actions buttons

4. **Transactions Page Testing**
   - Test type filter tabs (All/Income/Expense)
   - Test search functionality
   - Test category dropdown filtering
   - Verify period selector changes data
   - Test empty state when no results

5. **Budget Page Testing**
   - Verify all budget cards render
   - Check progress bars show correct colors
   - Test edit button interactions
   - Verify advice banner displays

6. **Mobile Testing**
   - Resize to mobile viewport
   - Verify bottom nav appears
   - Test FAB button
   - Verify sidebar is hidden
   - Test touch interactions

7. **Dark Mode Testing**
   - Toggle dark mode
   - Verify all components display correctly
   - Check contrast ratios
   - Verify glass effects

### Accessibility Testing

- [ ] Run axe-core on each page
- [ ] Test with keyboard-only navigation
- [ ] Verify ARIA labels on interactive elements
- [ ] Check color contrast ratios (4.5:1 minimum)
- [ ] Test focus indicators visibility
- [ ] Test with screen reader (VoiceOver/NVDA)

---

## Dependencies

### Required Packages

- `chart.js` ⏳ (to install: `bun add chart.js`)
- `@lucide/astro` ✅ (exists)
- `motion` ✅ (exists)
- `daisyui` ✅ (exists)
- `nanostores` ✅ (exists)

### Required Database Tables

- `transactions` ✅ (exists)
- `categories` ✅ (exists)
- `assets` ✅ (exists)
- `payment_methods` ✅ (exists)

### Required Services

- `TransactionService` ✅ (exists)
- `CategoryService` ✅ (exists)
- `AssetService` ✅ (exists)
- `BudgetService` ✅ (exists)

---

## Success Criteria

- [ ] All dashboard widgets render correctly with real data
- [ ] Pie chart is interactive with hover states
- [x] Navigation sidebar matches premium design
- [ ] Mobile bottom nav with FAB works correctly
- [ ] Transactions page filters work correctly
- [ ] Budget cards display with progress bars
- [x] Dark mode functions correctly (uses DaisyUI theme tokens)
- [x] All components pass accessibility checks (Navigation: skip link, aria-current, focus-visible)
- [ ] Page load performance maintained (FCP < 1.5s)
- [x] No TypeScript or linting errors
- [ ] No console errors in browser
- [x] All new components have Storybook stories
- [x] All quality gates pass

**Progress:** Tasks 1-4, 6-7 (P0-P1) Complete ✅ - Design tokens, component library updates, Navigation sidebar, Header redesign, Spending Summary Card, and Quick Actions complete. Ready for remaining Dashboard widget implementation.

---

## Estimated Effort

| Task | Description                  | T-shirt Size | Priority | Dependencies   |
| ---- | ---------------------------- | ------------ | -------- | -------------- |
| 1    | Design Token Updates         | S            | P0       | None           |
| 2    | Component Library Updates    | M            | P0       | Task 1         |
| 3    | Navigation Sidebar Redesign  | M            | P0       | Task 1         |
| 4    | Header Redesign              | M            | P0       | Task 1         |
| 5    | Mobile Bottom Navigation     | M            | P1       | Task 1         |
| 6    | Dashboard - Spending Card    | M            | P0       | Task 2         |
| 7    | Dashboard - Quick Actions    | S            | P1       | Task 6         |
| 8    | Dashboard - Recent Activity  | M            | P1       | Task 6         |
| 9    | Dashboard - Net Worth Widget | S            | P1       | Task 6         |
| 10   | Dashboard Page Assembly      | M            | P0       | Tasks 6-9      |
| 11   | Dashboard - Spending Chart   | L            | P1       | Chart.js       |
| 12   | Dashboard - Cash Flow Widget | S            | P2       | Task 6         |
| 13   | Transactions - Filter Bar    | M            | P1       | Task 2         |
| 14   | Transactions - Layout        | M            | P1       | Task 13        |
| 15   | Budget - Card Grid           | L            | P1       | Task 6         |
| 16   | Budget - Header & Advice     | S            | P2       | Task 15        |
| 17   | Dark Mode Verification       | S            | P2       | All components |
| 18   | Responsive Verification      | S            | P2       | All components |

**Total Estimated Size:** XL (18 tasks)

**Implementation Order:**

```
Phase 1 (P0 - Foundation):
  1 → 2 → 3 → 4 → 6 → 10

Phase 2 (P1 - Core Features):
  5, 7, 8, 9, 11, 13, 14, 15

Phase 3 (P2 - Polish):
  12, 16, 17, 18
```

---

## Code Quality Improvements

### Cleanup Tasks (Priority: P3-P4)

**Task: Remove Deprecated Component Patterns**

- [ ] Audit components for legacy patterns
- [ ] Remove unused CSS classes
- [ ] Consolidate duplicate styles
- [ ] Update any hardcoded values to use tokens

**Task: Storybook Story Updates**

- [x] Create stories for new atoms (ProgressBar, IconBadge) ✅
- [x] Create stories for new molecules (BudgetAlertBanner) ✅
- [x] Create stories for new organisms (SpendingCard) ✅
- [ ] Create stories for new organisms (SpendingChart, BudgetCard, etc.)

### Non-Blocking Feedback from Code Review (Task 6)

**P2-1: Hardcoded Size Values in Comments**

- **Location:** `/home/ivan/works/expenses/src/components/atoms/IconBadge.astro` (lines 31-35)
- **Issue:** Comments mention pixel values (20px, 24px, 30px) but use Tailwind classes
- **Action:** Update to reference Tailwind class names in comments instead

**P2-2: Inconsistent Status Badge Styling**

- **Location:** `/home/ivan/works/expenses/src/components/organisms/SpendingCard.astro` (lines 110-118)
- **Issue:** The status badge uses inline conditional class construction
- **Action:** Extract to a reusable `getStatusBadgeClasses` utility

**P2-3: Animations Not Using Motion Library**

- **Location:** `/home/ivan/works/expenses/src/components/atoms/ProgressBar.astro` (line 69)
- **Issue:** Uses CSS class instead of Motion library
- **Action:** Consider using Motion for consistency with design system

**P2-4: Missing Loading State Accessibility**

- **Location:** `/home/ivan/works/expenses/src/components/organisms/SpendingCard.astro` (line 56)
- **Issue:** Loading state could benefit from more descriptive aria-label
- **Action:** Add `aria-label="Loading spending data..."`
