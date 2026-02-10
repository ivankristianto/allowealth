/**
 * Amount Input Formatting
 *
 * Format-on-blur approach for amount inputs:
 * - On focus: show raw number for easy editing
 * - On blur: format with thousand separators via Intl.NumberFormat
 * - On submit: strip formatting before validation/API call
 *
 * Currency-aware: IDR uses '.' for thousands, USD uses ','
 *
 * @module lib/formatting/amount-input
 */

import { CURRENCY_META } from '@/lib/constants/currency';
import type { Currency } from '@/lib/constants/currency';

/**
 * Strip thousand separators and normalize decimal separator to '.'.
 *
 * Handles both IDR (thousands='.', decimal=',') and USD (thousands=',', decimal='.').
 * Returns a plain numeric string suitable for Number() parsing.
 */
export function stripAmountFormatting(value: string, currency: Currency = 'IDR'): string {
  if (!value || value.trim() === '') return '';

  const meta = CURRENCY_META[currency];
  let cleaned = value.trim();

  // Remove currency symbols and whitespace
  cleaned = cleaned.replace(/[^\d.,\-]/g, '');

  if (!cleaned) return '';

  // For currencies where thousands separator is '.' and decimal is ','
  // (e.g., IDR: 2.400.000,50 → 2400000.50)
  if (meta.thousandsSeparator === '.' && meta.decimalSeparator === ',') {
    // Find last comma — if it exists and has digits after it, treat as decimal
    const lastComma = cleaned.lastIndexOf(',');
    if (lastComma !== -1) {
      // Remove all dots (thousands), replace last comma with dot (decimal)
      const beforeDecimal = cleaned.substring(0, lastComma).replace(/\./g, '');
      const afterDecimal = cleaned.substring(lastComma + 1);
      cleaned = `${beforeDecimal}.${afterDecimal}`;
    } else {
      // No comma present — dots could be thousands separators OR a decimal point.
      // Heuristic: a single dot with 1-2 digits after it is a decimal point
      // (e.g., '2400000.50'), while multiple dots or a dot with 3+ digits
      // after it are thousands separators (e.g., '2.400.000').
      const dots = cleaned.match(/\./g);
      const lastDot = cleaned.lastIndexOf('.');
      const digitsAfterLastDot = lastDot !== -1 ? cleaned.length - lastDot - 1 : 0;

      if (dots && dots.length === 1 && digitsAfterLastDot <= 2) {
        // Single dot with 1-2 digits after → treat as decimal point
        // e.g., '2400000.50' → '2400000.50' (no change needed)
      } else {
        // Multiple dots or dot with 3+ digits → thousands separators
        cleaned = cleaned.replace(/\./g, '');
      }
    }
  } else {
    // For currencies where thousands separator is ',' and decimal is '.'
    // (e.g., USD: 2,400,000.50 → 2400000.50)
    cleaned = cleaned.replace(/,/g, '');
  }

  return cleaned;
}

/**
 * Format a numeric value with thousand separators for display.
 *
 * Uses Intl.NumberFormat for locale-aware formatting.
 * Returns empty string for empty/invalid input.
 */
export function formatAmountForDisplay(value: string, currency: Currency = 'IDR'): string {
  if (!value || value.trim() === '') return '';

  const stripped = stripAmountFormatting(value, currency);
  if (!stripped) return '';

  const num = Number(stripped);
  if (isNaN(num)) return value;

  const meta = CURRENCY_META[currency];

  // Use Intl.NumberFormat for proper locale-aware formatting
  const formatter = new Intl.NumberFormat(meta.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: meta.decimals,
    useGrouping: true,
  });

  return formatter.format(num);
}

/** Handle returned by attachAmountFormatter for cleanup and currency updates. */
export interface AmountFormatterHandle {
  /** Remove focus/blur event listeners from the input. */
  cleanup: () => void;
  /** Update the currency used for formatting (re-formats if input is not focused). */
  updateCurrency: (newCurrency: Currency) => void;
}

/**
 * Attach format-on-blur behavior to an amount input element.
 *
 * - On focus: strips formatting to show raw number
 * - On blur: formats with thousand separators
 * - Returns a handle with cleanup() and updateCurrency() methods
 */
export function attachAmountFormatter(
  input: HTMLInputElement,
  currency: Currency = 'IDR'
): AmountFormatterHandle {
  let currentCurrency = currency;

  function handleFocus() {
    const raw = stripAmountFormatting(input.value, currentCurrency);
    if (raw) {
      input.value = raw;
    }
  }

  function handleBlur() {
    const formatted = formatAmountForDisplay(input.value, currentCurrency);
    if (formatted) {
      input.value = formatted;
    }
  }

  input.addEventListener('focus', handleFocus);
  input.addEventListener('blur', handleBlur);

  // Format the initial value if present
  if (input.value) {
    input.value = formatAmountForDisplay(input.value, currentCurrency);
  }

  return {
    cleanup: () => {
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleBlur);
    },
    updateCurrency: (newCurrency: Currency) => {
      currentCurrency = newCurrency;
      // Re-format with new currency if not focused
      if (document.activeElement !== input && input.value) {
        input.value = formatAmountForDisplay(input.value, currentCurrency);
      }
    },
  };
}
