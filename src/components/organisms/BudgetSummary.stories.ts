/**
 * BudgetSummary Storybook Stories
 *
 * P1: NOTE - This file duplicates the BudgetSummary.astro HTML structure because
 * Storybook's HTML framework cannot directly render Astro components.
 * When updating BudgetSummary.astro, ensure this file is updated to match.
 *
 * @see src/components/organisms/BudgetSummary.astro
 */
import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Organisms/BudgetSummary',
  tags: ['autodocs'],
  argTypes: {
    totalAllocated: {
      control: 'number',
      description: 'Total monthly budget pot',
    },
    totalSpent: {
      control: 'number',
      description: 'Aggregate spending amount',
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
  },
};

export default meta;

const formatCurrency = (amount: number, curr: string): string => {
  const config = {
    IDR: { symbol: 'Rp', decimals: 0, locale: 'id-ID' },
    USD: { symbol: '$', decimals: 2, locale: 'en-US' },
  }[curr] || { symbol: curr, decimals: 0, locale: 'en-US' };

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: curr,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
};

interface DistributionItem {
  name: string;
  weight: number;
  color: string;
}

interface BudgetSummaryArgs {
  totalAllocated?: number;
  totalSpent?: number;
  distribution?: DistributionItem[];
  currency?: 'IDR' | 'USD';
  loading?: boolean;
}

