import type { Meta, StoryObj } from '@storybook/html';
import {
  mockSummaryCardsData,
  mockSummaryCardsHealthy,
  mockSummaryCardsExceeded,
  mockSummaryCardsEmpty,
} from '@/services/__tests__/mocks/dashboard-mocks';
import { formatCurrency } from '@/lib/formatting/currency-client';
import { formatPercentage } from '@/lib/formatting/percentage';

const meta: Meta = {
  title: 'Organisms/SummaryCards',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment
| Property | Value | Class |
|----------|-------|-------|
| Error Icon | CircleAlert | size={24}, shrink-0, text-error |
| Empty State Icon | TrendingUp | size={48}, mx-auto mb-4 text-neutral-400 |
| Total Accounts Icon | DollarSign | size={20}, stroke-current shrink-0 text-success |
| Monthly Spent Icon | Calendar | size={20}, stroke-current shrink-0 text-info |
| Budget Health Icon | ShieldCheck | size={20}, stroke-current shrink-0 text-warning |
| View Budget Chevron | ChevronRight | size={16}, group-hover:translate-x-1 |

### Layout
- Responsive grid: grid-cols-1 on mobile, md:grid-cols-3 on desktop
- gap-4 between cards
- Each card uses Card component with hoverable prop
- Icon backgrounds with hover effects (e.g., bg-success/10 -> bg-success/20)

### Card States
| State | Display |
|-------|---------|
| Loading | 5 animated pulse skeleton cards |
| Error | Single card with border-error, CircleAlert icon |
| Empty | Centered TrendingUp icon with "No data yet" message |
| Normal | 3 data cards (Accounts, Spent, Health) |

### Total Accounts Card
- IDR amount in text-success (green)
- USD amount in text-info (blue)
- Converted total in bold text-success

### Monthly Spent Card
- Progress bar with color coding: success (<80%), warning (80-99%), error (>=100%)
- Percentage display with matching color
- Shows "X remaining" or "X over budget" message

### Budget Health Card
- Alert count with semantic color (success/warning/error)
- Status badge: "On Track", "Review", or "Action Needed"
- View Budget link with animated chevron

### Accessibility
- Wrapper has role="region" aria-label="Financial summary"
- Error state: role="alert" aria-live="assertive"
- Loading state: role="status" aria-live="polite" aria-label="Loading financial summary"
- All icons have aria-hidden="true"
- Card headers have id attributes for aria-describedby
- Progress bar has aria-label="Budget progress: X% used"

### Data Display
- Currency formatting via formatCurrency() utility
- Percentage formatting via formatPercentage() utility
- Budget calculations use decimalSubtract for accuracy
        `,
      },
    },
  },
  argTypes: {
    loading: {
      control: 'boolean',
      description: 'Show loading skeleton state',
    },
    error: {
      control: 'boolean',
      description: 'Show error state',
    },
    data: {
      control: 'object',
      description: 'Summary cards data object',
    },
  },
};

export default meta;

const createSummaryCards = (args: {
  data?: object;
  loading?: boolean;
  error?: boolean;
}): HTMLElement => {
  const { data = mockSummaryCardsData, loading = false, error = false } = args;

  const container = document.createElement('div');
  container.className = 'p-4 bg-base-100 min-h-[400px]';

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-3 gap-4';

  if (error) {
    // Error state
    const errorCard = document.createElement('div');
    errorCard.className = 'col-span-full';
    errorCard.innerHTML = `
      <div class="border border-error rounded-lg p-6 bg-base-100">
        <div class="flex items-center gap-3 text-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p class="font-semibold">Unable to load summary data</p>
            <p class="text-sm">Please try again later</p>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(errorCard);
  } else if (loading) {
    // Loading skeleton
    for (let i = 0; i < 3; i++) {
      const card = document.createElement('div');
      card.className = 'border rounded-lg p-6 bg-base-100 animate-pulse';
      card.innerHTML = `
        <div class="space-y-3">
          <div class="h-4 bg-base-300 rounded w-1/3"></div>
          <div class="h-8 bg-base-300 rounded w-2/3"></div>
          <div class="h-4 bg-base-300 rounded w-1/2"></div>
        </div>
      `;
      grid.appendChild(card);
    }
  } else if (!data || (data as any).totalAccounts.idr === 0) {
    // Empty state
    const emptyCard = document.createElement('div');
    emptyCard.className = 'col-span-full';
    emptyCard.innerHTML = `
      <div class="border rounded-lg p-6 bg-base-100 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-4 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 class="text-lg font-semibold mb-2">No data yet</h3>
        <p class="text-base-content/60">Start by adding your accounts and transactions</p>
      </div>
    `;
    grid.appendChild(emptyCard);
  } else {
    // Normal state - Total Accounts Card
    const summaryData = data as typeof mockSummaryCardsData;

    const accountsCard = document.createElement('div');
    accountsCard.className =
      'border rounded-lg p-6 bg-base-100 hover:shadow-lg transition-shadow group';
    accountsCard.innerHTML = `
      <div class="flex items-start justify-between mb-4">
        <h3 class="text-sm font-medium text-base-content/60 uppercase tracking-wide">Total Accounts</h3>
        <div class="p-2 bg-success/10 rounded-lg group-hover:bg-success/20 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <div class="space-y-2 mb-4">
        <div class="flex justify-between items-baseline">
          <span class="text-sm text-base-content/60">IDR:</span>
          <span class="font-semibold text-lg text-success">${formatCurrency(summaryData.totalAccounts.idr, 'IDR')}</span>
        </div>
        <div class="flex justify-between items-baseline">
          <span class="text-sm text-base-content/60">USD:</span>
          <span class="font-semibold text-lg text-info">${formatCurrency(summaryData.totalAccounts.usd, 'USD')}</span>
        </div>
      </div>
      <div class="pt-3 border-t border-base-300">
        <div class="flex justify-between items-baseline">
          <span class="text-sm text-base-content/60">Total:</span>
          <span class="font-bold text-xl text-success">${formatCurrency(summaryData.totalAccounts.converted, summaryData.totalAccounts.convertedCurrency)}</span>
        </div>
      </div>
    `;
    grid.appendChild(accountsCard);

    // Monthly Spent Card
    const spentCard = document.createElement('div');
    spentCard.className =
      'border rounded-lg p-6 bg-base-100 hover:shadow-lg transition-shadow group';
    const spentColor =
      summaryData.monthlySpent.percentage >= 100
        ? 'text-error'
        : summaryData.monthlySpent.percentage >= 80
          ? 'text-warning'
          : 'text-success';
    const progressColor =
      summaryData.monthlySpent.percentage >= 100
        ? 'bg-error'
        : summaryData.monthlySpent.percentage >= 80
          ? 'bg-warning'
          : 'bg-success';
    spentCard.innerHTML = `
      <div class="flex items-start justify-between mb-4">
        <h3 class="text-sm font-medium text-base-content/60 uppercase tracking-wide">This Month</h3>
        <div class="p-2 bg-info/10 rounded-lg group-hover:bg-info/20 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
      <div class="mb-4">
        <div class="flex justify-between items-baseline mb-2">
          <span class="text-2xl font-bold">${formatCurrency(summaryData.monthlySpent.spent, summaryData.monthlySpent.currency)}</span>
          <span class="text-sm text-base-content/60">of ${formatCurrency(summaryData.monthlySpent.budget, summaryData.monthlySpent.currency)}</span>
        </div>
        <div class="text-right">
          <span class="text-lg font-semibold ${spentColor}">${formatPercentage(summaryData.monthlySpent.percentage)}</span>
        </div>
      </div>
      <div class="space-y-2">
        <div class="w-full bg-base-300 rounded-full h-3 overflow-hidden">
          <div class="h-full ${progressColor} transition-all duration-300" style="width: ${Math.min(summaryData.monthlySpent.percentage, 100)}%" role="progressbar" aria-valuenow="${summaryData.monthlySpent.percentage}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <p class="text-xs text-base-content/60 text-center">
          ${
            summaryData.monthlySpent.percentage >= 100
              ? `Over budget by ${formatPercentage(summaryData.monthlySpent.percentage - 100)}`
              : `${formatCurrency(summaryData.monthlySpent.budget - summaryData.monthlySpent.spent, summaryData.monthlySpent.currency)} remaining`
          }
        </p>
      </div>
    `;
    grid.appendChild(spentCard);

    // Budget Health Card
    const healthCard = document.createElement('div');
    healthCard.className =
      'border rounded-lg p-6 bg-base-100 hover:shadow-lg transition-shadow group';
    const healthColor =
      summaryData.budgetHealth.status === 'healthy'
        ? 'text-success'
        : summaryData.budgetHealth.status === 'warning'
          ? 'text-warning'
          : 'text-error';
    const healthBadge =
      summaryData.budgetHealth.status === 'healthy'
        ? 'badge-success'
        : summaryData.budgetHealth.status === 'warning'
          ? 'badge-warning'
          : 'badge-error';
    healthCard.innerHTML = `
      <div class="flex items-start justify-between mb-4">
        <h3 class="text-sm font-medium text-base-content/60 uppercase tracking-wide">Budget Health</h3>
        <div class="p-2 bg-warning/10 rounded-lg group-hover:bg-warning/20 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <div class="flex items-center gap-4 mb-4">
        <div class="flex-1">
          <div class="text-3xl font-bold ${healthColor}">${summaryData.budgetHealth.alertCount}</div>
          <div class="text-sm text-base-content/60">alert${summaryData.budgetHealth.alertCount !== 1 ? 's' : ''}</div>
        </div>
        <div class="badge ${healthBadge} badge-lg">${summaryData.budgetHealth.status === 'healthy' ? 'On Track' : summaryData.budgetHealth.status === 'warning' ? 'Review' : 'Action Needed'}</div>
      </div>
      <a href="/budget" class="flex items-center justify-center gap-2 w-full py-2 px-4 bg-base-200 hover:bg-base-300 rounded-lg transition-colors text-sm font-medium group">
        View Budget
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </a>
    `;
    grid.appendChild(healthCard);
  }

  container.appendChild(grid);
  return container;
};

