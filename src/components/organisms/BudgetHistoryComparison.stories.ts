import type { Meta, StoryObj } from '@storybook/html';
import type { MonthlyBudgetData } from './BudgetHistoryComparison.astro';
import { formatCurrency } from '@/lib/formatting/currency-client';
import { formatPercentage } from '@/lib/formatting/percentage';
import { IconRenderers } from '../../../.storybook/lucide-icons';

const { Download } = IconRenderers;

const meta: Meta = {
  title: 'Organisms/BudgetHistoryComparison',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment
| Property | Value | Class |
|----------|-------|-------|
| Export Button Icon | Download | size={16}, stroke-current |
| Progress Bar | Native div | h-2 rounded-full with color coding |

### Layout
- Header with title "Budget History" and export button
- Desktop: 7-column grid (Month, Budget, Spent, Balance, Status, Change, actions)
- Mobile: Card layout with stacked info
- Uses Card component with shadow and border

### Column Structure (Desktop)
| Column | Content | Width |
|--------|---------|-------|
| Month | Name + Year + Current badge | col-span-2 |
| Budget | Formatted amount | col-span-1, text-right |
| Spent | Formatted amount | col-span-1, text-right |
| Balance | +/- formatted amount | col-span-1, text-right |
| Status | Badge with percentage | col-span-1, text-center |
| Change | Month-over-month % | col-span-1, text-center |

### Status Badge Variants
| Percentage | Badge Variant | Progress Color |
|------------|---------------|----------------|
| >= 100% | error | bg-error |
| >= 80% | warning | bg-warning |
| < 80% | success | bg-success |

### Change Indicator Colors
| Change | Color | Meaning |
|--------|-------|---------|
| Positive | text-error | Spending increased (bad) |
| Negative | text-success | Spending decreased (good) |
| Zero | text-base-content/60 | No change |
| N/A | text-base-content/40 | No previous data |

### Current Month Highlighting
- Background: bg-primary/5
- Shows "Current" badge (variant="primary")

### Export Button
- Disabled with "Coming soon" tooltip
- Badge variant="neutral" with "Soon" text

### Empty State
- Uses EmptyState component
- Title: "No budget history available"
- Action: "Start Tracking" -> /transactions/add

### Accessibility
- Download icon: aria-hidden="true"
- Progress bar: role="progressbar" with aria-valuenow/min/max
- Progress bar has descriptive aria-label
- Proper heading hierarchy (h2)
- Semantic button element for export

### Responsive Design
- Mobile: grid-cols-1 card layout
- Desktop: grid-cols-7 table-like layout
- Header: flex-col on mobile, sm:flex-row on desktop
- Hover effect on table rows: hover:bg-base-100

### Data Display
- Currency formatting: formatCurrency(amount, currency)
- Percentage formatting: formatPercentage(percentage)
- Balance indicator: + for positive, - for negative
- Sorted by date (newest first): year desc, month desc
        `,
      },
    },
  },
  argTypes: {
    history: {
      control: 'object',
      description: 'Array of monthly budget data',
    },
    currency: {
      control: 'select',
      options: ['IDR', 'USD'],
      description: 'Currency code for formatting',
    },
    currentMonth: {
      control: 'number',
      description: 'Current month number (1-12)',
    },
    currentYear: {
      control: 'number',
      description: 'Current year',
    },
  },
};

export default meta;

const mockHistory: MonthlyBudgetData[] = [
  {
    month: 1,
    year: 2025,
    month_name: 'January',
    total_budget: '5000000',
    total_spent: '4250000',
    total_balance: '750000',
    categories_count: 8,
    categories_exceeded: 1,
    categories_warning: 2,
    percentage_used: 85,
  },
  {
    month: 12,
    year: 2024,
    month_name: 'December',
    total_budget: '5000000',
    total_spent: '5500000',
    total_balance: '-500000',
    categories_count: 8,
    categories_exceeded: 3,
    categories_warning: 1,
    percentage_used: 110,
  },
  {
    month: 11,
    year: 2024,
    month_name: 'November',
    total_budget: '4500000',
    total_spent: '3200000',
    total_balance: '1300000',
    categories_count: 7,
    categories_exceeded: 0,
    categories_warning: 1,
    percentage_used: 71,
  },
  {
    month: 10,
    year: 2024,
    month_name: 'October',
    total_budget: '4500000',
    total_spent: '4000000',
    total_balance: '500000',
    categories_count: 7,
    categories_exceeded: 0,
    categories_warning: 2,
    percentage_used: 89,
  },
];

const getStatusBadge = (percentage: number): string => {
  if (percentage >= 100) return 'badge-error';
  if (percentage >= 80) return 'badge-warning';
  return 'badge-success';
};

const getProgressColor = (percentage: number): string => {
  if (percentage >= 100) return 'bg-error';
  if (percentage >= 80) return 'bg-warning';
  return 'bg-success';
};

const getChangeIndicator = (
  current: number,
  previous: number | null
): { value: string; class: string } => {
  if (previous === null || previous === 0) {
    return { value: 'N/A', class: 'text-base-content/40' };
  }

  const change = ((current - previous) / previous) * 100;
  const absChange = Math.abs(change).toFixed(1);

  if (change > 0) {
    return { value: `+${absChange}%`, class: 'text-error' };
  } else if (change < 0) {
    return { value: `-${absChange}%`, class: 'text-success' };
  }

  return { value: '0%', class: 'text-base-content/60' };
};

const createBudgetHistoryComparison = (args: {
  history?: MonthlyBudgetData[];
  currency?: 'IDR' | 'USD';
  currentMonth?: number;
  currentYear?: number;
}): HTMLElement => {
  const { history = mockHistory, currency = 'IDR', currentMonth = 1, currentYear = 2025 } = args;

  const container = document.createElement('div');
  container.className = 'p-4 bg-base-100 space-y-6';
  container.setAttribute('data-budget-history-comparison', '');

  // Header
  const header = document.createElement('div');
  header.className = 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4';

  const titleSection = document.createElement('div');
  titleSection.innerHTML = `
    <h2 class="text-2xl font-bold">Budget History</h2>
    <p class="text-base-content/60">Compare your budget performance over time</p>
  `;
  header.appendChild(titleSection);

  const downloadIcon = Download.render(
    { size: 16, class: 'stroke-current' },
    { 'aria-hidden': 'true' }
  );
  const exportButton = document.createElement('button');
  exportButton.className = 'btn btn-outline btn-sm gap-2';
  exportButton.disabled = true;
  exportButton.title = 'Coming soon';
  exportButton.innerHTML = `
    ${downloadIcon.outerHTML}
    Export Report
    <span class="badge badge-neutral badge-sm">Soon</span>
  `;
  header.appendChild(exportButton);

  container.appendChild(header);

  if (history.length === 0) {
    // Empty state
    const emptyCard = document.createElement('div');
    emptyCard.className = 'card bg-base-100 shadow border border-base-300';
    emptyCard.innerHTML = `
      <div class="card-body text-center py-12">
        <h3 class="text-lg font-semibold mb-2">No budget history available</h3>
        <p class="text-base-content/60 mb-4">Budget history will appear here as you track your spending over time.</p>
        <a href="/transactions/add" class="btn btn-primary btn-sm">Start Tracking</a>
      </div>
    `;
    container.appendChild(emptyCard);
    return container;
  }

  // Sort history by date (newest first)
  const sortedHistory = [...history].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  // History table
  const card = document.createElement('div');
  card.className = 'card bg-base-100 shadow border border-base-300 overflow-hidden';

  // Desktop header
  const tableHeader = document.createElement('div');
  tableHeader.className =
    'hidden md:grid grid-cols-7 gap-4 px-6 py-4 bg-base-200/50 text-sm font-semibold text-base-content/60';
  tableHeader.innerHTML = `
    <div class="col-span-2">Month</div>
    <div class="col-span-1 text-right">Budget</div>
    <div class="col-span-1 text-right">Spent</div>
    <div class="col-span-1 text-right">Balance</div>
    <div class="col-span-1 text-center">Status</div>
    <div class="col-span-1 text-center">Change</div>
  `;
  card.appendChild(tableHeader);

  // History items
  const itemsContainer = document.createElement('div');
  itemsContainer.className = 'divide-y divide-base-200';

  sortedHistory.forEach((monthData, index) => {
    const budgetAmount = parseFloat(monthData.total_budget);
    const spentAmount = parseFloat(monthData.total_spent);
    const balance = parseFloat(monthData.total_balance);
    const percentageUsed = monthData.percentage_used;

    const previousMonth = sortedHistory[index + 1];
    const previousSpent = previousMonth ? parseFloat(previousMonth.total_spent) : null;
    const changeIndicator = getChangeIndicator(spentAmount, previousSpent);

    const isCurrentMonth = monthData.month === currentMonth && monthData.year === currentYear;

    const row = document.createElement('div');
    row.className = `grid grid-cols-1 md:grid-cols-7 gap-2 md:gap-4 py-4 px-6 hover:bg-base-100 transition-colors ${isCurrentMonth ? 'bg-primary/5' : ''}`;

    // Mobile view
    const mobileView = document.createElement('div');
    mobileView.className = 'md:hidden col-span-full space-y-3';
    mobileView.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="font-bold text-lg">${monthData.month_name}</span>
          <span class="text-base-content/60">${monthData.year}</span>
          ${isCurrentMonth ? '<span class="badge badge-primary badge-sm">Current</span>' : ''}
        </div>
        <span class="badge ${getStatusBadge(percentageUsed)} badge-sm">${formatPercentage(percentageUsed)}</span>
      </div>
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div class="text-base-content/60">Budget</div>
          <div class="font-medium">${formatCurrency(budgetAmount, currency)}</div>
        </div>
        <div>
          <div class="text-base-content/60">Spent</div>
          <div class="font-medium">${formatCurrency(spentAmount, currency)}</div>
        </div>
        <div>
          <div class="text-base-content/60">Balance</div>
          <div class="font-medium ${balance >= 0 ? 'text-success' : 'text-error'}">
            ${balance >= 0 ? '+' : '-'}${formatCurrency(Math.abs(balance), currency)}
          </div>
        </div>
        <div>
          <div class="text-base-content/60">vs Prev Month</div>
          <div class="font-medium ${changeIndicator.class}">${changeIndicator.value}</div>
        </div>
      </div>
      <div class="pt-1">
        <div class="w-full bg-base-300 rounded-full h-2 overflow-hidden">
          <div
            class="h-full ${getProgressColor(percentageUsed)} transition-all duration-300"
            style="width: ${Math.min(percentageUsed, 100)}%"
            role="progressbar"
            aria-valuenow="${percentageUsed}"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label="${monthData.month_name}: ${formatPercentage(percentageUsed)} of budget used"
          ></div>
        </div>
      </div>
      ${
        monthData.categories_exceeded > 0 || monthData.categories_warning > 0
          ? `
        <div class="flex items-center gap-2 text-xs">
          ${monthData.categories_exceeded > 0 ? `<span class="text-error">${monthData.categories_exceeded} exceeded</span>` : ''}
          ${monthData.categories_warning > 0 ? `<span class="text-warning">${monthData.categories_warning} warning</span>` : ''}
        </div>
      `
          : ''
      }
    `;
    row.appendChild(mobileView);

    // Desktop view
    row.innerHTML += `
      <div class="hidden md:block col-span-2">
        <div class="flex items-center gap-2">
          <span class="font-semibold">${monthData.month_name}</span>
          <span class="text-base-content/60">${monthData.year}</span>
          ${isCurrentMonth ? '<span class="badge badge-primary badge-sm">Current</span>' : ''}
        </div>
      </div>
      <div class="hidden md:block col-span-1 text-right">${formatCurrency(budgetAmount, currency)}</div>
      <div class="hidden md:block col-span-1 text-right">${formatCurrency(spentAmount, currency)}</div>
      <div class="hidden md:block col-span-1 text-right font-medium ${balance >= 0 ? 'text-success' : 'text-error'}">
        ${balance >= 0 ? '+' : '-'}${formatCurrency(Math.abs(balance), currency)}
      </div>
      <div class="hidden md:block col-span-1 text-center">
        <span class="badge ${getStatusBadge(percentageUsed)} badge-sm">${formatPercentage(percentageUsed)}</span>
        ${
          monthData.categories_exceeded > 0 || monthData.categories_warning > 0
            ? `
          <div class="text-xs text-base-content/60 mt-1">
            ${monthData.categories_exceeded > 0 ? `<span class="text-error">${monthData.categories_exceeded} exceeded</span>` : ''}
            ${monthData.categories_warning > 0 ? `<span class="text-warning ml-1">${monthData.categories_warning} warning</span>` : ''}
          </div>
        `
            : ''
        }
      </div>
      <div class="hidden md:block col-span-1 text-center">
        <span class="font-medium ${changeIndicator.class}">${changeIndicator.value}</span>
      </div>
    `;

    itemsContainer.appendChild(row);
  });

  card.appendChild(itemsContainer);
  container.appendChild(card);

  return container;
};

