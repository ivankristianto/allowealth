import type { Meta, StoryObj } from '@storybook/html';
import type { TransactionOutput } from '@/lib/types/transaction';
import { IconRenderers } from '../../../.storybook/lucide-icons';

const { Pencil, Trash2 } = IconRenderers;

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
      editBtn.appendChild(
        Pencil.render({ size: 16, class: 'stroke-current' }, { 'aria-hidden': 'true' })
      );
      actionsDiv.appendChild(editBtn);
    }

    if (deleteUrl) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-ghost btn-sm text-error';
      deleteBtn.setAttribute('aria-label', 'Delete transaction');
      deleteBtn.setAttribute('data-delete-transaction', transaction.id);
      deleteBtn.setAttribute('data-transaction-details', JSON.stringify(transaction));
      deleteBtn.appendChild(
        Trash2.render({ size: 16, class: 'stroke-current' }, { 'aria-hidden': 'true' })
      );
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
