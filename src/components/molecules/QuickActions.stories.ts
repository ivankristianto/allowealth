import type { Meta, StoryObj } from '@storybook/html';
import { Minus, Plus, ChartPie } from '@lucide/astro';

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
  icon: string;
  variant: 'primary' | 'secondary' | 'outline';
  ariaLabel: string;
}

const defaultActions: QuickAction[] = [
  {
    label: 'Add Expense',
    url: '/transactions/add?type=expense',
    icon: 'minus',
    variant: 'primary',
    ariaLabel: 'Add new expense transaction',
  },
  {
    label: 'Add Income',
    url: '/transactions/add?type=income',
    icon: 'plus',
    variant: 'secondary',
    ariaLabel: 'Add new income transaction',
  },
  {
    label: 'View Reports',
    url: '/reports',
    icon: 'search',
    variant: 'outline',
    ariaLabel: 'View financial reports',
  },
];

const iconMap = {
  minus: Minus,
  plus: Plus,
  search: ChartPie,
};

const createQuickActions = (args: { actions?: QuickAction[] }): HTMLElement => {
  const { actions = defaultActions } = args;

  const container = document.createElement('div');
  container.className = 'p-4 bg-base-100';

  const wrapper = document.createElement('div');
  wrapper.className = 'flex flex-col sm:flex-row gap-3';

  actions.forEach((action) => {
    const button = document.createElement('a');
    button.href = action.url;
    button.className = 'btn gap-2 flex-1 justify-center';
    button.setAttribute('aria-label', action.ariaLabel);

    if (action.variant === 'primary') {
      button.classList.add('btn-primary');
    } else if (action.variant === 'secondary') {
      button.classList.add('bg-neutral-200', 'text-neutral-800', 'hover:bg-neutral-300');
    } else {
      button.classList.add('btn-outline');
    }

    const IconComponent = iconMap[action.icon as keyof typeof iconMap] || Plus;
    const iconWrapper = document.createElement('span');
    iconWrapper.setAttribute('aria-hidden', 'true');
    iconWrapper.innerHTML = IconComponent.render({ size: 16, class: 'stroke-current' });

    button.appendChild(iconWrapper);

    const span = document.createElement('span');
    span.textContent = action.label;
    button.appendChild(span);

    wrapper.appendChild(button);
  });

  container.appendChild(wrapper);
  return container;
};

// Default state
export const Default: StoryObj = {
  args: {
    actions: defaultActions,
  },
  render: (args) => createQuickActions(args),
};

// Custom actions
export const CustomActions: StoryObj = {
  args: {
    actions: [
      {
        label: 'Add Asset',
        url: '/assets/add',
        icon: 'plus',
        variant: 'primary',
        ariaLabel: 'Add new asset',
      },
      {
        label: 'Import CSV',
        url: '/transactions/import',
        icon: 'search',
        variant: 'secondary',
        ariaLabel: 'Import transactions from CSV',
      },
    ],
  },
  render: (args) => createQuickActions(args),
};

// Single action
export const SingleAction: StoryObj = {
  args: {
    actions: [
      {
        label: 'Add Transaction',
        url: '/transactions/add',
        icon: 'plus',
        variant: 'primary',
        ariaLabel: 'Add new transaction',
      },
    ],
  },
  render: (args) => createQuickActions(args),
};

// All outline
export const AllOutline: StoryObj = {
  args: {
    actions: [
      {
        label: 'Add Expense',
        url: '/transactions/add?type=expense',
        icon: 'minus',
        variant: 'outline',
        ariaLabel: 'Add expense transaction',
      },
      {
        label: 'Add Income',
        url: '/transactions/add?type=income',
        icon: 'plus',
        variant: 'outline',
        ariaLabel: 'Add income transaction',
      },
      {
        label: 'View Reports',
        url: '/reports',
        icon: 'search',
        variant: 'outline',
        ariaLabel: 'View financial reports',
      },
    ],
  },
  render: (args) => createQuickActions(args),
};

// All states together
export const AllVariants: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'space-y-8';

    const states: { title: string; actions: QuickAction[] }[] = [
      { title: 'Default (Mixed)', actions: defaultActions },
      {
        title: 'Custom Actions',
        actions: [
          {
            label: 'Add Asset',
            url: '/assets/add',
            icon: 'plus',
            variant: 'primary',
            ariaLabel: 'Add new asset',
          },
          {
            label: 'Import CSV',
            url: '/transactions/import',
            icon: 'search',
            variant: 'secondary',
            ariaLabel: 'Import transactions from CSV',
          },
        ],
      },
      {
        title: 'Single Action',
        actions: [
          {
            label: 'Add Transaction',
            url: '/transactions/add',
            icon: 'plus',
            variant: 'primary',
            ariaLabel: 'Add new transaction',
          },
        ],
      },
      {
        title: 'All Outline',
        actions: [
          {
            label: 'Add Expense',
            url: '/transactions/add?type=expense',
            icon: 'minus',
            variant: 'outline',
            ariaLabel: 'Add expense transaction',
          },
          {
            label: 'Add Income',
            url: '/transactions/add?type=income',
            icon: 'plus',
            variant: 'outline',
            ariaLabel: 'Add income transaction',
          },
          {
            label: 'View Reports',
            url: '/reports',
            icon: 'search',
            variant: 'outline',
            ariaLabel: 'View financial reports',
          },
        ],
      },
    ];

    states.forEach((state) => {
      const section = document.createElement('section');
      section.innerHTML = `<h3 class="text-lg font-semibold mb-4">${state.title}</h3>`;
      section.appendChild(createQuickActions({ actions: state.actions }));
      container.appendChild(section);
    });

    return container;
  },
};
