import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Organisms/TransactionFiltersBar',
  tags: ['autodocs'],
  argTypes: {
    typeFilter: {
      control: 'select',
      options: ['income', 'expense'],
      description: 'Current type filter',
    },
    searchValue: {
      control: 'text',
      description: 'Current search query',
    },
    categoryIds: {
      control: 'object',
      description: 'Selected category IDs',
    },
    showCategoryFilter: {
      control: 'boolean',
      description: 'Show category dropdown',
    },
    monthSelector: {
      control: 'boolean',
      description: 'Show month selector',
    },
    selectedMonth: {
      control: 'text',
      description: 'Currently selected month (YYYY-MM)',
    },
  },
};

export default meta;

// HTML escape helper to prevent XSS
const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// Attribute escape helper (also escapes quotes)
const escapeAttr = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// SVG icons
const searchIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current text-base-content/40"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
const chevronLeftIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current"><path d="m15 18-6-6 6-6"/></svg>`;
const chevronRightIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current"><path d="m9 18 6-6-6-6"/></svg>`;
const chevronDownIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current text-base-content/40 shrink-0"><path d="m6 9 6 6 6-6"/></svg>`;
const tagIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current text-base-content/40"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>`;
const calendarIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current text-base-content/40"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`;
const resetIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stroke-current"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;

interface Category {
  id: string;
  name: string;
  type: string;
}

interface TransactionFiltersBarArgs {
  typeFilter?: 'income' | 'expense';
  searchValue?: string;
  categoryIds?: string[];
  categories?: Category[];
  showCategoryFilter?: boolean;
  monthSelector?: boolean;
  availableMonths?: Array<{ key: string; label: string }>;
  selectedMonth?: string;
  currentMonth?: string;
  hasActiveFilters?: boolean;
}

