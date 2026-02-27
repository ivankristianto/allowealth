import { z } from 'zod';
import { currencyEnum, transactionTypeEnum } from '@/lib/enums';

/**
 * Validation schemas for Transaction operations
 */

// Re-export enums from shared location for convenience
export { currencyEnum, transactionTypeEnum };

// Validation for transaction ID (nanoid format)
export const transactionIdSchema = z
  .string()
  .min(1, 'Transaction ID is required')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid transaction ID format');

// Common validation for amount
const amountValidation = z
  .string()
  .min(1, 'Amount is required')
  .refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: 'Amount must be greater than 0' }
  );

// Common validation for transaction date (from Date object)
const transactionDateValidation = z.date().refine((date) => date <= new Date(), {
  message: 'Transaction date cannot be in the future',
});

const transactionDateWithoutFutureValidation = z.date();

function buildCreateTransactionSchema(transactionDateSchema: z.ZodType<Date>) {
  return z
    .object({
      workspace_id: z.string().min(1, 'Workspace ID is required'),
      created_by_user_id: z.string().min(1, 'Created by user ID is required'),
      type: transactionTypeEnum,
      amount: amountValidation,
      currency: currencyEnum,
      category_id: z.string().min(1, 'Category ID is required').optional(), // Optional for transfers
      account_id: z.string().min(1, 'Account ID is required'),
      to_account_id: z.string().min(1, 'Destination account ID is required').optional(), // For transfers
      transaction_date: transactionDateSchema.default(() => new Date()),
      description: z.string().max(500, 'Description must not exceed 500 characters').optional(),
    })
    .strict()
    .refine(
      (data) => {
        // For transfers, to_account_id is required
        if (data.type === 'transfer') {
          return !!data.to_account_id;
        }
        return true;
      },
      { message: 'Destination account is required for transfers', path: ['to_account_id'] }
    )
    .refine(
      (data) => {
        // For expense/income, category_id is required
        if (data.type !== 'transfer') {
          return !!data.category_id;
        }
        return true;
      },
      { message: 'Category is required for expense/income transactions', path: ['category_id'] }
    );
}

// Schema for creating a transaction (for service layer)
export const createTransactionSchema = buildCreateTransactionSchema(transactionDateValidation);
export const createTransactionSchemaNoFutureDate = buildCreateTransactionSchema(
  transactionDateWithoutFutureValidation
);

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// Schema for updating a transaction (for service layer)
export const updateTransactionSchema = z
  .object({
    type: transactionTypeEnum.optional(),
    amount: amountValidation.optional(),
    currency: currencyEnum.optional(),
    category_id: z.string().min(1, 'Category ID is required').optional(),
    account_id: z.string().min(1, 'Account ID is required').optional(),
    to_account_id: z.string().min(1, 'Destination account ID is required').optional().nullable(),
    transaction_date: transactionDateValidation.optional(),
    description: z.string().max(500, 'Description must not exceed 500 characters').optional(),
  })
  .strict();

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

// API-specific schemas that accept date strings (YYYY-MM-DD format)
// The form sends date-only strings, which are then converted to Date objects in the API handler
const dateStringValidation = z
  .string()
  .min(1, 'Transaction date is required')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine(
    (dateStr) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) && date <= new Date();
    },
    { message: 'Invalid date or date cannot be in the future' }
  );

export const createTransactionAPISchema = z
  .object({
    type: transactionTypeEnum,
    amount: amountValidation,
    currency: currencyEnum,
    category_id: z.string().min(1, 'Category ID is required').optional(),
    account_id: z.string().min(1, 'Account ID is required'),
    to_account_id: z.string().min(1, 'Destination account ID is required').optional(),
    transaction_date: dateStringValidation,
    description: z.string().max(500, 'Description must not exceed 500 characters').optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.type === 'transfer') {
        return !!data.to_account_id;
      }
      return true;
    },
    { message: 'Destination account is required for transfers', path: ['to_account_id'] }
  )
  .refine(
    (data) => {
      if (data.type !== 'transfer') {
        return !!data.category_id;
      }
      return true;
    },
    { message: 'Category is required for expense/income transactions', path: ['category_id'] }
  );

export const updateTransactionAPISchema = z
  .object({
    type: transactionTypeEnum.optional(),
    amount: amountValidation.optional(),
    currency: currencyEnum.optional(),
    category_id: z.string().min(1, 'Category ID is required').optional(),
    account_id: z.string().min(1, 'Account ID is required').optional(),
    to_account_id: z.string().min(1, 'Destination account ID is required').optional().nullable(),
    transaction_date: dateStringValidation.optional(),
    description: z.string().max(500, 'Description must not exceed 500 characters').optional(),
  })
  .strict();

// Schema for transaction filters
export const transactionFilterSchema = z
  .object({
    type: transactionTypeEnum.optional(),
    category_id: z.string().optional(),
    account_id: z.string().optional(),
    currency: currencyEnum.optional(),
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .optional(),
    offset: z.coerce.number().int().min(0, 'Offset must be non-negative').optional(),
  })
  .refine(
    (data) => {
      // If both dates are provided, ensure end_date is after start_date
      if (data.start_date && data.end_date) {
        return data.end_date >= data.start_date;
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['end_date'],
    }
  );

export type TransactionFilter = z.infer<typeof transactionFilterSchema>;
