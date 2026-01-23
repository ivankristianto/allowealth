import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Molecules/CashFlowItem',
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'text',
      description: 'Cash flow item name',
    },
    date: {
      control: 'text',
      description: 'Display date',
    },
    amount: {
      control: 'number',
      description: 'Amount value',
    },
    type: {
      control: 'select',
      options: ['income', 'expense'],
      description: 'Cash flow type',
    },
    icon: {
      control: 'select',
      options: ['trending-up', 'calendar', 'banknote', 'receipt'],
      description: 'Lucide icon name',
    },
    currency: {
      control: 'select',
      options: ['IDR', 'USD'],
      description: 'Currency code',
    },
  },
};

export default meta;

type Story = StoryObj;

export const Income: Story = {
  args: {
    name: 'Project Salary',
    date: 'Jan 28, 2024',
    amount: 15000000,
    type: 'income',
    icon: 'trending-up',
    currency: 'IDR',
  },
  render: (args) => html`
    <cash-flow-item
      name="${args.name}"
      date="${args.date}"
      amount="${args.amount}"
      type="${args.type}"
      icon="${args.icon}"
      currency="${args.currency}"
    ></cash-flow-item>
  `,
};

export const Expense: Story = {
  args: {
    name: 'House Rent',
    date: 'Feb 01, 2024',
    amount: 45000000,
    type: 'expense',
    icon: 'calendar',
    currency: 'IDR',
  },
  render: (args) => html`
    <cash-flow-item
      name="${args.name}"
      date="${args.date}"
      amount="${args.amount}"
      type="${args.type}"
      icon="${args.icon}"
      currency="${args.currency}"
    ></cash-flow-item>
  `,
};

export const USDIncome: Story = {
  args: {
    name: 'Consulting Payout',
    date: 'Mar 04, 2024',
    amount: 2200,
    type: 'income',
    icon: 'banknote',
    currency: 'USD',
  },
  render: (args) => html`
    <cash-flow-item
      name="${args.name}"
      date="${args.date}"
      amount="${args.amount}"
      type="${args.type}"
      icon="${args.icon}"
      currency="${args.currency}"
    ></cash-flow-item>
  `,
};

customElements.define(
  'cash-flow-item',
  class extends HTMLElement {
    connectedCallback() {
      const name = this.getAttribute('name') ?? 'Cash flow item';
      const date = this.getAttribute('date') ?? 'Jan 01, 2024';
      const amount = Number(this.getAttribute('amount') ?? '0');
      const type = this.getAttribute('type') ?? 'income';
      const icon = this.getAttribute('icon') ?? 'trending-up';
      const currency = this.getAttribute('currency') ?? 'IDR';

      const isIncome = type === 'income';
      const amountClass = isIncome ? 'text-success' : 'text-error';
      const containerClass = isIncome
        ? 'bg-success/5 border-success/20 hover:border-success/30'
        : 'bg-error/5 border-error/20 hover:border-error/30';
      const badgeClass = isIncome ? 'bg-success/10 text-success' : 'bg-error/10 text-error';
      const sign = amount === 0 ? '' : isIncome ? '+' : '-';

      const formatted = new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'id-ID', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: currency === 'USD' ? 2 : 0,
      }).format(Math.abs(amount));

      const dateLabel = date.toUpperCase();

      const icons: Record<string, string> = {
        'trending-up':
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>',
        calendar:
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',
        banknote:
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>',
        receipt:
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l4-2 4 2 4-2 4 2V2z"/><path d="M16 8H8"/><path d="M16 12H8"/><path d="M16 16H8"/></svg>',
      };

      this.className = 'block max-w-sm';
      this.innerHTML = `
        <div class="group flex items-center justify-between gap-4 p-6 rounded-3xl border shadow-sm transition-all hover:scale-[1.03] hover:shadow-md ${containerClass}">
          <div class="flex items-center gap-4 min-w-0">
            <div class="rounded-2xl shadow-md p-4 ${badgeClass}">
              ${icons[icon] ?? icons['trending-up']}
            </div>
            <div class="min-w-0">
              <p class="text-base font-bold tracking-tight leading-tight text-base-content truncate">${name}</p>
              <span class="text-[10px] font-bold text-base-content/50 tracking-widest uppercase mt-1 block">${dateLabel}</span>
            </div>
          </div>
          <div class="text-right leading-none shrink-0">
            <span class="text-base font-bold tracking-tight ${amountClass}">${sign}${formatted}</span>
          </div>
        </div>
      `;
    }
  }
);
