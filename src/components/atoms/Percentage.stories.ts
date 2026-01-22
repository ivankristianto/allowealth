import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/Percentage',
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'number', min: 0, max: 150 },
    decimals: { control: 'number', min: 0, max: 2 },
    showSign: { control: 'boolean' },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    variant: {
      control: 'select',
      options: ['auto', 'success', 'warning', 'error', 'neutral'],
    },
    showBar: { control: 'boolean' },
  },
};

export default meta;

const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

const createPercentage = (args: {
  value?: number;
  decimals?: number;
  showSign?: boolean;
  size?: string;
  variant?: string;
  showBar?: boolean;
}): HTMLElement => {
  const {
    value = 50,
    decimals = 1,
    showSign = false,
    size = 'md',
    variant = 'auto',
    showBar = false,
  } = args;

  const container = document.createElement('div');
  container.className = 'flex flex-col gap-2';

  const sizeClasses: Record<string, string> = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  let colorVariant = variant;
  if (variant === 'auto') {
    if (value >= 100) colorVariant = 'error';
    else if (value >= 80) colorVariant = 'warning';
    else colorVariant = 'success';
  }

  const variantClasses: Record<string, string> = {
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    neutral: 'text-neutral',
  };

  let formatted = formatPercentage(value, decimals);

  if (showSign && value !== 0) {
    formatted = (value > 0 ? '+' : '') + formatted;
  }

  const span = document.createElement('span');
  span.className = `font-mono font-medium ${sizeClasses[size]} ${variantClasses[colorVariant]}`;
  span.textContent = formatted;

  container.appendChild(span);

  if (showBar) {
    const progressColor =
      colorVariant === 'error'
        ? 'progress-error'
        : colorVariant === 'warning'
          ? 'progress-warning'
          : 'progress-success';
    const progress = document.createElement('progress');
    progress.className = `progress ${progressColor} w-full`;
    progress.value = Math.min(value, 100);
    progress.max = 100;
    container.appendChild(progress);
  }

  return container;
};

export const Default: StoryObj = {
  args: { value: 45 },
  render: (args) => createPercentage(args),
};

export const Success: StoryObj = {
  args: { value: 45, variant: 'success' },
  render: (args) => createPercentage(args),
};

export const Warning: StoryObj = {
  args: { value: 85, variant: 'warning' },
  render: (args) => createPercentage(args),
};

export const Error: StoryObj = {
  args: { value: 120, variant: 'error' },
  render: (args) => createPercentage(args),
};

export const Auto: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-3';

    const values = [
      { value: 45, label: 'Groceries' },
      { value: 85, label: 'Dining Out' },
      { value: 120, label: 'Entertainment' },
    ];

    values.forEach((v) => {
      const row = document.createElement('div');
      row.className = 'flex justify-between items-center gap-4';

      const label = document.createElement('span');
      label.textContent = v.label;
      label.className = 'font-medium';

      const percentage = createPercentage({ value: v.value, variant: 'auto' });

      row.appendChild(label);
      row.appendChild(percentage);
      container.appendChild(row);
    });

    return container;
  },
};

export const WithProgressBar: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4';

    const values = [25, 45, 75, 95, 120];

    values.forEach((v) => {
      container.appendChild(createPercentage({ value: v, variant: 'auto', showBar: true }));
    });

    return container;
  },
};

export const BudgetProgress: StoryObj = {
  render: () => {
    const card = document.createElement('div');
    card.className = 'card bg-base-100 card-bordered p-6';

    const title = document.createElement('h3');
    title.className = 'card-title mb-4';
    title.textContent = 'Budget Overview';

    const categories = document.createElement('div');
    categories.className = 'space-y-4';

    const items = [
      { name: 'Groceries', spent: 2500000, budget: 5000000 },
      { name: 'Dining Out', spent: 1700000, budget: 2000000 },
      { name: 'Transport', spent: 800000, budget: 1500000 },
      { name: 'Entertainment', spent: 1200000, budget: 1000000 },
    ];

    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'flex justify-between items-center gap-4';

      const left = document.createElement('div');
      left.className = 'flex-1';

      const label = document.createElement('div');
      label.className = 'font-medium';
      label.textContent = item.name;

      const progressContainer = document.createElement('div');
      progressContainer.className = 'flex items-center gap-2 mt-1';

      const percentage = createPercentage({
        value: (item.spent / item.budget) * 100,
        variant: 'auto',
        decimals: 0,
        showBar: true,
      });

      left.appendChild(label);
      left.appendChild(percentage);

      const amounts = document.createElement('div');
      amounts.className = 'text-sm text-neutral-500';
      amounts.textContent = `${formatCurrency(item.spent)} / ${formatCurrency(item.budget)}`;

      row.appendChild(left);
      row.appendChild(amounts);

      categories.appendChild(row);
    });

    card.appendChild(title);
    card.appendChild(categories);

    return card;
  },
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
