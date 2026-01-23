import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/EmptyState',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'compact', 'centered'],
    },
    iconName: {
      control: 'select',
      options: [
        '',
        'search',
        'folder',
        'inbox',
        'calendar',
        'file',
        'wallet',
        'trending',
        'alert',
        'info',
        'check',
        'plus',
      ],
    },
  },
};

export default meta;

// Lucide icon SVG paths (minimal, 24x24 viewBox)
const lucideIcons: Record<string, string> = {
  search:
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />',
  folder:
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />',
  inbox:
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M22 12h-6l-2 3h-4l-2-3H2" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />',
  calendar:
    '<rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /><line x1="16" y1="2" x2="16" y2="6" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /><line x1="8" y1="2" x2="8" y2="6" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /><line x1="3" y1="10" x2="21" y2="10" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />',
  file: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /><line x1="16" y1="13" x2="8" y2="13" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /><line x1="16" y1="17" x2="8" y2="17" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /><polyline points="10 9 9 9 8 9" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />',
  wallet:
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12V7H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v3" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5v14a2 2 0 002 2h16v-5" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12a2 2 0 00-2 2v4a2 2 0 002 2h4v-6h-4z" />',
  trending:
    '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /><polyline points="17 6 23 6 23 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />',
  alert:
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /><line x1="12" y1="16" x2="12" y2="12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /><line x1="12" y1="8" x2="12.01" y2="8" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />',
  check:
    '<polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />',
  plus: '<line x1="12" y1="5" x2="12" y2="19" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /><line x1="5" y1="12" x2="19" y2="12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />',
};

const createEmptyState = (args: {
  title?: string;
  message?: string;
  iconName?: string;
  actionLabel?: string;
  variant?: string;
}): HTMLElement => {
  const {
    title = 'No Data',
    message = "There's nothing to show here yet.",
    iconName = '',
    actionLabel = 'Add Item',
    variant = 'centered',
  } = args;

  const container = document.createElement('div');
  container.className = `flex flex-col items-center justify-center ${variant === 'centered' ? 'text-center py-12' : 'text-left py-8'}`;

  // Icon using Lucide SVG paths
  if (iconName && lucideIcons[iconName]) {
    const iconDiv = document.createElement('div');
    iconDiv.className = 'mb-4';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', '32');
    svg.setAttribute('height', '32');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.classList.add('text-base-content/40');
    svg.innerHTML = lucideIcons[iconName];
    iconDiv.appendChild(svg);
    container.appendChild(iconDiv);
  }

  // Title
  const titleEl = document.createElement('h3');
  titleEl.className = 'text-lg font-semibold mb-2';
  titleEl.textContent = title;
  container.appendChild(titleEl);

  // Message
  const messageEl = document.createElement('p');
  messageEl.className = 'text-base-content/60 mb-4 max-w-md';
  messageEl.textContent = message;
  container.appendChild(messageEl);

  // Action button
  if (actionLabel) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-sm';
    btn.textContent = actionLabel;
    container.appendChild(btn);
  }

  return container;
};

export const Default: StoryObj = {
  args: {
    title: 'No Expenses Yet',
    message: 'Start tracking your expenses by adding your first transaction.',
    actionLabel: 'Add Expense',
    variant: 'centered',
  },
  render: (args) => createEmptyState(args),
};

export const Compact: StoryObj = {
  args: {
    title: 'No Results',
    message: 'No expenses match your current filters.',
    variant: 'compact',
  },
  render: (args) => createEmptyState(args),
};

export const WithIcon: StoryObj = {
  args: {
    title: 'No Categories',
    message: 'Create categories to organize your expenses better.',
    iconName: 'folder',
    actionLabel: 'Create Category',
    variant: 'centered',
  },
  render: (args) => createEmptyState(args),
};

export const NoBudgets: StoryObj = {
  render: () => {
    const card = document.createElement('div');
    card.className = 'card bg-base-100 card-bordered p-8';

    const emptyState = createEmptyState({
      title: 'No Budgets Set',
      message:
        'Setting budgets helps you track and control your spending across different categories.',
      iconName: 'wallet',
      actionLabel: 'Create Budget',
      variant: 'centered',
    });

    card.appendChild(emptyState);
    return card;
  },
};

export const NoTransactions: StoryObj = {
  render: () => {
    const card = document.createElement('div');
    card.className = 'card bg-base-100 card-bordered';

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = 'Recent Transactions';

    const emptyState = document.createElement('div');
    emptyState.className = 'text-center py-12';

    // Using Lucide FileText icon
    emptyState.innerHTML = `
      <div class="mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold mb-2">No transactions yet</h3>
      <p class="text-base-content/60 mb-4">Your expense tracking journey starts here. Add your first transaction to begin.</p>
      <div class="flex gap-2 justify-center">
        <button class="btn btn-accent">Add Transaction</button>
        <button class="btn btn-outline">Import CSV</button>
      </div>
    `;

    cardBody.appendChild(title);
    cardBody.appendChild(emptyState);
    card.appendChild(cardBody);

    return card;
  },
};

export const SearchNoResults: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'py-8';

    const header = document.createElement('div');
    header.className = 'mb-6';
    header.innerHTML = `
      <h2 class="text-xl font-semibold">Search Results</h2>
      <p class="text-base-content/60 text-sm">Searching for "coffee shop"</p>
    `;

    const emptyState = createEmptyState({
      title: 'No Results Found',
      message:
        'We couldn\'t find any expenses matching "coffee shop". Try a different search term.',
      iconName: 'search',
      actionLabel: 'Clear Search',
      variant: 'centered',
    });

    container.appendChild(header);
    container.appendChild(emptyState);

    return container;
  },
};

export const AllIcons: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'grid grid-cols-3 gap-4 p-4';

    Object.entries(lucideIcons).forEach(([name]) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'flex flex-col items-center p-4 border rounded-lg';

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svg.setAttribute('width', '32');
      svg.setAttribute('height', '32');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.classList.add('text-base-content/40', 'mb-2');
      svg.innerHTML = lucideIcons[name];

      const label = document.createElement('span');
      label.className = 'text-xs text-base-content/60';
      label.textContent = name;

      wrapper.appendChild(svg);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    });

    return container;
  },
};
