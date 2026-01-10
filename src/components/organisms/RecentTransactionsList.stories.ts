import type { Meta, StoryObj } from '@storybook/html';
import {
  mockRecentTransactions,
  mockRecentTransactionsEmpty,
} from '@/services/__tests__/mocks/dashboard-mocks';

const meta: Meta = {
  title: 'Organisms/RecentTransactionsList',
  tags: ['autodocs'],
  argTypes: {
    transactions: {
      control: 'object',
      description: 'Array of recent transactions',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading skeleton state',
    },
    viewAllUrl: {
      control: 'text',
      description: 'URL for View All link',
    },
  },
};

export default meta;

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number, currency: 'IDR' | 'USD'): string => {
  const config =
    currency === 'IDR'
      ? { locale: 'id-ID', symbol: 'Rp', decimals: 0 }
      : { locale: 'en-US', symbol: '$', decimals: 2 };

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
};

const getPaymentIcon = (type: string): string => {
  const icons: Record<string, string> = {
    cash: '💵',
    credit_card: '💳',
    debit_card: '💳',
    bank_transfer: '🏦',
    e_wallet: '📱',
  };
  return icons[type] || '💵';
};

const createRecentTransactionsList = (args: {
  transactions?: object[];
  loading?: boolean;
  viewAllUrl?: string;
}): HTMLElement => {
  const {
    transactions = mockRecentTransactions,
    loading = false,
    viewAllUrl = '/transactions',
  } = args;

  const container = document.createElement('div');
  container.className = 'p-4 bg-base-100';

  const card = document.createElement('div');
  card.className = 'border rounded-lg p-6 bg-base-100';

  // Header
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-4';
  header.innerHTML = `
    <h2 class="text-lg font-semibold flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
      Recent Transactions
    </h2>
    ${
      !loading && transactions.length > 5
        ? `
      <a href="${viewAllUrl}" class="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
        View All
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </a>
    `
        : ''
    }
  `;
  card.appendChild(header);

  if (loading) {
    // Loading skeleton
    const skeleton = document.createElement('div');
    skeleton.className = 'space-y-3';
    for (let i = 0; i < 5; i++) {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-4 p-4 bg-base-200 rounded-lg animate-pulse';
      row.innerHTML = `
        <div class="w-20 h-4 bg-neutral-300 rounded"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-neutral-300 rounded w-3/4"></div>
          <div class="h-3 bg-neutral-300 rounded w-1/2"></div>
        </div>
        <div class="w-24 h-4 bg-neutral-300 rounded"></div>
      `;
      skeleton.appendChild(row);
    }
    card.appendChild(skeleton);
  } else if (transactions.length === 0) {
    // Empty state
    const emptyState = document.createElement('div');
    emptyState.className = 'text-center py-8';
    emptyState.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      <h3 class="text-lg font-semibold mb-2">No transactions yet</h3>
      <p class="text-neutral-500 mb-4">Start tracking by adding your first expense or income transaction.</p>
      <a href="/transactions/add" class="btn btn-primary btn-sm">Add Transaction</a>
    `;
    card.appendChild(emptyState);
  } else {
    // Transactions list
    const list = document.createElement('div');
    list.className = 'space-y-1';

    transactions.slice(0, 5).forEach((transaction: any) => {
      const amount = parseFloat(transaction.amount) || 0;
      const isExpense = transaction.type === 'expense';
      const date = new Date(transaction.transaction_date);
      const amountColor = isExpense ? 'text-red-600' : 'text-emerald-600';
      const amountSign = isExpense ? '-' : '+';

      const item = document.createElement('div');
      item.className =
        'flex items-center gap-4 p-4 hover:bg-base-200 rounded-lg transition-colors group';
      item.innerHTML = `
        <div class="flex-shrink-0 w-20 text-sm">
          <div class="font-medium">${formatDate(date)}</div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate group-hover:text-emerald-600 transition-colors">${transaction.category.name}</div>
          ${transaction.description ? `<div class="text-sm text-neutral-500 truncate">${transaction.description}</div>` : ''}
        </div>
        <div class="flex-shrink-0 hidden sm:block">
          <span class="badge badge-neutral badge-sm flex items-center gap-1">
            <span>${getPaymentIcon(transaction.payment_method.type)}</span>
            ${transaction.payment_method.name}
          </span>
        </div>
        <div class="flex-shrink-0 text-right min-w-[100px]">
          <span class="font-semibold ${amountColor}">${amountSign}${formatCurrency(amount, transaction.currency)}</span>
        </div>
        <a href="/transactions/${transaction.id}" class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity btn btn-ghost btn-sm" aria-label="View ${transaction.category.name} transaction">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      `;
      list.appendChild(item);
    });

    card.appendChild(list);

    // View all button
    const viewAllBtn = document.createElement('div');
    viewAllBtn.className = 'mt-4 pt-4 border-t border-base-300';
    viewAllBtn.innerHTML = `
      <a href="${viewAllUrl}" class="flex items-center justify-center gap-2 w-full py-2 px-4 bg-base-200 hover:bg-base-300 rounded-lg transition-colors text-sm font-medium group">
        View All Transactions
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </a>
    `;
    card.appendChild(viewAllBtn);
  }

  container.appendChild(card);
  return container;
};

// Default state with transactions
export const Default: StoryObj = {
  args: {
    transactions: mockRecentTransactions,
    loading: false,
  },
  render: (args) => createRecentTransactionsList(args),
};

// Empty state
export const Empty: StoryObj = {
  args: {
    transactions: mockRecentTransactionsEmpty,
    loading: false,
  },
  render: (args) => createRecentTransactionsList(args),
};

// Loading state
export const Loading: StoryObj = {
  args: {
    transactions: [],
    loading: true,
  },
  render: (args) => createRecentTransactionsList(args),
};

// All states together
export const AllStates: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.className = 'grid grid-cols-1 md:grid-cols-2 gap-8';

    const states = [
      { title: 'With Transactions', transactions: mockRecentTransactions, loading: false },
      { title: 'Empty State', transactions: mockRecentTransactionsEmpty, loading: false },
      { title: 'Loading', transactions: [], loading: true },
    ];

    states.forEach((state) => {
      const section = document.createElement('section');
      section.innerHTML = `<h3 class="text-lg font-semibold mb-4">${state.title}</h3>`;
      section.appendChild(
        createRecentTransactionsList({ transactions: state.transactions, loading: state.loading })
      );
      container.appendChild(section);
    });

    return container;
  },
};
