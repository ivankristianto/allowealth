import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Organisms/NetWorthWidget',
  tags: ['autodocs'],
  argTypes: {
    totalIDR: { control: 'number', description: 'Total net worth in IDR' },
    totalUSD: { control: 'number', description: 'Total net worth in USD' },
    localAssets: { control: 'number', description: 'Local assets value in IDR' },
    globalAssets: { control: 'number', description: 'Global assets value in USD' },
    growthPercentage: { control: 'number', description: 'Growth percentage for badge' },
    loading: { control: 'boolean', description: 'Show loading state' },
    error: { control: 'text', description: 'Error message to display' },
  },
};

export default meta;

const formatIDR = (amount: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatUSD = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

const createNetWorthWidget = (args: {
  totalIDR?: number;
  totalUSD?: number;
  localAssets?: number;
  globalAssets?: number;
  growthPercentage?: number;
  loading?: boolean;
  error?: string;
}): HTMLElement => {
  const {
    totalIDR = 0,
    totalUSD = 0,
    localAssets = 0,
    globalAssets = 0,
    growthPercentage = 0,
    loading = false,
    error = '',
  } = args;

  const container = document.createElement('div');
  container.className = 'block max-w-sm';

  const growthVariant = growthPercentage >= 0 ? 'success' : 'error';
  const growthLabel = `${growthPercentage >= 0 ? '+' : ''}${growthPercentage.toFixed(1)}% growth`;
  const growthColorClass =
    growthVariant === 'success' ? 'text-success bg-success/10' : 'text-error bg-error/10';

  if (error) {
    container.innerHTML = `
      <div class="bg-base-100 rounded-2xl border border-error/50 bg-error/5 shadow-premium p-6">
        <div class="flex items-center gap-3 text-error">
          <div class="p-2 bg-error/10 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div>
            <p class="font-semibold text-sm">Unable to load net worth</p>
            <p class="text-xs opacity-80">${error}</p>
          </div>
        </div>
      </div>`;
    return container;
  }

  if (loading) {
    container.innerHTML = `
      <div class="bg-base-100 rounded-2xl border border-base-300 shadow-premium p-8">
        <div class="space-y-4">
          <div class="flex justify-between items-start">
            <div class="w-16 h-16 bg-success/10 rounded-2xl animate-pulse"></div>
            <div class="h-7 w-24 bg-success/10 rounded-full animate-pulse"></div>
          </div>
          <div class="space-y-2">
            <div class="h-4 w-32 bg-base-300/50 rounded animate-pulse"></div>
            <div class="h-10 w-48 bg-base-300/50 rounded animate-pulse"></div>
            <div class="h-7 w-36 bg-base-300/50 rounded animate-pulse"></div>
          </div>
          <div class="h-px bg-base-200"></div>
          <div class="space-y-3">
            <div class="flex justify-between"><div class="h-5 w-24 bg-base-300/50 rounded animate-pulse"></div><div class="h-5 w-28 bg-base-300/50 rounded animate-pulse"></div></div>
            <div class="flex justify-between"><div class="h-5 w-24 bg-base-300/50 rounded animate-pulse"></div><div class="h-5 w-28 bg-base-300/50 rounded animate-pulse"></div></div>
          </div>
        </div>
      </div>`;
    return container;
  }

  container.innerHTML = `
    <div class="bg-base-100 rounded-2xl border border-base-300 shadow-premium p-8">
      <div class="flex justify-between items-start mb-6">
        <div class="p-4 bg-success/10 text-success rounded-2xl shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="9" x2="9" y1="11" y2="17"/><line x1="15" x2="15" y1="11" y2="17"/></svg>
        </div>
        <span class="text-xs font-bold ${growthColorClass} px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          ${growthLabel}
        </span>
      </div>
      <p class="text-xs font-bold uppercase tracking-widest text-base-content/60 leading-none mb-3">Total net worth</p>
      <div>
        <h3 class="text-3xl font-bold text-base-content tracking-tighter leading-none">${formatIDR(totalIDR)}</h3>
        <p class="text-lg font-semibold text-base-content/60 mt-1.5 tracking-tight">${formatUSD(totalUSD)}</p>
      </div>
      <div class="mt-6 pt-6 border-t border-base-200 space-y-3">
        <div class="flex justify-between text-base font-medium leading-none">
          <span class="text-base-content/60">Local assets</span>
          <span class="text-base-content font-bold">${formatIDR(localAssets)}</span>
        </div>
        <div class="flex justify-between text-base font-medium leading-none">
          <span class="text-base-content/60">Global assets</span>
          <span class="text-base-content font-bold">${formatUSD(globalAssets)}</span>
        </div>
      </div>
    </div>`;

  return container;
};

export const Default: StoryObj = {
  args: {
    totalIDR: 1956063000,
    totalUSD: 130404.2,
    localAssets: 1541740000,
    globalAssets: 102782.67,
    growthPercentage: 4.2,
    loading: false,
    error: '',
  },
  render: (args) => createNetWorthWidget(args),
};

export const PositiveGrowth: StoryObj = {
  args: {
    totalIDR: 1956063000,
    totalUSD: 130404.2,
    localAssets: 1541740000,
    globalAssets: 102782.67,
    growthPercentage: 4.2,
    loading: false,
    error: '',
  },
  render: (args) => createNetWorthWidget(args),
};

export const NegativeGrowth: StoryObj = {
  args: {
    totalIDR: 1850000000,
    totalUSD: 123333.33,
    localAssets: 1450000000,
    globalAssets: 98765.43,
    growthPercentage: -2.5,
    loading: false,
    error: '',
  },
  render: (args) => createNetWorthWidget(args),
};

/**
 * Large Portfolio - Shows high net worth scenario with significant assets
 */
export const LargePortfolio: StoryObj = {
  args: {
    totalIDR: 5000000000,
    totalUSD: 333333.33,
    localAssets: 4000000000,
    globalAssets: 250000,
    growthPercentage: 12.8,
    loading: false,
    error: '',
  },
  render: (args) => createNetWorthWidget(args),
};

/**
 * Starting Portfolio - Shows beginner user scenario with modest first assets
 */
export const StartingPortfolio: StoryObj = {
  args: {
    totalIDR: 150000000,
    totalUSD: 10000,
    localAssets: 100000000,
    globalAssets: 3333.33,
    growthPercentage: 1.5,
    loading: false,
    error: '',
  },
  render: (args) => createNetWorthWidget(args),
};

export const Loading: StoryObj = {
  args: {
    totalIDR: 1956063000,
    totalUSD: 130404.2,
    localAssets: 1541740000,
    globalAssets: 102782.67,
    growthPercentage: 4.2,
    loading: true,
    error: '',
  },
  render: (args) => createNetWorthWidget(args),
};

export const Error: StoryObj = {
  args: {
    totalIDR: 1956063000,
    totalUSD: 130404.2,
    localAssets: 1541740000,
    globalAssets: 102782.67,
    growthPercentage: 4.2,
    loading: false,
    error: 'Failed to load net worth data. Please try again.',
  },
  render: (args) => createNetWorthWidget(args),
};
