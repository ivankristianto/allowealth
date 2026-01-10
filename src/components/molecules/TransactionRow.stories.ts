import type { Meta, StoryObj } from '@storybook/html';
import type { TransactionOutput } from '@/lib/types/transaction';

const meta: Meta = {
  title: 'Molecules/TransactionRow',
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['expense', 'income'],
    },
    currency: {
      control: 'select',
      options: ['IDR', 'USD'],
    },
    showActions: { control: 'boolean' },
  },
};

export default meta;

const createMockTransaction = (overrides?: Partial<TransactionOutput>): TransactionOutput => ({
  id: 'txn_123456',
  type: 'expense',
  amount: '150000',
  currency: 'IDR',
  description: 'Lunch at restaurant',
  transaction_date: new Date('2024-01-15'),
  category: {
    id: 'cat_1',
    name: 'Food & Dining',
    type: 'expense',
  },
  payment_method: {
    id: 'pm_1',
    name: 'Cash',
    type: 'cash',
  },
  deleted_at: null,
  created_at: new Date('2024-01-15'),
  updated_at: new Date('2024-01-15'),
  ...overrides,
});

const createTransactionRow = (args: {
  transaction?: TransactionOutput;
  editUrl?: string;
  deleteUrl?: string;
  showActions?: boolean;
}): HTMLElement => {
  const {
    transaction = createMockTransaction(),
    editUrl = '/transactions/edit',
    deleteUrl = '/transactions/delete',
    showActions = true,
  } = args;

  const amount = parseFloat(transaction.amount) || 0;
  const isExpense = transaction.type === 'expense';
  const date = new Date(transaction.transaction_date);

  // Format date
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Currency formatter
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
  wrapper.className = 'flex items-center gap-4 p-4 hover:bg-base-200 rounded-lg transition-colors';

  // Date
  const dateDiv = document.createElement('div');
  dateDiv.className = 'flex-shrink-0 w-24 text-sm';
  dateDiv.innerHTML = `<div class="font-medium">${formattedDate}</div>`;
  wrapper.appendChild(dateDiv);

  // Category & Description
  const infoDiv = document.createElement('div');
  infoDiv.className = 'flex-1 min-w-0';
  infoDiv.innerHTML = `
    <div class="font-medium truncate">${transaction.category.name}</div>
    ${transaction.description ? `<div class="text-sm text-neutral-500 truncate">${transaction.description}</div>` : ''}
  `;
  wrapper.appendChild(infoDiv);

  // Payment Method
  const paymentDiv = document.createElement('div');
  paymentDiv.className = 'flex-shrink-0 hidden sm:block';
  paymentDiv.innerHTML = `<span class="badge badge-neutral badge-sm">${transaction.payment_method.name}</span>`;
  wrapper.appendChild(paymentDiv);

  // Amount
  const amountDiv = document.createElement('div');
  amountDiv.className = 'flex-shrink-0 text-right';
  amountDiv.innerHTML = `<span class="${isExpense ? 'text-error' : 'text-success'} font-medium">${formatCurrencyValue(amount, transaction.currency, true)}</span>`;
  wrapper.appendChild(amountDiv);

  // Actions
  if (showActions && (editUrl || deleteUrl)) {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'flex-shrink-0 flex gap-1';

    if (editUrl) {
      const editBtn = document.createElement('a');
      editBtn.href = editUrl;
      editBtn.className = 'btn btn-ghost btn-sm';
      editBtn.setAttribute('aria-label', 'Edit transaction');
      editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>`;
      actionsDiv.appendChild(editBtn);
    }

    if (deleteUrl) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-ghost btn-sm text-error';
      deleteBtn.setAttribute('aria-label', 'Delete transaction');
      deleteBtn.setAttribute('data-delete-url', deleteUrl);
      deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>`;
      actionsDiv.appendChild(deleteBtn);
    }

    wrapper.appendChild(actionsDiv);
  }

  return wrapper;
};

export const Default: StoryObj = {
  args: {},
  render: (args) => createTransactionRow(args),
};

export const Expense: StoryObj = {
  args: { type: 'expense' },
  render: (args) =>
    createTransactionRow({
      ...args,
      transaction: createMockTransaction({ type: 'expense', amount: '150000' }),
    }),
};

export const Income: StoryObj = {
  args: { type: 'income' },
  render: (args) =>
    createTransactionRow({
      ...args,
      transaction: createMockTransaction({ type: 'income', amount: '5000000' }),
    }),
};

export const USDCurrency: StoryObj = {
  args: { currency: 'USD' },
  render: (args) =>
    createTransactionRow({
      ...args,
      transaction: createMockTransaction({ type: 'expense', amount: '25.50', currency: 'USD' }),
    }),
};

export const WithoutDescription: StoryObj = {
  render: (args) =>
    createTransactionRow({ ...args, transaction: createMockTransaction({ description: '' }) }),
};

export const WithoutActions: StoryObj = {
  args: { showActions: false },
  render: (args) => createTransactionRow(args),
};

export const LongDescription: StoryObj = {
  render: (args) =>
    createTransactionRow({
      ...args,
      transaction: createMockTransaction({
        description:
          'This is a very long description that should be truncated when displayed in the transaction row to test the truncation behavior.',
      }),
    }),
};
