/**
 * AssetPortfolioSummary Storybook Stories
 *
 * NOTE: This file duplicates the AssetPortfolioSummary.astro HTML structure because
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
    totalIdr: { control: 'number', description: 'Total asset value in IDR' },
    totalUsd: { control: 'number', description: 'Total asset value in USD' },
    debtIdr: { control: 'number', description: 'Total debt in IDR' },
    debtUsd: { control: 'number', description: 'Total debt in USD' },
    loading: { control: 'boolean', description: 'Show loading state' },
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
  debtIdr?: number;
  debtUsd?: number;
  distribution?: AllocationItem[];
  loading?: boolean;
}

function currencyBadge(currency: 'IDR' | 'USD', size: 'sm' | 'lg' = 'sm'): string {
  const isIdr = currency === 'IDR';
  const bgClass = isIdr ? 'bg-success/10 text-success' : 'bg-info/10 text-info';
  const sizeClass =
    size === 'lg'
      ? 'px-2 py-0.5 rounded-md text-[11px] w-10 justify-center'
      : 'px-1.5 py-0.5 rounded text-[10px]';
  return `<span class="inline-flex items-center ${sizeClass} font-bold uppercase tracking-wider ${bgClass} shrink-0">${currency}</span>`;
}

const createPortfolioSummary = (args: PortfolioSummaryArgs): HTMLElement => {
  const {
    totalIdr = 300800000,
    totalUsd = 53000,
    debtIdr = 43200000,
    debtUsd = 0,
    distribution = [],
    loading = false,
  } = args;

  const container = document.createElement('div');
  container.className = 'w-full max-w-6xl';

  const netWorthIdr = totalIdr - debtIdr;
  const netWorthUsd = totalUsd - debtUsd;
  const hasDebt = debtIdr > 0 || debtUsd > 0;
  const hasIdr = totalIdr > 0 || debtIdr > 0;
  const hasUsd = totalUsd > 0 || debtUsd > 0;

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
      <section class="bg-base-100 rounded-card border border-base-300 shadow-sm relative overflow-hidden" aria-busy="true" aria-label="Loading portfolio summary">
        <div class="p-6 lg:p-10 space-y-8">
          <div class="space-y-3">
            <div class="h-3.5 bg-base-300 rounded w-[120px] animate-pulse"></div>
            <div class="h-8 bg-base-300 rounded w-[280px] animate-pulse"></div>
            <div class="h-8 bg-base-300 rounded w-[200px] animate-pulse"></div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="border border-base-200 rounded-xl p-5 space-y-3">
              <div class="h-3 bg-base-300 rounded w-[100px] animate-pulse"></div>
              <div class="h-6 bg-base-300 rounded w-[200px] animate-pulse"></div>
              <div class="h-6 bg-base-300 rounded w-[140px] animate-pulse"></div>
            </div>
            <div class="border border-base-200 rounded-xl p-5 space-y-3">
              <div class="h-3 bg-base-300 rounded w-[100px] animate-pulse"></div>
              <div class="h-6 bg-base-300 rounded w-[180px] animate-pulse"></div>
            </div>
          </div>
          <div class="space-y-4 pt-6 border-t border-base-200">
            <div class="h-4 bg-base-300 rounded w-[140px] animate-pulse"></div>
            <div class="flex flex-col sm:flex-row items-center gap-6">
              <div class="w-[160px] h-[160px] rounded-full bg-base-300 animate-pulse shrink-0"></div>
              <div class="flex-1 space-y-3 w-full">
                ${Array(4)
                  .fill(0)
                  .map(
                    () => `
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="w-2.5 h-2.5 rounded-full bg-base-300 animate-pulse"></div>
                      <div class="h-3 bg-base-300 rounded w-20 animate-pulse"></div>
                    </div>
                    <div class="h-3 bg-base-300 rounded w-10 animate-pulse"></div>
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

  const netWorthIdrClass = netWorthIdr >= 0 ? 'text-accent' : 'text-error';
  const netWorthUsdClass = netWorthUsd >= 0 ? 'text-accent' : 'text-error';

  container.innerHTML = `
    <section class="bg-base-100 rounded-card border border-base-300 shadow-sm relative overflow-hidden" aria-label="Portfolio overview summary">
      <!-- Net Worth Hero -->
      <div class="bg-base-200/40 p-6 lg:px-10 lg:py-8">
        <div class="flex items-center gap-2 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-base-content/50"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          <span class="text-xs font-semibold uppercase tracking-widest text-base-content/50">Net Worth</span>
        </div>
        <div class="space-y-2.5">
          ${
            hasIdr
              ? `
            <div class="flex items-center gap-3">
              ${currencyBadge('IDR', 'lg')}
              <p class="text-2xl lg:text-3xl font-bold font-mono tracking-tight leading-none ${netWorthIdrClass}">
                ${formatCurrency(netWorthIdr, 'IDR')}
              </p>
            </div>`
              : ''
          }
          ${
            hasUsd
              ? `
            <div class="flex items-center gap-3">
              ${currencyBadge('USD', 'lg')}
              <p class="text-2xl lg:text-3xl font-bold font-mono tracking-tight leading-none ${netWorthUsdClass}">
                ${formatCurrency(netWorthUsd, 'USD')}
              </p>
            </div>`
              : ''
          }
        </div>
      </div>

      <div class="p-6 lg:px-10 lg:pb-8 space-y-8">
        <!-- Assets & Debt -->
        <div class="grid grid-cols-1 ${hasDebt ? 'md:grid-cols-2' : ''} gap-4">
          <!-- Total Assets -->
          <div class="border-l-2 border-success rounded-xl bg-base-200/30 px-5 py-4">
            <div class="flex items-center gap-2 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-success"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
              <span class="text-xs font-semibold uppercase tracking-widest text-base-content/50">Total Assets</span>
            </div>
            <div class="space-y-2">
              ${
                totalIdr > 0
                  ? `
                <div class="flex items-center gap-2.5">
                  ${currencyBadge('IDR')}
                  <p class="text-lg lg:text-xl font-bold font-mono text-success tracking-tight leading-none">${formatCurrency(totalIdr, 'IDR')}</p>
                </div>`
                  : ''
              }
              ${
                totalUsd > 0
                  ? `
                <div class="flex items-center gap-2.5">
                  ${currencyBadge('USD')}
                  <p class="text-lg lg:text-xl font-bold font-mono text-info tracking-tight leading-none">${formatCurrency(totalUsd, 'USD')}</p>
                </div>`
                  : ''
              }
            </div>
          </div>

          ${
            hasDebt
              ? `
            <!-- Total Debt -->
            <div class="border-l-2 border-error rounded-xl bg-base-200/30 px-5 py-4">
              <div class="flex items-center gap-2 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-error"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                <span class="text-xs font-semibold uppercase tracking-widest text-base-content/50">Total Debt</span>
              </div>
              <div class="space-y-2">
                ${
                  debtIdr > 0
                    ? `
                  <div class="flex items-center gap-2.5">
                    ${currencyBadge('IDR')}
                    <p class="text-lg lg:text-xl font-bold font-mono text-error tracking-tight leading-none">${formatCurrency(debtIdr, 'IDR')}</p>
                  </div>`
                    : ''
                }
                ${
                  debtUsd > 0
                    ? `
                  <div class="flex items-center gap-2.5">
                    ${currencyBadge('USD')}
                    <p class="text-lg lg:text-xl font-bold font-mono text-error tracking-tight leading-none">${formatCurrency(debtUsd, 'USD')}</p>
                  </div>`
                    : ''
                }
              </div>
            </div>`
              : ''
          }
        </div>

        ${
          displayDistribution.length > 0
            ? `
          <!-- Asset Allocation -->
          <div class="space-y-5 pt-6 border-t border-base-200">
            <h3 class="font-bold text-sm uppercase tracking-wider text-base-content">Asset Allocation</h3>

            <div class="flex flex-col sm:flex-row items-center gap-6 lg:gap-10">
              <!-- Chart placeholder (no Chart.js in Storybook) -->
              <div class="w-[160px] h-[160px] lg:w-[180px] lg:h-[180px] shrink-0 relative flex items-center justify-center rounded-full border-[16px] border-base-300">
                <span class="text-xs text-base-content/40 font-medium">Chart</span>
              </div>

              <!-- Legend -->
              <div class="flex-1 w-full">
                <div class="grid grid-cols-1 gap-2">
                  ${displayDistribution
                    .map(
                      (item) => `
                    <div class="flex items-center justify-between py-1">
                      <div class="flex items-center gap-2.5">
                        <div class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${item.color};" aria-hidden="true"></div>
                        <span class="text-sm text-base-content/70 font-medium">${item.type}</span>
                      </div>
                      <span class="text-sm font-bold text-base-content tabular-nums">${item.percentage}%</span>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>
            </div>

            <!-- Stacked Bar -->
            <div class="relative" data-allocation-bar>
              <div class="h-4 w-full bg-base-300 rounded-full overflow-hidden flex shadow-inner" role="img" aria-label="Asset allocation distribution">
                ${displayDistribution
                  .map(
                    (item) => `
                  <div class="h-full transition-all duration-500" style="width: ${item.percentage}%; background-color: ${item.color};"></div>
                `
                  )
                  .join('')}
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

const defaultDistribution: AllocationItem[] = [
  { type: 'Stock', percentage: 64, color: '#15803d' },
  { type: 'Bank Account', percentage: 15, color: '#10b981' },
  { type: 'Crypto', percentage: 9, color: '#8b5cf6' },
  { type: 'Bond', percentage: 9, color: '#3b82f6' },
  { type: 'Mutual Fund', percentage: 2, color: '#f59e0b' },
  { type: 'Cash', percentage: 0, color: '#ef4444' },
  { type: 'E-Wallet', percentage: 0, color: '#ec4899' },
];

export const Default: StoryObj = {
  args: {
    totalIdr: 300800000,
    totalUsd: 53000,
    debtIdr: 43200000,
    debtUsd: 0,
    distribution: defaultDistribution,
    loading: false,
  },
  render: (args) => createPortfolioSummary(args),
};

export const Loading: StoryObj = {
  args: {
    totalIdr: 0,
    totalUsd: 0,
    debtIdr: 0,
    debtUsd: 0,
    distribution: [],
    loading: true,
  },
  render: (args) => createPortfolioSummary(args),
};

export const SingleCurrency: StoryObj = {
  args: {
    totalIdr: 500000000,
    totalUsd: 0,
    debtIdr: 25000000,
    debtUsd: 0,
    distribution: [
      { type: 'Bank Account', percentage: 60, color: '#10b981' },
      { type: 'Stock', percentage: 40, color: '#15803d' },
    ],
    loading: false,
  },
  render: (args) => createPortfolioSummary(args),
};

export const NoDebt: StoryObj = {
  args: {
    totalIdr: 1000000000,
    totalUsd: 50000,
    debtIdr: 0,
    debtUsd: 0,
    distribution: [
      { type: 'Stock', percentage: 50, color: '#15803d' },
      { type: 'Mutual Fund', percentage: 30, color: '#f59e0b' },
      { type: 'Bank Account', percentage: 20, color: '#10b981' },
    ],
    loading: false,
  },
  render: (args) => createPortfolioSummary(args),
};

export const NegativeNetWorth: StoryObj = {
  args: {
    totalIdr: 50000000,
    totalUsd: 5000,
    debtIdr: 200000000,
    debtUsd: 10000,
    distribution: [
      { type: 'Bank Account', percentage: 70, color: '#10b981' },
      { type: 'Cash', percentage: 30, color: '#ef4444' },
    ],
    loading: false,
  },
  render: (args) => createPortfolioSummary(args),
};

export const ManyAssetTypes: StoryObj = {
  args: {
    totalIdr: 2000000000,
    totalUsd: 133333.33,
    debtIdr: 100000000,
    debtUsd: 5000,
    distribution: [
      { type: 'Stock', percentage: 40, color: '#15803d' },
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
