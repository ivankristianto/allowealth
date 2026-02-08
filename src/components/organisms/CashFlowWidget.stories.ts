import type { Meta, StoryObj } from '@storybook/html';
import { formatCurrency } from '@/lib/formatting/currency-client';

const meta: Meta = {
  title: 'Organisms/CashFlowWidget',
  tags: ['autodocs'],
  argTypes: {
    loading: {
      control: 'boolean',
      description: 'Show loading skeleton state',
    },
    empty: {
      control: 'boolean',
      description: 'Show empty state',
    },
  },
};

export default meta;

interface CashFlowItem {
  name: string;
  date: string;
  amount: number;
  type: string;
  icon: string;
  currency: string;
}

const sampleItems: CashFlowItem[] = [
  {
    name: 'Project Salary',
    date: 'Jan 28, 2024',
    amount: 15000000,
    type: 'income',
    icon: 'trending-up',
    currency: 'IDR',
  },
  {
    name: 'House Rent',
    date: 'Feb 01, 2024',
    amount: 45000000,
    type: 'expense',
    icon: 'calendar',
    currency: 'IDR',
  },
];

const icons: Record<string, string> = {
  'trending-up':
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>',
  calendar:
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',
};

const renderItem = (item: CashFlowItem): string => {
  const isIncome = item.type === 'income';
  const containerClass = isIncome
    ? 'bg-success/5 border-success/20 hover:border-success/30'
    : 'bg-error/5 border-error/20 hover:border-error/30';
  const amountClass = isIncome ? 'text-success' : 'text-error';
  const badgeClass = isIncome ? 'bg-success/10 text-success' : 'bg-error/10 text-error';
  const sign = item.amount === 0 ? '' : isIncome ? '+' : '-';
  const formatted = formatCurrency(Math.abs(item.amount), item.currency);

  return `
    <div class="group flex items-center justify-between gap-4 p-6 rounded-3xl border shadow-sm transition-all hover:scale-[1.03] hover:shadow-md ${containerClass}">
      <div class="flex items-center gap-4 min-w-0">
        <div class="rounded-2xl shadow-md p-4 ${badgeClass}">
          ${icons[item.icon] ?? icons['trending-up']}
        </div>
        <div class="min-w-0">
          <p class="text-base font-bold tracking-tight leading-tight text-base-content truncate">${item.name}</p>
          <span class="text-xs font-bold text-base-content/50 tracking-widest uppercase mt-1 block">${item.date.toUpperCase()}</span>
        </div>
      </div>
      <div class="text-right leading-none shrink-0">
        <span class="text-base font-bold tracking-tight ${amountClass}">${sign}${formatted}</span>
      </div>
    </div>
  `;
};

const createCashFlowWidget = (args: { loading?: boolean; empty?: boolean }): HTMLElement => {
  const { loading = false, empty = false } = args;

  const container = document.createElement('div');
  container.className = 'block max-w-sm';

  if (loading) {
    container.innerHTML = `
      <div class="bg-base-100 rounded-3xl border border-base-300 shadow-premium p-8">
        <div class="space-y-6">
          <span class="text-xs font-semibold uppercase tracking-widest text-base-content/60">Cash flow analysis</span>
          <div class="space-y-5">
            ${[1, 2]
              .map(
                () => `
              <div class="flex items-center justify-between gap-4 p-6 rounded-3xl border border-base-200 bg-base-200/40 animate-pulse">
                <div class="flex items-center gap-4">
                  <div class="h-12 w-12 rounded-2xl bg-base-200"></div>
                  <div class="space-y-2">
                    <div class="h-4 w-32 bg-base-200 rounded"></div>
                    <div class="h-3 w-20 bg-base-200 rounded"></div>
                  </div>
                </div>
                <div class="h-4 w-24 bg-base-200 rounded"></div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
    return container;
  }

  if (empty) {
    container.innerHTML = `
      <div class="bg-base-100 rounded-3xl border border-base-300 shadow-premium p-8">
        <div class="space-y-4">
          <span class="text-xs font-semibold uppercase tracking-widest text-base-content/60">Cash flow analysis</span>
          <p class="text-sm text-base-content/60">
            No cash flow entries yet. Add income or expenses to see upcoming activity.
          </p>
        </div>
      </div>
    `;
    return container;
  }

  container.innerHTML = `
    <div class="bg-base-100 rounded-3xl border border-base-300 shadow-premium p-8">
      <div class="space-y-6">
        <span class="text-xs font-semibold uppercase tracking-widest text-base-content/60">Cash flow analysis</span>
        <div class="space-y-5">
          ${sampleItems.map(renderItem).join('')}
        </div>
      </div>
    </div>
  `;

  return container;
};

export const Default: StoryObj = {
  args: {
    loading: false,
    empty: false,
  },
  render: (args) => createCashFlowWidget(args),
};

export const Loading: StoryObj = {
  args: {
    loading: true,
    empty: false,
  },
  render: (args) => createCashFlowWidget(args),
};

export const Empty: StoryObj = {
  args: {
    loading: false,
    empty: true,
  },
  render: (args) => createCashFlowWidget(args),
};
