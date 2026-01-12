/**
 * Unit tests for TransactionService
 */

import { describe, it, expect, mock } from 'bun:test';
import { TransactionService } from './transaction.service';
import type { Transaction } from '@/lib/types';

// Mock the database module
const mockInsert = mock(() => ({ values: mock(() => ({ returning: mock(() => []) })) }));
const mockQuery = mock(() => ({
  transactions: {
    findFirst: mock(() => []),
    findMany: mock(() => []),
  },
  categories: {
    findFirst: mock(() => []),
  },
  paymentMethods: {
    findFirst: mock(() => []),
  },
}));
const mockUpdate = mock(() => ({ set: mock(() => ({ where: mock(() => ({})) })) }));
const mockSelect = mock(() => ({ from: mock(() => ({ where: mock(() => []) })) }));

// Mock dependent services
const mockCategoryService = {
  findById: mock(() => []),
};
const mockPaymentMethodService = {
  findById: mock(() => []),
};

// Create service instance
const transactionService = new TransactionService();

describe.skip('TransactionService', () => {
  const mockCategory = {
    id: 'cat-1',
    user_id: 'user-1',
    name: 'Food & Groceries',
    type: 'expense',
    percentage: '5.00',
    budget_amount: '6000000',
    currency: 'IDR',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockPaymentMethod = {
    id: 'pm-1',
    user_id: 'user-1',
    name: 'Cash',
    type: 'cash',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockTransaction: Transaction = {
    id: 'txn-1',
    user_id: 'user-1',
    category_id: 'cat-1',
    payment_method_id: 'pm-1',
    type: 'expense',
    amount: '50000',
    currency: 'IDR',
    description: 'Lunch',
    transaction_date: new Date('2026-01-05'),
    deleted_at: null,
    created_at: new Date('2026-01-05'),
    updated_at: new Date('2026-01-05'),
  };

  describe('create', () => {
    it('should create a new transaction with valid input', async () => {
      const input = {
        user_id: 'user-1',
        type: 'expense' as const,
        amount: '50000',
        currency: 'IDR' as const,
        category_id: 'cat-1',
        payment_method_id: 'pm-1',
        transaction_date: new Date('2026-01-05'),
        description: 'Lunch',
      };

      // Mock category and payment method as existing
      mockQuery.mockReturnValueOnce({
        categories: {
          findFirst: mock(() => mockCategory),
        },
        paymentMethods: {
          findFirst: mock(() => mockPaymentMethod),
        },
      } as any);

      mockInsert.mockReturnValueOnce({
        values: mock(() => ({
          returning: mock(() => [mockTransaction]),
        })),
      } as any);

      // Mock findById for the return
      mockQuery.mockReturnValueOnce({
        transactions: {
          findFirst: mock(() => ({
            ...mockTransaction,
            category: mockCategory,
            paymentMethod: mockPaymentMethod,
          })),
        },
      } as any);

      const result = await transactionService.create(input);

      expect(result).toBeDefined();
      expect(result?.amount).toBe(input.amount);
    });

    it('should throw error if category not found', async () => {
      const input = {
        user_id: 'user-1',
        type: 'expense' as const,
        amount: '50000',
        currency: 'IDR' as const,
        category_id: 'non-existent',
        payment_method_id: 'pm-1',
        transaction_date: new Date('2026-01-05'),
      };

      mockQuery.mockReturnValueOnce({
        categories: {
          findFirst: mock(() => undefined),
        },
      } as any);

      await expect(transactionService.create(input)).rejects.toThrow(
        'Category not found or inactive'
      );
    });

    it('should throw error if payment method not found', async () => {
      const input = {
        user_id: 'user-1',
        type: 'expense' as const,
        amount: '50000',
        currency: 'IDR' as const,
        category_id: 'cat-1',
        payment_method_id: 'non-existent',
        transaction_date: new Date('2026-01-05'),
      };

      mockQuery.mockReturnValueOnce({
        categories: {
          findFirst: mock(() => mockCategory),
        },
        paymentMethods: {
          findFirst: mock(() => undefined),
        },
      } as any);

      await expect(transactionService.create(input)).rejects.toThrow(
        'Payment method not found or inactive'
      );
    });

    it('should throw error if category is inactive', async () => {
      const inactiveCategory = { ...mockCategory, is_active: false };

      const input = {
        user_id: 'user-1',
        type: 'expense' as const,
        amount: '50000',
        currency: 'IDR' as const,
        category_id: 'cat-1',
        payment_method_id: 'pm-1',
        transaction_date: new Date('2026-01-05'),
      };

      mockQuery.mockReturnValueOnce({
        categories: {
          findFirst: mock(() => inactiveCategory),
        },
      } as any);

      await expect(transactionService.create(input)).rejects.toThrow(
        'Category not found or inactive'
      );
    });
  });

  describe('findById', () => {
    it('should find transaction by id with relations', async () => {
      mockQuery.mockReturnValueOnce({
        transactions: {
          findFirst: mock(() => ({
            ...mockTransaction,
            category: mockCategory,
            paymentMethod: mockPaymentMethod,
          })),
        },
      } as any);

      const result = await transactionService.findById('txn-1', 'user-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('txn-1');
      expect(result?.category).toBeDefined();
      expect(result?.paymentMethod).toBeDefined();
    });

    it('should return undefined for non-existent transaction', async () => {
      mockQuery.mockReturnValueOnce({
        transactions: {
          findFirst: mock(() => undefined),
        },
      } as any);

      const result = await transactionService.findById('non-existent', 'user-1');

      expect(result).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should find all transactions with filters', async () => {
      const mockTransactions: Transaction[] = [
        {
          ...mockTransaction,
          category: mockCategory,
          paymentMethod: mockPaymentMethod,
        } as any,
      ];

      mockQuery.mockReturnValueOnce({
        transactions: {
          findMany: mock(() => mockTransactions),
        },
      } as any);

      const result = await transactionService.findAll({
        user_id: 'user-1',
        type: 'expense',
        limit: 10,
      });

      expect(result).toHaveLength(1);
    });

    it('should filter by date range', async () => {
      const mockTransactions: Transaction[] = [
        {
          ...mockTransaction,
          category: mockCategory,
          paymentMethod: mockPaymentMethod,
        } as any,
      ];

      mockQuery.mockReturnValueOnce({
        transactions: {
          findMany: mock(() => mockTransactions),
        },
      } as any);

      const result = await transactionService.findAll({
        user_id: 'user-1',
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-01-31'),
      });

      expect(result).toBeDefined();
    });

    it('should paginate results', async () => {
      const mockTransactions: Transaction[] = [
        {
          ...mockTransaction,
          category: mockCategory,
          paymentMethod: mockPaymentMethod,
        } as any,
      ];

      mockQuery.mockReturnValueOnce({
        transactions: {
          findMany: mock(() => mockTransactions),
        },
      } as any);

      const result = await transactionService.findAll({
        user_id: 'user-1',
        limit: 10,
        offset: 20,
      });

      expect(result).toBeDefined();
    });

    it('should exclude soft deleted transactions', async () => {
      const mockTransactions: Transaction[] = [
        {
          ...mockTransaction,
          deleted_at: null,
          category: mockCategory,
          paymentMethod: mockPaymentMethod,
        } as any,
      ];

      mockQuery.mockReturnValueOnce({
        transactions: {
          findMany: mock(() => mockTransactions),
        },
      } as any);

      const result = await transactionService.findAll({
        user_id: 'user-1',
      });

      expect(result.every((t) => t.deleted_at === null)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update transaction fields', async () => {
      const mockUpdatedTransaction = {
        ...mockTransaction,
        amount: '75000',
        category: mockCategory,
        paymentMethod: mockPaymentMethod,
      };

      mockQuery.mockReturnValueOnce({
        categories: {
          findFirst: mock(() => mockCategory),
        },
      } as any);

      mockQuery.mockReturnValueOnce({
        transactions: {
          findFirst: mock(() => mockUpdatedTransaction),
        },
      } as any);

      const result = await transactionService.update('txn-1', 'user-1', {
        amount: '75000',
      });

      expect(result?.amount).toBe('75000');
    });

    it('should validate category on update', async () => {
      mockQuery.mockReturnValueOnce({
        categories: {
          findFirst: mock(() => undefined),
        },
      } as any);

      await expect(
        transactionService.update('txn-1', 'user-1', {
          category_id: 'non-existent',
        })
      ).rejects.toThrow('Category not found or inactive');
    });

    it('should validate payment method on update', async () => {
      mockQuery.mockReturnValueOnce({
        categories: {
          findFirst: mock(() => mockCategory),
        },
        paymentMethods: {
          findFirst: mock(() => undefined),
        },
      } as any);

      await expect(
        transactionService.update('txn-1', 'user-1', {
          payment_method_id: 'non-existent',
        })
      ).rejects.toThrow('Payment method not found or inactive');
    });
  });

  describe('delete', () => {
    it('should soft delete transaction', async () => {
      mockUpdate.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({})),
        })),
      } as any);

      const result = await transactionService.delete('txn-1', 'user-1');

      expect(result.success).toBe(true);
    });
  });

  describe('count', () => {
    it('should count transactions with filters', async () => {
      mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => [{ count: 5 }]),
        })),
      } as any);

      const result = await transactionService.count({
        user_id: 'user-1',
        type: 'expense',
      });

      expect(result).toBe(5);
    });

    it('should return 0 for no transactions', async () => {
      mockSelect.mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => [{}]),
        })),
      } as any);

      const result = await transactionService.count({
        user_id: 'user-1',
        type: 'income',
      });

      expect(result).toBe(0);
    });
  });
});
