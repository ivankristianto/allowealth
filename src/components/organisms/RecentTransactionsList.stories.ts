import type { Meta, StoryObj } from '@storybook/html';
import { formatCurrency } from '@/lib/formatting/currency-client';
import {
  mockRecentTransactions,
  mockRecentTransactionsEmpty,
} from '@/services/__tests__/mocks/dashboard-mocks';
import { IconRenderers } from '../../../.storybook/lucide-icons';

const { CreditCard, Plus, Tag } = IconRenderers;

// Icon map for dynamic lookup from category.icon field (kebab-case to renderer)
const iconMap: Record<string, (typeof IconRenderers)[keyof typeof IconRenderers]> = {
  banknote: IconRenderers.Banknote,
  briefcase: IconRenderers.Briefcase,
  car: IconRenderers.Car,
  'credit-card': IconRenderers.CreditCard,
  film: IconRenderers.Film,
  home: IconRenderers.Home,
  'shopping-basket': IconRenderers.ShoppingBasket,
  'shopping-cart': IconRenderers.ShoppingCart,
  utensils: IconRenderers.UtensilsCrossed,
  wallet: IconRenderers.Wallet,
  zap: IconRenderers.Zap,
  user: IconRenderers.User,
  tag: IconRenderers.Tag,
  smile: IconRenderers.Smile,
  plane: IconRenderers.Plane,
  package: IconRenderers.Package,
  shield: IconRenderers.Shield,
  users: IconRenderers.Users,
  'circle-dot': IconRenderers.CircleDot,
};

// Color map from DaisyUI semantic classes to visual styling
const colorStyleMap: Record<string, { bg: string; text: string }> = {
  'bg-primary': { bg: 'bg-primary/10', text: 'text-primary' },
  'bg-secondary': { bg: 'bg-secondary/10', text: 'text-secondary' },
  'bg-accent': { bg: 'bg-accent/10', text: 'text-accent' },
  'bg-success': { bg: 'bg-success/10', text: 'text-success' },
  'bg-warning': { bg: 'bg-warning/10', text: 'text-warning' },
  'bg-error': { bg: 'bg-error/10', text: 'text-error' },
  'bg-info': { bg: 'bg-info/10', text: 'text-info' },
  'bg-neutral': { bg: 'bg-base-300', text: 'text-base-content' },
  'bg-base-300': { bg: 'bg-base-300', text: 'text-base-content' },
};

