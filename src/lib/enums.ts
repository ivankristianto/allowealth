import { picklist, type InferOutput } from 'valibot';
import { AVAILABLE_CURRENCIES } from '@/lib/constants/currency';

/**
 * Shared enum definitions using Valibot
 * These are the single source of truth for all enum values
 */

// Currency enum (shared across Category and Transaction)
export const currencyEnum = picklist(AVAILABLE_CURRENCIES);
export type Currency = InferOutput<typeof currencyEnum>;

// Transaction type enum
export const transactionTypeEnum = picklist(['expense', 'income', 'transfer']);
export type TransactionType = InferOutput<typeof transactionTypeEnum>;

// Category type enum (same as transaction type)
export const categoryTypeEnum = picklist(['expense', 'income']);
export type CategoryType = InferOutput<typeof categoryTypeEnum>;

// Recurring template status enum
export const recurringTemplateStatusEnum = picklist(['active', 'paused', 'completed', 'cancelled']);
export type RecurringTemplateStatus = InferOutput<typeof recurringTemplateStatusEnum>;

// Recurring occurrence status enum
export const recurringOccurrenceStatusEnum = picklist(['pending', 'confirmed', 'skipped']);
export type RecurringOccurrenceStatus = InferOutput<typeof recurringOccurrenceStatusEnum>;
