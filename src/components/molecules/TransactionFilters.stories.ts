import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Molecules/TransactionFilters',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Design System Alignment

| Property | Value | Class |
|----------|-------|-------|
| Container | Card | \`bg-base-100 rounded-box p-4\` |
| Grid | Responsive | \`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4\` |
| Input Height | 40px | \`h-10\` |
| Input Background | bg-base-200 | DaisyUI base |
| Focus Ring | ring-accent | \`focus:ring-2 focus:ring-accent\` |

### Icons

| Icon | Size | Class | Usage |
|------|------|-------|-------|
| Search | 16px | \`size={16} stroke-current\` | Search input prefix |

### Filter Fields (6 Total)

| Field | Type | Options/Format |
|-------|------|----------------|
| Search | text input | Free text with Search icon |
| Type | select | All, Income, Expense |
| Category | select | Dynamic from categories |
| Asset | select | Dynamic from assets |
| Date From | date | Date picker |
| Date To | date | Date picker |

### Search Input

| Property | Value | Class |
|----------|-------|-------|
| Icon Position | Left | \`absolute left-3\` |
| Padding Left | 36px | \`pl-9\` (for icon) |
| Placeholder | "Search transactions..." | Gray text |

### Select Inputs

| Property | Value | Class |
|----------|-------|-------|
| Style | DaisyUI | \`select select-bordered\` |
| Default | "All" option | First option |
| Width | Full | \`w-full\` |

### Date Range

| Property | Value | Class |
|----------|-------|-------|
| Style | DaisyUI | \`input input-bordered\` |
| Max Date | Today | \`max={today}\` |
| Validation | From <= To | Client-side check |

### Responsive Layout

| Breakpoint | Columns |
|------------|---------|
| Mobile (< 768px) | 1 column |
| Tablet (768-1024px) | 2 columns |
| Desktop (> 1024px) | 3 columns |

### Accessibility

- Labels associated with inputs via \`for\` attribute
- Search icon is \`aria-hidden="true"\` (decorative)
- Date inputs have accessible labels
- Filter changes announced via \`aria-live\`

### Props

- **searchQuery**: Initial search text
- **selectedType**: all | income | expense
- **selectedCategory**: Category ID or null
- **selectedAsset**: Asset ID or null
- **dateFrom**: Start date filter
- **dateTo**: End date filter
- **categories**: Array of category options
- **assets**: Array of asset options
        `,
      },
    },
  },
  argTypes: {
    searchQuery: {
      control: 'text',
      description: 'Search query text',
    },
    selectedType: {
      control: 'select',
      options: ['all', 'income', 'expense'],
      description: 'Transaction type filter',
    },
  },
};

export default meta;

/**
 * Helper function to create TransactionFilters
 */
