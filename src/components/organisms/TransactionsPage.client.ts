/**
 * Transactions Page Client-Side Orchestrator
 *
 * Initializes client-side interactivity for the transactions page.
 * Follows the ToastContainer pattern - SSR provides initial HTML,
 * client-side takes over for dynamic updates.
 */

import { transactionFiltersStore, initFiltersFromSSR } from '@/lib/stores/transactionFiltersStore';
import {
  transactionsDataStore,
  initializeFromSSR,
  setLoading,
  setError,
  updateTransactions,
  updateSummary,
  removeTransaction,
  getCachedMonth,
  setCachedMonth,
  invalidateAllCache,
  filterCachedTransactions,
  paginateTransactions,
} from '@/lib/stores/transactionsDataStore';
import {
  fetchMonthTransactions,
  deleteTransaction,
  cancelPendingRequest,
} from '@/lib/api/transactionsApiClient';
import { addToast } from '@/lib/stores/toastStore';
import { formatMonthKey } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants/pagination';
import {
  renderTransactionList,
  renderSummaryCards,
  renderPagination,
  showLoadingState,
  hideLoadingState,
  animateRowRemoval,
} from './TransactionsRenderer.client';

// Debounce timer for search
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SEARCH_DEBOUNCE_MS = 300;

// Page size constant
const PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE;

// Track initialization to prevent duplicate event listeners
let initialized = false;

// Buffer for events received before initialization completes
const pendingFilterEvents: CustomEvent[] = [];

// Set up global event listener IMMEDIATELY at module load time
// This ensures we catch filterChange events even before initTransactionsPage() runs
window.addEventListener('filterChange', ((e: CustomEvent) => {
  // If not yet initialized, buffer the event
  if (!initialized) {
    pendingFilterEvents.push(e);
    return;
  }

  // Process the event
  processFilterChangeEvent(e);
}) as EventListener);

/**
 * Process a filterChange event
 */
function processFilterChangeEvent(e: CustomEvent): void {
  const { type, value } = e.detail;
  if (type === 'category') {
    handleCategoryFilterChange(value);
  } else if (type === 'category_ids') {
    handleCategoryIdsFilterChange(value as string[]);
  } else if (type === 'month') {
    handleMonthFilterChange(value);
  }
}

interface SSRData {
  transactions: import('@/lib/types/transaction').TransactionOutput[];
  pagination: import('@/lib/stores/transactionsDataStore').PaginationState;
  summary: import('@/lib/stores/transactionsDataStore').SummaryState;
  filters: {
    type: 'income' | 'expense';
    search: string;
    category_id: string;
    category_ids: string[];
    month: string;
    page: number;
  };
  categories: import('@/lib/stores/transactionsDataStore').Category[];
  availableMonths: import('@/lib/stores/transactionsDataStore').AvailableMonth[];
  currency: 'IDR' | 'USD';
  currentMonth: string;
}

/**
 * Validate SSR data structure
 */
function isValidSSRData(data: unknown): data is SSRData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.transactions) &&
    d.pagination !== null &&
    typeof d.pagination === 'object' &&
    d.summary !== null &&
    typeof d.summary === 'object' &&
    d.filters !== null &&
    typeof d.filters === 'object' &&
    Array.isArray(d.categories) &&
    Array.isArray(d.availableMonths) &&
    (d.currency === 'IDR' || d.currency === 'USD')
  );
}

/**
 * Parse SSR data from the page container
 */
function parseSSRData(): SSRData | null {
  const container = document.getElementById('transactions-page');
  if (!container) return null;

  const ssrDataAttr = container.dataset.ssrData;
  if (!ssrDataAttr) return null;

  try {
    const parsed = JSON.parse(ssrDataAttr);
    if (!isValidSSRData(parsed)) {
      console.error('Invalid SSR data structure');
      addToast('Failed to load page data. Please refresh.', 'error');
      return null;
    }
    return parsed;
  } catch (e) {
    console.error('Failed to parse SSR data:', e);
    addToast('Failed to load page data. Please refresh.', 'error');
    return null;
  }
}

/**
 * Fetch and render transactions based on current filter state
 * Uses client-side cache when available to reduce API calls
 */
