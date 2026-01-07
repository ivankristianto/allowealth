import { z } from 'zod';

/**
 * Validation schemas for Payment Method operations
 */

// Common enums
export const paymentMethodTypeEnum = z.enum([
  'cash',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'e_wallet',
]);

// Schema for creating a payment method
export const createPaymentMethodSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  name: z
    .string()
    .min(3, 'Payment method name must be at least 3 characters')
    .max(100, 'Payment method name must not exceed 100 characters'),
  type: paymentMethodTypeEnum,
});

export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;

// Schema for updating a payment method (all fields optional)
export const updatePaymentMethodSchema = z.object({
  name: z
    .string()
    .min(3, 'Payment method name must be at least 3 characters')
    .max(100, 'Payment method name must not exceed 100 characters')
    .optional(),
  type: paymentMethodTypeEnum.optional(),
  is_active: z.boolean().optional(),
});

export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;

// Schema for payment method filters
export const paymentMethodFilterSchema = z.object({
  is_active: z.boolean().optional(),
});

export type PaymentMethodFilter = z.infer<typeof paymentMethodFilterSchema>;