// Default state
export const Default: StoryObj = {
  args: {
    data: mockSummaryCardsData,
    loading: false,
    error: false,
  },
  render: (args) => createSummaryCards(args),
};

// Healthy state
export const Healthy: StoryObj = {
  args: {
    data: mockSummaryCardsHealthy,
    loading: false,
    error: false,
  },
  render: (args) => createSummaryCards(args),
};

// Exceeded budget state
export const Exceeded: StoryObj = {
  args: {
    data: mockSummaryCardsExceeded,
    loading: false,
    error: false,
  },
  render: (args) => createSummaryCards(args),
};

// Empty state
export const Empty: StoryObj = {
  args: {
    data: mockSummaryCardsEmpty,
    loading: false,
    error: false,
  },
  render: (args) => createSummaryCards(args),
};

// Loading state
export const Loading: StoryObj = {
  args: {
    loading: true,
    error: false,
  },
  render: (args) => createSummaryCards(args),
};

// Error state
export const Error: StoryObj = {
  args: {
    loading: false,
    error: true,
  },
  render: (args) => createSummaryCards(args),
};

// All states together
export const AllStates: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-8';

    const states = [
      { title: 'Default (Warning)', data: mockSummaryCardsData },
      { title: 'Healthy', data: mockSummaryCardsHealthy },
      { title: 'Exceeded', data: mockSummaryCardsExceeded },
      { title: 'Empty', data: mockSummaryCardsEmpty },
    ];

    states.forEach((state) => {
      const section = document.createElement('section');
      section.innerHTML = `<h3 class="text-lg font-semibold mb-4">${state.title}</h3>`;
      section.appendChild(createSummaryCards({ data: state.data, loading: false, error: false }));
      container.appendChild(section);
    });

    // Loading and Error states
    const loadingSection = document.createElement('section');
    loadingSection.innerHTML = '<h3 class="text-lg font-semibold mb-4">Loading State</h3>';
    loadingSection.appendChild(createSummaryCards({ loading: true, error: false }));
    container.appendChild(loadingSection);

    const errorSection = document.createElement('section');
    errorSection.innerHTML = '<h3 class="text-lg font-semibold mb-4">Error State</h3>';
    errorSection.appendChild(createSummaryCards({ loading: false, error: true }));
    container.appendChild(errorSection);

    return container;
  },
};
