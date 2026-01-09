/**
 * Shared TypeScript types for all transaction models
 *
 * These types are used by both backend services and frontend components
 *
 * IMPORTANT: Input/Update types are now exported from @/lib/validation
 * to maintain a single source of truth. Filter types are also from validation.
 */

// Categories
export type { Category, CategoryOutput, CategoryBudgetStatus } from './category';
export type { CategoryType, Currency } from './category';

// Payment Methods
export type { PaymentMethod, PaymentMethodOutput } from './payment-method';
export type { PaymentMethodType } from './payment-method';

// Transactions
export type { Transaction, TransactionOutput, TransactionSummary } from './transaction';
export type { TransactionType } from './transaction';

// Re-export Input/Update/Filter types from validation (single source of truth)
export type { CreateCategoryInput, UpdateCategoryInput, CategoryFilter } from '@/lib/validation';

export type {
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput,
  PaymentMethodFilter,
} from '@/lib/validation';

export type {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilter,
} from '@/lib/validation';
