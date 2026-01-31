/**
 * AssetPortfolioSummary Storybook Stories
 *
 * P1: NOTE - This file duplicates the AssetPortfolioSummary.astro HTML structure because
 * Storybook's HTML framework cannot directly render Astro components.
 * When updating AssetPortfolioSummary.astro, ensure this file is updated to match.
 *
 * @see src/components/organisms/AssetPortfolioSummary.astro
 */
import type { Meta, StoryObj } from '@storybook/html';
import { formatCurrency } from '@/lib/formatting/currency-client';

const meta: Meta = {
  title: 'Organisms/AssetPortfolioSummary',
  tags: ['autodocs'],
  argTypes: {
    totalIdr: {
      control: 'number',
      description: 'Total portfolio value in IDR',
    },
    totalUsd: {
      control: 'number',
      description: 'Total portfolio value in USD',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading state',
    },
  },
};

export default meta;

interface AllocationItem {
  type: string;
  percentage: number;
  color: string;
}

interface PortfolioSummaryArgs {
  totalIdr?: number;
  totalUsd?: number;
  distribution?: AllocationItem[];
  loading?: boolean;
}

const createPortfolioSummary = (args: PortfolioSummaryArgs): HTMLElement => {
  const { totalIdr = 1043200000, totalUsd = 69546.67, distribution = [], loading = false } = args;

  const container = document.createElement('div');
  container.className = 'w-full max-w-6xl';

  const MAX_LEGEND_ITEMS = 7;
  const OTHERS_COLOR = '#9ca3af';
  const sortedDistribution = [...distribution].sort((a, b) => b.percentage - a.percentage);
  const topTypes = sortedDistribution.slice(0, MAX_LEGEND_ITEMS);
  const remainingTypes = sortedDistribution.slice(MAX_LEGEND_ITEMS);
  const othersPercentage = remainingTypes.reduce((sum, item) => sum + item.percentage, 0);
  const displayDistribution: AllocationItem[] =
    othersPercentage > 0
      ? [...topTypes, { type: 'Others', percentage: othersPercentage, color: OTHERS_COLOR }]
      : topTypes;

  if (loading) {
    container.innerHTML = `
      <section class="bg-base-100 rounded-card border border-base-300 shadow-sm p-6 lg:p-10 relative overflow-hidden" aria-busy="true" aria-label="Loading portfolio summary">
        <div class="space-y-8">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            <div class="flex items-center justify-between">
              <div>
                <div class="h-3 bg-base-300 rounded w-24 animate-pulse"></div>
                <div class="h-9 bg-base-300 rounded w-48 mt-3 animate-pulse"></div>
              </div>
              <div class="w-14 h-14 bg-base-300 rounded-2xl animate-pulse"></div>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <div class="h-3 bg-base-300 rounded w-24 animate-pulse"></div>
                <div class="h-9 bg-base-300 rounded w-40 mt-3 animate-pulse"></div>
              </div>
              <div class="w-14 h-14 bg-base-300 rounded-2xl animate-pulse"></div>
            </div>
          </div>
          <div class="space-y-4 pt-6 border-t border-base-200">
            <div class="flex justify-between items-center">
              <div class="h-4 bg-base-300 rounded w-32 animate-pulse"></div>
              <div class="flex gap-4">
                ${Array(3)
                  .fill(0)
                  .map(
                    () => `
                  <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-base-300 animate-pulse"></div>
                    <div class="h-2.5 bg-base-300 rounded w-20 animate-pulse"></div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
            <div class="h-4 bg-base-300 rounded-full animate-pulse"></div>
          </div>
        </div>
      </section>
    `;
    return container;
  }

  container.innerHTML = `
    <section class="bg-base-100 rounded-card border border-base-300 shadow-sm p-6 lg:p-10 relative overflow-hidden" aria-label="Portfolio overview summary">
      <div class="space-y-8">
        <!-- Total Values -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          <!-- Total Value (IDR) -->
          <div class="flex items-center justify-between">
            <div>
              <span class="label-premium uppercase tracking-widest font-semibold text-[10px] text-base-content/60">Total Value (IDR)</span>
              <p class="text-2xl lg:text-3xl font-bold mt-2 lg:mt-3 text-success tracking-tight leading-none">
                ${formatCurrency(totalIdr, 'IDR')}
              </p>
            </div>
            <div class="w-12 h-12 lg:w-14 lg:h-14 bg-success/10 text-success rounded-2xl flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>
                <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
              </svg>
            </div>
          </div>

          <!-- Total Value (USD) -->
          <div class="flex items-center justify-between">
            <div>
              <span class="label-premium uppercase tracking-widest font-semibold text-[10px] text-base-content/60">Total Value (USD)</span>
              <p class="text-2xl lg:text-3xl font-bold mt-2 lg:mt-3 text-info tracking-tight leading-none">
                ${formatCurrency(totalUsd, 'USD')}
              </p>
            </div>
            <div class="w-12 h-12 lg:w-14 lg:h-14 bg-info/10 text-info rounded-2xl flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                <path d="M2 12h20"/>
              </svg>
            </div>
          </div>
        </div>

        ${
          displayDistribution.length > 0
            ? `
          <!-- Asset Allocation -->
          <div class="space-y-4 pt-6 border-t border-base-200">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 class="font-bold text-sm uppercase tracking-wider text-base-content">Asset Allocation</h3>
              <div class="flex gap-4 lg:gap-6 overflow-x-auto hide-scrollbar pb-1 w-full sm:w-auto">
                ${displayDistribution
                  .map(
                    (item) => `
                  <div class="flex items-center gap-1.5 shrink-0">
                    <div class="w-2 h-2 rounded-full" style="background-color: ${item.color};" aria-hidden="true"></div>
                    <span class="text-[10px] font-bold text-base-content/60 uppercase tracking-widest whitespace-nowrap">${item.type} (${item.percentage}%)</span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>

            <!-- Stacked Bar -->
            <div class="relative" data-allocation-bar>
              <div class="h-4 w-full bg-base-300 rounded-full overflow-hidden flex shadow-inner" role="img" aria-label="Asset allocation distribution">
                ${displayDistribution
                  .map(
                    (item) => `
                  <div
                    class="h-full transition-all duration-500 relative group/segment cursor-pointer"
                    style="width: ${item.percentage}%; background-color: ${item.color};"
                    data-segment-type="${item.type}"
                    data-segment-percentage="${item.percentage}"
                  >
                    <div class="absolute inset-0 bg-white/10 opacity-0 group-hover/segment:opacity-100 transition-opacity"></div>
                  </div>
                `
                  )
                  .join('')}
              </div>
              <div
                class="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-neutral text-neutral-content text-xs font-medium rounded-lg shadow-lg opacity-0 pointer-events-none transition-opacity z-50 whitespace-nowrap"
                data-allocation-tooltip
              >
                <span data-tooltip-text></span>
                <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral rotate-45"></div>
              </div>
            </div>
          </div>
        `
            : ''
        }
      </div>
    </section>
  `;

  return container;
};

// Default distribution based on screenshot
const defaultDistribution: AllocationItem[] = [
  { type: 'Stock', percentage: 78, color: '#16a34a' },
  { type: 'Bank Account', percentage: 19, color: '#10b981' },
  { type: 'Mutual Fund', percentage: 2, color: '#f59e0b' },
];

export const Default: StoryObj = {
  args: {
    totalIdr: 1043200000,
    totalUsd: 69546.67,
    distribution: defaultDistribution,
    loading: false,
  },
  render: (args) => createPortfolioSummary(args),
};

export const Loading: StoryObj = {
  args: {
    totalIdr: 0,
    totalUsd: 0,
    distribution: [],
    loading: true,
  },
  render: (args) => createPortfolioSummary(args),
};

export const FewAssetTypes: StoryObj = {
  args: {
    totalIdr: 500000000,
    totalUsd: 33333.33,
    distribution: [
      { type: 'Bank Account', percentage: 60, color: '#10b981' },
      { type: 'Stock', percentage: 40, color: '#16a34a' },
    ],
    loading: false,
  },
  render: (args) => createPortfolioSummary(args),
};

export const ManyAssetTypes: StoryObj = {
  args: {
    totalIdr: 2000000000,
    totalUsd: 133333.33,
    distribution: [
      { type: 'Stock', percentage: 40, color: '#16a34a' },
      { type: 'Bank Account', percentage: 25, color: '#10b981' },
      { type: 'Mutual Fund', percentage: 15, color: '#f59e0b' },
      { type: 'Bond', percentage: 10, color: '#3b82f6' },
      { type: 'Crypto', percentage: 5, color: '#8b5cf6' },
      { type: 'Real Estate', percentage: 3, color: '#ec4899' },
      { type: 'Gold', percentage: 1, color: '#14b8a6' },
      { type: 'Other', percentage: 1, color: '#9ca3af' },
    ],
    loading: false,
  },
  render: (args) => createPortfolioSummary(args),
};

export const SmallPortfolio: StoryObj = {
  args: {
    totalIdr: 15000000,
    totalUsd: 1000,
    distribution: [{ type: 'Bank Account', percentage: 100, color: '#10b981' }],
    loading: false,
  },
  render: (args) => createPortfolioSummary(args),
};

export const NoAssets: StoryObj = {
  args: {
    totalIdr: 0,
    totalUsd: 0,
    distribution: [],
    loading: false,
  },
  render: (args) => createPortfolioSummary(args),
};
