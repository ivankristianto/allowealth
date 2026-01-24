/**
 * Transaction transformation utilities
 *
 * Shared utilities for transforming transaction data between different formats.
 */

import type { TransactionOutput } from '@/lib/types/transaction';

/**
 * Raw transaction data from Drizzle ORM
 * Uses camelCase naming (paymentMethod) as per Drizzle conventions
 */
export interface DrizzleTransactionResult {
  id: string;
  type: 'income' | 'expense';
  amount: string;
  currency: 'IDR' | 'USD';
  description: string | null;
  transaction_date: Date;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  category: {
    id: string;
    name: string;
    type: string;
  };
  paymentMethod: {
    id: string;
    name: string;
    type: string;
  };
}

/**
 * Transform Drizzle result to TransactionOutput format
 *
 * Drizzle uses camelCase (paymentMethod), API uses snake_case (payment_method)
 *
 * @param t - Raw transaction from Drizzle ORM
 * @returns Transformed transaction in API format
 */
export function transformTransaction(t: DrizzleTransactionResult): TransactionOutput {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount,
    currency: t.currency,
    description: t.description,
    transaction_date: t.transaction_date,
    deleted_at: t.deleted_at,
    created_at: t.created_at,
    updated_at: t.updated_at,
    category: {
      id: t.category.id,
      name: t.category.name,
      type: t.category.type as 'income' | 'expense',
    },
    payment_method: {
      id: t.paymentMethod.id,
      name: t.paymentMethod.name,
      type: t.paymentMethod.type,
    },
  };
}

/**
 * Safely parse an amount value to number
 *
 * @param amount - Amount value (string or number)
 * @returns Parsed number, or 0 if invalid
 */
export function safeParseAmount(amount: string | number): number {
  const parsed = typeof amount === 'string' ? parseFloat(amount) : amount;
  return isNaN(parsed) ? 0 : parsed;
}
