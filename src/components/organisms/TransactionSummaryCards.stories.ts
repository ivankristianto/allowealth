import type { Meta, StoryObj } from '@storybook/html';

interface TransactionSummaryCardsArgs {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  transactionCount?: number;
  periodLabel?: string;
  currency?: 'IDR' | 'USD';
  loading?: boolean;
  error?: string;
}

const meta: Meta<TransactionSummaryCardsArgs> = {
  title: 'Organisms/TransactionSummaryCards',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    monthlyIncome: {
      control: 'number',
      description: 'Total income for the selected period',
    },
    monthlyExpenses: {
      control: 'number',
      description: 'Total expenses for the selected period',
    },
    transactionCount: {
      control: 'number',
      description: 'Number of expense transactions',
    },
    periodLabel: {
      control: 'text',
      description: 'Period label (e.g., "January 2024")',
    },
    currency: {
      control: 'select',
      options: ['IDR', 'USD'],
      description: 'Currency code',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading state',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
  },
};

export default meta;

// HTML escape helper to prevent XSS
const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// Format currency helper
const formatCurrency = (amount: number, curr: string): string => {
  const config: Record<string, { symbol: string; decimals: number; locale: string }> = {
    IDR: { symbol: 'Rp', decimals: 0, locale: 'id-ID' },
    USD: { symbol: '$', decimals: 2, locale: 'en-US' },
  };
  const currConfig = config[curr] || { symbol: curr, decimals: 0, locale: 'en-US' };

  return new Intl.NumberFormat(currConfig.locale, {
    style: 'currency',
    currency: curr,
    minimumFractionDigits: currConfig.decimals,
    maximumFractionDigits: currConfig.decimals,
  }).format(amount);
};

// SVG icons (aria-hidden for decorative icons per design system accessibility guidelines)
const trendingUpIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current text-success" aria-hidden="true"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`;
const trendingDownIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current text-error" aria-hidden="true"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>`;
const walletIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current text-primary" aria-hidden="true"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>`;

type Story = StoryObj<TransactionSummaryCardsArgs>;

