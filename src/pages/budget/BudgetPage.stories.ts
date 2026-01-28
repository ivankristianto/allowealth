import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Pages/Budget/Index',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Page Overview
Main budget page with premium redesign featuring BudgetCardGrid and BudgetPageHeader.

### Page Components

| Component | Purpose |
|-----------|---------|
| BudgetPageHeader | Title, budget count, month navigation, action buttons |
| BudgetCardGrid | Grid of budget cards per category |
| BudgetAdviceBanner | Alerts for exceeded/warning budgets |
| SetNewBudgetModal | Dialog for creating/editing budgets |

### BudgetPageHeader Features

| Feature | Description |
|---------|-------------|
| Title | "Family Spending Targets" |
| Subtitle | "Monitoring X critical expense categories" |
| Month Navigation | Previous/next buttons with current month display |
| View History | Links to /budget/history with History icon |
| AI Rebalancer | Shows when budgetCount > 0, Sparkles icon |
| Set New Budget | Opens modal dialog |

### Navigation Controls

| Button | Icon | Behavior |
|--------|------|----------|
| Previous month | ChevronLeft | Navigate to prior month |
| Next month | ChevronRight | Disabled if future month |
| View History | History | Link to /budget/history |
| AI Rebalancer | Sparkles | Conditional on budgetCount > 0 |

### Query Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| year | Current year | Budget year filter |
| month | Current month | Budget month filter |
| currency | IDR | Currency (IDR or USD) |

### SetNewBudgetModal

| Field | Type | Validation |
|-------|------|------------|
| Category | Select | Required, populated with expense categories |
| Budget Amount | Number | Required, min: 0, step: 0.01 |
| Warning | Info alert | Shows when category has existing budget |

### Modal Behavior
- No close X button (\`closable={false}\`)
- Cancel: closes modal and resets form
- Save: submits to API, shows toast notification

### Accessibility

| Element | ARIA |
|---------|------|
| Previous month | \`aria-label="Previous month"\` |
| Next month | \`aria-label="Next month"\` |
| All icons | \`aria-hidden="true"\` |
| Error message | \`role="alert"\` |
| Form inputs | Associated labels |

### Client-Side Behavior
- Edit button stops event propagation
- Modal pre-fills data from \`data-expense-categories\`
- Form checks existing budget on category change
- API submission without page reload
- Toast notifications on success/error
- Initialized on DOMContentLoaded and astro:page-load

### Data Flow
1. Fetch from \`budgetService.getMonthlyOverview()\`
2. Fetch alerts from \`budgetService.getAlerts()\`
3. Fetch categories from \`categoryService.findAll()\`
4. Handle errors gracefully with error state

### Service Dependencies
- \`budgetService\` - Budget data and alerts
- \`categoryService\` - Expense categories
- \`formatCurrency\` - Currency formatting utility
        `,
      },
    },
  },
  argTypes: {
    budgetCount: { control: 'number' },
    hasAlerts: { control: 'boolean' },
    hasError: { control: 'boolean' },
    isLoading: { control: 'boolean' },
  },
};

export default meta;

