import type { Meta, StoryObj } from '@storybook/html';

/**
 * Badge Component Stories
 *
 * Aligned with Oasis Finance v1.1.0 design system specifications (Forest Green).
 *
 * @see design-system/styles.json - Badge component specifications
 * @see src/components/atoms/Badge.astro - Component implementation
 */

const meta: Meta = {
  title: 'Atoms/Badge',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment

Aligned with Oasis Finance v1.1.0 design system (Forest Green).

| Property | Value | Class |
|----------|-------|-------|
| Padding X | 10px (0.625rem) | \`px-2.5\` |
| Padding Y | 4px (0.25rem) | \`py-1\` |
| Font Size | 12px (0.75rem) | \`text-badge\` utility |
| Font Weight | 700 (bold) | \`font-bold\` |
| Border Radius | DaisyUI tokenized | \`--radius-selector\` (1rem) |

### Color Semantic Model (v1.1.0 - Forest Green)

| Variant | Semantic Use | Color |
|---------|--------------|-------|
| primary | Headings, primary text | slate-900 |
| accent | CTAs, interactive elements, active states | forest-600 |
| success | Positive status, confirmations | emerald-500 |
| warning | Budget alerts, caution states | amber-500 |
| error | Over budget, destructive actions | rose-500 |
| info | Informational messages | sky-500 |
| neutral | Default neutral gray | neutral |

### Budget Status Variants

| Variant | Display | Maps To |
|---------|---------|---------|
| optimal | "On Track" | \`badge-success\` |
| review | "Review Needed" | \`badge-warning\` |
| exceeded | "Over Budget" | \`badge-error\` |

### Size Variants

| Size | Class |
|------|-------|
| sm | \`badge-sm\` |
| md | (default, no class) |
| lg | \`badge-lg\` |

### Accessibility

- **Font Size**: 12px minimum for WCAG AA compliance
- **Font Weight**: Bold (700) for improved readability
- **Theme**: Automatically adapts to light/dark via DaisyUI semantic colors
- **No manual dark: variants needed** - DaisyUI handles theme switching
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'neutral',
        'primary',
        'accent',
        'secondary',
        'success',
        'warning',
        'error',
        'info',
        'optimal',
        'review',
        'exceeded',
      ],
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
    primary: outline ? 'badge-outline' : 'badge-primary',
    accent: outline ? 'badge-outline' : 'badge-accent',
    secondary: outline ? 'badge-outline' : 'badge-secondary',
    success: outline ? 'badge-outline' : 'badge-success',
    warning: outline ? 'badge-outline' : 'badge-warning',
    error: outline ? 'badge-outline' : 'badge-error',
    info: outline ? 'badge-outline' : 'badge-info',
    // Budget status variants
    optimal: outline ? 'badge-outline' : 'badge-success',
    review: outline ? 'badge-outline' : 'badge-warning',
    exceeded: outline ? 'badge-outline' : 'badge-error',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'badge-sm',
    md: '',
    lg: 'badge-lg',
  };

  // Base classes include tokenized padding (px-2.5 py-1), font size (text-badge), and font weight (font-bold)
  const baseClasses = 'px-2.5 py-1 text-badge font-bold';

  badge.className = `${baseClasses} badge ${variantClasses[variant]} ${sizeClasses[size]}`;

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

    const variants = [
      'neutral',
      'primary',
      'accent',
      'secondary',
      'success',
      'warning',
      'error',
      'info',
    ] as const;

    variants.forEach((variant) => {
      const badge = createBadge({
        variant,
        text: variant.charAt(0).toUpperCase() + variant.slice(1),
      });
      container.appendChild(badge);
    });

    return container;
  },
};

// Budget status variant stories
// TODO: P2 - Consider consolidating Optimal/Review/Exceeded stories with AllBudgetStatuses to reduce duplication

export const Optimal: StoryObj = {
  args: { variant: 'optimal', text: 'On Track' },
  render: (args) => createBadge(args),
};

export const Review: StoryObj = {
  args: { variant: 'review', text: 'Review Needed' },
  render: (args) => createBadge(args),
};

export const Exceeded: StoryObj = {
  args: { variant: 'exceeded', text: 'Over Budget' },
  render: (args) => createBadge(args),
};

export const AllBudgetStatuses: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'flex flex-wrap gap-3';

    const budgetStatuses = ['optimal', 'review', 'exceeded'] as const;

    budgetStatuses.forEach((variant) => {
      const badge = createBadge({
        variant,
        text: variant === 'optimal' ? 'On Track' : variant === 'review' ? 'Review' : 'Over Budget',
      });
      container.appendChild(badge);
    });

    return container;
  },
};

export const Accent: StoryObj = {
  args: { variant: 'accent', text: 'Accent (Indigo)' },
  render: (args) => createBadge(args),
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
