import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Organisms/BudgetCardGrid',
  tags: ['autodocs'],
  argTypes: {
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
    budgetCount: {
      control: 'number',
      description: 'Number of budget cards to show',
    },
  },
};

export default meta;

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

// Icon SVG mapping
const icons: Record<string, string> = {
  Home: '<path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>',
  ShoppingCart:
    '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  Utensils:
    '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
  Car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8c-.3.5-.1 1.2.5 1.4l1.5.5C4 12.9 4 13.4 4 14v2c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  Film: '<rect width="20" height="20" x="2" y="2" rx="2.18" ry="2.18"/><line x1="7" x2="7" y1="2" y2="22"/><line x1="17" x2="17" y1="2" y2="22"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="2" x2="7" y1="7" y2="7"/><line x1="2" x2="7" y1="17" y2="17"/><line x1="17" x2="22" y1="17" y2="17"/><line x1="17" x2="22" y1="7" y2="7"/>',
  Zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
};

// Status styling
const statusClasses: Record<string, { badge: string; progress: string; footer: string }> = {
  ok: {
    badge: 'bg-success/10 text-success',
    progress: 'bg-success',
    footer: 'bg-base-200/50 border-base-300 text-base-content/60',
  },
  warning: {
    badge: 'bg-warning/10 text-warning',
    progress: 'bg-warning',
    footer: 'bg-base-200/50 border-base-300 text-base-content/60',
  },
  exceeded: {
    badge: 'bg-error/10 text-error',
    progress: 'bg-error',
    footer: 'bg-error/5 border-error/10 text-error',
  },
};

// Sample budget data generator
const getBudgetData = (currency: string) => [
  {
    category_name: 'Housing',
    icon: 'Home',
    spent: currency === 'USD' ? 2500 : 37680000,
    budget: currency === 'USD' ? 2700 : 40000000,
    percentage_used: 94,
    status: 'warning',
  },
  {
    category_name: 'Groceries',
    icon: 'ShoppingCart',
    spent: currency === 'USD' ? 580 : 5800000,
    budget: currency === 'USD' ? 800 : 8000000,
    percentage_used: 72,
    status: 'warning',
  },
  {
    category_name: 'Dining',
    icon: 'Utensils',
    spent: currency === 'USD' ? 350 : 2850000,
    budget: currency === 'USD' ? 300 : 3000000,
    percentage_used: 117,
    status: 'exceeded',
  },
  {
    category_name: 'Transport',
    icon: 'Car',
    spent: currency === 'USD' ? 120 : 1200000,
    budget: currency === 'USD' ? 250 : 2500000,
    percentage_used: 48,
    status: 'ok',
  },
  {
    category_name: 'Entertainment',
    icon: 'Film',
    spent: currency === 'USD' ? 85 : 850000,
    budget: currency === 'USD' ? 150 : 1500000,
    percentage_used: 56,
    status: 'ok',
  },
  {
    category_name: 'Utilities',
    icon: 'Zap',
    spent: currency === 'USD' ? 293 : 2929000,
    budget: currency === 'USD' ? 400 : 4000000,
    percentage_used: 73,
    status: 'warning',
  },
];

