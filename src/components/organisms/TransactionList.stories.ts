import type { Meta, StoryObj } from '@storybook/html';
import type { TransactionOutput } from '@/lib/types/transaction';

const meta: Meta = {
  title: 'Organisms/TransactionList',
  tags: ['autodocs'],
  argTypes: {
    showFilters: { control: 'boolean' },
    showPagination: { control: 'boolean' },
    transactionCount: { control: 'number', min: 0, max: 20 },
  },
};

export default meta;

const createMockTransaction = (
  id: string,
  overrides?: Partial<TransactionOutput>
): TransactionOutput => ({
  id,
  type: 'expense',
  amount: '150000',
  currency: 'IDR',
  description: 'Lunch at restaurant',
  transaction_date: new Date('2024-01-15'),
  category: {
    id: `cat_${id}`,
    name: 'Food & Dining',
    type: 'expense',
  },
  payment_method: {
    id: `pm_${id}`,
    name: 'Cash',
    type: 'cash',
  },
  deleted_at: null,
  created_at: new Date('2024-01-15'),
  updated_at: new Date('2024-01-15'),
  ...overrides,
});

const createTransactionRow = (transaction: TransactionOutput): HTMLElement => {
  const amount = parseFloat(transaction.amount) || 0;
  const isExpense = transaction.type === 'expense';
  const date = new Date(transaction.transaction_date);

  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formatCurrencyValue = (val: number, currency: string, showSign = false) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(val);

    if (showSign) {
      return isExpense ? `-${formatted}` : `+${formatted}`;
    }
    return formatted;
  };

  const wrapper = document.createElement('div');
  wrapper.className =
    'flex items-center gap-4 p-4 hover:bg-base-200 rounded-lg transition-colors border-b border-base-300';

  wrapper.innerHTML = `
    <div class="flex-shrink-0 w-24 text-sm">
      <div class="font-medium">${formattedDate}</div>
    </div>
    <div class="flex-1 min-w-0">
      <div class="font-medium truncate">${transaction.category.name}</div>
      ${transaction.description ? `<div class="text-sm text-neutral-500 truncate">${transaction.description}</div>` : ''}
    </div>
    <div class="flex-shrink-0 hidden sm:block">
      <span class="badge badge-neutral badge-sm">${transaction.payment_method.name}</span>
    </div>
    <div class="flex-shrink-0 text-right">
      <span class="${isExpense ? 'text-error' : 'text-success'} font-medium">${formatCurrencyValue(amount, transaction.currency, true)}</span>
    </div>
    <div class="flex-shrink-0 flex gap-1">
      <button type="button" class="btn btn-ghost btn-sm" aria-label="Edit transaction">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
      </button>
      <button type="button" class="btn btn-ghost btn-sm text-error" aria-label="Delete transaction">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  `;

  return wrapper;
};

const createTransactionList = (args: {
  showFilters?: boolean;
  showPagination?: boolean;
  transactionCount?: number;
}): HTMLElement => {
  const { showFilters = true, showPagination = true, transactionCount = 5 } = args;

  const wrapper = document.createElement('div');
  wrapper.className = 'space-y-4';

  // Header with Add Button
  const header = document.createElement('div');
  header.className = 'flex justify-between items-center';
  header.innerHTML = `
    <h2 class="text-2xl font-bold">Transactions</h2>
    <button class="btn btn-primary">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
      Add Transaction
    </button>
  `;
  wrapper.appendChild(header);

  // Filters
  if (showFilters) {
    const filters = document.createElement('div');
    filters.className = 'card bg-base-200';
    filters.innerHTML = `
      <div class="card-body p-4">
        <div class="flex flex-wrap gap-3">
          <input type="text" placeholder="Search transactions..." class="input input-bordered input-sm flex-1 min-w-[200px]" />
          <select class="select select-bordered select-sm">
            <option value="">All Types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <select class="select select-bordered select-sm">
            <option value="">All Categories</option>
            <option value="1">Food & Dining</option>
            <option value="2">Transportation</option>
          </select>
          <input type="date" class="input input-bordered input-sm" />
          <button class="btn btn-sm btn-ghost">Reset</button>
        </div>
      </div>
    `;
    wrapper.appendChild(filters);
  }

  // Transaction List
  const listContainer = document.createElement('div');
  listContainer.className = 'card bg-base-100 shadow-sm';

  const listContent = document.createElement('div');
  listContent.className = 'divide-y divide-base-300';

  if (transactionCount === 0) {
    listContent.innerHTML = `
      <div class="p-8 text-center text-neutral-500">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-lg font-medium">No transactions found</p>
        <p class="text-sm">Get started by adding your first transaction</p>
      </div>
    `;
  } else {
    for (let i = 0; i < transactionCount; i++) {
      const transaction = createMockTransaction(
        `txn_${i}`,
        i % 2 === 0
          ? { type: 'expense', amount: '150000', description: 'Lunch at restaurant' }
          : { type: 'income', amount: '5000000', description: 'Salary deposit' }
      );
      listContent.appendChild(createTransactionRow(transaction));
    }
  }

  listContainer.appendChild(listContent);
  wrapper.appendChild(listContainer);

  // Pagination
  if (showPagination && transactionCount > 0) {
    const pagination = document.createElement('div');
    pagination.className = 'flex justify-between items-center mt-4';
    pagination.innerHTML = `
      <div class="text-sm text-neutral-500">
        Showing 1-${Math.min(transactionCount, 10)} of ${transactionCount} transactions
      </div>
      <div class="join">
        <button class="join-item btn btn-sm" disabled>Previous</button>
        <button class="join-item btn btn-sm btn-active">1</button>
        <button class="join-item btn btn-sm">2</button>
        <button class="join-item btn btn-sm">Next</button>
      </div>
    `;
    wrapper.appendChild(pagination);
  }

  return wrapper;
};

export const Default: StoryObj = {
  args: { transactionCount: 5 },
  render: (args) => createTransactionList(args),
};

export const Empty: StoryObj = {
  args: { transactionCount: 0 },
  render: (args) => createTransactionList(args),
};

export const WithoutFilters: StoryObj = {
  args: { showFilters: false, transactionCount: 5 },
  render: (args) => createTransactionList(args),
};

export const WithoutPagination: StoryObj = {
  args: { showPagination: false, transactionCount: 3 },
  render: (args) => createTransactionList(args),
};

export const ManyTransactions: StoryObj = {
  args: { transactionCount: 15 },
  render: (args) => createTransactionList(args),
};
