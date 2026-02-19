/**
 * Shared TypeScript types for all transaction models
 *
 * These types are used by both backend services and frontend components
 *
 * IMPORTANT: Input/Update types are now exported from @/lib/validation
 * to maintain a single source of truth. Filter types are also from validation.
 */

// Categories
export type { Category, CategoryOutput, CategoryBudgetStatus, CategoryType } from './category';

// Shared enums
export type { Currency } from '@/lib/enums';

// Transactions
export type { Transaction, TransactionOutput, TransactionSummary } from './transaction';
export type { TransactionType } from './transaction';

// Accounts
export type {
  Account,
  AccountOutput,
  AccountHistory,
  AccountHistoryOutput,
  AccountSummaryByCurrency,
  AccountSummaryByType,
} from './account';
export type { AccountType } from './account';
export { formatAccountType, getAccountTypeLabel, ACCOUNT_TYPE_LABELS } from './account';

// Re-export Input/Update/Filter types from validation (single source of truth)
export type { CreateCategoryInput, UpdateCategoryInput, CategoryFilter } from '@/lib/validation';

export type {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilter,
} from '@/lib/validation';
