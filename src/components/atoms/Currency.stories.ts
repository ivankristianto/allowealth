import type { Meta, StoryObj } from '@storybook/html';
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatting/currency-client';

const meta: Meta = {
  title: 'Atoms/Currency',
  tags: ['autodocs'],
  argTypes: {
    amount: { control: 'number' },
    currency: {
      control: 'select',
      options: ['IDR', 'USD'],
    },
    compact: { control: 'boolean' },
    showSign: { control: 'boolean' },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    variant: {
      control: 'select',
      options: ['default', 'positive', 'negative', 'neutral'],
    },
  },
};

export default meta;

const createCurrency = (args: {
  amount?: number;
  currency?: string;
  compact?: boolean;
  showSign?: boolean;
  size?: string;
  variant?: string;
}): HTMLElement => {
  const {
    amount = 0,
    currency = 'IDR',
    compact = false,
    showSign = false,
    size = 'md',
    variant = 'default',
  } = args;

  const span = document.createElement('span');

  const sizeClasses: Record<string, string> = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const variantClasses: Record<string, string> = {
    default: currency === 'IDR' ? 'text-success' : currency === 'USD' ? 'text-info' : '',
    positive: 'text-success',
    negative: 'text-error',
    neutral: 'text-neutral',
  };

  let formatted = compact
    ? formatCurrencyCompact(amount, currency as Currency)
    : formatCurrency(amount, currency as Currency);

  if (showSign && amount !== 0) {
    formatted = (amount > 0 ? '+' : '') + formatted;
  }

  span.className = `font-mono font-medium ${sizeClasses[size]} ${variantClasses[variant]}`;
  span.textContent = formatted;

  return span;
};

export const IDR: StoryObj = {
  args: { amount: 5000000, currency: 'IDR' },
  render: (args) => createCurrency(args),
};

export const USD: StoryObj = {
  args: { amount: 500.5, currency: 'USD' },
  render: (args) => createCurrency(args),
};

export const Compact: StoryObj = {
  args: { amount: 2500000000, currency: 'IDR', compact: true },
  render: (args) => createCurrency(args),
};

export const Positive: StoryObj = {
  args: { amount: 1500000, currency: 'IDR', variant: 'positive', showSign: true },
  render: (args) => createCurrency(args),
};

export const Negative: StoryObj = {
  args: { amount: -500000, currency: 'IDR', variant: 'negative', showSign: true },
  render: (args) => createCurrency(args),
};

export const Small: StoryObj = {
  args: { amount: 100000, currency: 'IDR', size: 'sm' },
  render: (args) => createCurrency(args),
};

export const Large: StoryObj = {
  args: { amount: 10000000, currency: 'IDR', size: 'xl' },
  render: (args) => createCurrency(args),
};

export const Zero: StoryObj = {
  args: { amount: 0, currency: 'IDR' },
  render: (args) => createCurrency(args),
};

export const Comparison: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-3';

    const items = [
      { amount: 5000000, currency: 'IDR' as const, label: 'Income', variant: 'positive' as const },
      {
        amount: -3200000,
        currency: 'IDR' as const,
        label: 'Expenses',
        variant: 'negative' as const,
      },
      { amount: 1800000, currency: 'IDR' as const, label: 'Balance', variant: 'default' as const },
    ];

    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'flex justify-between items-center gap-4';

      const label = document.createElement('span');
      label.textContent = item.label;
      label.className = 'font-medium';

      const value = createCurrency({ ...item, showSign: true });

      row.appendChild(label);
      row.appendChild(value);
      container.appendChild(row);
    });

    return container;
  },
};

export const BudgetCard: StoryObj = {
  render: () => {
    const card = document.createElement('div');
    card.className = 'card bg-base-100 card-bordered p-6';

    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = 'Monthly Budget';

    const details = document.createElement('div');
    details.className = 'space-y-3 mt-4';

    const rows = [
      { label: 'Budget', amount: 10000000, variant: 'neutral' as const },
      { label: 'Spent', amount: -6500000, variant: 'negative' as const },
      { label: 'Remaining', amount: 3500000, variant: 'positive' as const },
    ];

    rows.forEach((row) => {
      const div = document.createElement('div');
      div.className = 'flex justify-between items-center';

      const label = document.createElement('span');
      label.textContent = row.label;

      const value = createCurrency({ ...row, currency: 'IDR', size: 'lg' });

      div.appendChild(label);
      div.appendChild(value);
      details.appendChild(div);
    });

    card.appendChild(title);
    card.appendChild(details);

    return card;
  },
};