const createBudgetSummary = (args: BudgetSummaryArgs): HTMLElement => {
  const {
    totalAllocated = 59000000,
    totalSpent = 51309000,
    distribution = [],
    currency = 'IDR',
    loading = false,
  } = args;

  const container = document.createElement('div');
  container.className = 'w-full max-w-6xl';

  const remaining = totalAllocated - totalSpent;
  const isDeficit = remaining < 0;
  const overallUsage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
  const sortedDistribution = [...distribution].sort((a, b) => b.weight - a.weight);

  // Take top 7 for legend display, combine rest as "Others"
  const MAX_LEGEND_ITEMS = 7;
  const OTHERS_COLOR = '#9ca3af';
  const topCategories = sortedDistribution.slice(0, MAX_LEGEND_ITEMS);
  const remainingCategories = sortedDistribution.slice(MAX_LEGEND_ITEMS);
  const othersWeight = remainingCategories.reduce((sum, item) => sum + item.weight, 0);
  const displayDistribution: DistributionItem[] =
    othersWeight > 0
      ? [...topCategories, { name: 'Others', weight: othersWeight, color: OTHERS_COLOR }]
      : topCategories;

  // Loading state
  if (loading) {
    container.innerHTML = `
      <section class="bg-base-100 rounded-card border border-base-300 shadow-sm p-6 lg:p-10 relative overflow-hidden" aria-busy="true" aria-label="Loading budget summary">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          <div class="lg:col-span-4 flex flex-col justify-center gap-6 lg:gap-8">
            <div class="grid flex flex-col gap-6">
              <div>
                <div class="h-3 bg-base-300 rounded w-28 animate-pulse"></div>
                <div class="h-8 bg-base-300 rounded w-44 mt-3 animate-pulse"></div>
              </div>
              <div>
                <div class="h-3 bg-base-300 rounded w-32 animate-pulse"></div>
                <div class="flex items-baseline gap-2 mt-3">
                  <div class="h-8 bg-base-300 rounded w-40 animate-pulse"></div>
                  <div class="h-4 bg-base-300 rounded w-12 animate-pulse"></div>
                </div>
              </div>
            </div>
            <div class="h-14 bg-base-300 rounded-2xl animate-pulse"></div>
          </div>
          <div class="lg:col-span-8 flex flex-col justify-center gap-6 lg:gap-8">
            <div class="flex justify-between items-end mb-2">
              <div class="h-5 bg-base-300 rounded w-28 animate-pulse"></div>
              <div class="h-3 bg-base-300 rounded w-40 animate-pulse"></div>
            </div>
            <div class="h-6 bg-base-300 rounded-full animate-pulse"></div>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              ${Array(6)
                .fill(0)
                .map(
                  () => `
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-base-300 animate-pulse"></div>
                    <div class="h-2.5 bg-base-300 rounded w-14 animate-pulse"></div>
                  </div>
                  <div class="h-3 bg-base-300 rounded w-10 ml-4 animate-pulse"></div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </div>
      </section>
    `;
    return container;
  }

  container.innerHTML = `
    <section class="bg-base-100 rounded-card border border-base-300 shadow-sm p-6 lg:p-10 relative overflow-hidden" aria-label="Budget overview summary">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 relative z-10">
        <!-- Left: Key Metrics -->
        <div class="lg:col-span-4 flex flex-col justify-center gap-6 lg:gap-8">
          <div class="grid flex flex-col gap-6">
            <!-- Total Monthly Pot -->
            <div>
              <span class="label-premium uppercase tracking-widest font-semibold text-[10px] text-base-content/60">Total Monthly Pot</span>
              <p class="text-2xl lg:text-3xl font-bold mt-2 lg:mt-3 text-base-content tracking-tight leading-none">
                ${formatCurrency(totalAllocated, currency)}
              </p>
            </div>

            <!-- Aggregate Spending -->
            <div>
              <span class="label-premium uppercase tracking-widest font-semibold text-[10px] text-warning">Aggregate Spending</span>
              <div class="flex items-baseline gap-2 mt-2 lg:mt-3">
                <p class="text-2xl lg:text-3xl font-bold tracking-tight leading-none ${totalSpent > totalAllocated ? 'text-error' : 'text-base-content'}">
                  ${formatCurrency(totalSpent, currency)}
                </p>
                <span class="text-xs font-bold text-base-content/40">/ ${overallUsage.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <!-- Surplus/Deficit Indicator -->
          <div class="p-4 rounded-2xl border flex items-center gap-3 ${isDeficit ? 'bg-error/5 border-error/20' : 'bg-success/5 border-success/20'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${isDeficit ? 'text-error' : 'text-success'} shrink-0">
              ${
                isDeficit
                  ? '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'
                  : '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>'
              }
            </svg>
            <p class="text-xs font-bold uppercase tracking-wide ${isDeficit ? 'text-error' : 'text-success'}">
              ${isDeficit ? `Deficit of ${formatCurrency(Math.abs(remaining), currency)}` : `Surplus of ${formatCurrency(remaining, currency)}`}
            </p>
          </div>
        </div>

        <!-- Right: Allocation Mix -->
        <div class="lg:col-span-8 flex flex-col justify-center gap-6 lg:gap-8">
          <!-- Header -->
          <div class="flex justify-between items-end">
            <h3 class="font-bold text-base-content tracking-tight text-base lg:text-lg leading-none">Allocation Mix</h3>
            <span class="label-premium uppercase tracking-widest font-semibold text-[10px] text-base-content/60 hidden sm:block">Total Share Distribution</span>
          </div>

          <!-- Stacked Bar -->
          <div class="h-6 w-full bg-base-300 rounded-full overflow-hidden flex shadow-inner" role="img" aria-label="Budget allocation distribution">
            ${sortedDistribution
              .map(
                (item) => `
              <div
                class="h-full transition-all duration-500 relative group/segment tooltip tooltip-bottom"
                style="width: ${item.weight}%; background-color: ${item.color};"
                data-tip="${item.name}: ${item.weight.toFixed(1)}%"
              >
                <div class="absolute inset-0 bg-white/10 opacity-0 group-hover/segment:opacity-100 transition-opacity cursor-pointer"></div>
              </div>
            `
              )
              .join('')}
          </div>

          <!-- Legend -->
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
            ${displayDistribution
              .map(
                (item) => `
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full shrink-0" style="background-color: ${item.color};" aria-hidden="true"></div>
                  <span class="text-[10px] font-bold text-base-content/60 uppercase tracking-tight truncate">${item.name}</span>
                </div>
                <p class="text-xs font-bold text-base-content leading-none ml-4">${item.weight.toFixed(1)}%</p>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    </section>
  `;

  return container;
};

// Default mock distribution based on screenshot
const defaultDistribution: DistributionItem[] = [
  { name: 'Housing', weight: 67.8, color: '#ea580c' },
  { name: 'Groceries', weight: 13.6, color: '#3b82f6' },
  { name: 'Utilities', weight: 6.8, color: '#6366f1' },
  { name: 'Dining', weight: 5.1, color: '#8b5cf6' },
  { name: 'Transport', weight: 4.2, color: '#a855f7' },
  { name: 'Entertainment', weight: 2.5, color: '#ec4899' },
];

export const Default: StoryObj = {
  args: {
    totalAllocated: 59000000,
    totalSpent: 51309000,
    distribution: defaultDistribution,
    currency: 'IDR',
    loading: false,
  },
  render: (args) => createBudgetSummary(args),
};

export const Surplus: StoryObj = {
  args: {
    totalAllocated: 59000000,
    totalSpent: 51309000,
    distribution: defaultDistribution,
    currency: 'IDR',
    loading: false,
  },
  render: (args) => createBudgetSummary(args),
};

export const Deficit: StoryObj = {
  args: {
    totalAllocated: 50000000,
    totalSpent: 55000000,
    distribution: defaultDistribution,
    currency: 'IDR',
    loading: false,
  },
  render: (args) => createBudgetSummary(args),
};

export const ExactBudget: StoryObj = {
  args: {
    totalAllocated: 50000000,
    totalSpent: 50000000,
    distribution: defaultDistribution,
    currency: 'IDR',
    loading: false,
  },
  render: (args) => createBudgetSummary(args),
};

export const USD: StoryObj = {
  args: {
    totalAllocated: 5000,
    totalSpent: 4250,
    distribution: [
      { name: 'Housing', weight: 60, color: '#ea580c' },
      { name: 'Groceries', weight: 15, color: '#3b82f6' },
      { name: 'Utilities', weight: 10, color: '#6366f1' },
      { name: 'Dining', weight: 8, color: '#8b5cf6' },
      { name: 'Transport', weight: 5, color: '#a855f7' },
      { name: 'Entertainment', weight: 2, color: '#ec4899' },
    ],
    currency: 'USD',
    loading: false,
  },
  render: (args) => createBudgetSummary(args),
};

export const FewCategories: StoryObj = {
  args: {
    totalAllocated: 30000000,
    totalSpent: 22000000,
    distribution: [
      { name: 'Housing', weight: 70, color: '#ea580c' },
      { name: 'Groceries', weight: 20, color: '#3b82f6' },
      { name: 'Transport', weight: 10, color: '#a855f7' },
    ],
    currency: 'IDR',
    loading: false,
  },
  render: (args) => createBudgetSummary(args),
};

export const ManyCategories: StoryObj = {
  args: {
    totalAllocated: 80000000,
    totalSpent: 65000000,
    distribution: [
      { name: 'Housing', weight: 45, color: '#ea580c' },
      { name: 'Groceries', weight: 15, color: '#3b82f6' },
      { name: 'Utilities', weight: 10, color: '#6366f1' },
      { name: 'Dining', weight: 8, color: '#8b5cf6' },
      { name: 'Transport', weight: 6, color: '#a855f7' },
      { name: 'Entertainment', weight: 5, color: '#ec4899' },
      { name: 'Healthcare', weight: 4, color: '#14b8a6' },
      { name: 'Education', weight: 4, color: '#f59e0b' },
      { name: 'Personal', weight: 2, color: '#10b981' },
      { name: 'Other', weight: 1, color: '#ef4444' },
    ],
    currency: 'IDR',
    loading: false,
  },
  render: (args) => createBudgetSummary(args),
};

export const Loading: StoryObj = {
  args: {
    totalAllocated: 0,
    totalSpent: 0,
    distribution: [],
    currency: 'IDR',
    loading: true,
  },
  render: (args) => createBudgetSummary(args),
};

export const HighUsage: StoryObj = {
  args: {
    totalAllocated: 50000000,
    totalSpent: 48000000,
    distribution: defaultDistribution,
    currency: 'IDR',
    loading: false,
  },
  render: (args) => createBudgetSummary(args),
};