const createBudgetCardGrid = (args: {
  currency?: string;
  loading?: boolean;
  error?: string;
  budgetCount?: number;
}): HTMLElement => {
  const { currency = 'IDR', loading = false, error = '', budgetCount = 6 } = args;

  const container = document.createElement('div');
  container.className = 'block';

  const allBudgets = getBudgetData(currency);
  const budgets = allBudgets.slice(0, budgetCount);

  // Error state
  if (error) {
    container.innerHTML = `
      <div class="alert alert-error" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
        <span>${error}</span>
      </div>
    `;
    return container;
  }

  // Loading state
  if (loading) {
    const skeletons = Array.from({ length: 6 })
      .map(
        () => `
      <div class="bg-base-100 rounded-card border border-base-300 shadow-sm p-6 lg:p-8">
        <div class="flex justify-between items-start mb-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-base-300 animate-pulse"></div>
            <div class="space-y-2">
              <div class="h-4 bg-base-300 rounded w-24 animate-pulse"></div>
              <div class="h-5 bg-base-300 rounded w-16 animate-pulse"></div>
            </div>
          </div>
          <div class="w-8 h-8 rounded-lg bg-base-300 animate-pulse"></div>
        </div>
        <div class="space-y-4">
          <div class="flex justify-between">
            <div class="space-y-1">
              <div class="h-3 bg-base-300 rounded w-10 animate-pulse"></div>
              <div class="h-5 bg-base-300 rounded w-24 animate-pulse"></div>
            </div>
            <div class="space-y-1 text-right">
              <div class="h-3 bg-base-300 rounded w-12 animate-pulse"></div>
              <div class="h-4 bg-base-300 rounded w-20 animate-pulse"></div>
            </div>
          </div>
          <div class="h-3 bg-base-300 rounded-full animate-pulse"></div>
          <div class="h-14 bg-base-300 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    `
      )
      .join('');

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8" aria-busy="true" aria-label="Loading budgets">
        ${skeletons}
      </div>
    `;
    return container;
  }

  // Empty state
  if (budgets.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-base-content/40"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
        </div>
        <h3 class="text-lg font-bold text-base-content mb-2">No budgets set</h3>
        <p class="text-sm text-base-content/60 max-w-sm">
          Set up spending limits for your expense categories to start tracking your budget progress.
        </p>
      </div>
    `;
    return container;
  }

  // Normal state - render budget cards
  const cards = budgets
    .map((budget) => {
      const iconSvg = icons[budget.icon] || icons.Home;
      const statusStyle = statusClasses[budget.status] || statusClasses.ok;
      const remaining = budget.budget - budget.spent;
      const isOver = remaining < 0;

      return `
      <div role="listitem">
        <article class="bg-base-100 rounded-card border border-base-300 shadow-sm hover:shadow-xl transition-all duration-300 p-6 lg:p-8 group" aria-label="Budget for ${budget.category_name}">
          <div class="flex justify-between items-start mb-6 lg:mb-8">
            <div class="flex items-center gap-3 lg:gap-4">
              <div class="p-4 bg-base-300 rounded-2xl shadow-sm shrink-0 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-base-content">${iconSvg}</svg>
              </div>
              <div>
                <h3 class="font-bold text-base-content tracking-tight leading-none">${budget.category_name}</h3>
                <span class="inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusStyle.badge}">
                  ${Math.round(budget.percentage_used)}% Used
                </span>
              </div>
            </div>
            <button type="button" class="text-base-content/30 hover:text-base-content/60 transition-colors p-1 rounded-lg hover:bg-base-200" aria-label="Edit ${budget.category_name} budget">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            </button>
          </div>
          <div class="space-y-4">
            <div class="flex justify-between items-end">
              <div>
                <span class="label-premium uppercase tracking-widest font-semibold text-[10px] text-base-content/60">Spent</span>
                <p class="text-lg font-bold mt-1 text-base-content leading-none">${formatCurrency(budget.spent, currency)}</p>
              </div>
              <div class="text-right">
                <span class="label-premium uppercase tracking-widest font-semibold text-[10px] text-base-content/60">Budget</span>
                <p class="text-sm font-bold mt-1 text-base-content/60 leading-none">${formatCurrency(budget.budget, currency)}</p>
              </div>
            </div>
            <div class="w-full bg-base-300 h-3 rounded-full overflow-hidden shadow-inner">
              <div class="h-full rounded-full transition-all duration-1000 shadow-md ${statusStyle.progress}" style="width: ${Math.min(100, budget.percentage_used)}%"></div>
            </div>
            <div class="p-4 rounded-2xl border ${statusStyle.footer}">
              <div class="flex justify-between items-center text-xs font-bold leading-none">
                <span class="uppercase tracking-widest">${isOver ? 'Over budget by' : 'Left to spend'}</span>
                <span class="${isOver ? 'text-error' : 'text-base-content'}">${formatCurrency(Math.abs(remaining), currency)}</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    `;
    })
    .join('');

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8" role="list" aria-label="Budget categories">
      ${cards}
    </div>
  `;

  return container;
};

export const Default: StoryObj = {
  args: {
    currency: 'IDR',
    loading: false,
    error: '',
    budgetCount: 6,
  },
  render: (args) => createBudgetCardGrid(args),
};

export const ThreeCards: StoryObj = {
  args: {
    currency: 'IDR',
    loading: false,
    error: '',
    budgetCount: 3,
  },
  render: (args) => createBudgetCardGrid(args),
};

export const Loading: StoryObj = {
  args: {
    currency: 'IDR',
    loading: true,
    error: '',
    budgetCount: 6,
  },
  render: (args) => createBudgetCardGrid(args),
};

export const Error: StoryObj = {
  args: {
    currency: 'IDR',
    loading: false,
    error: 'Failed to load budget data. Please try again.',
    budgetCount: 0,
  },
  render: (args) => createBudgetCardGrid(args),
};

export const Empty: StoryObj = {
  args: {
    currency: 'IDR',
    loading: false,
    error: '',
    budgetCount: 0,
  },
  render: (args) => createBudgetCardGrid(args),
};

export const USD: StoryObj = {
  args: {
    currency: 'USD',
    loading: false,
    error: '',
    budgetCount: 6,
  },
  render: (args) => createBudgetCardGrid(args),
};
