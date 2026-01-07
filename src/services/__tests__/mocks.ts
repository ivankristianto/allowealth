/**
 * Mock setup for database operations in tests
 *
 * This file provides mock implementations of the database and services
 * for unit testing without a real database connection.
 */

import { beforeEach, afterEach } from 'bun:test';

// Mock database
export const mockDb = {
  insert: () => mockDb,
  values: () => mockDb,
  returning: () => mockDb,
  update: () => mockDb,
  set: () => mockDb,
  where: () => mockDb,
  delete: () => mockDb,
  select: () => mockDb,
  from: () => mockDb,
  query: {
    categories: {
      findFirst: () => mockDb,
      findMany: () => mockDb,
    },
    paymentMethods: {
      findFirst: () => mockDb,
      findMany: () => mockDb,
    },
    transactions: {
      findFirst: () => mockDb,
      findMany: () => mockDb,
    },
    users: {
      findFirst: () => mockDb,
    },
  },
  orderBy: () => mockDb,
  limit: () => mockDb,
  offset: () => mockDb,
  with: () => mockDb,
};

// Mock data
export const mockCategories = [
  {
    id: 'cat-1',
    user_id: 'user-1',
    name: 'Food & Groceries',
    type: 'expense' as const,
    percentage: '5.00',
    budget_amount: '6000000',
    currency: 'IDR',
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  },
  {
    id: 'cat-2',
    user_id: 'user-1',
    name: 'Salary',
    type: 'income' as const,
    percentage: '0',
    budget_amount: '0',
    currency: 'IDR',
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  },
];

export const mockPaymentMethods = [
  {
    id: 'pm-1',
    user_id: 'user-1',
    name: 'Cash',
    type: 'cash' as const,
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  },
  {
    id: 'pm-2',
    user_id: 'user-1',
    name: 'BCA Bank',
    type: 'bank_transfer' as const,
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  },
];

export const mockTransactions = [
  {
    id: 'txn-1',
    user_id: 'user-1',
    category_id: 'cat-1',
    payment_method_id: 'pm-1',
    type: 'expense' as const,
    amount: '50000',
    currency: 'IDR',
    description: 'Lunch',
    transaction_date: new Date('2026-01-05'),
    deleted_at: null,
    created_at: new Date('2026-01-05'),
    updated_at: new Date('2026-01-05'),
    category: mockCategories[0],
    paymentMethod: mockPaymentMethods[0],
  },
];

// Clear all mocks before each test
beforeEach(() => {
  // Reset mock states if needed
});

afterEach(() => {
  // Cleanup after each test if needed
});