const createTransactionSummaryCards = (args: TransactionSummaryCardsArgs): HTMLElement => {
  const {
    monthlyIncome = 0,
    monthlyExpenses = 0,
    transactionCount = 0,
    periodLabel = '',
    currency = 'IDR',
    loading = false,
    error = '',
  } = args;

  const container = document.createElement('div');
  container.className = 'block';

  // Error state
  if (error) {
    container.innerHTML = `
      <div class="alert alert-error rounded-3xl" role="alert">
        <p>${escapeHtml(error)}</p>
      </div>
    `;
    return container;
  }

  // Loading state
  if (loading) {
    const skeletonCard = `
      <div class="card bg-base-100 border border-base-300 rounded-3xl shadow-sm">
        <div class="card-body p-8">
          <div class="h-3 bg-base-300 rounded w-1/2 mb-4 animate-pulse"></div>
          <div class="h-9 bg-base-300 rounded w-4/5 mb-3 animate-pulse"></div>
          <div class="h-3 bg-base-300 rounded w-2/5 animate-pulse"></div>
        </div>
      </div>
    `;
    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${skeletonCard}
        ${skeletonCard}
        ${skeletonCard}
      </div>
    `;
    return container;
  }

  // Normal state
  const netSavings = monthlyIncome - monthlyExpenses;
  const netSavingsClass = netSavings >= 0 ? 'text-success' : 'text-error';

  const cardClasses =
    'card bg-base-100 border border-base-300 rounded-3xl shadow-sm relative overflow-hidden group transition-all hover:shadow-md';
  const iconContainerClasses =
    'absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity';

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Income Card -->
      <div class="${cardClasses}">
        <div class="${iconContainerClasses}">
          ${trendingUpIcon}
        </div>
        <div class="card-body p-8">
          <p class="text-xs font-bold tracking-widest uppercase text-base-content/60">Monthly Income</p>
          <h3 class="text-3xl font-bold text-success mt-4 leading-none tracking-tight">
            ${formatCurrency(monthlyIncome, currency)}
          </h3>
          ${periodLabel ? `<p class="text-[10px] font-bold text-success/60 mt-3 uppercase tracking-wider">${escapeHtml(periodLabel)}</p>` : ''}
        </div>
      </div>

      <!-- Expenses Card -->
      <div class="${cardClasses}">
        <div class="${iconContainerClasses}">
          ${trendingDownIcon}
        </div>
        <div class="card-body p-8">
          <p class="text-xs font-bold tracking-widest uppercase text-base-content/60">Monthly Expenses</p>
          <h3 class="text-3xl font-bold text-error mt-4 leading-none tracking-tight">
            ${formatCurrency(monthlyExpenses, currency)}
          </h3>
          <p class="text-[10px] font-bold text-error/60 mt-3 uppercase tracking-wider">${transactionCount} items</p>
        </div>
      </div>

      <!-- Net Savings Card -->
      <div class="${cardClasses}">
        <div class="${iconContainerClasses}">
          ${walletIcon}
        </div>
        <div class="card-body p-8">
          <p class="text-xs font-bold tracking-widest uppercase text-base-content/60">Net Savings</p>
          <h3 class="text-3xl font-bold mt-4 leading-none tracking-tight ${netSavingsClass}">
            ${formatCurrency(netSavings, currency)}
          </h3>
          ${periodLabel ? `<p class="text-[10px] font-bold text-base-content/40 mt-3 uppercase tracking-wider">${escapeHtml(periodLabel)}</p>` : ''}
        </div>
      </div>
    </div>
  `;

  return container;
};

export const Default: Story = {
  args: {
    monthlyIncome: 59700000,
    monthlyExpenses: 4800000,
    transactionCount: 10,
    periodLabel: 'January 2024',
    currency: 'IDR',
    loading: false,
    error: '',
  },
  render: (args) => createTransactionSummaryCards(args),
};

export const HighSpending: Story = {
  args: {
    monthlyIncome: 25000000,
    monthlyExpenses: 30000000,
    transactionCount: 45,
    periodLabel: 'January 2024',
    currency: 'IDR',
    loading: false,
    error: '',
  },
  render: (args) => createTransactionSummaryCards(args),
};

export const PositiveSavings: Story = {
  args: {
    monthlyIncome: 100000000,
    monthlyExpenses: 35000000,
    transactionCount: 28,
    periodLabel: 'December 2023',
    currency: 'IDR',
    loading: false,
    error: '',
  },
  render: (args) => createTransactionSummaryCards(args),
};

export const USD: Story = {
  args: {
    monthlyIncome: 8500,
    monthlyExpenses: 3200,
    transactionCount: 15,
    periodLabel: 'January 2024',
    currency: 'USD',
    loading: false,
    error: '',
  },
  render: (args) => createTransactionSummaryCards(args),
};

export const NoTransactions: Story = {
  args: {
    monthlyIncome: 0,
    monthlyExpenses: 0,
    transactionCount: 0,
    periodLabel: 'January 2024',
    currency: 'IDR',
    loading: false,
    error: '',
  },
  render: (args) => createTransactionSummaryCards(args),
};

export const Loading: Story = {
  args: {
    monthlyIncome: 0,
    monthlyExpenses: 0,
    transactionCount: 0,
    periodLabel: '',
    currency: 'IDR',
    loading: true,
    error: '',
  },
  render: (args) => createTransactionSummaryCards(args),
};

export const Error: Story = {
  args: {
    monthlyIncome: 0,
    monthlyExpenses: 0,
    transactionCount: 0,
    periodLabel: '',
    currency: 'IDR',
    loading: false,
    error: 'Failed to load transaction summary',
  },
  render: (args) => createTransactionSummaryCards(args),
};
