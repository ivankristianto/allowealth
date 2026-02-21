import type { Meta, StoryObj } from '@storybook/html';
import { formatCurrency } from '@/lib/formatting/currency-client';

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
      description: 'Icon name',
    },
    currency: {
      control: 'select',
      options: ['IDR', 'USD'],
      description: 'Currency code',
    },
  },
};

export default meta;

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

const createCashFlowItem = (args: {
  name?: string;
  date?: string;
  amount?: number;
  type?: 'income' | 'expense';
  icon?: string;
  currency?: Currency;
}): HTMLElement => {
  const {
    name = 'Cash flow item',
    date = 'Jan 01, 2024',
    amount = 0,
    type = 'income',
    icon = 'trending-up',
    currency = 'IDR',
  } = args;

  const isIncome = type === 'income';
  const amountClass = isIncome ? 'text-success' : 'text-error';
  const containerClass = isIncome
    ? 'bg-success/5 border-success/20 hover:border-success/30'
    : 'bg-error/5 border-error/20 hover:border-error/30';
  const badgeClass = isIncome ? 'bg-success/10 text-success' : 'bg-error/10 text-error';
  const sign = amount === 0 ? '' : isIncome ? '+' : '-';

  const formatted = formatCurrency(Math.abs(amount), currency);

  const container = document.createElement('div');
  container.className = 'block max-w-sm';

  const innerDiv = document.createElement('div');
  innerDiv.className = `group flex items-center justify-between gap-4 p-6 rounded-3xl border shadow-sm transition-all hover:scale-[1.03] hover:shadow-md ${containerClass}`;

  const leftDiv = document.createElement('div');
  leftDiv.className = 'flex items-center gap-4 min-w-0';

  const iconBadge = document.createElement('div');
  iconBadge.className = `rounded-2xl shadow-md p-4 ${badgeClass}`;
  iconBadge.innerHTML = icons[icon] ?? icons['trending-up'];

  const textDiv = document.createElement('div');
  textDiv.className = 'min-w-0';

  const nameEl = document.createElement('p');
  nameEl.className = 'text-base font-bold tracking-tight leading-tight text-base-content truncate';
  nameEl.textContent = name;

  const dateEl = document.createElement('span');
  dateEl.className = 'text-xs font-bold text-base-content/50 tracking-widest uppercase mt-1 block';
  dateEl.textContent = date.toUpperCase();

  textDiv.appendChild(nameEl);
  textDiv.appendChild(dateEl);

  leftDiv.appendChild(iconBadge);
  leftDiv.appendChild(textDiv);

  const amountDiv = document.createElement('div');
  amountDiv.className = 'text-right leading-none shrink-0';

  const amountEl = document.createElement('span');
  amountEl.className = `text-base font-bold tracking-tight ${amountClass}`;
  amountEl.textContent = `${sign}${formatted}`;

  amountDiv.appendChild(amountEl);

  innerDiv.appendChild(leftDiv);
  innerDiv.appendChild(amountDiv);

  container.appendChild(innerDiv);

  return container;
};

export const Income: StoryObj = {
  args: {
    name: 'Project Salary',
    date: 'Jan 28, 2024',
    amount: 15000000,
    type: 'income',
    icon: 'trending-up',
    currency: 'IDR',
  },
  render: (args) => createCashFlowItem(args),
};

export const Expense: StoryObj = {
  args: {
    name: 'House Rent',
    date: 'Feb 01, 2024',
    amount: 45000000,
    type: 'expense',
    icon: 'calendar',
    currency: 'IDR',
  },
  render: (args) => createCashFlowItem(args),
};

export const USDIncome: StoryObj = {
  args: {
    name: 'Consulting Payout',
    date: 'Mar 04, 2024',
    amount: 2200,
    type: 'income',
    icon: 'banknote',
    currency: 'USD',
  },
  render: (args) => createCashFlowItem(args),
};
