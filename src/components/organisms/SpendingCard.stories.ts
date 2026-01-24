import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Organisms/SpendingCard',
  tags: ['autodocs'],
  argTypes: {
    spent: {
      control: 'number',
      description: 'Amount spent',
    },
    budget: {
      control: 'number',
      description: 'Total budget amount',
    },
    currency: {
      control: 'select',
      options: ['IDR', 'USD'],
      description: 'Currency code',
    },
    remainingLabel: {
      control: 'text',
      description: 'Label for remaining amount',
    },
    alertMessage: {
      control: 'text',
      description: 'Optional alert message',
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

// Format currency helper
const formatCurrency = (amount: string | number, curr: string, compact = false): string => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const config: Record<string, { symbol: string; decimals: number; locale: string }> = {
    IDR: { symbol: 'Rp', decimals: 0, locale: 'id-ID' },
    USD: { symbol: '$', decimals: 2, locale: 'en-US' },
  };
  const currConfig = config[curr] || { symbol: curr, decimals: 0, locale: 'en-US' };

  if (compact && numericAmount >= 1_000_000) {
    return `${currConfig.symbol}${(numericAmount / 1_000_000).toFixed(1)}M`;
  }

  return new Intl.NumberFormat(currConfig.locale, {
    style: 'currency',
    currency: curr,
    minimumFractionDigits: compact ? 0 : currConfig.decimals,
    maximumFractionDigits: compact ? 0 : currConfig.decimals,
  }).format(numericAmount);
};

const getStatusClass = (percentage: number): string => {
  if (percentage >= 100) return 'danger';
  if (percentage >= 80) return 'warning';
  return 'ok';
};

const createSpendingCard = (args: {
  spent?: number;
  budget?: number;
  currency?: string;
  remainingLabel?: string;
  alertMessage?: string;
  loading?: boolean;
  error?: string;
}): HTMLElement => {
  const {
    spent = 0,
    budget = 0,
    currency = 'IDR',
    remainingLabel = 'Remaining',
    alertMessage = '',
    loading = false,
    error = '',
  } = args;

  const container = document.createElement('div');
  container.className = 'block max-w-md';

  // Loading state
  if (loading) {
    container.innerHTML = `
      <div class="bg-base-100 rounded-2xl border border-base-300 shadow-premium p-8">
        <div class="flex flex-col gap-6">
          <div class="flex justify-between items-start">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-base-300 animate-pulse"></div>
              <div class="space-y-3">
                <div class="h-3 bg-base-300 rounded w-20 animate-pulse"></div>
                <div class="h-8 bg-base-300 rounded w-48 animate-pulse"></div>
              </div>
            </div>
            <div class="h-6 bg-base-300 rounded w-16 animate-pulse"></div>
          </div>
          <div class="h-3 bg-base-300 rounded-full animate-pulse"></div>
          <div class="h-4 bg-base-300 rounded w-40 animate-pulse"></div>
          <div class="h-20 bg-base-300 rounded-3xl animate-pulse"></div>
        </div>
      </div>
    `;
    return container;
  }

  // Error state
  if (error) {
    container.innerHTML = `
      <div class="bg-base-100 rounded-2xl border border-base-300 shadow-premium">
        <div class="p-6 text-center">
          <p class="text-error font-medium">${error}</p>
        </div>
      </div>
    `;
    return container;
  }

  // Normal state
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
  const remaining = budget - spent;
  const status = getStatusClass(percentage);

  const statusClasses: Record<string, { text: string; bar: string }> = {
    ok: { text: 'text-success bg-success/10', bar: 'bg-success' },
    warning: { text: 'text-warning bg-warning/10', bar: 'bg-warning' },
    danger: { text: 'text-error bg-error/10', bar: 'bg-error' },
  };

  const statusStyle = statusClasses[status];

  const spentFormatted = formatCurrency(String(spent), currency);
  const budgetFormatted = formatCurrency(String(budget), currency, true);
  const remainingFormatted = formatCurrency(String(remaining), currency);

  container.innerHTML = `
    <div class="bg-base-100 rounded-2xl border border-base-300 shadow-premium p-8">
      <div class="flex flex-col gap-6">
        <!-- Header -->
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-4">
            <div class="p-4 bg-warning/10 text-warning rounded-2xl shadow-sm shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="2"/><circle cx="16" cy="21" r="2"/><path d="M7.8 7.8 2 8l2.9 5.5"/><path d="m22 8-2.9 5.5"/><path d="M9 8h6"/></svg>
            </div>
            <div>
              <p class="text-xs font-bold tracking-widest uppercase text-base-content/60">MONTHLY SPENDING</p>
              <h3 class="text-3xl font-bold mt-1.5 tracking-tight leading-none">
                ${spentFormatted} <span class="text-base text-base-content/60 font-medium tracking-normal">/ ${budgetFormatted}</span>
              </h3>
            </div>
          </div>
          <span class="text-xs font-bold tracking-wider uppercase px-3 py-1.5 rounded-full ${statusStyle.text}">
            ${Math.round(percentage)}% used
          </span>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-base-300 h-3 rounded-full overflow-hidden shadow-inner">
          <div class="h-full rounded-full transition-all duration-1000 shadow-md ${statusStyle.bar}" style="width: ${Math.min(100, percentage)}%"></div>
        </div>

        <!-- Remaining -->
        <p class="text-base font-medium text-base-content/60">
          ${remainingLabel}: <span class="font-bold text-base-content">${remainingFormatted}</span>
        </p>

        <!-- Alert -->
        ${
          alertMessage
            ? `
          <div class="p-6 rounded-3xl border ${status === 'danger' ? 'bg-error/5 border-error/20' : 'bg-warning/5 border-warning/20'}" role="alert">
            <div class="flex items-start gap-3">
              <div class="${status === 'danger' ? 'text-error' : 'text-warning'} shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold tracking-wide ${status === 'danger' ? 'text-error' : 'text-warning'} leading-none mb-1.5">Budget alert</p>
                <p class="text-base font-medium leading-relaxed ${status === 'danger' ? 'text-error/90' : 'text-warning/90'}">${alertMessage}</p>
              </div>
            </div>
          </div>
        `
            : ''
        }
      </div>
    </div>
  `;

  return container;
};

export const Default: StoryObj = {
  args: {
    spent: 53694000,
    budget: 65900000,
    currency: 'IDR',
    remainingLabel: 'Remaining for Jan',
    alertMessage: "You've reached 95% of your dining budget. Consider eating at home this week.",
    loading: false,
    error: '',
  },
  render: (args) => createSpendingCard(args),
};

export const WithinBudget: StoryObj = {
  args: {
    spent: 35000000,
    budget: 65900000,
    currency: 'IDR',
    remainingLabel: 'Remaining for Jan',
    alertMessage: '',
    loading: false,
    error: '',
  },
  render: (args) => createSpendingCard(args),
};

export const NearLimit: StoryObj = {
  args: {
    spent: 53694000,
    budget: 65900000,
    currency: 'IDR',
    remainingLabel: 'Remaining for Jan',
    alertMessage: "You've reached 82% of your monthly budget.",
    loading: false,
    error: '',
  },
  render: (args) => createSpendingCard(args),
};

export const OverBudget: StoryObj = {
  args: {
    spent: 75000000,
    budget: 65900000,
    currency: 'IDR',
    remainingLabel: 'Over budget by',
    alertMessage: "You've exceeded your monthly budget. Consider reducing discretionary spending.",
    loading: false,
    error: '',
  },
  render: (args) => createSpendingCard(args),
};

export const USD: StoryObj = {
  args: {
    spent: 3500,
    budget: 5000,
    currency: 'USD',
    remainingLabel: 'Remaining for Jan',
    alertMessage: '',
    loading: false,
    error: '',
  },
  render: (args) => createSpendingCard(args),
};

export const Loading: StoryObj = {
  args: {
    spent: 53694000,
    budget: 65900000,
    currency: 'IDR',
    remainingLabel: 'Remaining for Jan',
    alertMessage: '',
    loading: true,
    error: '',
  },
  render: (args) => createSpendingCard(args),
};

export const Error: StoryObj = {
  args: {
    spent: 53694000,
    budget: 65900000,
    currency: 'IDR',
    remainingLabel: 'Remaining for Jan',
    alertMessage: '',
    loading: false,
    error: 'Failed to load spending data',
  },
  render: (args) => createSpendingCard(args),
};
