/**
 * Utility functions for transaction models
 *
 * Export all utilities for use in services and components
 */

// Currency utilities
export {
  parseCurrencyInput,
  convertCurrency,
  addCurrency,
  subtractCurrency,
  multiplyCurrency,
  divideCurrency,
} from './currency';

// Budget utilities
export {
  calculateBudgetStatus,
  getBudgetStatusClass,
  getBudgetStatusIcon,
  formatBudgetStatus,
  getBudgetProgressWidth,
  getBudgetProgressClass,
  getCategoryColor,
  calculateAllocationDistribution,
  isValidHexColor,
  sanitizeColor,
  type BudgetStatus,
  type BudgetStatusResult,
  type AllocationDistribution,
} from './budget';

// Date utilities
export {
  formatDate,
  formatMonthYear,
  formatPeriodLabel,
  formatDateTime,
  formatRelativeDate,
  isFutureDate,
  isPastDate,
  isToday,
  getStartOfDay,
  getEndOfDay,
  getStartOfMonth,
  getEndOfMonth,
  getDaysBetween,
  getCurrentDateISO,
  // Month key utilities (MM-YYYY format)
  parseMonthKey,
  parseMonthKeyToISO,
  formatMonthKey,
  createMonthKey,
  getCurrentMonthKey,
  extractAvailableMonths,
  type AvailableMonth,
} from './date';

// Transaction utilities
export {
  transformTransaction,
  safeParseAmount,
  type DrizzleTransactionResult,
} from './transaction';

// Recurring transaction utilities
export {
  calculateDueDate,
  shouldGenerateOccurrence,
  generateInstallmentDescription,
} from './recurring-dates';

// Decimal utilities
export {
  decimalMultiply,
  decimalDivide,
  decimalAdd,
  decimalSubtract,
  decimalRound,
  decimalCompare,
  decimalPercentage,
  decimalSum,
  decimalAverage,
  decimalIsZero,
  decimalIsPositive,
  decimalIsNegative,
  decimalAbs,
  decimalClamp,
} from './decimal';

// Error logging utilities
export { logError, sanitizeError, getSafeErrorMessage, type SanitizedError } from '@/lib/logger';

// Client-side utilities
export { debounce, throttle } from './client';
