import { z } from 'zod';

/**
 * Shared enum definitions using Zod
 * These are the single source of truth for all enum values
 */

// Currency enum (shared across Category and Transaction)
export const currencyEnum = z.enum(['IDR', 'USD']);
export type Currency = z.infer<typeof currencyEnum>;

// Transaction type enum
export const transactionTypeEnum = z.enum(['expense', 'income', 'transfer']);
export type TransactionType = z.infer<typeof transactionTypeEnum>;

// Category type enum (same as transaction type)
export const categoryTypeEnum = z.enum(['expense', 'income']);
export type CategoryType = z.infer<typeof categoryTypeEnum>;

// Payment method type enum
export const paymentMethodTypeEnum = z.enum([
  'cash',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'e_wallet',
]);
export type PaymentMethodType = z.infer<typeof paymentMethodTypeEnum>;
