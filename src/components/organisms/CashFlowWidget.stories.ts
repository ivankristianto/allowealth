import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Organisms/CashFlowWidget',
  tags: ['autodocs'],
  argTypes: {
    items: {
      control: 'object',
      description: 'Cash flow items list',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading skeleton state',
    },
  },
};

export default meta;

type Story = StoryObj;

const sampleItems = [
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

export const Default: Story = {
  args: {
    items: sampleItems,
    loading: false,
  },
  render: (args) => html`
    <cash-flow-widget data-items="${JSON.stringify(args.items)}" ?loading="${args.loading}">
    </cash-flow-widget>
  `,
};

export const Loading: Story = {
  args: {
    items: sampleItems,
    loading: true,
  },
  render: (args) => html`
    <cash-flow-widget data-items="${JSON.stringify(args.items)}" ?loading="${args.loading}">
    </cash-flow-widget>
  `,
};

export const Empty: Story = {
  args: {
    items: [],
    loading: false,
  },
  render: (args) => html`
    <cash-flow-widget data-items="${JSON.stringify(args.items)}" ?loading="${args.loading}">
    </cash-flow-widget>
  `,
};

customElements.define(
  'cash-flow-widget',
  class extends HTMLElement {
    connectedCallback() {
      const loading = this.hasAttribute('loading');
      const itemsAttribute = this.getAttribute('data-items') ?? '[]';
      const items = JSON.parse(itemsAttribute) as Array<{
        name: string;
        date: string;
        amount: number;
        type: string;
        icon: string;
        currency: string;
      }>;

      this.className = 'block max-w-sm';

      if (loading) {
        this.innerHTML = `
          <div class="bg-base-100 rounded-3xl border border-base-300 shadow-premium p-8">
            <div class="space-y-6">
              <span class="text-[10px] font-semibold uppercase tracking-widest text-base-content/60">Cash flow analysis</span>
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
        return;
      }

      if (items.length === 0) {
        this.innerHTML = `
          <div class="bg-base-100 rounded-3xl border border-base-300 shadow-premium p-8">
            <div class="space-y-4">
              <span class="text-[10px] font-semibold uppercase tracking-widest text-base-content/60">Cash flow analysis</span>
              <p class="text-sm text-base-content/60">
                No cash flow entries yet. Add income or expenses to see upcoming activity.
              </p>
            </div>
          </div>
        `;
        return;
      }

      const renderItem = (item: (typeof items)[number]) => {
        const isIncome = item.type === 'income';
        const containerClass = isIncome
          ? 'bg-success/5 border-success/20 hover:border-success/30'
          : 'bg-error/5 border-error/20 hover:border-error/30';
        const amountClass = isIncome ? 'text-success' : 'text-error';
        const badgeClass = isIncome ? 'bg-success/10 text-success' : 'bg-error/10 text-error';
        const sign = item.amount === 0 ? '' : isIncome ? '+' : '-';
        const formatted = new Intl.NumberFormat(item.currency === 'USD' ? 'en-US' : 'id-ID', {
          style: 'currency',
          currency: item.currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: item.currency === 'USD' ? 2 : 0,
        }).format(Math.abs(item.amount));

        const icons: Record<string, string> = {
          'trending-up':
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>',
          calendar:
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',
        };

        return `
          <div class="group flex items-center justify-between gap-4 p-6 rounded-3xl border shadow-sm transition-all hover:scale-[1.03] hover:shadow-md ${containerClass}">
            <div class="flex items-center gap-4 min-w-0">
              <div class="rounded-2xl shadow-md p-4 ${badgeClass}">
                ${icons[item.icon] ?? icons['trending-up']}
              </div>
              <div class="min-w-0">
                <p class="text-base font-bold tracking-tight leading-tight text-base-content truncate">${item.name}</p>
                <span class="text-[10px] font-bold text-base-content/50 tracking-widest uppercase mt-1 block">${item.date.toUpperCase()}</span>
              </div>
            </div>
            <div class="text-right leading-none shrink-0">
              <span class="text-base font-bold tracking-tight ${amountClass}">${sign}${formatted}</span>
            </div>
          </div>
        `;
      };

      this.innerHTML = `
        <div class="bg-base-100 rounded-3xl border border-base-300 shadow-premium p-8">
          <div class="space-y-6">
            <span class="text-[10px] font-semibold uppercase tracking-widest text-base-content/60">Cash flow analysis</span>
            <div class="space-y-5">
              ${items.map(renderItem).join('')}
            </div>
          </div>
        </div>
      `;
    }
  }
);
