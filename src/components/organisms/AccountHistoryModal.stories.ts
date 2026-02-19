/**
 * AccountHistoryModal Storybook Stories
 *
 * P1: NOTE - This file duplicates the AccountHistoryModal.astro HTML structure because
 * Storybook's HTML framework cannot directly render Astro components.
 * When updating AccountHistoryModal.astro, ensure this file is updated to match.
 *
 * @see src/components/organisms/AccountHistoryModal.astro
 */
import type { Meta, StoryObj } from '@storybook/html';
import { formatCurrency } from '@/lib/formatting/currency-client';

const meta: Meta = {
  title: 'Organisms/AccountHistoryModal',
  tags: ['autodocs'],
  argTypes: {
    accountName: {
      control: 'text',
      description: 'Name of the account',
    },
    accountType: {
      control: 'text',
      description: 'Type of the account',
    },
    balance: {
      control: 'number',
      description: 'Current balance',
    },
    currency: {
      control: 'select',
      options: ['IDR', 'USD'],
      description: 'Currency',
    },
    changePercent: {
      control: 'number',
      description: 'Change percentage',
    },
    timeframe: {
      control: 'select',
      options: ['weekly', 'monthly'],
      description: 'Selected timeframe',
    },
    isLoading: {
      control: 'boolean',
      description: 'Show loading state',
    },
    isEmpty: {
      control: 'boolean',
      description: 'Show empty state',
    },
  },
};

export default meta;

// Generate mock SVG chart path
const generateChartPath = (points: number): { linePath: string; areaPath: string } => {
  const width = 760;
  const height = 200;
  const padding = 20;

  const chartPoints: { x: number; y: number }[] = [];

  for (let i = 0; i < points; i++) {
    const x = padding + (i / (points - 1)) * (width - padding * 2);
    // Generate a smooth wave-like pattern
    const y = padding + height / 2 + Math.sin((i / points) * Math.PI * 3) * (height / 3) - i * 2;
    chartPoints.push({ x, y: Math.max(padding, Math.min(height - padding, y)) });
  }

  const linePath = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const areaPath =
    linePath +
    ` L ${chartPoints[chartPoints.length - 1].x} ${height}` +
    ` L ${chartPoints[0].x} ${height} Z`;

  return { linePath, areaPath };
};

interface AccountHistoryModalArgs {
  accountName?: string;
  accountType?: string;
  balance?: number;
  currency?: 'IDR' | 'USD';
  changePercent?: number;
  timeframe?: 'weekly' | 'monthly';
  isLoading?: boolean;
  isEmpty?: boolean;
}

