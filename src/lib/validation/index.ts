/**
 * Validation schemas for all transaction models
 *
 * Export all Zod schemas for use in services and API endpoints
 */

// Shared enums (export once from central location)
export {
  currencyEnum,
  transactionTypeEnum,
  categoryTypeEnum,
  paymentMethodTypeEnum,
  type Currency,
  type TransactionType,
  type CategoryType,
  type PaymentMethodType,
} from '@/lib/enums';

// Categories
export {
  createCategorySchema,
  updateCategorySchema,
  createCategoryAPISchema,
  updateCategoryAPISchema,
  categoryFilterSchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type CategoryFilter,
} from './categories';

// Payment Methods
export {
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
  createPaymentMethodAPISchema,
  updatePaymentMethodAPISchema,
  paymentMethodFilterSchema,
  type CreatePaymentMethodInput,
  type UpdatePaymentMethodInput,
  type PaymentMethodFilter,
} from './payment-methods';

// Transactions
export {
  createTransactionSchema,
  updateTransactionSchema,
  createTransactionAPISchema,
  updateTransactionAPISchema,
  transactionFilterSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
  type TransactionFilter,
} from './transactions';