function createTransactionFilters(args: {
  searchQuery?: string;
  selectedType?: 'all' | 'income' | 'expense';
  selectedCategory?: string;
  selectedAsset?: string;
  dateFrom?: string;
  dateTo?: string;
}): HTMLElement {
  const {
    searchQuery = '',
    selectedType = 'all',
    selectedCategory = '',
    selectedAsset = '',
    dateFrom = '',
    dateTo = '',
  } = args;

  const container = document.createElement('div');
  container.className = 'bg-base-100 rounded-box p-4';

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

  // Search field
  const searchGroup = document.createElement('div');
  searchGroup.className = 'form-control';
  searchGroup.innerHTML = `
    <label class="label" for="search">
      <span class="label-text">Search</span>
    </label>
    <div class="relative">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 stroke-current" aria-hidden="true">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
      <input
        type="text"
        id="search"
        name="search"
        placeholder="Search transactions..."
        value="${searchQuery}"
        class="input input-bordered h-10 pl-9 pr-3 bg-base-200 focus:ring-2 focus:ring-accent focus:outline-none w-full"
      />
    </div>
  `;
  grid.appendChild(searchGroup);

  // Type filter
  const typeGroup = document.createElement('div');
  typeGroup.className = 'form-control';
  typeGroup.innerHTML = `
    <label class="label" for="type">
      <span class="label-text">Type</span>
    </label>
    <select id="type" name="type" class="select select-bordered h-10 bg-base-200 focus:ring-2 focus:ring-accent focus:outline-none w-full">
      <option value="all" ${selectedType === 'all' ? 'selected' : ''}>All Types</option>
      <option value="income" ${selectedType === 'income' ? 'selected' : ''}>Income</option>
      <option value="expense" ${selectedType === 'expense' ? 'selected' : ''}>Expense</option>
    </select>
  `;
  grid.appendChild(typeGroup);

  // Category filter
  const categoryGroup = document.createElement('div');
  categoryGroup.className = 'form-control';
  categoryGroup.innerHTML = `
    <label class="label" for="category">
      <span class="label-text">Category</span>
    </label>
    <select id="category" name="category" class="select select-bordered h-10 bg-base-200 focus:ring-2 focus:ring-accent focus:outline-none w-full">
      <option value="" ${!selectedCategory ? 'selected' : ''}>All Categories</option>
      <option value="1" ${selectedCategory === '1' ? 'selected' : ''}>Food & Dining</option>
      <option value="2" ${selectedCategory === '2' ? 'selected' : ''}>Transportation</option>
      <option value="3" ${selectedCategory === '3' ? 'selected' : ''}>Entertainment</option>
      <option value="4" ${selectedCategory === '4' ? 'selected' : ''}>Shopping</option>
      <option value="5" ${selectedCategory === '5' ? 'selected' : ''}>Bills & Utilities</option>
    </select>
  `;
  grid.appendChild(categoryGroup);

  // Asset filter
  const assetGroup = document.createElement('div');
  assetGroup.className = 'form-control';
  assetGroup.innerHTML = `
    <label class="label" for="asset">
      <span class="label-text">Asset</span>
    </label>
    <select id="asset" name="asset" class="select select-bordered h-10 bg-base-200 focus:ring-2 focus:ring-accent focus:outline-none w-full">
      <option value="" ${!selectedAsset ? 'selected' : ''}>All Assets</option>
      <option value="1" ${selectedAsset === '1' ? 'selected' : ''}>Cash</option>
      <option value="2" ${selectedAsset === '2' ? 'selected' : ''}>BCA Savings</option>
      <option value="3" ${selectedAsset === '3' ? 'selected' : ''}>Mandiri Checking</option>
      <option value="4" ${selectedAsset === '4' ? 'selected' : ''}>GoPay</option>
    </select>
  `;
  grid.appendChild(assetGroup);

  // Date From filter
  const dateFromGroup = document.createElement('div');
  dateFromGroup.className = 'form-control';
  dateFromGroup.innerHTML = `
    <label class="label" for="dateFrom">
      <span class="label-text">From Date</span>
    </label>
    <input
      type="date"
      id="dateFrom"
      name="dateFrom"
      value="${dateFrom}"
      class="input input-bordered h-10 bg-base-200 focus:ring-2 focus:ring-accent focus:outline-none w-full"
      max="${new Date().toISOString().split('T')[0]}"
    />
  `;
  grid.appendChild(dateFromGroup);

  // Date To filter
  const dateToGroup = document.createElement('div');
  dateToGroup.className = 'form-control';
  dateToGroup.innerHTML = `
    <label class="label" for="dateTo">
      <span class="label-text">To Date</span>
    </label>
    <input
      type="date"
      id="dateTo"
      name="dateTo"
      value="${dateTo}"
      class="input input-bordered h-10 bg-base-200 focus:ring-2 focus:ring-accent focus:outline-none w-full"
      max="${new Date().toISOString().split('T')[0]}"
    />
  `;
  grid.appendChild(dateToGroup);

  container.appendChild(grid);

  return container;
}

// Default
export const Default: StoryObj = {
  args: {
    searchQuery: '',
    selectedType: 'all',
  },
  render: (args) => createTransactionFilters(args),
};

// With Search
export const WithSearch: StoryObj = {
  args: {
    searchQuery: 'coffee',
    selectedType: 'all',
  },
  render: (args) => createTransactionFilters(args),
};

// Filtered by Type
export const FilteredByType: StoryObj = {
  args: {
    searchQuery: '',
    selectedType: 'expense',
  },
  render: (args) => createTransactionFilters(args),
};

// With Date Range
export const WithDateRange: StoryObj = {
  args: {
    searchQuery: '',
    selectedType: 'all',
    dateFrom: '2024-01-01',
    dateTo: '2024-01-31',
  },
  render: (args) => createTransactionFilters(args),
};

// Fully Filtered
export const FullyFiltered: StoryObj = {
  args: {
    searchQuery: 'groceries',
    selectedType: 'expense',
    selectedCategory: '1',
    selectedAsset: '2',
    dateFrom: '2024-01-01',
    dateTo: '2024-01-31',
  },
  render: (args) => createTransactionFilters(args),
};

// Mobile View
export const MobileView: StoryObj = {
  render: () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'w-[375px] border border-base-300 p-4 rounded-box';

    const label = document.createElement('p');
    label.className = 'text-sm font-medium text-base-content/60 mb-4';
    label.textContent = 'Mobile View (375px)';
    wrapper.appendChild(label);

    wrapper.appendChild(createTransactionFilters({}));

    return wrapper;
  },
};
