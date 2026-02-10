/**
 * Currency Constants
 *
 * Centralized currency configuration for the application.
 *
 * To add a new currency:
 * 1. Add the currency code to `AVAILABLE_CURRENCIES` array
 * 2. Add currency metadata to `CURRENCY_META` object
 * 3. Add currency option to `CURRENCY_OPTIONS` array
 * 4. Update server-side validation in `src/services/user.service.ts` updateSettingsSchema
 * 5. Update Zod enum to include new currency: `z.enum(['IDR', 'USD', 'EUR', ...])`
 *
 * @module lib/constants/currency
 */

/**
 * Available currency codes in the application.
 *
 * To add a new currency:
 * 1. Add the 3-letter ISO 4217 currency code to this array
 * 2. Add metadata to `CURRENCY_META` below
 * 3. Add option to `CURRENCY_OPTIONS` below
 * 4. Update server-side validation in `src/services/user.service.ts`
 *
 * @readonly
 */
export const AVAILABLE_CURRENCIES = ['IDR', 'USD'] as const;

/**
 * Currency type derived from available currencies.
 *
 * Use this type for type-safe currency handling throughout the app.
 *
 * @example
 * ```ts
 * function formatAmount(amount: number, currency: Currency): string {
 *   // ...
 * }
 * ```
 */
export type Currency = (typeof AVAILABLE_CURRENCIES)[number];

// ==================== TYPES ====================

/**
 * Currency metadata information.
 */
export interface CurrencyInfo {
  /** ISO 4217 currency code */
  code: Currency;
  /** Currency symbol */
  symbol: string;
  /** Locale for formatting */
  locale: string;
  /** Full currency name */
  name: string;
  /** Number of decimal places */
  decimals: 0 | 1 | 2;
  /** Position of currency symbol */
  symbolPosition: 'before' | 'after';
  /** Thousands separator character */
  thousandsSeparator: string;
  /** Decimal separator character */
  decimalSeparator: string;
  /** Flag emoji for visual display */
  flagEmoji: string;
}

/**
 * Currency option type for select dropdowns.
 *
 * Used in form selects and UI components.
 */
export interface CurrencyOption {
  /** Currency code (ISO 4217) */
  value: Currency;
  /** Display label (e.g., "IDR - Indonesian Rupiah") */
  label: string;
  /** Currency symbol */
  symbol: string;
}

/**
 * Currency symbol position type.
 */
export type CurrencySymbolPosition = 'before' | 'after';

// ==================== CONSTANTS ====================

/**
 * Currency metadata for display and formatting.
 *
 * Contains information about each supported currency including
 * symbol, name, decimal places, and display formatting rules.
 *
 * To add a new currency, add an entry with:
 * - code: ISO 4217 currency code (must match AVAILABLE_CURRENCIES)
 * - symbol: Currency symbol (e.g., '$', '€', '£')
 * - name: Full currency name for display
 * - decimals: Number of decimal places for formatting
 * - symbolPosition: 'before' or 'after' the amount
 * - thousandsSeparator: Character for thousands grouping
 * - decimalSeparator: Character for decimal point
 *
 * @readonly
 */
export const CURRENCY_META = {
  IDR: {
    code: 'IDR' as const,
    symbol: 'Rp',
    locale: 'id-ID',
    name: 'Indonesian Rupiah',
    decimals: 2,
    symbolPosition: 'before' as const,
    thousandsSeparator: '.',
    decimalSeparator: ',',
    flagEmoji: '🇮🇩',
  },
  USD: {
    code: 'USD' as const,
    symbol: '$',
    locale: 'en-US',
    name: 'US Dollar',
    decimals: 2,
    symbolPosition: 'before' as const,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    flagEmoji: '🇺🇸',
  },
} as const satisfies Record<Currency, CurrencyInfo>;

/**
 * Currency options for form select dropdowns.
 *
 * This array is used to generate currency select options in the UI.
 * The order determines the display order in dropdowns.
 *
 * To add a new currency, add an option following the existing pattern.
 * The `value` must match a key in `CURRENCY_META` and an entry in `AVAILABLE_CURRENCIES`.
 *
 * @readonly
 */
export const CURRENCY_OPTIONS: readonly CurrencyOption[] = [
  {
    value: 'IDR',
    label: 'IDR - Indonesian Rupiah',
    symbol: 'Rp',
  },
  {
    value: 'USD',
    label: 'USD - US Dollar',
    symbol: '$',
  },
] as const;

/**
 * Default currency for new users and forms.
 *
 * Change this to set a different default currency.
 */
export const DEFAULT_CURRENCY: Currency = 'IDR';

// ==================== FUNCTIONS ====================

/**
 * Type guard to check if a string is a valid currency code.
 *
 * @param code - String to check
 * @returns true if the string is a valid currency code
 *
 * @example
 * ```ts
 * if (isValidCurrency(userInput)) {
 *   // userInput is typed as Currency
 * }
 * ```
 */
export function isValidCurrency(code: string): code is Currency {
  return AVAILABLE_CURRENCIES.includes(code as Currency);
}

/**
 * Get currency metadata by code.
 *
 * @param code - Currency code
 * @returns Currency metadata or undefined if not found
 *
 * @example
 * ```ts
 * const usdInfo = getCurrencyMeta('USD');
 * console.log(usdInfo.symbol); // '$'
 * ```
 */
export function getCurrencyMeta(code: Currency): CurrencyInfo {
  return CURRENCY_META[code];
}