async function fetchAndRender(): Promise<void> {
  const filters = transactionFiltersStore.get();
  const currentMonth = filters.month;

  if (!currentMonth) {
    console.error('No month filter set');
    return;
  }

  // Check cache first
  const cached = getCachedMonth(currentMonth);

  if (cached) {
    // Use cached data - filter and paginate client-side
    renderFromCache(cached.transactions, cached.summary, filters);
    return;
  }

  // No cache - fetch from API
  setLoading(true);
  showLoadingState();

  try {
    const response = await fetchMonthTransactions(currentMonth);

    // Add periodLabel to summary
    const periodLabel = formatMonthKey(currentMonth);
    const summaryWithPeriod = {
      ...(response.summary || { income: 0, expenses: 0, transactionCount: 0 }),
      periodLabel,
    };

    // Cache the raw month data (before filtering)
    if (response.transactions.length > 0) {
      setCachedMonth(currentMonth, response.transactions, summaryWithPeriod);
    }

    hideLoadingState();

    // Apply filters and render
    renderFromCache(response.transactions, summaryWithPeriod, filters);
  } catch (error) {
    hideLoadingState();
    if (error instanceof Error && error.name !== 'AbortError') {
      setError(error.message);
      addToast(error.message || 'Failed to load transactions', 'error');
    }
  }
}

/**
 * Render transactions from cache (applies filters client-side)
 */
function renderFromCache(
  allTransactions: import('@/lib/types/transaction').TransactionOutput[],
  summary: import('@/lib/stores/transactionsDataStore').SummaryState,
  filters: ReturnType<typeof transactionFiltersStore.get>
): void {
  // Apply filters client-side
  const filtered = filterCachedTransactions(allTransactions, {
    type: filters.type,
    category_ids: filters.category_ids.length > 0 ? filters.category_ids : undefined,
    search: filters.search || undefined,
  });

  // Paginate
  const { transactions, total } = paginateTransactions(filtered, filters.page, PAGE_SIZE);

  // Update store
  updateTransactions({
    transactions,
    pagination: {
      total,
      limit: PAGE_SIZE,
      offset: (filters.page - 1) * PAGE_SIZE,
    },
  });

  // Summary is always from full month data (not filtered)
  updateSummary(summary);

  // Render
  const state = transactionsDataStore.get();
  renderTransactionList(state.transactions);
  renderSummaryCards(state.summary, state.currency);
  renderPagination(state.pagination);
}

/**
 * Handle type filter changes
 */
function handleTypeFilterChange(type: 'income' | 'expense'): void {
  transactionFiltersStore.setKey('type', type);
  transactionFiltersStore.setKey('page', 1);

  // Update URL
  updateUrl();

  // Update UI state for type buttons
  updateTypeFilterUI(type);

  fetchAndRender();
}

/**
 * Update type filter button UI
 */
function updateTypeFilterUI(activeType: string): void {
  const buttons = document.querySelectorAll('[data-filter-type]');
  buttons.forEach((btn) => {
    const btnType = btn.getAttribute('data-filter-type');
    const isActive = btnType === activeType;

    btn.setAttribute('aria-pressed', String(isActive));

    // Update classes
    btn.classList.toggle('bg-base-100', isActive);
    btn.classList.toggle('shadow', isActive);
    btn.classList.toggle('text-primary', isActive);
    btn.classList.toggle('text-base-content/50', !isActive);
    btn.classList.toggle('hover:text-base-content/70', !isActive);
  });
}

/**
 * Handle category filter changes (single)
 */
function handleCategoryFilterChange(categoryId: string): void {
  transactionFiltersStore.setKey('category_id', categoryId);
  transactionFiltersStore.setKey('category_ids', []);
  transactionFiltersStore.setKey('page', 1);
  updateUrl();
  fetchAndRender();
}

/**
 * Handle category filter changes (multi-select)
 */
function handleCategoryIdsFilterChange(categoryIds: string[]): void {
  transactionFiltersStore.setKey('category_ids', categoryIds);
  transactionFiltersStore.setKey('category_id', ''); // Clear single category
  transactionFiltersStore.setKey('page', 1);
  updateUrl();
  fetchAndRender();
}

/**
 * Handle month filter changes
 */