// Default state with history data
export const Default: StoryObj = {
  args: {
    history: mockHistory,
    currency: 'IDR',
    currentMonth: 1,
    currentYear: 2025,
  },
  render: (args) => createBudgetHistoryComparison(args),
};

// Empty state
export const Empty: StoryObj = {
  args: {
    history: [],
    currency: 'IDR',
  },
  render: (args) => createBudgetHistoryComparison(args),
};

// USD currency
export const USDCurrency: StoryObj = {
  args: {
    history: mockHistory.map((h) => ({
      ...h,
      total_budget: (parseFloat(h.total_budget) / 15000).toFixed(2),
      total_spent: (parseFloat(h.total_spent) / 15000).toFixed(2),
      total_balance: (parseFloat(h.total_balance) / 15000).toFixed(2),
    })),
    currency: 'USD',
    currentMonth: 1,
    currentYear: 2025,
  },
  render: (args) => createBudgetHistoryComparison(args),
};

// All states
export const AllStates: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-8';

    const states = [
      { title: 'With History Data', history: mockHistory, currentMonth: 1, currentYear: 2025 },
      { title: 'Empty State', history: [], currentMonth: 1, currentYear: 2025 },
    ];

    states.forEach((state) => {
      const section = document.createElement('section');
      section.innerHTML = `<h3 class="text-lg font-semibold mb-4">${state.title}</h3>`;
      section.appendChild(
        createBudgetHistoryComparison({
          history: state.history,
          currency: 'IDR',
          currentMonth: state.currentMonth,
          currentYear: state.currentYear,
        })
      );
      container.appendChild(section);
    });

    return container;
  },
};
