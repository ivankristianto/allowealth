/**
 * Shared TypeScript types for Payment Method entities
 *
 * NOTE: Input types (CreatePaymentMethodInput, UpdatePaymentMethodInput) are now
 * exported from @/lib/validation to maintain a single source of truth.
 * Filter types are also exported from validation to avoid duplication.
 *
 * Import Input types from: @/lib/validation
 */

import type { PaymentMethodType } from '@/lib/enums';

// Re-export enum from validation for convenience
export type { PaymentMethodType };

// Database model (from schema)
export interface PaymentMethod {
  id: string;
  user_id: string;
  name: string;
  type: PaymentMethodType;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Output types (with computed fields for API responses)
export interface PaymentMethodOutput extends Omit<PaymentMethod, 'user_id'> {
  transaction_count?: number; // Number of transactions using this payment method
  last_used?: Date | null; // Date of last transaction
}
