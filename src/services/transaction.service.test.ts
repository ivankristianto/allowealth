/**
 * Unit tests for TransactionService
 *
 * These tests use dependency injection and mock database to avoid
 * real database connections, ensuring tests run consistently.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { TransactionService } from './transaction.service';
import {
  createMockDatabase,
  createMockCategory,
  createMockAccount,
  createMockTransaction,
  createMockTransactionWithRelations,
  resetMockDatabase,
} from './test-helpers/mocks';

describe('TransactionService', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let transactionService: TransactionService;
  const mockCategory = createMockCategory();
  const mockAccount = createMockAccount();
  const mockTransaction = createMockTransaction();

  beforeEach(() => {
    // Create fresh mock database and service for each test
    mockDb = createMockDatabase();
    transactionService = new TransactionService(mockDb);
    resetMockDatabase(mockDb);
  });

  describe('create', () => {
    it('should create a new transaction with valid input', async () => {
      const input = {
        workspace_id: 'workspace-1',
        created_by_user_id: 'user-1',
        type: 'expense' as const,
        amount: '50000',
        currency: 'IDR' as const,
        category_id: 'cat-1',
        account_id: 'account-1',
        transaction_date: new Date('2026-01-05'),
        description: 'Lunch',
      };

      // Mock category and account lookup
      (mockDb.query.categories.findFirst as any).mockResolvedValue(mockCategory);
      (mockDb.query.accounts.findFirst as any).mockResolvedValue(mockAccount);

      // Mock insert returning the created transaction
      (mockDb.insert as any).mockReturnValueOnce({
        values: mock(() => ({
          returning: mock(() => Promise.resolve([mockTransaction])),
        })),
      });

      // Mock findById to return the transaction with relations
      const transactionWithRelations = createMockTransactionWithRelations(
        { id: 'txn-1' },
        mockCategory,
        mockAccount
      );
      (mockDb.query.transactions.findFirst as any).mockResolvedValue(transactionWithRelations);

      const result = await transactionService.create(input);

      expect(result).toBeDefined();
      expect(result?.amount).toBe(input.amount);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should throw error if category not found', async () => {
      const input = {
        workspace_id: 'workspace-1',
        created_by_user_id: 'user-1',
        type: 'expense' as const,
        amount: '50000',
        currency: 'IDR' as const,
        category_id: 'non-existent',
        account_id: 'account-1',
        transaction_date: new Date('2026-01-05'),
      };

      // Mock category as not found
      (mockDb.query.categories.findFirst as any).mockResolvedValue(undefined);

      await expect(transactionService.create(input)).rejects.toThrow('Category not found');
    });

    it('should throw error if account not found', async () => {
      const input = {
        workspace_id: 'workspace-1',
        created_by_user_id: 'user-1',
        type: 'expense' as const,
        amount: '50000',
        currency: 'IDR' as const,
        category_id: 'cat-1',
        account_id: 'non-existent',
        transaction_date: new Date('2026-01-05'),
      };

      // Mock category as found but account as not found
      (mockDb.query.categories.findFirst as any).mockResolvedValue(mockCategory);
      (mockDb.query.accounts.findFirst as any).mockResolvedValue(undefined);

      await expect(transactionService.create(input)).rejects.toThrow('Account not found');
    });

    it('should throw error if category is inactive', async () => {
      const inactiveCategory = createMockCategory({ is_active: false });

      const input = {
        workspace_id: 'workspace-1',
        created_by_user_id: 'user-1',
        type: 'expense' as const,
        amount: '50000',
        currency: 'IDR' as const,
        category_id: 'cat-1',
        account_id: 'account-1',
        transaction_date: new Date('2026-01-05'),
      };

      // Mock inactive category
      (mockDb.query.categories.findFirst as any).mockResolvedValue(inactiveCategory);

      await expect(transactionService.create(input)).rejects.toThrow('Category is inactive');
    });
  });

  describe('findById', () => {
    it('should find transaction by id with relations', async () => {
      const transactionWithRelations = createMockTransactionWithRelations(
        { id: 'txn-1' },
        mockCategory,
        mockAccount
      );

      (mockDb.query.transactions.findFirst as any).mockResolvedValueOnce(transactionWithRelations);

      const result = await transactionService.findById('txn-1', 'user-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('txn-1');
      expect(result?.category).toBeDefined();
      expect(result?.account).toBeDefined();
      expect(mockDb.query.transactions.findFirst).toHaveBeenCalled();
    });

    it('should return undefined for non-existent transaction', async () => {
      (mockDb.query.transactions.findFirst as any).mockResolvedValueOnce(undefined);

      const result = await transactionService.findById('non-existent', 'user-1');

      expect(result).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should find all transactions with filters', async () => {
      const transactionsWithRelations = [
        createMockTransactionWithRelations({ id: 'txn-1' }, mockCategory, mockAccount),
      ];

      (mockDb.query.transactions.findMany as any).mockResolvedValueOnce(transactionsWithRelations);

      const result = await transactionService.findAll({
        workspace_id: 'workspace-1',
        type: 'expense',
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(mockDb.query.transactions.findMany).toHaveBeenCalled();
    });

    it('should filter by date range', async () => {
      const transactionsWithRelations = [
        createMockTransactionWithRelations({ id: 'txn-1' }, mockCategory, mockAccount),
      ];

      (mockDb.query.transactions.findMany as any).mockResolvedValueOnce(transactionsWithRelations);

      const result = await transactionService.findAll({
        workspace_id: 'workspace-1',
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-01-31'),
      });

      expect(result).toBeDefined();
      expect(mockDb.query.transactions.findMany).toHaveBeenCalled();
    });

    it('should paginate results', async () => {
      const transactionsWithRelations = [
        createMockTransactionWithRelations({ id: 'txn-1' }, mockCategory, mockAccount),
      ];

      (mockDb.query.transactions.findMany as any).mockResolvedValueOnce(transactionsWithRelations);

      const result = await transactionService.findAll({
        workspace_id: 'workspace-1',
        limit: 10,
        offset: 20,
      });

      expect(result).toBeDefined();
      expect(mockDb.query.transactions.findMany).toHaveBeenCalled();
    });

    it('should filter by category', async () => {
      const transactionsWithRelations = [
        createMockTransactionWithRelations(
          { id: 'txn-1', category_id: 'cat-food' },
          mockCategory,
          mockAccount
        ),
      ];

      (mockDb.query.transactions.findMany as any).mockResolvedValueOnce(transactionsWithRelations);

      const result = await transactionService.findAll({
        workspace_id: 'workspace-1',
        category_id: 'cat-food',
      });

      expect(result).toBeDefined();
      expect(mockDb.query.transactions.findMany).toHaveBeenCalled();
    });

    it('should filter by account', async () => {
      const transactionsWithRelations = [
        createMockTransactionWithRelations(
          { id: 'txn-1', account_id: 'account-cash' },
          mockCategory,
          mockAccount
        ),
      ];

      (mockDb.query.transactions.findMany as any).mockResolvedValueOnce(transactionsWithRelations);

      const result = await transactionService.findAll({
        workspace_id: 'workspace-1',
        account_id: 'account-cash',
      });

      expect(result).toBeDefined();
      expect(mockDb.query.transactions.findMany).toHaveBeenCalled();
    });

    it('should filter transactions by created_by_user_id', async () => {
      const filters = {
        workspace_id: 'workspace-1',
        created_by_user_id: 'user-1',
      };

      const transactionWithRelations = createMockTransactionWithRelations(
        { id: 'txn-1', created_by_user_id: 'user-1' },
        mockCategory,
        mockAccount
      );
      (mockDb.query.transactions.findMany as any).mockResolvedValue([transactionWithRelations]);

      const result = await transactionService.findAll(filters);

      expect(result).toHaveLength(1);
      expect(mockDb.query.transactions.findMany).toHaveBeenCalled();
    });

    it('should filter by currency', async () => {
      const transactionsWithRelations = [
        createMockTransactionWithRelations(
          { id: 'txn-1', currency: 'USD' },
          mockCategory,
          mockAccount
        ),
      ];

      (mockDb.query.transactions.findMany as any).mockResolvedValueOnce(transactionsWithRelations);

      const result = await transactionService.findAll({
        workspace_id: 'workspace-1',
        currency: 'USD',
      });

      expect(result).toBeDefined();
      expect(mockDb.query.transactions.findMany).toHaveBeenCalled();
    });

    it('should filter by search term', async () => {
      const transactionsWithRelations = [
        createMockTransactionWithRelations(
          { id: 'txn-1', description: 'Lunch at restaurant' },
          mockCategory,
          mockAccount
        ),
      ];

      (mockDb.query.transactions.findMany as any).mockResolvedValueOnce(transactionsWithRelations);

      const result = await transactionService.findAll({
        workspace_id: 'workspace-1',
        search: 'lunch',
      });

      expect(result).toBeDefined();
      expect(mockDb.query.transactions.findMany).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update transaction fields', async () => {
      const mockUpdatedTransaction = createMockTransactionWithRelations(
        { amount: '75000' },
        mockCategory,
        mockAccount
      );

      // Mock findById returning updated transaction (no category/account change)
      (mockDb.query.transactions.findFirst as any).mockResolvedValue(mockUpdatedTransaction);

      const result = await transactionService.update('txn-1', 'user-1', {
        amount: '75000',
      });

      expect(result?.amount).toBe('75000');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should validate category on update', async () => {
      // Mock findById returning existing transaction
      (mockDb.query.transactions.findFirst as any).mockResolvedValueOnce(mockTransaction);
      // Mock category as not found
      (mockDb.query.categories.findFirst as any).mockResolvedValue(undefined);

      await expect(
        transactionService.update('txn-1', 'user-1', {
          category_id: 'non-existent',
        })
      ).rejects.toThrow('Category not found');
    });

    it('should validate account on update', async () => {
      // Mock findById returning existing transaction
      (mockDb.query.transactions.findFirst as any).mockResolvedValueOnce(mockTransaction);
      // Mock category as found but account as not found
      (mockDb.query.categories.findFirst as any).mockResolvedValue(mockCategory);
      (mockDb.query.accounts.findFirst as any).mockResolvedValue(undefined);

      await expect(
        transactionService.update('txn-1', 'user-1', {
          account_id: 'non-existent',
        })
      ).rejects.toThrow('Account not found');
    });

    it('should validate inactive category on update', async () => {
      const inactiveCategory = createMockCategory({ is_active: false });

      // Mock findById returning existing transaction
      (mockDb.query.transactions.findFirst as any).mockResolvedValueOnce(mockTransaction);
      // Mock inactive category
      (mockDb.query.categories.findFirst as any).mockResolvedValue(inactiveCategory);

      await expect(
        transactionService.update('txn-1', 'user-1', {
          category_id: 'cat-1',
        })
      ).rejects.toThrow('Category is inactive');
    });

    it('should support partial updates', async () => {
      const mockUpdatedTransaction = createMockTransactionWithRelations(
        { description: 'Updated description' },
        mockCategory,
        mockAccount
      );

      (mockDb.query.transactions.findFirst as any).mockResolvedValue(mockUpdatedTransaction);

      const result = await transactionService.update('txn-1', 'user-1', {
        description: 'Updated description',
      });

      expect(result?.description).toBe('Updated description');
    });

    it('should update multiple fields at once', async () => {
      const mockUpdatedTransaction = createMockTransactionWithRelations(
        { amount: '100000', description: 'Big lunch' },
        mockCategory,
        mockAccount
      );

      (mockDb.query.transactions.findFirst as any).mockResolvedValue(mockUpdatedTransaction);

      const result = await transactionService.update('txn-1', 'user-1', {
        amount: '100000',
        description: 'Big lunch',
      });

      expect(result?.amount).toBe('100000');
      expect(result?.description).toBe('Big lunch');
    });
  });

  describe('delete', () => {
    it('should soft delete transaction', async () => {
      const transactionWithRelations = createMockTransactionWithRelations(
        { id: 'txn-1' },
        mockCategory,
        mockAccount
      );

      // Mock findById returning existing transaction
      (mockDb.query.transactions.findFirst as any).mockResolvedValueOnce(transactionWithRelations);

      const result = await transactionService.delete('txn-1', 'user-1');

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should throw error if transaction not found', async () => {
      // Mock findById returning undefined
      (mockDb.query.transactions.findFirst as any).mockResolvedValueOnce(undefined);

      await expect(transactionService.delete('non-existent', 'user-1')).rejects.toThrow(
        'Transaction not found'
      );
    });
  });

  describe('count', () => {
    it('should count transactions with filters', async () => {
      (mockDb.select as any).mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 5 }])),
        })),
      });

      const result = await transactionService.count({
        workspace_id: 'workspace-1',
        type: 'expense',
      });

      expect(result).toBe(5);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return 0 for no transactions', async () => {
      (mockDb.select as any).mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 0 }])),
        })),
      });

      const result = await transactionService.count({
        workspace_id: 'workspace-1',
        type: 'income',
      });

      expect(result).toBe(0);
    });

    it('should count by category', async () => {
      (mockDb.select as any).mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 3 }])),
        })),
      });

      const result = await transactionService.count({
        workspace_id: 'workspace-1',
        category_id: 'cat-food',
      });

      expect(result).toBe(3);
    });

    it('should count by account', async () => {
      (mockDb.select as any).mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 7 }])),
        })),
      });

      const result = await transactionService.count({
        workspace_id: 'workspace-1',
        account_id: 'account-cash',
      });

      expect(result).toBe(7);
    });

    it('should count with date range filter', async () => {
      (mockDb.select as any).mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 15 }])),
        })),
      });

      const result = await transactionService.count({
        workspace_id: 'workspace-1',
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-01-31'),
      });

      expect(result).toBe(15);
    });
  });

  describe('getCategoryUsageCounts', () => {
    it('should return category usage counts ordered by frequency', async () => {
      (mockDb.select as any).mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => ({
              orderBy: mock(() =>
                Promise.resolve([
                  { category_id: 'cat-food', count: 15 },
                  { category_id: 'cat-transport', count: 8 },
                  { category_id: 'cat-entertainment', count: 3 },
                ])
              ),
            })),
          })),
        })),
      });

      const result = await transactionService.getCategoryUsageCounts('workspace-1', 'user-1');

      expect(result).toHaveLength(3);
      expect(result[0].category_id).toBe('cat-food');
      expect(result[0].count).toBe(15);
      expect(result[1].category_id).toBe('cat-transport');
      expect(result[2].count).toBe(3);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return empty array when no transactions exist', async () => {
      (mockDb.select as any).mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => ({
              orderBy: mock(() => Promise.resolve([])),
            })),
          })),
        })),
      });

      const result = await transactionService.getCategoryUsageCounts('workspace-1', 'user-1');

      expect(result).toHaveLength(0);
    });

    it('should accept custom daysBack parameter', async () => {
      (mockDb.select as any).mockReturnValueOnce({
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() => ({
              orderBy: mock(() => Promise.resolve([{ category_id: 'cat-1', count: 5 }])),
            })),
          })),
        })),
      });

      const result = await transactionService.getCategoryUsageCounts('workspace-1', 'user-1', 30);

      expect(result).toHaveLength(1);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    it('should resolve category and account IDs to readable names in diffs', async () => {
      const logs = [
        {
          id: 'log-update-1',
          action: 'update',
          user_id: 'user-1',
          old_value: JSON.stringify({
            category_id: 'cat-1',
            account_id: 'account-1',
          }),
          new_value: JSON.stringify({
            category_id: 'cat-2',
            account_id: 'account-2',
          }),
          created_at: new Date('2026-01-10T10:00:00Z'),
          user: { id: 'user-1', name: 'Ivan' },
        },
      ];

      (mockDb.query as any).auditLogs.findMany.mockResolvedValueOnce(logs);
      (mockDb.query.categories.findMany as any).mockResolvedValueOnce([
        { id: 'cat-1', name: 'Food' },
        { id: 'cat-2', name: 'Transport' },
      ]);
      (mockDb.query.accounts.findMany as any).mockResolvedValueOnce([
        { id: 'account-1', name: 'Cash' },
        { id: 'account-2', name: 'BCA Savings' },
      ]);

      const result = await transactionService.getHistory('txn-1', 'workspace-1');
      const updateEntry = result.history.find((entry) => entry.action === 'update');

      expect(updateEntry).toBeDefined();
      expect(updateEntry?.oldValue?.category_id).toBe('Food');
      expect(updateEntry?.newValue?.category_id).toBe('Transport');
      expect(updateEntry?.oldValue?.account_id).toBe('Cash');
      expect(updateEntry?.newValue?.account_id).toBe('BCA Savings');
    });
  });
});
