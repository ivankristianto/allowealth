import { z } from 'zod';
import { paymentMethodTypeEnum } from '@/lib/enums';

/**
 * Validation schemas for Payment Method operations
 */

// Re-export enum from shared location for convenience
export { paymentMethodTypeEnum };

// Common validation for payment method fields
const nameValidation = z
  .string()
  .min(3, 'Payment method name must be at least 3 characters')
  .max(100, 'Payment method name must not exceed 100 characters');

// Schema for creating a payment method (for service layer)
export const createPaymentMethodSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  name: nameValidation,
  type: paymentMethodTypeEnum,
});

export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;

// Schema for updating a payment method (for service layer)
export const updatePaymentMethodSchema = z.object({
  name: nameValidation.optional(),
  type: paymentMethodTypeEnum.optional(),
  is_active: z.boolean().optional(),
});

export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;

// API-specific schemas that don't include user_id (comes from auth)
export const createPaymentMethodAPISchema = z.object({
  name: nameValidation,
  type: paymentMethodTypeEnum,
});

export const updatePaymentMethodAPISchema = updatePaymentMethodSchema; // No user_id in update

// Schema for payment method filters
export const paymentMethodFilterSchema = z.object({
  is_active: z.boolean().optional(),
});

export type PaymentMethodFilter = z.infer<typeof paymentMethodFilterSchema>;
