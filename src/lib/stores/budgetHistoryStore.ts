import { atom, computed } from 'nanostores';

/**
 * Budget History Store
 *
 * Client-side state management for the budget history page.
 * Uses Nano Stores for reactive state.
 */

export type HistoryViewMode = 'monthly' | 'trends';

export interface BudgetHistoryState {
  selectedYear: number;
  isLoading: boolean;
  availableYears: number[];
  currency: Currency;
  viewMode: HistoryViewMode;
  monthRange: 3 | 6 | 12;
}

// Individual atoms for granular reactivity
export const selectedYear = atom<number>(new Date().getFullYear());
export const isLoading = atom<boolean>(false);
export const availableYears = atom<number[]>([]);
export const currency = atom<Currency>('IDR');
export const viewMode = atom<HistoryViewMode>('monthly');
export const monthRange = atom<3 | 6 | 12>(6);

// Computed value for checking if current year is selected
export const isCurrentYear = computed(selectedYear, (year) => year === new Date().getFullYear());

/**
 * Initialize the store with SSR data
 */
export function initBudgetHistoryStore(data: Partial<BudgetHistoryState>): void {
  if (data.selectedYear !== undefined) {
    selectedYear.set(data.selectedYear);
  }
  if (data.availableYears !== undefined) {
    availableYears.set(data.availableYears);
  }
  if (data.currency !== undefined) {
    currency.set(data.currency);
  }
  if (data.viewMode !== undefined) {
    viewMode.set(data.viewMode);
  }
  if (data.monthRange !== undefined) {
    monthRange.set(data.monthRange);
  }
  // Always reset loading state on init
  isLoading.set(false);
}

/**
 * Set the selected year and trigger fetch
 */
export function setSelectedYear(year: number): void {
  if (availableYears.get().includes(year)) {
    selectedYear.set(year);
  }
}

/**
 * Set loading state
 */
export function setLoading(loading: boolean): void {
  isLoading.set(loading);
}

/**
 * Set the view mode (monthly overview or category trends)
 */
export function setViewMode(mode: HistoryViewMode): void {
  viewMode.set(mode);
}

/**
 * Set the month range for trends view
 */
export function setMonthRange(range: 3 | 6 | 12): void {
  monthRange.set(range);
}

/**
 * Get the current state as an object
 */
export function getState(): BudgetHistoryState {
  return {
    selectedYear: selectedYear.get(),
    isLoading: isLoading.get(),
    availableYears: availableYears.get(),
    currency: currency.get(),
    viewMode: viewMode.get(),
    monthRange: monthRange.get(),
  };
}