const createTransactionFiltersBar = (args: TransactionFiltersBarArgs): HTMLElement => {
  const {
    typeFilter = 'expense',
    searchValue = '',
    categoryIds = [],
    categories = [],
    showCategoryFilter = true,
    monthSelector = true,
    availableMonths = [
      { key: '2024-01', label: 'January 2024' },
      { key: '2023-12', label: 'December 2023' },
      { key: '2023-11', label: 'November 2023' },
    ],
    selectedMonth = '2024-01',
    hasActiveFilters = false,
  } = args;

  const container = document.createElement('form');
  container.className = 'flex flex-col xl:flex-row items-center gap-4 xl:gap-6 justify-between';
  container.setAttribute('role', 'search');
  container.setAttribute('aria-label', 'Filter transactions');

  // Get category label (escaped for XSS prevention)
  const getCategoryLabel = (): string => {
    if (categoryIds.length === 0) return 'All Categories';
    if (categoryIds.length === 1) {
      const cat = categories.find((c) => c.id === categoryIds[0]);
      return escapeHtml(cat?.name || 'All Categories');
    }
    return `${categoryIds.length} Categories`;
  };

  // Get month label (escaped for XSS prevention)
  const getMonthLabel = (): string => {
    const month = availableMonths.find((m) => m.key === selectedMonth);
    return escapeHtml(month?.label || 'January 2024');
  };

  // Filter categories by type
  const filteredCategories = categories.filter((cat) => cat.type === typeFilter);

  container.innerHTML = `
    <div class="flex flex-wrap items-center gap-4 w-full xl:w-auto">
      <!-- Type Filter -->
      <div class="flex bg-base-200 p-1 rounded-2xl" role="group" aria-label="Filter by transaction type">
        <a href="#" class="px-6 py-2.5 text-xs font-bold rounded-xl transition-all focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
          typeFilter === 'expense'
            ? 'bg-base-100 shadow text-primary'
            : 'text-base-content/50 hover:text-base-content/70'
        }" aria-pressed="${typeFilter === 'expense'}" role="button">
          Expenses
        </a>
        <a href="#" class="px-6 py-2.5 text-xs font-bold rounded-xl transition-all focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
          typeFilter === 'income'
            ? 'bg-base-100 shadow text-primary'
            : 'text-base-content/50 hover:text-base-content/70'
        }" aria-pressed="${typeFilter === 'income'}" role="button">
          Income
        </a>
      </div>

      ${
        showCategoryFilter && filteredCategories.length > 0
          ? `
        <!-- Category Filter -->
        <div class="dropdown">
          <button type="button" tabindex="0" class="flex items-center gap-2 px-4 py-3 text-xs font-bold border border-base-300 bg-base-100 text-base-content rounded-2xl shadow-sm hover:border-base-content/30 transition-colors min-w-[160px]" aria-label="Filter by category" aria-haspopup="listbox" aria-expanded="false">
            ${tagIcon}
            <span class="flex-1 text-left truncate">${getCategoryLabel()}</span>
            ${chevronDownIcon}
          </button>
          <div tabindex="0" class="dropdown-content z-50 p-3 shadow-lg bg-base-100 rounded-2xl w-72 border border-base-300 mt-2" role="listbox" aria-multiselectable="true" aria-label="Select categories">
            <div class="space-y-1 max-h-52 overflow-y-auto">
              ${filteredCategories
                .map(
                  (cat) => `
                <label class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-base-200 ${categoryIds.includes(cat.id) ? 'bg-accent/10' : ''}">
                  <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${categoryIds.includes(cat.id) ? 'bg-accent border-accent' : 'border-base-300'}">
                    ${categoryIds.includes(cat.id) ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' : ''}
                  </div>
                  <span class="text-sm font-medium text-base-content truncate">${escapeHtml(cat.name)}</span>
                </label>
              `
                )
                .join('')}
            </div>
          </div>
        </div>
      `
          : ''
      }

      ${
        monthSelector && availableMonths.length > 0
          ? `
        <!-- Month Filter -->
        <div class="flex items-center gap-1">
          <button type="button" class="btn btn-ghost btn-square border border-base-300 bg-base-100 rounded-2xl transition-all active:scale-95 shadow-sm text-base-content/40 hover:text-primary hover:border-accent/30" aria-label="Previous month">
            ${chevronLeftIcon}
          </button>

          <div class="dropdown">
            <button type="button" tabindex="0" class="flex items-center gap-2 px-4 py-3 text-xs font-bold border border-base-300 bg-base-100 text-base-content rounded-2xl shadow-sm hover:border-base-content/30 transition-colors min-w-[120px]" aria-label="Select month">
              ${calendarIcon}
              <span class="flex-1 text-left">${getMonthLabel()}</span>
              ${chevronDownIcon}
            </button>
            <ul tabindex="0" class="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-2xl w-52 border border-base-300 mt-2 max-h-64 overflow-y-auto">
              ${availableMonths
                .map(
                  (month) => `
                <li>
                  <button type="button" class="text-xs font-medium ${month.key === selectedMonth ? 'bg-primary/10 text-primary' : ''}">
                    ${escapeHtml(month.label)}
                  </button>
                </li>
              `
                )
                .join('')}
            </ul>
          </div>

          <button type="button" class="btn btn-ghost btn-square border border-base-300 bg-base-100 rounded-2xl transition-all active:scale-95 shadow-sm text-base-content/40 hover:text-primary hover:border-accent/30" aria-label="Next month">
            ${chevronRightIcon}
          </button>
        </div>
      `
          : ''
      }
    </div>

    <div class="flex items-center gap-3 w-full xl:w-auto">
      <!-- Search Input -->
      <div class="relative flex-1 xl:w-64">
        <div class="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          ${searchIcon}
        </div>
        <label for="search-input" class="sr-only">Search activity</label>
        <input
          id="search-input"
          type="search"
          name="search"
          value="${escapeAttr(searchValue)}"
          placeholder="Search activity..."
          class="input w-full pl-11 pr-4 py-3 bg-base-100 border border-base-300 rounded-2xl text-sm font-medium shadow-sm placeholder:text-base-content/40 focus:outline-none focus:border-accent"
        />
      </div>

      <!-- Reset Filters Button -->
      <button type="button" class="btn btn-ghost btn-sm gap-2 text-base-content/60 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors shrink-0 ${hasActiveFilters ? '' : 'hidden'}" aria-label="Reset filters">
        ${resetIcon}
        <span class="hidden sm:inline">Reset</span>
      </button>
    </div>
  `;

  return container;
};

