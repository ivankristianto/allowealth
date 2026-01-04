import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/Badge',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'success', 'warning', 'error', 'info'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    outline: { control: 'boolean' },
  },
};

export default meta;

const createBadge = (args: {
  variant?: string;
  size?: string;
  outline?: boolean;
  text?: string;
}): HTMLElement => {
  const { variant = 'neutral', size = 'md', outline = false, text = 'Badge' } = args;

  const badge = document.createElement('span');
  badge.textContent = text;

  const variantClasses: Record<string, string> = {
    neutral: outline ? 'badge-outline' : 'badge-neutral',
    primary: outline ? 'badge-outline text-primary' : 'badge-primary',
    secondary: outline ? 'badge-outline text-secondary' : 'badge-secondary',
    success: outline ? 'badge-outline text-success' : 'badge-success',
    warning: outline ? 'badge-outline text-warning' : 'badge-warning',
    error: outline ? 'badge-outline text-error' : 'badge-error',
    info: outline ? 'badge-outline text-info' : 'badge-info',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'badge-sm text-xs',
    md: '',
    lg: 'badge-lg',
  };

  badge.className = `badge ${variantClasses[variant]} ${sizeClasses[size]}`;

  return badge;
};

export const Default: StoryObj = {
  args: { text: 'Neutral' },
  render: (args) => createBadge(args),
};

export const Primary: StoryObj = {
  args: { variant: 'primary', text: 'Primary' },
  render: (args) => createBadge(args),
};

export const Success: StoryObj = {
  args: { variant: 'success', text: 'Success' },
  render: (args) => createBadge(args),
};

export const Warning: StoryObj = {
  args: { variant: 'warning', text: 'Warning' },
  render: (args) => createBadge(args),
};

export const Error: StoryObj = {
  args: { variant: 'error', text: 'Error' },
  render: (args) => createBadge(args),
};

export const Info: StoryObj = {
  args: { variant: 'info', text: 'Info' },
  render: (args) => createBadge(args),
};

export const Small: StoryObj = {
  args: { variant: 'primary', size: 'sm', text: 'Small' },
  render: (args) => createBadge(args),
};

export const Large: StoryObj = {
  args: { variant: 'primary', size: 'lg', text: 'Large' },
  render: (args) => createBadge(args),
};

export const Outline: StoryObj = {
  args: { variant: 'primary', outline: true, text: 'Outline' },
  render: (args) => createBadge(args),
};

export const AllVariants: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-wrap gap-2';

    const variants = ['neutral', 'primary', 'secondary', 'success', 'warning', 'error', 'info'] as const;

    variants.forEach((variant) => {
      const badge = createBadge({ variant, text: variant.charAt(0).toUpperCase() + variant.slice(1) });
      container.appendChild(badge);
    });

    return container;
  },
};

export const AllSizes: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex items-center gap-2';

    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      const badge = createBadge({ variant: 'primary', size, text: size.toUpperCase() });
      container.appendChild(badge);
    });

    return container;
  },
};

export const BudgetStatus: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-3';

    const statuses = [
      { variant: 'success' as const, text: 'Under Budget (45%)', label: 'Groceries' },
      { variant: 'warning' as const, text: 'Warning (85%)', label: 'Dining Out' },
      { variant: 'error' as const, text: 'Over Budget (120%)', label: 'Entertainment' },
    ];

    statuses.forEach((status) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between gap-4';

      const label = document.createElement('span');
      label.textContent = status.label;
      label.className = 'font-medium';

      const badge = createBadge({ variant: status.variant, text: status.text });

      row.appendChild(label);
      row.appendChild(badge);
      container.appendChild(row);
    });

    return container;
  },
};
