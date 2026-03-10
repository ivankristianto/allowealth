import { picklist, type BaseIssue, type BaseSchema, type InferOutput } from 'valibot';
import { z } from 'zod';
import { AVAILABLE_CURRENCIES } from '@/lib/constants/currency';

/**
 * Shared enum definitions using Valibot
 * These are the single source of truth for all enum values
 */

type EnumValues = readonly [string, ...string[]];

function createCompatibleEnumSchema<const TValues extends EnumValues>(values: TValues) {
  const valibotSchema = picklist(values);
  const zodSchema = z.enum(values);

  return Object.assign(zodSchema, {
    '~run': valibotSchema['~run'],
    '~standard': valibotSchema['~standard'],
    '~types': valibotSchema['~types'],
  }) as typeof zodSchema & BaseSchema<TValues[number], TValues[number], BaseIssue<unknown>>;
}

// Currency enum (shared across Category and Transaction)
export const currencyEnum = createCompatibleEnumSchema(AVAILABLE_CURRENCIES);
export type Currency = InferOutput<typeof currencyEnum>;

// Transaction type enum
export const transactionTypeEnum = createCompatibleEnumSchema(['expense', 'income', 'transfer']);
export type TransactionType = InferOutput<typeof transactionTypeEnum>;

// Category type enum (same as transaction type)
export const categoryTypeEnum = createCompatibleEnumSchema(['expense', 'income']);
export type CategoryType = InferOutput<typeof categoryTypeEnum>;

// Recurring template status enum
export const recurringTemplateStatusEnum = createCompatibleEnumSchema([
  'active',
  'paused',
  'completed',
  'cancelled',
]);
export type RecurringTemplateStatus = InferOutput<typeof recurringTemplateStatusEnum>;

// Recurring occurrence status enum
export const recurringOccurrenceStatusEnum = createCompatibleEnumSchema([
  'pending',
  'confirmed',
  'skipped',
]);
export type RecurringOccurrenceStatus = InferOutput<typeof recurringOccurrenceStatusEnum>;
