import { z } from 'zod';
import { currencyEnum } from './categories';

/**
 * Validation schemas for Transaction operations
 */

// Common enums
export const transactionTypeEnum = z.enum(['expense', 'income']);

// Schema for creating a transaction
export const createTransactionSchema = z
  .object({
    user_id: z.string().min(1, 'User ID is required'),
    type: transactionTypeEnum,
    amount: z
      .string()
      .min(1, 'Amount is required')
      .refine(
        (val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0;
        },
        { message: 'Amount must be greater than 0' }
      ),
    currency: currencyEnum,
    category_id: z.string().min(1, 'Category ID is required'),
    payment_method_id: z.string().min(1, 'Payment method ID is required'),
    transaction_date: z
      .date()
      .refine((date) => date <= new Date(), {
        message: 'Transaction date cannot be in the future',
      })
      .default(() => new Date()),
    description: z.string().max(500, 'Description must not exceed 500 characters').optional(),
  })
  .strict();

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// Schema for updating a transaction (all fields optional)
export const updateTransactionSchema = z
  .object({
    type: transactionTypeEnum.optional(),
    amount: z
      .string()
      .min(1, 'Amount is required')
      .refine(
        (val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0;
        },
        { message: 'Amount must be greater than 0' }
      )
      .optional(),
    currency: currencyEnum.optional(),
    category_id: z.string().min(1, 'Category ID is required').optional(),
    payment_method_id: z.string().min(1, 'Payment method ID is required').optional(),
    transaction_date: z
      .date()
      .refine((date) => date <= new Date(), {
        message: 'Transaction date cannot be in the future',
      })
      .optional(),
    description: z.string().max(500, 'Description must not exceed 500 characters').optional(),
  })
  .strict();

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

// Schema for transaction filters
export const transactionFilterSchema = z
  .object({
    type: transactionTypeEnum.optional(),
    category_id: z.string().optional(),
    payment_method_id: z.string().optional(),
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
