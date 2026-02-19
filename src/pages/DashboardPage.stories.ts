import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Pages/Dashboard',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Page Overview
Dashboard page assembly with premium redesign layout featuring widgets and summary components.

### Container and Spacing

| Property | Value | Class |
|----------|-------|-------|
| Max width | 7xl | \`max-w-7xl\` |
| Horizontal | Centered | \`mx-auto\` |
| Padding (sm) | 0.5rem | \`sm:px-2\` |
| Padding (lg) | 1.5rem | \`lg:px-6\` |
| Vertical gap (base) | 1.5rem | \`space-y-6\` |
| Vertical gap (sm+) | 2rem | \`sm:space-y-8\` |

### Layout Structure

#### Quick Actions Row
- Position: Top of dashboard content
- Component: QuickActions

#### Primary Grid

| Property | Value |
|----------|-------|
| Columns (base) | 1 |
| Columns (lg+) | 2 |
| Gap | 2rem (\`gap-8\`) |

| Column | Component |
|--------|-----------|
| Left | SpendingCard |
| Right | SpendingChart |

#### Secondary Grid

| Property | Value |
|----------|-------|
| Columns (base) | 1 |
| Columns (xl+) | 3 |
| Gap | 2rem (\`gap-8\`) |

| Area | Component | Span |
|------|-----------|------|
| Main content | RecentTransactionsList | xl:col-span-2 |
| Sidebar | AccountsWidget + CashFlowWidget | space-y-8 stack |

### Component Dependencies

| Component | Purpose |
|-----------|---------|
| QuickActions | Quick action buttons row |
| SpendingCard | Spending summary card |
| SpendingChart | Spending visualization chart |
| RecentTransactionsList | Recent activity list |
| AccountsWidget | Net worth display |
| CashFlowWidget | Cash flow summary |

### Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| Mobile | Single column, stacked layout |
| sm (640px+) | Increased spacing |
| lg (1024px+) | Primary grid becomes 2 columns |
| xl (1280px+) | Secondary grid becomes 3 columns |

### Mobile Layout
- No extra horizontal padding (uses MainLayout's p-4)
- Vertical spacing: space-y-6

### Desktop Layout (lg+)
- Adds minimal padding for visual separation
- Primary grid: 2 columns (SpendingCard | SpendingChart)

### Large Desktop (xl+)
- Secondary grid: 3 columns
- RecentTransactionsList spans 2 columns
- Sidebar widgets stack vertically

### Spacing Strategy
- Outer container: space-y-8 for section separation
- Primary grid: gap-8
- Secondary grid: gap-8
- Sidebar stack: space-y-8
        `,
      },
    },
  },
};

export default meta;

// TODO: P2 - Add more story variants: Loading, Error, Empty (no transactions), Mobile viewport

