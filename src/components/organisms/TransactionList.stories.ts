import type { Meta, StoryObj } from '@storybook/html';
import type { TransactionOutput } from '@/lib/types/transaction';

const meta: Meta = {
  title: 'Organisms/TransactionList',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment
| Property | Value | Class |
|----------|-------|-------|
| Import CSV Icon | ArrowLeft | size={16}, stroke-current |
| Download CSV Icon | Download | size={16}, stroke-current |
| Export Options Icon | ArrowRight | size={16}, stroke-current |
| Add Transaction Icon | Plus | size={16}, stroke-current |
| Previous Page Icon | ChevronLeft | size={16}, stroke-current |
| Next Page Icon | ChevronRight | size={16}, stroke-current |

### Layout
- Header with title and action buttons
- Filter panel (collapsible details/summary)
- Transaction list with table header (desktop) or card layout (mobile)
- Pagination footer with page info and controls

### Action Buttons
| Button | Icon | Class |
|--------|------|-------|
| Import CSV | ArrowLeft | btn btn-outline btn-sm gap-2 |
| Download CSV | Download | btn btn-success btn-sm gap-2 |
| Export Options | ArrowRight | btn btn-outline btn-sm gap-2 |
| Add Transaction | Plus | btn btn-primary gap-2 |

### Filter Panel
- Uses details/summary for collapse behavior
- Auto-opens when filters are active
- Shows "X active" badge when filters applied
- Includes TransactionFiltersBar component

### Pagination
- Page sizes: 10, 25, 50, 100
- Shows "Page X of Y" indicator
- Shows "Showing X to Y of Z transactions"
- Previous/Next buttons disabled appropriately
- URLs preserve current filters

### Transaction Display
- Table header hidden on mobile (hidden md:flex)
- Payment column hidden on small screens (hidden sm:block)
- TransactionCard for each row with showActions={true}
- Delete confirmation via dialog element

### Delete Dialog
- Native dialog element for modal
- Transaction details container populated via JS
- Error container with role="alert"
- Confirm/Cancel buttons

### Accessibility
- All icons have aria-hidden="true"
- Buttons have visible text labels
- Dialog uses proper modal semantics
- Error container has role="alert"
- Pagination buttons disabled states

### Responsive Design
- Table header: hidden md:flex
- Payment column: hidden sm:block
- Action buttons maintain text on mobile
- Filter panel full-width on mobile
        `,
      },
    },
  },
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
  asset: {
    id: `asset_${id}`,
    name: 'Cash',
    type: 'cash',
  },
  deleted_at: null,
  created_at: new Date('2024-01-15'),
  updated_at: new Date('2024-01-15'),
  ...overrides,
});

// TODO: P3 - Extract page size (10) to a named constant for maintainability
const DEFAULT_PAGE_SIZE = 10;

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
  // Updated to use design system hover color
  wrapper.className =
    'flex items-center gap-4 p-4 hover:bg-base-100 rounded-lg transition-colors border-b border-base-300';

  // Date column
  const dateCol = document.createElement('div');
  dateCol.className = 'flex-shrink-0 w-24 text-sm';
  const dateText = document.createElement('div');
  dateText.className = 'font-medium';
  dateText.textContent = formattedDate;
  dateCol.appendChild(dateText);
  wrapper.appendChild(dateCol);

  // Category/description column - using textContent to prevent XSS
  const infoCol = document.createElement('div');
  infoCol.className = 'flex-1 min-w-0';
  const categoryDiv = document.createElement('div');
  categoryDiv.className = 'font-medium truncate';
  categoryDiv.textContent = transaction.category.name;
  infoCol.appendChild(categoryDiv);
  if (transaction.description) {
    const descDiv = document.createElement('div');
    descDiv.className = 'text-sm text-base-content/60 truncate';
    descDiv.textContent = transaction.description;
    infoCol.appendChild(descDiv);
  }
  wrapper.appendChild(infoCol);

  // Asset badge column
  const assetCol = document.createElement('div');
  assetCol.className = 'flex-shrink-0 hidden sm:block';
  const assetBadge = document.createElement('span');
  assetBadge.className = 'badge badge-neutral badge-sm';
  assetBadge.textContent = transaction.asset.name;
  assetCol.appendChild(assetBadge);
  wrapper.appendChild(assetCol);

  // Amount column
  const amountCol = document.createElement('div');
  amountCol.className = 'flex-shrink-0 text-right';
  const amountSpan = document.createElement('span');
  amountSpan.className = `${isExpense ? 'text-error' : 'text-success'} font-medium`;
  amountSpan.textContent = formatCurrencyValue(amount, transaction.currency, true);
  amountCol.appendChild(amountSpan);
  wrapper.appendChild(amountCol);

  // Action buttons column - static SVG is safe
  const actionsCol = document.createElement('div');
  actionsCol.className = 'flex-shrink-0 flex gap-1';
  actionsCol.innerHTML = `
    <button type="button" class="btn btn-ghost btn-sm" aria-label="Edit transaction">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
    </button>
    <button type="button" class="btn btn-ghost btn-sm text-error" aria-label="Delete transaction">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
    </button>
  `;
  wrapper.appendChild(actionsCol);

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
    <h2 class="text-2xl font-bold text-base-content">Transactions</h2>
    <button class="btn btn-accent">
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
      <div class="p-8 text-center text-base-content/60">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-lg font-medium text-base-content">No transactions found</p>
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
      <div class="text-sm text-base-content/60">
        Showing 1-${Math.min(transactionCount, DEFAULT_PAGE_SIZE)} of ${transactionCount} transactions
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