const createAccountHistoryModal = (args: AccountHistoryModalArgs): HTMLElement => {
  const {
    accountName = 'BCA Checking',
    accountType = 'Bank Account',
    balance = 15250000,
    currency = 'IDR',
    changePercent = 0.27,
    timeframe = 'monthly',
    isLoading = false,
    isEmpty = false,
  } = args;

  const container = document.createElement('div');
  container.className = 'w-full max-w-4xl mx-auto';

  const isPositive = changePercent >= 0;
  const changeBadgeClasses = isPositive ? 'bg-success/10 text-success' : 'bg-error/10 text-error';

  const { linePath, areaPath } = generateChartPath(timeframe === 'weekly' ? 7 : 30);

  // Generate x-axis labels
  const today = new Date();
  const labelCount = timeframe === 'weekly' ? 7 : 8;
  const dayStep = timeframe === 'weekly' ? 1 : 4;
  const xLabels = Array.from({ length: labelCount }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (labelCount - 1 - i) * dayStep);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  container.innerHTML = `
    <div class="bg-base-100 rounded-3xl shadow-xl border border-base-300 p-6 lg:p-8">
      <div class="space-y-8">
        <!-- Header with account info -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center bg-accent/10 text-accent">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <div>
              <h2 class="text-2xl font-bold tracking-tight text-base-content leading-none">${accountName}</h2>
              <p class="text-xs font-bold text-base-content/40 uppercase tracking-widest mt-2">${accountType} • ${currency} Accounts</p>
            </div>
          </div>

          <div class="flex flex-col items-start md:items-end">
            <p class="text-2xl md:text-3xl font-bold text-base-content tracking-tight">${formatCurrency(balance, currency)}</p>
            <div class="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${changeBadgeClasses}">
              ${
                isPositive
                  ? `
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m5 12 7-7 7 7"/>
                  <path d="M12 19V5"/>
                </svg>
              `
                  : `
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 5v14"/>
                  <path d="m19 12-7 7-7-7"/>
                </svg>
              `
              }
              <span>${Math.abs(changePercent).toFixed(2)}% (${timeframe})</span>
            </div>
          </div>
        </div>

        <!-- Chart section -->
        <div class="bg-base-200/50 rounded-3xl p-6 md:p-8 border border-base-300/50">
          <!-- Chart header -->
          <div class="flex justify-between items-center mb-8">
            <h3 class="text-sm font-bold text-base-content/60 uppercase tracking-widest">
              Performance History
            </h3>
            <div class="flex bg-base-100 p-1 rounded-xl shadow-sm border border-base-300/50">
              <button
                type="button"
                class="px-4 py-2 text-xs font-bold rounded-lg uppercase tracking-widest transition-all ${timeframe === 'weekly' ? 'bg-accent text-white shadow-sm' : 'text-base-content/50'}"
              >
                7 Days
              </button>
              <button
                type="button"
                class="px-4 py-2 text-xs font-bold rounded-lg uppercase tracking-widest transition-all ${timeframe === 'monthly' ? 'bg-accent text-white shadow-sm' : 'text-base-content/50'}"
              >
                30 Days
              </button>
            </div>
          </div>

          <!-- Chart container -->
          <div class="relative h-[250px] md:h-[300px] w-full">
            ${
              isLoading
                ? `
              <!-- Loading state -->
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="loading loading-spinner loading-lg text-accent"></div>
              </div>
            `
                : isEmpty
                  ? `
              <!-- Empty state -->
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <p class="text-base-content/50 text-sm">No history data available</p>
              </div>
            `
                  : `
              <!-- SVG Chart -->
              <svg class="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#15803d" stop-opacity="0.3"></stop>
                    <stop offset="100%" stop-color="#15803d" stop-opacity="0"></stop>
                  </linearGradient>
                </defs>

                <!-- Grid lines -->
                <g class="text-base-300">
                  <line x1="0" y1="60" x2="800" y2="60" stroke="currentColor" stroke-dasharray="4 4" opacity="0.3"></line>
                  <line x1="0" y1="120" x2="800" y2="120" stroke="currentColor" stroke-dasharray="4 4" opacity="0.3"></line>
                  <line x1="0" y1="180" x2="800" y2="180" stroke="currentColor" stroke-dasharray="4 4" opacity="0.3"></line>
                  <line x1="0" y1="240" x2="800" y2="240" stroke="currentColor" stroke-dasharray="4 4" opacity="0.3"></line>
                </g>

                <!-- Area fill -->
                <path d="${areaPath}" fill="url(#gradient)"></path>

                <!-- Line -->
                <path d="${linePath}" fill="none" stroke="#15803d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>

              <!-- X-axis labels -->
              <div class="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs font-bold text-base-content/40 uppercase tracking-wider">
                ${xLabels.map((label) => `<span>${label}</span>`).join('')}
              </div>
            `
            }
          </div>
        </div>

        <!-- Close button -->
        <div class="flex justify-end">
          <button
            type="button"
            class="px-8 py-4 bg-neutral text-neutral-content rounded-2xl font-bold uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 shadow-lg"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  `;

  return container;
};

export const Default: StoryObj = {
  args: {
    accountName: 'BCA Checking',
    accountType: 'Bank Account',
    balance: 15250000,
    currency: 'IDR',
    changePercent: 0.27,
    timeframe: 'monthly',
    isLoading: false,
    isEmpty: false,
  },
  render: (args) => createAccountHistoryModal(args),
};

export const WeeklyView: StoryObj = {
  args: {
    accountName: 'BCA Checking',
    accountType: 'Bank Account',
    balance: 15250000,
    currency: 'IDR',
    changePercent: 1.5,
    timeframe: 'weekly',
    isLoading: false,
    isEmpty: false,
  },
  render: (args) => createAccountHistoryModal(args),
};

export const USDAccount: StoryObj = {
  args: {
    accountName: 'Fidelity 401(k)',
    accountType: 'Stock',
    balance: 125000.5,
    currency: 'USD',
    changePercent: 5.25,
    timeframe: 'monthly',
    isLoading: false,
    isEmpty: false,
  },
  render: (args) => createAccountHistoryModal(args),
};

export const NegativeChange: StoryObj = {
  args: {
    accountName: 'Crypto Accounts',
    accountType: 'Cryptocurrency',
    balance: 5000000,
    currency: 'IDR',
    changePercent: -12.5,
    timeframe: 'monthly',
    isLoading: false,
    isEmpty: false,
  },
  render: (args) => createAccountHistoryModal(args),
};

export const Loading: StoryObj = {
  args: {
    accountName: 'BCA Checking',
    accountType: 'Bank Account',
    balance: 15250000,
    currency: 'IDR',
    changePercent: 0,
    timeframe: 'monthly',
    isLoading: true,
    isEmpty: false,
  },
  render: (args) => createAccountHistoryModal(args),
};

export const Empty: StoryObj = {
  args: {
    accountName: 'New Account',
    accountType: 'Other',
    balance: 1000000,
    currency: 'IDR',
    changePercent: 0,
    timeframe: 'monthly',
    isLoading: false,
    isEmpty: true,
  },
  render: (args) => createAccountHistoryModal(args),
};

export const LargeBalance: StoryObj = {
  args: {
    accountName: 'Main Investment',
    accountType: 'Mutual Fund',
    balance: 1500000000,
    currency: 'IDR',
    changePercent: 8.75,
    timeframe: 'monthly',
    isLoading: false,
    isEmpty: false,
  },
  render: (args) => createAccountHistoryModal(args),
};
