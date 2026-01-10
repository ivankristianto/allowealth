import type { Meta, StoryObj } from '@storybook/html';

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

const getIconSvg = (iconName: string): string => {
  const icons: Record<string, string> = {
    minus: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />',
    plus: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />',
    search:
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />',
  };
  const result = icons[iconName];
  return result ?? icons['plus']!;
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

    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        ${getIconSvg(action.icon)}
      </svg>
      <span>${action.label}</span>
    `;

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
        ariaLabel: 'Add new expense transaction',
      },
      {
        label: 'Add Income',
        url: '/transactions/add?type=income',
        icon: 'plus',
        variant: 'outline',
        ariaLabel: 'Add new income transaction',
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
            ariaLabel: 'Add new expense transaction',
          },
          {
            label: 'Add Income',
            url: '/transactions/add?type=income',
            icon: 'plus',
            variant: 'outline',
            ariaLabel: 'Add new income transaction',
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
