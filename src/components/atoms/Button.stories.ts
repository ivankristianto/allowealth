import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/Button',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'primary',
        'accent',
        'secondary',
        'outline',
        'ghost',
        'danger',
        'warning',
        'success',
      ],
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

  // Base classes - focus ring uses accent color for theme-aware consistency
  const baseClasses =
    'btn inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent';

  // Variant classes - primary and accent both use btn-accent (indigo) for CTAs per Oasis Finance v1.0.0
  const variantClasses: Record<string, string> = {
    primary: 'btn-accent shadow-accent-glow',
    accent: 'btn-accent shadow-accent-glow',
    secondary: 'btn-secondary',
    outline: 'btn-outline border-accent text-accent hover:bg-accent/5',
    ghost: 'btn-ghost text-accent hover:bg-accent/5',
    danger: 'btn-error',
    warning: 'btn-warning',
    success: 'btn-success',
  };

  // Size classes - match styles.json specifications exactly
  const sizeClasses: Record<string, string> = {
    sm: 'h-8 px-3 py-1.5 text-xs',
    md: 'h-10 px-5 py-2.5 text-sm',
    lg: 'h-12 px-6 py-3 text-sm',
  };

  const classes = [
    baseClasses,
    variantClasses[variant] || variantClasses.primary,
    sizeClasses[size] || sizeClasses.md,
    disabled || loading
      ? 'opacity-50 cursor-not-allowed focus:ring-0 focus:ring-offset-0'
      : 'cursor-pointer',
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

export const Accent: StoryObj = {
  args: {
    variant: 'accent',
    text: 'Accent (Indigo)',
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
      'accent',
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