function handleMonthFilterChange(month: string): void {
  transactionFiltersStore.setKey('month', month);
  transactionFiltersStore.setKey('page', 1);
  updateUrl();
  updateMonthNavigationUI();
  fetchAndRender();
}

/**
 * Update month navigation button states
 */
function updateMonthNavigationUI(): void {
  const state = transactionsDataStore.get();
  const currentMonth = transactionFiltersStore.get().month;

  // Find current month index in available months
  const currentIndex = state.availableMonths.findIndex((m) => m.key === currentMonth);
  const totalMonths = state.availableMonths.length;

  const prevBtn = document.querySelector('[data-month-nav="prev"]');
  const nextBtn = document.querySelector('[data-month-nav="next"]');

  if (prevBtn) {
    const hasPrev = currentIndex > 0;
    prevBtn.setAttribute('data-has-prev', String(hasPrev));
    prevBtn.setAttribute('aria-disabled', String(!hasPrev));
    prevBtn.classList.toggle('opacity-30', !hasPrev);
    prevBtn.classList.toggle('cursor-not-allowed', !hasPrev);
    prevBtn.classList.toggle('pointer-events-none', !hasPrev);
  }

  if (nextBtn) {
    const hasNext = currentIndex >= 0 && currentIndex < totalMonths - 1;
    nextBtn.setAttribute('data-has-next', String(hasNext));
    nextBtn.setAttribute('aria-disabled', String(!hasNext));
    nextBtn.classList.toggle('opacity-30', !hasNext);
    nextBtn.classList.toggle('cursor-not-allowed', !hasNext);
    nextBtn.classList.toggle('pointer-events-none', !hasNext);
  }
}

/**
 * Handle search input changes (debounced)
 */
function handleSearchInput(searchValue: string): void {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  searchDebounceTimer = setTimeout(() => {
    transactionFiltersStore.setKey('search', searchValue);
    transactionFiltersStore.setKey('page', 1);
    updateUrl();
    fetchAndRender();
  }, SEARCH_DEBOUNCE_MS);
}

/**
 * Handle pagination
 */
