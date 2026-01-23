import type { Meta, StoryObj } from '@storybook/html';
import {
  mockRecentTransactions,
  mockRecentTransactionsEmpty,
} from '@/services/__tests__/mocks/dashboard-mocks';
import { IconRenderers } from '../../../.storybook/lucide-icons';

const { ArrowRight, DollarSign, CreditCard, ArrowLeft, Wallet, Plus, Clock } = IconRenderers;

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

// Type alias for payment method icon components
type PaymentIconComponent =
  | typeof DollarSign
  | typeof CreditCard
  | typeof ArrowLeft
  | typeof Wallet;

// Payment method icon component mapping
const getPaymentIconComponent = (type: string): PaymentIconComponent => {
  const icons: Record<string, PaymentIconComponent> = {
    cash: DollarSign,
    credit_card: CreditCard,
    debit_card: CreditCard,
    bank_transfer: ArrowLeft,
    e_wallet: Wallet,
  };
  return icons[type] || DollarSign;
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

  // Header with Lucide icon
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-4';
  const headerTitle = document.createElement('h2');
  headerTitle.className = 'text-lg font-semibold flex items-center gap-2';
  headerTitle.appendChild(
    Clock.render({ size: 20, class: 'stroke-current text-info' }, { 'aria-hidden': 'true' })
  );
  headerTitle.appendChild(document.createTextNode('Recent Transactions'));
  header.appendChild(headerTitle);

  if (!loading && transactions.length > 5) {
    const viewAllLink = document.createElement('a');
    viewAllLink.href = viewAllUrl;
    viewAllLink.className =
      'text-sm text-primary hover:text-accent font-medium flex items-center gap-1';
    viewAllLink.textContent = 'View All';
    viewAllLink.appendChild(
      ArrowRight.render({ size: 16, class: 'stroke-current' }, { 'aria-hidden': 'true' })
    );
    header.appendChild(viewAllLink);
  }

  card.appendChild(header);

  if (loading) {
    // Loading skeleton
    const skeleton = document.createElement('div');
    skeleton.className = 'space-y-3';
    for (let i = 0; i < 5; i++) {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-4 p-4 bg-base-200 rounded-lg animate-pulse';
      row.innerHTML = `
        <div class="w-20 h-4 bg-base-300 rounded"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-base-300 rounded w-3/4"></div>
          <div class="h-3 bg-base-300 rounded w-1/2"></div>
        </div>
        <div class="w-24 h-4 bg-base-300 rounded"></div>
      `;
      skeleton.appendChild(row);
    }
    card.appendChild(skeleton);
  } else if (transactions.length === 0) {
    // Empty state with Lucide icon
    const emptyState = document.createElement('div');
    emptyState.className = 'text-center py-8';
    const iconContainer = document.createElement('div');
    iconContainer.className = 'mb-4 flex justify-center';
    iconContainer.appendChild(
      Plus.render(
        { size: 48, class: 'stroke-current text-base-content/40' },
        { 'aria-hidden': 'true' }
      )
    );
    emptyState.appendChild(iconContainer);

    const emptyTitle = document.createElement('h3');
    emptyTitle.className = 'text-lg font-semibold mb-2';
    emptyTitle.textContent = 'No transactions yet';
    emptyState.appendChild(emptyTitle);

    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'text-base-content/60 mb-4';
    emptyMessage.textContent = 'Start tracking by adding your first expense or income transaction.';
    emptyState.appendChild(emptyMessage);

    const addLink = document.createElement('a');
    addLink.href = '/transactions/add';
    addLink.className = 'btn btn-primary btn-sm';
    addLink.textContent = 'Add Transaction';
    emptyState.appendChild(addLink);

    card.appendChild(emptyState);
  } else {
    // Transactions list
    const list = document.createElement('ul');
    list.className = 'space-y-1';
    list.setAttribute('role', 'list');
    list.setAttribute('aria-label', 'Recent transactions');

    transactions.slice(0, 5).forEach((transaction: any) => {
      const amount = parseFloat(transaction.amount) || 0;
      const isExpense = transaction.type === 'expense';
      const date = new Date(transaction.transaction_date);
      const amountColor = isExpense ? 'text-error' : 'text-success';
      const amountSign = isExpense ? '-' : '+';

      const item = document.createElement('li');
      item.className =
        'flex items-center gap-4 p-4 hover:bg-base-200 rounded-lg transition-colors group';

      // Date
      const dateDiv = document.createElement('div');
      dateDiv.className = 'flex-shrink-0 w-20 text-sm';
      const timeEl = document.createElement('time');
      timeEl.className = 'font-medium';
      timeEl.textContent = formatDate(date);
      timeEl.setAttribute('datetime', date.toISOString());
      dateDiv.appendChild(timeEl);
      item.appendChild(dateDiv);

      // Category & Description
      const infoDiv = document.createElement('div');
      infoDiv.className = 'flex-1 min-w-0';
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'font-medium truncate group-hover:text-primary transition-colors';
      categoryDiv.textContent = transaction.category.name;
      infoDiv.appendChild(categoryDiv);

      if (transaction.description) {
        const descDiv = document.createElement('div');
        descDiv.className = 'text-sm text-base-content/60 truncate';
        descDiv.textContent = transaction.description;
        infoDiv.appendChild(descDiv);
      }
      item.appendChild(infoDiv);

      // Payment Method
      const paymentDiv = document.createElement('div');
      paymentDiv.className = 'flex-shrink-0 hidden sm:block';
      const badge = document.createElement('span');
      badge.className = 'badge badge-ghost badge-sm flex items-center gap-1';
      const PaymentIcon = getPaymentIconComponent(transaction.payment_method.type);
      badge.appendChild(
        PaymentIcon.render({ size: 12, class: 'stroke-current' }, { 'aria-hidden': 'true' })
      );
      badge.appendChild(document.createTextNode(transaction.payment_method.name));
      paymentDiv.appendChild(badge);
      item.appendChild(paymentDiv);

      // Amount
      const amountDiv = document.createElement('div');
      amountDiv.className = 'flex-shrink-0 text-right min-w-[100px]';
      const amountSpan = document.createElement('span');
      amountSpan.className = `font-semibold ${amountColor}`;
      amountSpan.textContent = `${amountSign}${formatCurrency(amount, transaction.currency)}`;
      amountDiv.appendChild(amountSpan);
      item.appendChild(amountDiv);

      // Quick action link
      const actionLink = document.createElement('a');
      actionLink.href = `/transactions/${transaction.id}`;
      actionLink.className =
        'flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity btn btn-ghost btn-sm';
      actionLink.setAttribute('aria-label', `View ${transaction.category.name} transaction`);
      actionLink.appendChild(
        ArrowRight.render({ size: 16, class: 'stroke-current' }, { 'aria-hidden': 'true' })
      );
      item.appendChild(actionLink);

      list.appendChild(item);
    });

    card.appendChild(list);

    // View all button
    const viewAllBtn = document.createElement('div');
    viewAllBtn.className = 'mt-4 pt-4 border-t border-base-300';
    const viewAllAnchor = document.createElement('a');
    viewAllAnchor.href = viewAllUrl;
    viewAllAnchor.className =
      'flex items-center justify-center gap-2 w-full py-2 px-4 bg-base-200 hover:bg-base-300 rounded-lg transition-colors text-sm font-medium group';
    viewAllAnchor.textContent = 'View All Transactions';
    const arrowIcon = ArrowRight.render(
      { size: 16, class: 'stroke-current group-hover:translate-x-1 transition-transform' },
      { 'aria-hidden': 'true' }
    );
    viewAllAnchor.appendChild(arrowIcon);
    viewAllBtn.appendChild(viewAllAnchor);
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
      const heading = document.createElement('h3');
      heading.className = 'text-lg font-semibold mb-4';
      heading.textContent = state.title;
      section.appendChild(heading);
      section.appendChild(
        createRecentTransactionsList({ transactions: state.transactions, loading: state.loading })
      );
      container.appendChild(section);
    });

    return container;
  },
};
