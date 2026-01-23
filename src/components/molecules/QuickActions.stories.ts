import type { Meta, StoryObj } from '@storybook/html';
import { IconRenderers } from '../../../.storybook/lucide-icons';

const { ShoppingCart, CircleDollarSign, Plus } = IconRenderers;

const meta: Meta = {
  title: 'Molecules/QuickActions',
  tags: ['autodocs'],
  argTypes: {
    actions: {
      control: 'object',
      description: 'Array of quick action objects',
    },
  },
};

export default meta;

interface QuickAction {
  label: string;
  url: string;
  icon: 'shopping-cart' | 'circle-dollar' | 'plus';
  variant: 'expense' | 'income';
  ariaLabel: string;
}

// Default quick actions for dashboard
const defaultActions: QuickAction[] = [
  {
    label: 'Add Expense',
    url: '/transactions/add?type=expense',
    icon: 'shopping-cart',
    variant: 'expense',
    ariaLabel: 'Add new expense transaction',
  },
  {
    label: 'Log Income',
    url: '/transactions/add?type=income',
    icon: 'circle-dollar',
    variant: 'income',
    ariaLabel: 'Add new income transaction',
  },
];

const iconComponents = {
  'shopping-cart': ShoppingCart,
  'circle-dollar': CircleDollarSign,
  plus: Plus,
};

const variantColors: Record<string, 'accent' | 'success'> = {
  expense: 'accent',
  income: 'success',
};

const createQuickActions = (args: { actions?: QuickAction[] }): HTMLElement => {
  const { actions = defaultActions } = args;

  const container = document.createElement('div');
  container.className = 'p-4 bg-base-100';

  const wrapper = document.createElement('div');
  wrapper.className = 'flex flex-col sm:flex-row gap-5';
  wrapper.setAttribute('role', 'group');
  wrapper.setAttribute('aria-label', 'Quick actions');

  actions.forEach((action) => {
    const button = document.createElement('a');
    button.href = action.url;
    button.className =
      'flex-1 px-8 py-7 bg-base-100 text-base-content font-bold rounded-2xl border border-base-300 hover:bg-base-200 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-5 active:scale-95 hover:scale-[1.02] group relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';
    button.setAttribute('aria-label', action.ariaLabel);

    // Create icon badge container
    const badgeVariant = variantColors[action.variant];
    const badgeContainer = document.createElement('div');
    badgeContainer.className = `p-4 rounded-2xl shrink-0 group-hover:scale-110 transition-transform`;

    // Apply color classes based on variant
    if (badgeVariant === 'accent') {
      badgeContainer.classList.add('bg-accent/10', 'text-accent');
    } else {
      badgeContainer.classList.add('bg-success/10', 'text-success');
    }
    badgeContainer.classList.add('shadow-sm');

    const IconComponent = iconComponents[action.icon];
    const iconEl = IconComponent.render({
      size: 24,
      class: 'stroke-current',
      'aria-hidden': 'true',
    });
    badgeContainer.appendChild(iconEl);
    button.appendChild(badgeContainer);

    const span = document.createElement('span');
    span.textContent = action.label;
    span.className = 'text-lg tracking-tight font-bold leading-none';
    button.appendChild(span);

    wrapper.appendChild(button);
  });

  container.appendChild(wrapper);
  return container;
};

// Default state with Add Expense (indigo) and Log Income (emerald)
export const Default: StoryObj = {
  args: {
    actions: defaultActions,
  },
  render: (args) => createQuickActions(args),
  parameters: {
    docs: {
      description: {
        story:
          'Default premium quick actions with Add Expense (indigo/accent theme) and Log Income (emerald/success theme). Features include IconBadge components, hover scale effects, and active state press feedback.',
      },
    },
  },
};

// Single action for full-width use
export const SingleAction: StoryObj = {
  args: {
    actions: [
      {
        label: 'Add Transaction',
        url: '/transactions/add',
        icon: 'plus',
        variant: 'expense',
        ariaLabel: 'Add new transaction',
      },
    ],
  },
  render: (args) => createQuickActions(args),
  parameters: {
    docs: {
      description: {
        story:
          'Single action button with full width. Useful for pages where only one primary action is needed.',
      },
    },
  },
};

// Custom actions example
export const CustomActions: StoryObj = {
  args: {
    actions: [
      {
        label: 'Add Asset',
        url: '/assets/add',
        icon: 'plus',
        variant: 'income',
        ariaLabel: 'Add new asset',
      },
      {
        label: 'Record Payment',
        url: '/transactions/add?type=payment',
        icon: 'circle-dollar',
        variant: 'expense',
        ariaLabel: 'Record a payment',
      },
    ],
  },
  render: (args) => createQuickActions(args),
  parameters: {
    docs: {
      description: {
        story: 'Custom quick actions with different labels, icons, and destinations.',
      },
    },
  },
};

// All variants together for visual comparison
export const AllVariants: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-12';

    const states: { title: string; actions: QuickAction[]; description: string }[] = [
      {
        title: 'Default (Dashboard)',
        actions: defaultActions,
        description:
          'Standard dashboard quick actions with Add Expense (indigo) and Log Income (emerald).',
      },
      {
        title: 'Single Action',
        actions: [
          {
            label: 'Add Transaction',
            url: '/transactions/add',
            icon: 'plus',
            variant: 'expense',
            ariaLabel: 'Add new transaction',
          },
        ],
        description: 'Single action button for focused use cases.',
      },
      {
        title: 'Custom Actions',
        actions: [
          {
            label: 'Add Asset',
            url: '/assets/add',
            icon: 'plus',
            variant: 'income',
            ariaLabel: 'Add new asset',
          },
          {
            label: 'Record Payment',
            url: '/transactions/add?type=payment',
            icon: 'circle-dollar',
            variant: 'expense',
            ariaLabel: 'Record a payment',
          },
        ],
        description: 'Custom quick actions with different icons and destinations.',
      },
    ];

    states.forEach((state) => {
      const section = document.createElement('section');
      section.className = 'space-y-4';

      const header = document.createElement('div');
      header.innerHTML = `
        <h3 class="text-xl font-bold text-base-content tracking-tight">${state.title}</h3>
        <p class="text-sm text-base-content/70 mt-1">${state.description}</p>
      `;
      section.appendChild(header);
      section.appendChild(createQuickActions({ actions: state.actions }));
      container.appendChild(section);
    });

    return container;
  },
  parameters: {
    docs: {
      description: {
        story: 'All quick action variants together for visual comparison and testing.',
      },
    },
  },
};