const meta: Meta = {
  title: 'Organisms/RecentTransactionsList',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment
| Property | Value | Class |
|----------|-------|-------|
| Empty State Icon | Plus | size={48}, text-base-content/40 |
| Category Icons | Various | size={18}, stroke-current |
| Payment Method Icon | CreditCard | size={12}, stroke-current |

### Layout
- Header with "Recent activity" title and "View all" link
- Card container with rounded-2xl, shadow-sm, overflow-hidden
- List with divide-y divide-base-200
- Maximum 10 transactions displayed (maxTransactions = 10)

### Category Icon Mapping
| Category | Icon | Variant |
|----------|------|---------|
| Income | Banknote | success |
| Grocery/Food | ShoppingBasket | warning |
| Utilities | Zap | info |
| Entertainment | Film | error |
| Transport | Car | accent |
| Dining | UtensilsCrossed | warning |
| Housing | House | primary |
| Freelance | Briefcase | info |
| Other Expense | Wallet | error |
| Other Income | Wallet | success |

### Transaction Item Structure
- Icon badge: rounded-2xl p-3 with category color
- Primary text: description or category name (font-bold truncate)
- Category badge: uppercase tracking-widest
- Timestamp: formatted relative date
- Amount: text-error (expense) or text-success (income)
- Payment method: CreditCard icon + asset name

### States
| State | Display |
|-------|---------|
| Loading | 6 skeleton rows with animate-pulse |
| Empty | Plus icon + "No transactions yet" message + Add button |
| Normal | Transaction list with category icons |

### Accessibility
- List has role="list" aria-label="Recent transactions"
- View all link has aria-label="View all transactions"
- Loading skeleton has appropriate ARIA attributes
- Icons have aria-hidden="true"

### Responsive Design
- Full-width card on mobile
- Hover effects: border-l-4 with expense/income color
- Icon badge rotates slightly on hover (group-hover:rotate-2)
        `,
      },
    },
  },
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

const formatActivityDate = (date: Date): string => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (diffDays === 0) {
    return `Today, ${time}`;
  }
  if (diffDays === 1) {
    return `Yesterday, ${time}`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Helper to get icon renderer from category.icon field
const getIconRenderer = (iconName: string) => {
  return iconMap[iconName] || Tag;
};

// Helper to get color styling from category.color field
const getColorStyle = (color: string) => {
  return colorStyleMap[color] || { bg: 'bg-base-300', text: 'text-base-content' };
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
  container.className = 'p-4 bg-base-100 space-y-5';

  // Header with Lucide icon
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between px-2';
  const headerTitle = document.createElement('h2');
  headerTitle.className = 'text-lg font-bold tracking-tight leading-none';
  headerTitle.appendChild(document.createTextNode('Recent activity'));
  header.appendChild(headerTitle);

  if (!loading && transactions.length > 0) {
    const viewAllLink = document.createElement('a');
    viewAllLink.href = viewAllUrl;
    viewAllLink.className =
      'btn btn-outline btn-sm text-accent border-accent/20 hover:bg-accent/5 rounded-xl tracking-wide';
    viewAllLink.setAttribute('aria-label', 'View all transactions');
    viewAllLink.textContent = 'View all';
    header.appendChild(viewAllLink);
  }

  container.appendChild(header);

  const card = document.createElement('div');
  card.className = 'border rounded-2xl p-0 bg-base-100 shadow-sm overflow-hidden';

  if (loading) {
    // Loading skeleton
    const skeleton = document.createElement('div');
    skeleton.className = 'divide-y divide-base-200';
    for (let i = 0; i < 6; i++) {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-5 p-5 animate-pulse';
      row.innerHTML = `
        <div class="h-12 w-12 rounded-2xl bg-base-200"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-base-200 rounded w-3/4"></div>
          <div class="h-3 bg-base-200 rounded w-1/2"></div>
        </div>
        <div class="w-24 space-y-2">
          <div class="h-4 bg-base-200 rounded"></div>
          <div class="h-3 bg-base-200 rounded"></div>
        </div>
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
    list.className = 'divide-y divide-base-200';
    list.setAttribute('role', 'list');
    list.setAttribute('aria-label', 'Recent transactions');

    transactions.slice(0, 6).forEach((transaction: any) => {
      const amount = parseFloat(transaction.amount) || 0;
      const isExpense = transaction.type === 'expense';
      const date = new Date(transaction.transaction_date);
      const amountColor = isExpense ? 'text-error' : 'text-success';
      const amountSign = isExpense ? '-' : '+';
      // Use icon and color from category data
      const iconRenderer = getIconRenderer(transaction.category.icon);
      const iconStyle = getColorStyle(transaction.category.color);
      const primaryText = transaction.description || transaction.category.name;

      const item = document.createElement('li');
      item.className = [
        'group flex items-center gap-5 p-5 transition-all cursor-pointer border-l-4 border-transparent',
        isExpense ? 'hover:border-error/30' : 'hover:border-success/30',
        'hover:bg-base-200/40',
      ].join(' ');

      const iconBadge = document.createElement('div');
      iconBadge.className = `rounded-2xl p-3 shadow-sm ${iconStyle.bg} ${iconStyle.text} transition-transform group-hover:rotate-2`;
      iconBadge.appendChild(
        iconRenderer.render({ size: 18, class: 'stroke-current' }, { 'aria-hidden': 'true' })
      );
      item.appendChild(iconBadge);

      const contentDiv = document.createElement('div');
      contentDiv.className = 'flex-1 min-w-0';

      const topRow = document.createElement('div');
      topRow.className = 'flex items-start justify-between gap-4';

      const leftBlock = document.createElement('div');
      leftBlock.className = 'min-w-0';
      const title = document.createElement('div');
      title.className = 'font-bold tracking-tight truncate text-base leading-none';
      title.textContent = primaryText;
      leftBlock.appendChild(title);

      const metaRow = document.createElement('div');
      metaRow.className =
        'mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-base-content/60 tracking-wide leading-none';
      const categoryBadge = document.createElement('span');
      categoryBadge.className =
        'text-[10px] font-bold tracking-widest uppercase text-base-content/60 bg-base-200 px-2 py-0.5 rounded';
      categoryBadge.textContent = transaction.category.name;
      metaRow.appendChild(categoryBadge);
      const timeEl = document.createElement('time');
      timeEl.setAttribute('datetime', date.toISOString());
      timeEl.textContent = formatActivityDate(date);
      metaRow.appendChild(timeEl);
      leftBlock.appendChild(metaRow);
      topRow.appendChild(leftBlock);

      const rightBlock = document.createElement('div');
      rightBlock.className = 'flex flex-col items-end gap-1 min-w-[120px]';
      const amountSpan = document.createElement('span');
      amountSpan.className = `font-bold tracking-tight ${amountColor}`;
      amountSpan.textContent = `${amountSign}${formatCurrency(amount, transaction.currency)}`;
      rightBlock.appendChild(amountSpan);
      const paymentRow = document.createElement('div');
      paymentRow.className =
        'flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-base-content/60';
      paymentRow.appendChild(
        CreditCard.render({ size: 12, class: 'stroke-current' }, { 'aria-hidden': 'true' })
      );
      paymentRow.appendChild(document.createTextNode(transaction.asset.name));
      rightBlock.appendChild(paymentRow);
      topRow.appendChild(rightBlock);

      contentDiv.appendChild(topRow);
      item.appendChild(contentDiv);

      list.appendChild(item);
    });

    card.appendChild(list);
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
