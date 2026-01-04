import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/Button',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'warning', 'success'],
      description: 'Button style variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Button size',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the button',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading spinner',
    },
  },
};

export default meta;

const createButton = (args: {
  variant?: string;
  size?: string;
  disabled?: boolean;
  loading?: boolean;
  text?: string;
}): HTMLElement => {
  const {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    text = 'Button',
  } = args;

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.disabled = disabled;

  // Base classes
  const baseClasses =
    'btn inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

  // Variant classes
  const variantClasses: Record<string, string> = {
    primary: 'btn-primary text-white hover:bg-emerald-600 focus:ring-emerald-500',
    secondary: 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300 focus:ring-neutral-500',
    outline:
      'btn-outline border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 focus:ring-emerald-500',
    ghost: 'text-emerald-600 hover:bg-emerald-50 focus:ring-emerald-500',
    danger: 'bg-error text-white hover:bg-error-hover focus:ring-error',
    warning: 'bg-warning text-white hover:bg-warning-hover focus:ring-warning',
    success: 'bg-success text-white hover:bg-success-hover focus:ring-success',
  };

  // Size classes
  const sizeClasses: Record<string, string> = {
    sm: 'btn-sm px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'btn-lg px-6 py-3 text-lg',
  };

  const classes = [
    baseClasses,
    variantClasses[variant] || variantClasses.primary,
    sizeClasses[size] || sizeClasses.md,
    disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
  ].join(' ');

  button.className = classes;

  if (loading) {
    const spinner = document.createElement('span');
    spinner.className = 'loading loading-spinner loading-sm';
    spinner.setAttribute('aria-hidden', 'true');
    button.insertBefore(spinner, button.firstChild);
  }

  return button;
};

// Default
export const Primary: StoryObj = {
  args: {
    variant: 'primary',
    text: 'Primary Button',
  },
  render: (args) => createButton(args),
};

// Variants
export const Secondary: StoryObj = {
  args: {
    variant: 'secondary',
    text: 'Secondary Button',
  },
  render: (args) => createButton(args),
};

export const Outline: StoryObj = {
  args: {
    variant: 'outline',
    text: 'Outline Button',
  },
  render: (args) => createButton(args),
};

export const Ghost: StoryObj = {
  args: {
    variant: 'ghost',
    text: 'Ghost Button',
  },
  render: (args) => createButton(args),
};

export const Danger: StoryObj = {
  args: {
    variant: 'danger',
    text: 'Delete',
  },
  render: (args) => createButton(args),
};

export const Warning: StoryObj = {
  args: {
    variant: 'warning',
    text: 'Warning',
  },
  render: (args) => createButton(args),
};

export const Success: StoryObj = {
  args: {
    variant: 'success',
    text: 'Success',
  },
  render: (args) => createButton(args),
};

// Sizes
export const Small: StoryObj = {
  args: {
    variant: 'primary',
    size: 'sm',
    text: 'Small',
  },
  render: (args) => createButton(args),
};

export const Medium: StoryObj = {
  args: {
    variant: 'primary',
    size: 'md',
    text: 'Medium',
  },
  render: (args) => createButton(args),
};

export const Large: StoryObj = {
  args: {
    variant: 'primary',
    size: 'lg',
    text: 'Large',
  },
  render: (args) => createButton(args),
};

// States
export const Disabled: StoryObj = {
  args: {
    variant: 'primary',
    disabled: true,
    text: 'Disabled',
  },
  render: (args) => createButton(args),
};

export const Loading: StoryObj = {
  args: {
    variant: 'primary',
    loading: true,
    text: 'Loading...',
  },
  render: (args) => createButton(args),
};

export const LoadingDanger: StoryObj = {
  args: {
    variant: 'danger',
    loading: true,
    text: 'Deleting...',
  },
  render: (args) => createButton(args),
};

// All Variants Together
export const AllVariants: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-wrap gap-4';

    const variants = [
      'primary',
      'secondary',
      'outline',
      'ghost',
      'danger',
      'warning',
      'success',
    ] as const;

    variants.forEach((variant) => {
      const button = createButton({
        variant,
        text: variant.charAt(0).toUpperCase() + variant.slice(1),
      });
      container.appendChild(button);
    });

    return container;
  },
};

// All Sizes Together
export const AllSizes: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex items-center gap-4';

    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      const button = createButton({ size, text: size.toUpperCase() });
      container.appendChild(button);
    });

    return container;
  },
};
