import { z } from 'zod';
import { AVAILABLE_CURRENCIES } from '@/lib/constants/currency';

/**
 * Shared enum definitions using Zod
 * These are the single source of truth for all enum values
 */

// Currency enum (shared across Category and Transaction)
export const currencyEnum = z.enum(AVAILABLE_CURRENCIES);
export type Currency = z.infer<typeof currencyEnum>;

// Transaction type enum
export const transactionTypeEnum = z.enum(['expense', 'income', 'transfer']);
export type TransactionType = z.infer<typeof transactionTypeEnum>;

// Category type enum (same as transaction type)
export const categoryTypeEnum = z.enum(['expense', 'income']);
export type CategoryType = z.infer<typeof categoryTypeEnum>;

// Recurring template status enum
export const recurringTemplateStatusEnum = z.enum(['active', 'paused', 'completed', 'cancelled']);
export type RecurringTemplateStatus = z.infer<typeof recurringTemplateStatusEnum>;

// Recurring occurrence status enum
export const recurringOccurrenceStatusEnum = z.enum(['pending', 'confirmed', 'skipped']);
export type RecurringOccurrenceStatus = z.infer<typeof recurringOccurrenceStatusEnum>;
