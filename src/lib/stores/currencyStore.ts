import { atom } from 'nanostores';

export type Currency = 'IDR' | 'USD';

// Current selected currency
export const selectedCurrency = atom<Currency>('IDR');

/**
 * Set the selected currency
 */
export function setCurrency(currency: Currency): void {
  selectedCurrency.set(currency);
}

/**
 * Toggle between IDR and USD
 */
export function toggleCurrency(): void {
  const current = selectedCurrency.get();
  selectedCurrency.set(current === 'IDR' ? 'USD' : 'IDR');
}

/**
 * Get currency display label
 */
export function getCurrencyLabel(currency: Currency): string {
  return currency === 'IDR' ? 'IDR (Default)' : 'USD';
}
