import type { Meta, StoryObj } from '@storybook/html';

/**
 * StatLabel Component Stories
 *
 * Uppercase label component for displaying statistics and metrics.
 * Aligned with Oasis Finance v1.0.0 design system specifications.
 *
 * @see src/components/atoms/StatLabel.astro - Component implementation
 */

const meta: Meta = {
  title: 'Atoms/StatLabel',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Label size (sm: 10px decorative, md: 12px, lg: 14px)',
    },
    color: {
      control: 'select',
      options: ['neutral', 'primary', 'accent', 'success', 'warning', 'error'],
    },
  },
};

export default meta;

const createStatLabel = (args: { size?: string; color?: string; text?: string }): HTMLElement => {
  const { size = 'md', color = 'neutral', text = 'MONTHLY SPENDING' } = args;

  const label = document.createElement('span');
  label.textContent = text;

  // Size classes
  const sizeClasses: Record<string, string> = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm',
  };

  // Color classes using DaisyUI semantic colors
  const colorClasses: Record<string, string> = {
    neutral: 'text-base-content/60',
    primary: 'text-primary',
    accent: 'text-accent',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  };

  const labelClasses = [
    'label-premium uppercase tracking-widest font-semibold',
    sizeClasses[size],
    colorClasses[color],
  ].join(' ');

  label.className = labelClasses;

  return label;
};

export const Default: StoryObj = {
  args: { text: 'MONTHLY SPENDING' },
  render: (args) => createStatLabel(args),
};

export const Primary: StoryObj = {
  args: { color: 'primary', text: 'TOTAL NET WORTH' },
  render: (args) => createStatLabel(args),
};

export const Success: StoryObj = {
  args: { color: 'success', text: 'INCOME' },
  render: (args) => createStatLabel(args),
};

export const Warning: StoryObj = {
  args: { color: 'warning', text: 'BUDGET ALERT' },
  render: (args) => createStatLabel(args),
};

export const Error: StoryObj = {
  args: { color: 'error', text: 'OVER BUDGET' },
  render: (args) => createStatLabel(args),
};

export const Small: StoryObj = {
  args: { size: 'sm', color: 'neutral', text: 'CATEGORY' },
  render: (args) => createStatLabel(args),
};

export const Large: StoryObj = {
  args: { size: 'lg', color: 'primary', text: 'ANNUAL REPORT' },
  render: (args) => createStatLabel(args),
};

export const AllColors: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-3';

    const colors = ['neutral', 'primary', 'accent', 'success', 'warning', 'error'] as const;

    colors.forEach((color) => {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-4';

      const label = createStatLabel({
        color,
        text: `${color.toUpperCase()} LABEL`,
      });

      row.appendChild(label);
      container.appendChild(row);
    });

    return container;
  },
};

export const AllSizes: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex items-center gap-4';

    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      const label = createStatLabel({
        size,
        text: `${size.toUpperCase()} SIZE`,
      });

      container.appendChild(label);
    });

    return container;
  },
};

export const InCard: StoryObj = {
  render: () => {
    const card = document.createElement('div');
    card.className = 'card bg-base-100 card-bordered border-base-300 p-8 shadow-premium rounded-xl';

    const label = createStatLabel({
      color: 'primary',
      size: 'md',
      text: 'MONTHLY SPENDING',
    });

    const value = document.createElement('div');
    value.className = 'text-3xl font-bold tracking-tight text-primary mt-2';
    value.textContent = 'Rp53.694.000';

    card.appendChild(label);
    card.appendChild(value);

    return card;
  },
};

export const WithValue: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4';

    const examples = [
      { label: 'TOTAL NET WORTH', value: 'Rp1.956.063.000', color: 'primary' as const },
      { label: 'REMAINING', value: 'Rp12.246.000', color: 'success' as const },
      { label: 'OVER BUDGET', value: '-Rp2.500.000', color: 'error' as const },
    ];

    examples.forEach((example) => {
      const row = document.createElement('div');
      row.className = 'flex flex-col gap-1';

      const label = createStatLabel({
        color: example.color,
        text: example.label,
      });

      const value = document.createElement('div');
      value.className = 'text-2xl font-bold tracking-tight';
      value.className += example.color === 'primary' ? ' text-primary' : '';
      value.className += example.color === 'success' ? ' text-success' : '';
      value.className += example.color === 'error' ? ' text-error' : '';
      value.textContent = example.value;

      row.appendChild(label);
      row.appendChild(value);
      container.appendChild(row);
    });

    return container;
  },
};
