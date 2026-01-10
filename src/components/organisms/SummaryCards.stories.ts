import type { Meta, StoryObj } from '@storybook/html';
import {
  mockSummaryCardsData,
  mockSummaryCardsHealthy,
  mockSummaryCardsExceeded,
  mockSummaryCardsEmpty,
} from '@/services/__tests__/mocks/dashboard-mocks';

const meta: Meta = {
  title: 'Organisms/SummaryCards',
  tags: ['autodocs'],
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
          <div class="h-4 bg-neutral-200 rounded w-1/3"></div>
          <div class="h-8 bg-neutral-200 rounded w-2/3"></div>
          <div class="h-4 bg-neutral-200 rounded w-1/2"></div>
        </div>
      `;
      grid.appendChild(card);
    }
  } else if (!data || (data as any).totalAssets.idr === 0) {
    // Empty state
    const emptyCard = document.createElement('div');
    emptyCard.className = 'col-span-full';
    emptyCard.innerHTML = `
      <div class="border rounded-lg p-6 bg-base-100 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 class="text-lg font-semibold mb-2">No data yet</h3>
        <p class="text-neutral-500">Start by adding your assets and transactions</p>
      </div>
    `;
    grid.appendChild(emptyCard);
  } else {
    // Normal state - Total Assets Card
    const summaryData = data as typeof mockSummaryCardsData;

    const assetsCard = document.createElement('div');
    assetsCard.className =
      'border rounded-lg p-6 bg-base-100 hover:shadow-lg transition-shadow group';
    assetsCard.innerHTML = `
      <div class="flex items-start justify-between mb-4">
        <h3 class="text-sm font-medium text-neutral-600 uppercase tracking-wide">Total Assets</h3>
        <div class="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <div class="space-y-2 mb-4">
        <div class="flex justify-between items-baseline">
          <span class="text-sm text-neutral-500">IDR:</span>
          <span class="font-semibold text-lg text-emerald-600">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(summaryData.totalAssets.idr)}</span>
        </div>
        <div class="flex justify-between items-baseline">
          <span class="text-sm text-neutral-500">USD:</span>
          <span class="font-semibold text-lg text-blue-600">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(summaryData.totalAssets.usd)}</span>
        </div>
      </div>
      <div class="pt-3 border-t border-neutral-200">
        <div class="flex justify-between items-baseline">
          <span class="text-sm text-neutral-600">Total:</span>
          <span class="font-bold text-xl text-emerald-600">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(summaryData.totalAssets.converted)}</span>
        </div>
      </div>
    `;
    grid.appendChild(assetsCard);

    // Monthly Spent Card
    const spentCard = document.createElement('div');
    spentCard.className =
      'border rounded-lg p-6 bg-base-100 hover:shadow-lg transition-shadow group';
    const spentColor =
      summaryData.monthlySpent.percentage >= 100
        ? 'text-red-600'
        : summaryData.monthlySpent.percentage >= 80
          ? 'text-amber-600'
          : 'text-emerald-600';
    const progressColor =
      summaryData.monthlySpent.percentage >= 100
        ? 'bg-red-500'
        : summaryData.monthlySpent.percentage >= 80
          ? 'bg-amber-500'
          : 'bg-emerald-500';
    spentCard.innerHTML = `
      <div class="flex items-start justify-between mb-4">
        <h3 class="text-sm font-medium text-neutral-600 uppercase tracking-wide">This Month</h3>
        <div class="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
      <div class="mb-4">
        <div class="flex justify-between items-baseline mb-2">
          <span class="text-2xl font-bold">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(summaryData.monthlySpent.spent)}</span>
          <span class="text-sm text-neutral-500">of ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(summaryData.monthlySpent.budget)}</span>
        </div>
        <div class="text-right">
          <span class="text-lg font-semibold ${spentColor}">${summaryData.monthlySpent.percentage.toFixed(1)}%</span>
        </div>
      </div>
      <div class="space-y-2">
        <div class="w-full bg-neutral-200 rounded-full h-3 overflow-hidden">
          <div class="h-full ${progressColor} transition-all duration-300" style="width: ${Math.min(summaryData.monthlySpent.percentage, 100)}%" role="progressbar" aria-valuenow="${summaryData.monthlySpent.percentage}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <p class="text-xs text-neutral-500 text-center">
          ${
            summaryData.monthlySpent.percentage >= 100
              ? `Over budget by ${(summaryData.monthlySpent.percentage - 100).toFixed(1)}%`
              : `${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(summaryData.monthlySpent.budget - summaryData.monthlySpent.spent)} remaining`
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
        ? 'text-emerald-600'
        : summaryData.budgetHealth.status === 'warning'
          ? 'text-amber-600'
          : 'text-red-600';
    const healthBadge =
      summaryData.budgetHealth.status === 'healthy'
        ? 'badge-success'
        : summaryData.budgetHealth.status === 'warning'
          ? 'badge-warning'
          : 'badge-error';
    healthCard.innerHTML = `
      <div class="flex items-start justify-between mb-4">
        <h3 class="text-sm font-medium text-neutral-600 uppercase tracking-wide">Budget Health</h3>
        <div class="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <div class="flex items-center gap-4 mb-4">
        <div class="flex-1">
          <div class="text-3xl font-bold ${healthColor}">${summaryData.budgetHealth.alertCount}</div>
          <div class="text-sm text-neutral-500">alert${summaryData.budgetHealth.alertCount !== 1 ? 's' : ''}</div>
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
