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
      const afterLastComma = cleaned.substring(lastComma + 1);
      const commaCount = (cleaned.match(/,/g) || []).length;
      const hasDots = cleaned.includes('.');

      // When no dots are present, commas could be USD-style thousands separators.
      // Heuristic: multiple commas, or single comma with 3+ digits after (and no dots),
      // means commas are thousands separators (e.g., '12,000' or '1,000,000').
      // IDR has max 2 decimal places, so 3+ digits after comma is never a valid decimal.
      if (!hasDots && (commaCount > 1 || afterLastComma.length >= 3)) {
        cleaned = cleaned.replace(/,/g, '');
      } else {
        // Comma is decimal separator: remove dots (thousands), replace comma with dot
        const beforeDecimal = cleaned.substring(0, lastComma).replace(/\./g, '');
        cleaned = `${beforeDecimal}.${afterLastComma}`;
      }
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

/**
 * Format a value while user is typing.
 *
 * Preserves an in-progress decimal separator (e.g. "1.234," or "1,234.")
 * and applies grouping separators to the integer part.
 */
export function formatAmountForTyping(value: string, currency: Currency = 'IDR'): string {
  if (!value || value.trim() === '') return '';

  const meta = CURRENCY_META[currency];

  // Keep only number-relevant characters.
  let cleaned = value.replace(/[^\d.,\-]/g, '');
  if (!cleaned) return '';

  const isNegative = cleaned.startsWith('-');
  cleaned = cleaned.replace(/-/g, '');

  if (!cleaned) return '';

  let decimalIndex = -1;

  if (meta.decimalSeparator === '.') {
    decimalIndex = cleaned.lastIndexOf('.');
  } else {
    const commaIndex = cleaned.lastIndexOf(',');
    const hasComma = commaIndex !== -1;
    const hasDots = cleaned.includes('.');
    const commaCount = (cleaned.match(/,/g) || []).length;

    if (hasComma) {
      const digitsAfterComma = cleaned.length - commaIndex - 1;
      const treatCommaAsThousands =
        !hasDots && (commaCount > 1 || digitsAfterComma > meta.decimals);

      if (!treatCommaAsThousands) {
        decimalIndex = commaIndex;
      }
    } else {
      // Accept dot-decimal input on non-ID keyboard and normalize to locale separator.
      const dotCount = (cleaned.match(/\./g) || []).length;
      const dotIndex = cleaned.lastIndexOf('.');
      const digitsAfterDot = dotIndex !== -1 ? cleaned.length - dotIndex - 1 : 0;
      if (dotCount === 1 && digitsAfterDot <= meta.decimals) {
        decimalIndex = dotIndex;
      }
    }
  }

  const integerRaw =
    decimalIndex >= 0
      ? cleaned.slice(0, decimalIndex).replace(/[^\d]/g, '')
      : cleaned.replace(/[^\d]/g, '');
  const fractionRaw =
    decimalIndex >= 0
      ? cleaned
          .slice(decimalIndex + 1)
          .replace(/[^\d]/g, '')
          .slice(0, meta.decimals)
      : '';

  const groupedInteger = integerRaw
    .replace(/^0+(?=\d)/, '')
    .replace(/\B(?=(\d{3})+(?!\d))/g, meta.thousandsSeparator);

  const safeInteger = groupedInteger || (decimalIndex >= 0 ? '0' : '');
  let result = safeInteger;

  if (decimalIndex >= 0) {
    result += `${meta.decimalSeparator}${fractionRaw}`;
  }

  if (isNegative && result) {
    result = `-${result}`;
  }

  return result;
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

  function handleInput() {
    const before = input.value;
    const caret = input.selectionStart ?? before.length;
    const formatted = formatAmountForTyping(before, currentCurrency);

    if (formatted !== before) {
      input.value = formatted;
      const nextCaret = Math.max(0, caret + (formatted.length - before.length));
      input.setSelectionRange(nextCaret, nextCaret);
    }
  }

  function handleBlur() {
    const formatted = formatAmountForDisplay(input.value, currentCurrency);
    if (formatted) {
      input.value = formatted;
    }
  }

  input.addEventListener('input', handleInput);
  input.addEventListener('blur', handleBlur);

  // Format the initial value if present
  if (input.value) {
    input.value = formatAmountForTyping(input.value, currentCurrency);
  }

  return {
    cleanup: () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('blur', handleBlur);
    },
    updateCurrency: (newCurrency: Currency) => {
      currentCurrency = newCurrency;
      if (input.value) {
        input.value =
          document.activeElement === input
            ? formatAmountForTyping(input.value, currentCurrency)
            : formatAmountForDisplay(input.value, currentCurrency);
      }
    },
  };
}
