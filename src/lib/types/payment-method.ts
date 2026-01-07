/**
 * Shared TypeScript types for Payment Method entities
 */

// Enums
export type PaymentMethodType =
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'e_wallet';

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

// Input types (for forms/API)
export interface PaymentMethodCreateInput {
  user_id: string;
  name: string;
  type: PaymentMethodType;
}

export interface PaymentMethodUpdateInput {
  name?: string;
  type?: PaymentMethodType;
  is_active?: boolean;
}

// Filter types (for queries)
export interface PaymentMethodFilter {
  is_active?: boolean;
}

// Output types (with computed fields for API responses)
export interface PaymentMethodOutput extends Omit<PaymentMethod, 'user_id'> {
  transaction_count?: number; // Number of transactions using this payment method
  last_used?: Date | null; // Date of last transaction
}