const createBudgetPage = (args: {
  budgetCount?: number;
  hasAlerts?: boolean;
  hasError?: boolean;
  isLoading?: boolean;
}): HTMLElement => {
  const { budgetCount = 5, hasAlerts = true, hasError = false, isLoading = false } = args;

  const container = document.createElement('div');
  container.className = 'max-w-7xl mx-auto p-6 space-y-6';
  container.setAttribute('data-budget-container', '');

  // Header
  const header = document.createElement('div');
  header.className = 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4';
  header.innerHTML = `
    <div>
      <h1 class="text-2xl font-bold text-base-content">Family Spending Targets</h1>
      <p class="text-sm text-neutral mt-1">Monitoring ${budgetCount} critical expense categories</p>
    </div>
    <div class="flex flex-wrap items-center gap-3">
      <div class="join">
        <button class="join-item btn btn-sm btn-ghost" aria-label="Previous month">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <span class="join-item btn btn-sm btn-ghost pointer-events-none">January 2025</span>
        <button class="join-item btn btn-sm btn-ghost" aria-label="Next month" disabled>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
      <a href="/budget/history" class="btn btn-outline btn-sm gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
        View History
      </a>
      ${
        budgetCount > 0
          ? `
        <button class="btn btn-outline btn-sm gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
          AI Rebalancer
        </button>
      `
          : ''
      }
      <button class="btn btn-accent btn-sm gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Set New Budget
      </button>
    </div>
  `;
  container.appendChild(header);

  // Alert Banner
  if (hasAlerts && !hasError && !isLoading) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-warning';
    alert.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
      <div>
        <p class="font-bold">Food & Dining is over budget</p>
        <p class="text-sm">You've exceeded by Rp 250,000</p>
      </div>
      <a href="/transactions" class="btn btn-sm">Review spending</a>
    `;
    container.appendChild(alert);
  }

  // Error State
  if (hasError) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.setAttribute('role', 'alert');
    errorDiv.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
      <span>Failed to load budget data. Please try again.</span>
    `;
    container.appendChild(errorDiv);
  } else if (isLoading) {
    // Loading skeleton
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
    for (let i = 0; i < 6; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'card bg-base-100 border border-base-300 p-4 animate-pulse';
      skeleton.innerHTML = `
        <div class="h-4 bg-base-300 rounded w-1/2 mb-4"></div>
        <div class="h-8 bg-base-300 rounded w-3/4 mb-2"></div>
        <div class="h-2 bg-base-300 rounded w-full"></div>
      `;
      grid.appendChild(skeleton);
    }
    container.appendChild(grid);
  } else if (budgetCount === 0) {
    // Empty state
    const empty = document.createElement('div');
    empty.className = 'text-center py-12';
    empty.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto text-base-content/30 mb-4" aria-hidden="true"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
      <h3 class="text-lg font-semibold text-base-content mb-2">No budgets set</h3>
      <p class="text-base-content/60 mb-4">Create your first budget to start tracking spending</p>
      <button class="btn btn-accent">Set New Budget</button>
    `;
    container.appendChild(empty);
  } else {
    // Budget cards grid
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

    const categories = [
      { name: 'Food & Dining', spent: 2500000, budget: 2000000, status: 'exceeded' },
      { name: 'Transportation', spent: 800000, budget: 1000000, status: 'ok' },
      { name: 'Entertainment', spent: 450000, budget: 500000, status: 'warning' },
      { name: 'Utilities', spent: 600000, budget: 800000, status: 'ok' },
      { name: 'Shopping', spent: 1200000, budget: 1500000, status: 'ok' },
    ];

    categories.slice(0, budgetCount).forEach((cat) => {
      const card = document.createElement('div');
      const statusColor =
        cat.status === 'exceeded'
          ? 'border-error'
          : cat.status === 'warning'
            ? 'border-warning'
            : 'border-base-300';
      card.className = `card bg-base-100 border ${statusColor} p-4`;
      card.innerHTML = `
        <div class="flex justify-between items-start mb-2">
          <span class="font-semibold text-base-content">${cat.name}</span>
          <button class="btn btn-ghost btn-xs" aria-label="Edit budget">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </button>
        </div>
        <p class="text-2xl font-bold text-base-content">Rp ${(cat.spent / 1000000).toFixed(1)}M</p>
        <p class="text-sm text-neutral mb-2">of Rp ${(cat.budget / 1000000).toFixed(1)}M</p>
        <progress class="progress ${cat.status === 'exceeded' ? 'progress-error' : cat.status === 'warning' ? 'progress-warning' : 'progress-accent'} w-full" value="${Math.min((cat.spent / cat.budget) * 100, 100)}" max="100"></progress>
      `;
      grid.appendChild(card);
    });
    container.appendChild(grid);
  }

  return container;
};

export const Default: StoryObj = {
  args: { budgetCount: 5, hasAlerts: true, hasError: false, isLoading: false },
  render: (args) => createBudgetPage(args),
};

export const NoBudgets: StoryObj = {
  args: { budgetCount: 0, hasAlerts: false, hasError: false, isLoading: false },
  render: (args) => createBudgetPage(args),
};

export const Loading: StoryObj = {
  args: { budgetCount: 5, hasAlerts: false, hasError: false, isLoading: true },
  render: (args) => createBudgetPage(args),
};

export const ErrorState: StoryObj = {
  args: { budgetCount: 5, hasAlerts: false, hasError: true, isLoading: false },
  render: (args) => createBudgetPage(args),
};

export const NoAlerts: StoryObj = {
  args: { budgetCount: 5, hasAlerts: false, hasError: false, isLoading: false },
  render: (args) => createBudgetPage(args),
};
