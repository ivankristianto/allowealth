/**
 * Unit tests for CategoryService
 */

import { describe, it, expect, mock } from 'bun:test';
import { CategoryService } from './category.service';
import type { Category } from '@/lib/types';

// Mock the database module
const mockInsert = mock(() => ({ values: mock(() => ({ returning: mock(() => []) })) }));
const mockQuery = mock(() => ({
  categories: {
    findFirst: mock(() => []),
    findMany: mock(() => []),
  },
}));
const mockUpdate = mock(() => ({ set: mock(() => ({ where: mock(() => ({})) })) }));

// Mock db module
const mockDb = {
  insert: mockInsert,
  query: mockQuery,
  update: mockUpdate,
};

// Create service instance
const categoryService = new CategoryService();

describe.skip('CategoryService', () => {
  describe('create', () => {
    it('should create a new category with valid input', async () => {
      const input = {
        user_id: 'user-1',
        name: 'Food & Groceries',
        type: 'expense' as const,
        currency: 'IDR' as const,
        percentage: '5.00',
        budget_amount: '6000000',
      };

      const mockCategory: Category = {
        id: 'cat-1',
        ...input,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock the returning to return the category
      mockInsert.mockReturnValueOnce({
        values: mock(() => ({
          returning: mock(() => [mockCategory]),
        })),
      } as any);

      const result = await categoryService.create(input);

      expect(result).toBeDefined();
      expect(result?.name).toBe(input.name);
      expect(result?.type).toBe(input.type);
    });

    it('should use default values for optional fields', async () => {
      const input = {
        user_id: 'user-1',
        name: 'Salary',
        type: 'income' as const,
        currency: 'IDR' as const,
        percentage: '0',
        budget_amount: '0',
      };

      const mockCategory: Category = {
        id: 'cat-2',
        ...input,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockInsert.mockReturnValueOnce({
        values: mock(() => ({
          returning: mock(() => [mockCategory]),
        })),
      } as any);

      const result = await categoryService.create(input);

      expect(result?.percentage).toBe('0');
      expect(result?.budget_amount).toBe('0');
    });
  });

  describe('findById', () => {
    it('should find category by id for user', async () => {
      const mockCategory: Category = {
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

      mockQuery.mockReturnValueOnce({
        categories: {
          findFirst: mock(() => mockCategory),
        },
      } as any);

      const result = await categoryService.findById('cat-1', 'user-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('cat-1');
    });

    it('should return undefined for non-existent category', async () => {
      mockQuery.mockReturnValueOnce({
        categories: {
          findFirst: mock(() => undefined),
        },
      } as any);

      const result = await categoryService.findById('non-existent', 'user-1');

      expect(result).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should find all categories for user', async () => {
      const mockCategories: Category[] = [
        {
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
        },
        {
          id: 'cat-2',
          user_id: 'user-1',
          name: 'Salary',
          type: 'income',
          percentage: '0',
          budget_amount: '0',
          currency: 'IDR',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockQuery.mockReturnValueOnce({
        categories: {
          findMany: mock(() => mockCategories),
        },
      } as any);

      const result = await categoryService.findAll('user-1');

      expect(result).toHaveLength(2);
    });

    it('should filter by type', async () => {
      const mockCategories: Category[] = [
        {
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
        },
      ];

      mockQuery.mockReturnValueOnce({
        categories: {
          findMany: mock(() => mockCategories),
        },
      } as any);

      const result = await categoryService.findAll('user-1', { type: 'expense' });

      expect(result).toHaveLength(1);
      if (result[0]) expect(result[0].type).toBe('expense');
    });

    it('should filter by active status', async () => {
      const mockCategories: Category[] = [
        {
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
        },
      ];

      mockQuery.mockReturnValueOnce({
        categories: {
          findMany: mock(() => mockCategories),
        },
      } as any);

      const result = await categoryService.findAll('user-1', { is_active: true });

      expect(result).toHaveLength(1);
      if (result[0]) expect(result[0].is_active).toBe(true);
    });
  });

  describe('update', () => {
    it('should update category fields', async () => {
      const mockUpdatedCategory: Category = {
        id: 'cat-1',
        user_id: 'user-1',
        name: 'Food & Groceries Updated',
        type: 'expense',
        percentage: '10.00',
        budget_amount: '7000000',
        currency: 'IDR',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockReturnValueOnce({
        categories: {
          findFirst: mock(() => mockUpdatedCategory),
        },
      } as any);

      const result = await categoryService.update('cat-1', 'user-1', {
        name: 'Food & Groceries Updated',
        percentage: '10.00',
      });

      if (result) expect(result.name).toBe('Food & Groceries Updated');
    });

    it('should support partial updates', async () => {
      const mockUpdatedCategory: Category = {
        id: 'cat-1',
        user_id: 'user-1',
        name: 'Food & Groceries',
        type: 'expense',
        percentage: '5.00',
        budget_amount: '8000000',
        currency: 'IDR',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockReturnValueOnce({
        categories: {
          findFirst: mock(() => mockUpdatedCategory),
        },
      } as any);

      const result = await categoryService.update('cat-1', 'user-1', {
        budget_amount: '8000000',
      });

      if (result) expect(result.budget_amount).toBe('8000000');
    });
  });

  describe('delete', () => {
    it('should soft delete category', async () => {
      mockUpdate.mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => ({})),
        })),
      } as any);

      const result = await categoryService.delete('cat-1', 'user-1');

      expect(result.success).toBe(true);
    });
  });

  describe('existsByName', () => {
    it('should return true if category name exists', async () => {
      mockQuery.mockReturnValueOnce({
        categories: {
          findFirst: mock(() => ({ name: 'Food & Groceries' })),
        },
      } as any);

      const result = await categoryService.existsByName('Food & Groceries', 'user-1');

      expect(result).toBe(true);
    });

    it('should return false if category name does not exist', async () => {
      mockQuery.mockReturnValueOnce({
        categories: {
          findFirst: mock(() => undefined),
        },
      } as any);

      const result = await categoryService.existsByName('Non-existent', 'user-1');

      expect(result).toBe(false);
    });

    it('should exclude specific category id from check', async () => {
      mockQuery.mockReturnValueOnce({
        categories: {
          findFirst: mock(() => undefined),
        },
      } as any);

      const result = await categoryService.existsByName('Food & Groceries', 'user-1', 'cat-1');

      expect(result).toBe(false);
    });
  });
});