// Sample categories
const sampleCategories: Category[] = [
  { id: '1', name: 'Groceries', type: 'expense' },
  { id: '2', name: 'Dining Out', type: 'expense' },
  { id: '3', name: 'Transportation', type: 'expense' },
  { id: '4', name: 'Entertainment', type: 'expense' },
  { id: '5', name: 'Utilities', type: 'expense' },
  { id: '6', name: 'Healthcare', type: 'expense' },
  { id: '7', name: 'Salary', type: 'income' },
  { id: '8', name: 'Freelance', type: 'income' },
  { id: '9', name: 'Investments', type: 'income' },
];

export const Default: StoryObj = {
  args: {
    typeFilter: 'expense',
    searchValue: '',
    categoryIds: [],
    categories: sampleCategories,
    showCategoryFilter: true,
    monthSelector: true,
    selectedMonth: '2024-01',
    hasActiveFilters: false,
  },
  render: (args) => createTransactionFiltersBar(args as TransactionFiltersBarArgs),
};

export const WithSearchValue: StoryObj = {
  args: {
    typeFilter: 'expense',
    searchValue: 'grocery',
    categoryIds: [],
    categories: sampleCategories,
    showCategoryFilter: true,
    monthSelector: true,
    selectedMonth: '2024-01',
    hasActiveFilters: true,
  },
  render: (args) => createTransactionFiltersBar(args as TransactionFiltersBarArgs),
};

export const WithSelectedCategories: StoryObj = {
  args: {
    typeFilter: 'expense',
    searchValue: '',
    categoryIds: ['1', '2'],
    categories: sampleCategories,
    showCategoryFilter: true,
    monthSelector: true,
    selectedMonth: '2024-01',
    hasActiveFilters: true,
  },
  render: (args) => createTransactionFiltersBar(args as TransactionFiltersBarArgs),
};

export const IncomeFilter: StoryObj = {
  args: {
    typeFilter: 'income',
    searchValue: '',
    categoryIds: [],
    categories: sampleCategories,
    showCategoryFilter: true,
    monthSelector: true,
    selectedMonth: '2024-01',
    hasActiveFilters: true,
  },
  render: (args) => createTransactionFiltersBar(args as TransactionFiltersBarArgs),
};

export const NoCategoryFilter: StoryObj = {
  args: {
    typeFilter: 'expense',
    searchValue: '',
    categoryIds: [],
    categories: [],
    showCategoryFilter: false,
    monthSelector: true,
    selectedMonth: '2024-01',
    hasActiveFilters: false,
  },
  render: (args) => createTransactionFiltersBar(args as TransactionFiltersBarArgs),
};

export const NoMonthSelector: StoryObj = {
  args: {
    typeFilter: 'expense',
    searchValue: '',
    categoryIds: [],
    categories: sampleCategories,
    showCategoryFilter: true,
    monthSelector: false,
    selectedMonth: '',
    hasActiveFilters: false,
  },
  render: (args) => createTransactionFiltersBar(args as TransactionFiltersBarArgs),
};

export const AllFiltersActive: StoryObj = {
  args: {
    typeFilter: 'income',
    searchValue: 'freelance',
    categoryIds: ['8'],
    categories: sampleCategories,
    showCategoryFilter: true,
    monthSelector: true,
    selectedMonth: '2023-12',
    hasActiveFilters: true,
  },
  render: (args) => createTransactionFiltersBar(args as TransactionFiltersBarArgs),
};