const createDashboardPage = (): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'max-w-7xl mx-auto sm:px-2 lg:px-6 space-y-6 sm:space-y-8';

  // Quick Actions
  const quickActions = document.createElement('div');
  quickActions.className = 'flex flex-wrap gap-3';
  quickActions.innerHTML = `
    <button class="btn btn-accent btn-sm gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
      New Transaction
    </button>
    <button class="btn btn-outline btn-sm gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
      Import
    </button>
    <button class="btn btn-outline btn-sm gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
      Export
    </button>
  `;
  container.appendChild(quickActions);

  // Primary Grid
  const primaryGrid = document.createElement('div');
  primaryGrid.className = 'grid grid-cols-1 lg:grid-cols-2 gap-8';

  // SpendingCard
  const spendingCard = document.createElement('div');
  spendingCard.className = 'card bg-base-100 border border-base-300 p-6';
  spendingCard.innerHTML = `
    <h3 class="text-lg font-bold text-base-content mb-4">Monthly Spending</h3>
    <div class="text-3xl font-bold text-base-content mb-2">Rp 4,250,000</div>
    <p class="text-sm text-neutral">of Rp 8,000,000 budget</p>
    <progress class="progress progress-accent w-full mt-4" value="53" max="100"></progress>
  `;
  primaryGrid.appendChild(spendingCard);

  // SpendingChart
  const spendingChart = document.createElement('div');
  spendingChart.className = 'card bg-base-100 border border-base-300 p-6';
  spendingChart.innerHTML = `
    <h3 class="text-lg font-bold text-base-content mb-4">Spending by Category</h3>
    <div class="h-48 flex items-center justify-center text-base-content/30">
      [Chart Placeholder]
    </div>
  `;
  primaryGrid.appendChild(spendingChart);

  container.appendChild(primaryGrid);

  // Secondary Grid
  const secondaryGrid = document.createElement('div');
  secondaryGrid.className = 'grid grid-cols-1 xl:grid-cols-3 gap-8';

  // RecentTransactionsList
  const transactionsList = document.createElement('div');
  transactionsList.className = 'xl:col-span-2 card bg-base-100 border border-base-300';

  const transactionsBody = document.createElement('div');
  transactionsBody.className = 'card-body';
  transactionsBody.innerHTML = `
    <h3 class="text-lg font-bold text-base-content mb-4">Recent Transactions</h3>
    <div class="space-y-3">
      <div class="flex justify-between items-center py-2 border-b border-base-200">
        <div>
          <p class="font-medium text-base-content">Grocery Store</p>
          <p class="text-sm text-neutral">Food & Dining</p>
        </div>
        <span class="text-error font-bold">-Rp 450,000</span>
      </div>
      <div class="flex justify-between items-center py-2 border-b border-base-200">
        <div>
          <p class="font-medium text-base-content">Salary</p>
          <p class="text-sm text-neutral">Income</p>
        </div>
        <span class="text-success font-bold">+Rp 15,000,000</span>
      </div>
      <div class="flex justify-between items-center py-2 border-b border-base-200">
        <div>
          <p class="font-medium text-base-content">Electric Bill</p>
          <p class="text-sm text-neutral">Utilities</p>
        </div>
        <span class="text-error font-bold">-Rp 350,000</span>
      </div>
    </div>
    <a href="/transactions" class="btn btn-ghost btn-sm mt-4">View all transactions</a>
  `;
  transactionsList.appendChild(transactionsBody);
  secondaryGrid.appendChild(transactionsList);

  // Sidebar Stack
  const sidebar = document.createElement('div');
  sidebar.className = 'space-y-8';

  // AccountsWidget
  const netWorth = document.createElement('div');
  netWorth.className = 'card bg-base-100 border border-base-300 p-6';
  netWorth.innerHTML = `
    <h3 class="text-lg font-bold text-base-content mb-4">Net Worth</h3>
    <div class="text-2xl font-bold text-accent">Rp 125,000,000</div>
    <p class="text-sm text-success mt-2">+5.2% from last month</p>
  `;
  sidebar.appendChild(netWorth);

  // CashFlowWidget
  const cashFlow = document.createElement('div');
  cashFlow.className = 'card bg-base-100 border border-base-300 p-6';
  cashFlow.innerHTML = `
    <h3 class="text-lg font-bold text-base-content mb-4">Cash Flow</h3>
    <div class="space-y-2">
      <div class="flex justify-between">
        <span class="text-neutral">Income</span>
        <span class="text-success font-bold">+Rp 15,000,000</span>
      </div>
      <div class="flex justify-between">
        <span class="text-neutral">Expenses</span>
        <span class="text-error font-bold">-Rp 4,250,000</span>
      </div>
      <div class="border-t border-base-200 pt-2 mt-2">
        <div class="flex justify-between">
          <span class="font-medium text-base-content">Net</span>
          <span class="text-accent font-bold">+Rp 10,750,000</span>
        </div>
      </div>
    </div>
  `;
  sidebar.appendChild(cashFlow);

  secondaryGrid.appendChild(sidebar);
  container.appendChild(secondaryGrid);

  return container;
};

export const Default: StoryObj = {
  render: () => createDashboardPage(),
};
