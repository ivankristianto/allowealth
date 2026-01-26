import type { Meta, StoryObj } from '@storybook/html';
import Currency from './Currency.astro';

const meta: Meta = {
  title: 'Molecules/CalculatorResultCard',
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Card label (e.g., "Total Interest", "Final Balance")',
    },
    value: {
      control: 'number',
      description: 'The value to display',
    },
    variant: {
      control: 'select',
      options: ['success', 'primary', 'warning', 'error'],
      description: 'Color variant',
    },
    currency: {
      control: 'select',
      options: ['IDR', 'USD'],
      description: 'Currency code for formatting',
    },
  },
};

export default meta;

/**
 * Helper function to format currency
 */
function formatCurrency(amount: number, currency: 'IDR' | 'USD'): string {
  const config = {
    IDR: { code: 'IDR', symbol: 'Rp', decimals: 0, locale: 'id-ID' },
    USD: { code: 'USD', symbol: '$', decimals: 2, locale: 'en-US' },
  };
  const cfg = config[currency];
  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.code,
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  }).format(amount);
}

/**
 * Helper function to create CalculatorResultCard
 */
function createCalculatorResultCard(args: {
  label?: string;
  value?: number;
  variant?: 'success' | 'primary' | 'warning' | 'error';
  currency?: 'IDR' | 'USD';
}): HTMLElement {
  const {
    label = 'Total Interest',
    value = 15750000,
    variant = 'success',
    currency = 'IDR',
  } = args;

  const variantStyles: Record<string, string> = {
    success: 'bg-success/10 border-success/20 text-success',
    primary: 'bg-primary/10 border-primary/20 text-primary',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    error: 'bg-error/10 border-error/20 text-error',
  };

  const cardClass = [variantStyles[variant], 'p-6 rounded-3xl border'].join(' ');

  const card = document.createElement('div');
  card.className = cardClass;

  const labelEl = document.createElement('p');
  labelEl.className = 'text-[10px] font-bold uppercase tracking-widest mb-2 opacity-80';
  labelEl.textContent = label;
  card.appendChild(labelEl);

  const valueEl = document.createElement('h4');
  valueEl.className = 'text-2xl font-bold';
  valueEl.textContent = formatCurrency(value, currency);
  card.appendChild(valueEl);

  return card;
}

// Default
export const Default: StoryObj = {
  args: {
    label: 'Total Interest',
    value: 15750000,
    variant: 'primary',
    currency: 'IDR',
  },
  render: (args) => createCalculatorResultCard(args),
};

// Total Interest (Success)
export const TotalInterest: StoryObj = {
  args: {
    label: 'Total Interest',
    value: 15750000,
    variant: 'success',
    currency: 'IDR',
  },
  render: (args) => createCalculatorResultCard(args),
};

// Final Balance (Primary)
export const FinalBalance: StoryObj = {
  args: {
    label: 'Final Balance',
    value: 115750000,
    variant: 'primary',
    currency: 'IDR',
  },
  render: (args) => createCalculatorResultCard(args),
};

// Warning State
export const Warning: StoryObj = {
  args: {
    label: 'Budget Alert',
    value: 8500000,
    variant: 'warning',
    currency: 'IDR',
  },
  render: (args) => createCalculatorResultCard(args),
};

// Error State
export const Error: StoryObj = {
  args: {
    label: 'Over Budget',
    value: -2500000,
    variant: 'error',
    currency: 'IDR',
  },
  render: (args) => createCalculatorResultCard(args),
};

// USD Currency
export const USD: StoryObj = {
  args: {
    label: 'Total Balance',
    value: 10500.5,
    variant: 'primary',
    currency: 'USD',
  },
  render: (args) => createCalculatorResultCard(args),
};

// Large Values
export const LargeValues: StoryObj = {
  args: {
    label: 'Projected Wealth',
    value: 1000000000,
    variant: 'primary',
    currency: 'IDR',
  },
  render: (args) => createCalculatorResultCard(args),
};

// Small Values
export const SmallValues: StoryObj = {
  args: {
    label: 'Interest',
    value: 0.01,
    variant: 'success',
    currency: 'USD',
  },
  render: (args) => createCalculatorResultCard(args),
};

// All Variants
export const AllVariants: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6';

    const variants: Array<{
      variant: 'success' | 'primary' | 'warning' | 'error';
      label: string;
      value: number;
    }> = [
      { variant: 'success', label: 'Total Interest', value: 15750000 },
      { variant: 'primary', label: 'Final Balance', value: 115750000 },
      { variant: 'warning', label: 'Near Limit', value: 8500000 },
      { variant: 'error', label: 'Over Budget', value: -2500000 },
    ];

    variants.forEach(({ variant, label, value }) => {
      container.appendChild(createCalculatorResultCard({ label, value, variant }));
    });

    return container;
  },
};

// All Currencies
export const AllCurrencies: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col sm:flex-row gap-6';

    const currencies: Array<'IDR' | 'USD'> = ['IDR', 'USD'];

    currencies.forEach((currency) => {
      const card = createCalculatorResultCard({
        label: currency === 'IDR' ? 'Saldo' : 'Balance',
        value: currency === 'IDR' ? 15000000 : 10500.5,
        variant: 'success',
        currency,
      });
      container.appendChild(card);
    });

    return container;
  },
};
