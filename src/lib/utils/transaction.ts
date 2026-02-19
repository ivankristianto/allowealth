/**
 * Transaction transformation utilities
 *
 * Shared utilities for transforming transaction data between different formats.
 */

import type { TransactionOutput } from '@/lib/types/transaction';

/**
 * Raw transaction data from Drizzle ORM
 * Uses the new account-based schema
 */
export interface DrizzleTransactionResult {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: string;
  currency: 'IDR' | 'USD';
  description: string | null;
  transaction_date: Date;
  updated_by_user_id?: string | null;
  deleted_by_user_id?: string | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  category: {
    id: string;
    name: string;
    type: string;
    icon: string;
    color: string;
  } | null;
  account: {
    id: string;
    name: string;
    type: string;
  };
  toAccount?: {
    id: string;
    name: string;
    type: string;
  } | null;
  createdBy?: {
    id: string;
    name: string;
  } | null;
  has_history?: number | boolean;
}

/**
 * Transform Drizzle result to TransactionOutput format
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
    updated_by_user_id: t.updated_by_user_id ?? null,
    deleted_by_user_id: t.deleted_by_user_id ?? null,
    deleted_at: t.deleted_at,
    created_at: t.created_at,
    updated_at: t.updated_at,
    category: t.category
      ? {
          id: t.category.id,
          name: t.category.name,
          type: t.category.type as 'income' | 'expense' | 'transfer',
          icon: t.category.icon,
          color: t.category.color,
        }
      : null,
    account: {
      id: t.account.id,
      name: t.account.name,
      type: t.account.type,
    },
    toAccount: t.toAccount
      ? {
          id: t.toAccount.id,
          name: t.toAccount.name,
          type: t.toAccount.type,
        }
      : null,
    has_history: !!t.has_history,
    created_by_user_name: t.createdBy?.name,
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