function handlePageChange(page: number): void {
  const state = transactionsDataStore.get();
  if (page < 1 || page > state.pagination.totalPages) return;

  transactionFiltersStore.setKey('page', page);
  updateUrl();

  // Scroll to top of list
  const listCard = document.getElementById('transaction-list-card');
  if (listCard) {
    listCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  fetchAndRender();
}

/**
 * Handle transaction deletion
 */
async function handleDelete(transactionId: string, transactionDetails: string): Promise<void> {
  const dialog = document.getElementById('delete-dialog') as HTMLDialogElement | null;
  const deleteDetails = document.getElementById('delete-dialog-details');
  const deleteError = document.getElementById('delete-error');
  const confirmBtn = document.getElementById('confirm-delete-btn') as HTMLButtonElement | null;

  if (!dialog || !confirmBtn) return;

  // Store transaction ID on the button to prevent race conditions
  confirmBtn.setAttribute('data-pending-delete-id', transactionId);

  // Populate dialog details
  if (deleteDetails && transactionDetails) {
    try {
      const tx = JSON.parse(transactionDetails);
      const description = tx.description || tx.category?.name || '';
      const amount = parseFloat(tx.amount).toLocaleString();
      const currency = tx.currency || '';
      const date = new Date(tx.transaction_date).toLocaleDateString();

      deleteDetails.innerHTML = '';
      const list = document.createElement('dl');
      list.className = 'grid grid-cols-[auto_1fr] gap-2 text-sm';

      const items = [
        { label: 'Description:', value: description },
        { label: 'Amount:', value: `${currency} ${amount}` },
        { label: 'Date:', value: date },
      ];

      items.forEach(({ label, value }) => {
        const dt = document.createElement('dt');
        dt.className = 'font-semibold';
        dt.textContent = label;
        const dd = document.createElement('dd');
        dd.textContent = value;
        list.append(dt, dd);
      });

      deleteDetails.appendChild(list);
    } catch (e) {
      console.error('Failed to parse transaction details:', e);
    }
  }

  // Hide any previous error
  if (deleteError) {
    deleteError.classList.add('hidden');
    deleteError.textContent = '';
  }

  dialog.showModal();
}

/**
 * Execute the confirmed delete action
 */
async function executeDelete(confirmBtn: HTMLButtonElement): Promise<void> {
  const dialog = document.getElementById('delete-dialog') as HTMLDialogElement | null;
  const deleteError = document.getElementById('delete-error');

  // Get transaction ID from button attribute (prevents race conditions)
  const transactionId = confirmBtn.getAttribute('data-pending-delete-id');
  if (!transactionId || !dialog) return;

  try {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Deleting...';

    await deleteTransaction(transactionId);

    // Invalidate cache since data changed
    invalidateAllCache();

    // Optimistic UI update - animate row removal
    const row = document.querySelector(`[data-transaction-id="${transactionId}"]`);
    if (row) {
      await animateRowRemoval(row as HTMLElement);
    }

    // Update store
    removeTransaction(transactionId);

    // Re-render summary and pagination
    const state = transactionsDataStore.get();
    renderSummaryCards(state.summary, state.currency);
    renderPagination(state.pagination);

    // Close dialog
    dialog.close();

    // Show success toast
    addToast('Transaction deleted successfully', 'success');

    // If no more transactions on this page, go to previous page
    if (state.transactions.length === 0 && state.pagination.page > 1) {
      handlePageChange(state.pagination.page - 1);
    }
  } catch (error) {
    if (deleteError) {
      deleteError.textContent =
        error instanceof Error ? error.message : 'Failed to delete transaction';
      deleteError.classList.remove('hidden');
    }
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Delete Transaction';
    confirmBtn.removeAttribute('data-pending-delete-id');
  }
}

/**
 * Update URL with current filter state
 */
function updateUrl(): void {
  const filters = transactionFiltersStore.get();
  const url = new URL(window.location.href);

  // Clear all filter params
  ['type', 'search', 'category_id', 'category_ids', 'month', 'page'].forEach((key) => {
    url.searchParams.delete(key);
  });

  // Set active filters
  url.searchParams.set('type', filters.type);
  if (filters.search) url.searchParams.set('search', filters.search);
  if (filters.category_id) url.searchParams.set('category_id', filters.category_id);
  if (filters.category_ids && filters.category_ids.length > 0) {
    url.searchParams.set('category_ids', filters.category_ids.join(','));
  }
  if (filters.month) url.searchParams.set('month', filters.month);
  if (filters.page > 1) url.searchParams.set('page', String(filters.page));

  window.history.replaceState({}, '', url.toString());
}

/**
 * Handle browser back/forward navigation
 */
function handlePopState(): void {
  const url = new URL(window.location.href);
  const params = Object.fromEntries(url.searchParams.entries());

  // Parse category_ids from URL
  const categoryIdsParam = params.category_ids || '';
  const categoryIds = categoryIdsParam ? categoryIdsParam.split(',').filter(Boolean) : [];

  transactionFiltersStore.set({
    ...transactionFiltersStore.get(),
    type: (params.type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
    search: params.search || '',
    category_id: params.category_id || '',
    category_ids: categoryIds,
    month: params.month || '',
    page: parseInt(params.page || '1', 10),
  });

  // Update UI to reflect new state
  const filters = transactionFiltersStore.get();
  updateTypeFilterUI(filters.type);

  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  if (searchInput) searchInput.value = filters.search;

  const categoryInput = document.getElementById('category-filter') as HTMLInputElement | null;
  if (categoryInput) categoryInput.value = filters.category_ids.join(',');

  const monthInput = document.getElementById('month-filter') as HTMLInputElement | null;
  if (monthInput && filters.month) monthInput.value = filters.month;

  updateMonthNavigationUI();
  fetchAndRender();
}

/**
 * Set up event listeners
 */
function setupEventListeners(): void {
  // Type filter buttons
  document.querySelectorAll('[data-filter-type]').forEach((btn) => {
    btn.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const type = btn.getAttribute('data-filter-type') as 'income' | 'expense';
      handleTypeFilterChange(type);
    });
  });

  // filterChange events are handled by the global listener set up at module load time
  // This ensures events aren't lost if they fire before initialization completes

  // Month navigation buttons
  document.querySelectorAll('[data-month-nav]').forEach((btn) => {
    btn.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const direction = btn.getAttribute('data-month-nav');
      const state = transactionsDataStore.get();
      const currentMonth = transactionFiltersStore.get().month;

      // Find current month index in available months
      const currentIndex = state.availableMonths.findIndex((m) => m.key === currentMonth);
      const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

      if (newIndex >= 0 && newIndex < state.availableMonths.length) {
        const monthData = state.availableMonths[newIndex];
        // Update the label in the dropdown (display label, not key)
        const labelEl = document.querySelector('[data-month-label]');
        if (labelEl) labelEl.textContent = monthData.label;
        handleMonthFilterChange(monthData.key);
      }
    });
  });

  // Search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      handleSearchInput(value);
    });

    // Prevent form submission on Enter
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
    });
  }

  // Prevent form submission (we handle everything client-side)
  const filterForm = document.getElementById('transaction-filters-form');
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
    });
  }

  // Pagination buttons
  const prevBtn = document.querySelector('[data-pagination-prev]');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const page = transactionFiltersStore.get().page;
      handlePageChange(page - 1);
    });
  }

  const nextBtn = document.querySelector('[data-pagination-next]');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const page = transactionFiltersStore.get().page;
      handlePageChange(page + 1);
    });
  }

  // Delete buttons (use event delegation for dynamically rendered rows)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const deleteBtn = target.closest('[data-delete-transaction]');
    if (deleteBtn) {
      e.preventDefault();
      const transactionId = deleteBtn.getAttribute('data-delete-transaction');
      const transactionDetails = deleteBtn.getAttribute('data-transaction-details') || '';
      if (transactionId) {
        handleDelete(transactionId, transactionDetails);
      }
    }
  });

  // Confirm delete button in dialog
  const confirmDeleteBtn = document.getElementById(
    'confirm-delete-btn'
  ) as HTMLButtonElement | null;
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
      executeDelete(confirmDeleteBtn);
    });
  }

  // Reset filters button
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const resetBtn = target.closest('[data-reset-filters]') as HTMLElement | null;
    if (resetBtn) {
      e.preventDefault();

      // Get current month from the button's data attribute
      const currentMonth = resetBtn.dataset.currentMonth || '';

      transactionFiltersStore.set({
        type: 'expense',
        search: '',
        category_id: '',
        category_ids: [],
        payment_method_id: '',
        currency: '',
        start_date: '',
        end_date: '',
        page: 1,
        month: currentMonth,
      });

      // Reset UI
      const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
      if (searchInput) searchInput.value = '';

      const categoryInput = document.getElementById('category-filter') as HTMLInputElement | null;
      if (categoryInput) categoryInput.value = '';

      // Reset category dropdown UI
      const categoryLabel = document.querySelector('[data-category-label]');
      if (categoryLabel) categoryLabel.textContent = 'All Categories';

      // Reset month dropdown label
      const state = transactionsDataStore.get();
      const monthData = state.availableMonths.find((m) => m.key === currentMonth);
      if (monthData) {
        const monthLabel = document.querySelector('[data-month-label]');
        if (monthLabel) monthLabel.textContent = monthData.label;
      }

      updateTypeFilterUI('expense');
      updateUrl();
      fetchAndRender();
    }
  });

  // Browser back/forward
  window.addEventListener('popstate', handlePopState);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    cancelPendingRequest();
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
  });
}

/**
 * Initialize the transactions page
 */
export function initTransactionsPage(): void {
  // Prevent duplicate initialization (important for SPA navigation)
  if (initialized) {
    return;
  }
  initialized = true;

  // Parse and initialize from SSR data
  const ssrData = parseSSRData();
  if (ssrData) {
    initializeFromSSR(ssrData);
    initFiltersFromSSR(ssrData.filters);
    // Note: We don't cache SSR data because it's pre-filtered by type.
    // First filter interaction will fetch all month data and cache it.
  }

  // Set up event listeners
  setupEventListeners();

  // Process any filterChange events that were buffered before initialization
  while (pendingFilterEvents.length > 0) {
    const event = pendingFilterEvents.shift();
    if (event) {
      processFilterChangeEvent(event);
    }
  }

  // Announce to screen readers that the page is interactive
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  liveRegion.id = 'transactions-live-region';
  document.body.appendChild(liveRegion);
}
