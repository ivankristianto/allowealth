import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/EmptyState',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'compact', 'centered'],
    },
  },
};

export default meta;

const createEmptyState = (args: {
  title?: string;
  message?: string;
  icon?: string;
  actionLabel?: string;
  variant?: string;
}): HTMLElement => {
  const {
    title = 'No Data',
    message = 'There\'s nothing to show here yet.',
    icon = '',
    actionLabel = 'Add Item',
    variant = 'centered',
  } = args;

  const container = document.createElement('div');
  container.className = `flex flex-col items-center justify-center ${variant === 'centered' ? 'text-center py-12' : 'text-left py-8'}`;

  // Icon
  if (icon) {
    const iconDiv = document.createElement('div');
    iconDiv.className = 'mb-4 text-neutral-400';
    iconDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>`;
    container.appendChild(iconDiv);
  }

  // Title
  const titleEl = document.createElement('h3');
  titleEl.className = 'text-lg font-semibold mb-2';
  titleEl.textContent = title;
  container.appendChild(titleEl);

  // Message
  const messageEl = document.createElement('p');
  messageEl.className = 'text-neutral-500 mb-4 max-w-md';
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
    icon: 'folder',
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
      message: 'Setting budgets helps you track and control your spending across different categories.',
      icon: '',
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

    emptyState.innerHTML = `
      <div class="mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold mb-2">No transactions yet</h3>
      <p class="text-neutral-500 mb-4">Your expense tracking journey starts here. Add your first transaction to begin.</p>
      <div class="flex gap-2 justify-center">
        <button class="btn btn-primary">Add Transaction</button>
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
      <p class="text-neutral-500 text-sm">Searching for "coffee shop"</p>
    `;

    const emptyState = createEmptyState({
      title: 'No Results Found',
      message: 'We couldn\'t find any expenses matching "coffee shop". Try a different search term.',
      actionLabel: 'Clear Search',
      variant: 'centered',
    });

    container.appendChild(header);
    container.appendChild(emptyState);

    return container;
  },
};
