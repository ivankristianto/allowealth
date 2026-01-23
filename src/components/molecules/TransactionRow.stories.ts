import type { Meta, StoryObj } from '@storybook/html';
import type { TransactionOutput } from '@/lib/types/transaction';
import { IconRenderers } from '../../../.storybook/lucide-icons';

const {
  Banknote,
  Briefcase,
  Car,
  CreditCard,
  Film,
  House,
  Pencil,
  ShoppingBasket,
  Trash2,
  UtensilsCrossed,
  Wallet,
  Zap,
} = IconRenderers;

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
  const primaryText = transaction.description?.trim() || transaction.category.name;

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

  const iconVariants: Record<string, { bg: string; text: string }> = {
    primary: { bg: 'bg-primary/10', text: 'text-primary' },
    accent: { bg: 'bg-accent/10', text: 'text-accent' },
    success: { bg: 'bg-success/10', text: 'text-success' },
    warning: { bg: 'bg-warning/10', text: 'text-warning' },
    error: { bg: 'bg-error/10', text: 'text-error' },
    info: { bg: 'bg-info/10', text: 'text-info' },
    neutral: { bg: 'bg-base-300', text: 'text-base-content' },
  };

  const getCategoryMeta = (name: string, type: TransactionOutput['type']) => {
    const normalized = name.toLowerCase();

    if (type === 'income') {
      return { icon: Banknote, variant: 'success' };
    }

    if (
      normalized.includes('grocery') ||
      normalized.includes('market') ||
      normalized.includes('food')
    ) {
      return { icon: ShoppingBasket, variant: 'warning' };
    }
    if (
      normalized.includes('utility') ||
      normalized.includes('electric') ||
      normalized.includes('water') ||
      normalized.includes('gas')
    ) {
      return { icon: Zap, variant: 'info' };
    }
    if (
      normalized.includes('entertainment') ||
      normalized.includes('movie') ||
      normalized.includes('netflix')
    ) {
      return { icon: Film, variant: 'error' };
    }
    if (
      normalized.includes('transport') ||
      normalized.includes('uber') ||
      normalized.includes('taxi') ||
      normalized.includes('ride')
    ) {
      return { icon: Car, variant: 'accent' };
    }
    if (normalized.includes('dining') || normalized.includes('restaurant')) {
      return { icon: UtensilsCrossed, variant: 'warning' };
    }
    if (
      normalized.includes('housing') ||
      normalized.includes('rent') ||
      normalized.includes('mortgage')
    ) {
      return { icon: House, variant: 'primary' };
    }
    if (normalized.includes('freelance') || normalized.includes('contract')) {
      return { icon: Briefcase, variant: 'info' };
    }

    return { icon: Wallet, variant: type === 'expense' ? 'error' : 'success' };
  };

  const categoryMeta = getCategoryMeta(transaction.category.name, transaction.type);
  const iconStyle = iconVariants[categoryMeta.variant];

  const wrapper = document.createElement('div');
  wrapper.className = [
    'group flex items-center gap-5 p-5 transition-all cursor-pointer border-l-4 border-transparent',
    isExpense ? 'hover:border-error/30' : 'hover:border-success/30',
    'hover:bg-base-200/40',
  ].join(' ');

  // Date
  const dateDiv = document.createElement('div');
  dateDiv.className = 'flex-shrink-0 w-24 text-sm';
  dateDiv.innerHTML = `<div class="font-medium">${formattedDate}</div>`;
  wrapper.appendChild(dateDiv);

  // Category & Description
  const infoDiv = document.createElement('div');
  infoDiv.className = 'flex-1 min-w-0 flex items-center gap-4';

  const iconBadge = document.createElement('div');
  iconBadge.className = `rounded-2xl p-3 shadow-sm ${iconStyle.bg} ${iconStyle.text} transition-transform group-hover:rotate-2`;
  iconBadge.appendChild(
    categoryMeta.icon.render({ size: 18, class: 'stroke-current' }, { 'aria-hidden': 'true' })
  );
  infoDiv.appendChild(iconBadge);

  const textGroup = document.createElement('div');
  textGroup.className = 'min-w-0';
  textGroup.innerHTML = `
    <div class="font-bold tracking-tight truncate text-base leading-none">${primaryText}</div>
    <div class="mt-2 flex flex-wrap items-center gap-2 leading-none">
      <span class="text-[10px] font-bold tracking-widest uppercase text-base-content/60 bg-base-200 px-2 py-0.5 rounded">
        ${transaction.category.name}
      </span>
    </div>
  `;
  infoDiv.appendChild(textGroup);
  wrapper.appendChild(infoDiv);

  // Payment Method
  const paymentDiv = document.createElement('div');
  paymentDiv.className = 'flex-shrink-0 hidden sm:block';
  paymentDiv.className +=
    ' text-[10px] uppercase tracking-widest text-base-content/60 flex items-center gap-1.5';
  paymentDiv.appendChild(
    CreditCard.render({ size: 12, class: 'stroke-current' }, { 'aria-hidden': 'true' })
  );
  paymentDiv.appendChild(document.createTextNode(transaction.payment_method.name));
  wrapper.appendChild(paymentDiv);

  // Amount
  const amountDiv = document.createElement('div');
  amountDiv.className = 'flex-shrink-0 text-right min-w-[120px]';
  amountDiv.innerHTML = `<span class="${isExpense ? 'text-error' : 'text-success'} font-bold tracking-tight">${formatCurrencyValue(amount, transaction.currency, true)}</span>`;
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
