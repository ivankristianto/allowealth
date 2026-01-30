/**
 * Unit tests for CategoryService
 */

import { describe, it, expect, mock } from 'bun:test';
import { CategoryService } from './category.service';
import type { Category } from '@/lib/types';

describe('CategoryService', () => {
  describe('create', () => {
    it('should create a new category with valid input', async () => {
      // Create mock database
      const mockCategory: Category = {
        id: 'cat-1',
        user_id: 'user-1',
        name: 'Food & Groceries',
        type: 'expense',
        description: 'Daily food and grocery purchases',
        icon: 'utensils',
        color: 'bg-primary',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockInsert = mock(() => ({
        values: mock(() => ({
          returning: mock(() => Promise.resolve([mockCategory])),
        })),
      }));

      const mockDb: any = {
        insert: mockInsert,
        query: {
          categories: {
            findFirst: mock(() => Promise.resolve(undefined)),
            findMany: mock(() => Promise.resolve([])),
          },
        },
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve({})),
          })),
        })),
      };

      const categoryService = new CategoryService(mockDb);

      const input = {
        user_id: 'user-1',
        name: 'Food & Groceries',
        type: 'expense' as const,
        icon: 'utensils',
        color: 'bg-primary',
      };

      const result = await categoryService.create(input);

      expect(result).toBeDefined();
      expect(result?.name).toBe(input.name);
      expect(result?.type).toBe(input.type);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should use default values for optional fields', async () => {
      const mockCategory: Category = {
        id: 'cat-2',
        user_id: 'user-1',
        name: 'Salary',
        type: 'income',
        description: null,
        icon: 'tag',
        color: 'bg-neutral',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockInsert = mock(() => ({
        values: mock(() => ({
          returning: mock(() => Promise.resolve([mockCategory])),
        })),
      }));

      const mockDb: any = {
        insert: mockInsert,
        query: {
          categories: {
            findFirst: mock(() => Promise.resolve(undefined)),
            findMany: mock(() => Promise.resolve([])),
          },
        },
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve({})),
          })),
        })),
      };

      const categoryService = new CategoryService(mockDb);

      const input = {
        user_id: 'user-1',
        name: 'Salary',
        type: 'income' as const,
      };

      const result = await categoryService.create(input);

      expect(result?.icon).toBe('tag');
      expect(result?.color).toBe('bg-neutral');
    });
  });

  describe('findById', () => {
    it('should find category by id for user', async () => {
      const mockCategory: Category = {
        id: 'cat-1',
        user_id: 'user-1',
        name: 'Food & Groceries',
        type: 'expense',
        description: 'Daily food and grocery purchases',
        icon: 'utensils',
        color: 'bg-primary',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockDb: any = {
        insert: mock(() => ({
          values: mock(() => ({
            returning: mock(() => Promise.resolve([])),
          })),
        })),
        query: {
          categories: {
            findFirst: mock(() => Promise.resolve(mockCategory)),
            findMany: mock(() => Promise.resolve([])),
          },
        },
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve({})),
          })),
        })),
      };

      const categoryService = new CategoryService(mockDb);

      const result = await categoryService.findById('cat-1', 'user-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('cat-1');
      expect(mockDb.query.categories.findFirst).toHaveBeenCalled();
    });

    it('should return undefined for non-existent category', async () => {
      const mockDb: any = {
        insert: mock(() => ({
          values: mock(() => ({
            returning: mock(() => Promise.resolve([])),
          })),
        })),
        query: {
          categories: {
            findFirst: mock(() => Promise.resolve(undefined)),
            findMany: mock(() => Promise.resolve([])),
          },
        },
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve({})),
          })),
        })),
      };

      const categoryService = new CategoryService(mockDb);

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
          description: 'Daily food and grocery purchases',
          icon: 'utensils',
          color: 'bg-primary',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'cat-2',
          user_id: 'user-1',
          name: 'Salary',
          type: 'income',
          description: null,
          icon: 'banknote',
          color: 'bg-success',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockDb: any = {
        insert: mock(() => ({
          values: mock(() => ({
            returning: mock(() => Promise.resolve([])),
          })),
        })),
        query: {
          categories: {
            findFirst: mock(() => Promise.resolve(undefined)),
            findMany: mock(() => Promise.resolve(mockCategories)),
          },
        },
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve({})),
          })),
        })),
      };

      const categoryService = new CategoryService(mockDb);

      const result = await categoryService.findAll('user-1');

      expect(result).toHaveLength(2);
      expect(mockDb.query.categories.findMany).toHaveBeenCalled();
    });

    it('should filter by type', async () => {
      const mockCategories: Category[] = [
        {
          id: 'cat-1',
          user_id: 'user-1',
          name: 'Food & Groceries',
          type: 'expense',
          description: 'Daily food and grocery purchases',
          icon: 'utensils',
          color: 'bg-primary',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockDb: any = {
        insert: mock(() => ({
          values: mock(() => ({
            returning: mock(() => Promise.resolve([])),
          })),
        })),
        query: {
          categories: {
            findFirst: mock(() => Promise.resolve(undefined)),
            findMany: mock(() => Promise.resolve(mockCategories)),
          },
        },
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve({})),
          })),
        })),
      };

      const categoryService = new CategoryService(mockDb);

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
          description: 'Daily food and grocery purchases',
          icon: 'utensils',
          color: 'bg-primary',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockDb: any = {
        insert: mock(() => ({
          values: mock(() => ({
            returning: mock(() => Promise.resolve([])),
          })),
        })),
        query: {
          categories: {
            findFirst: mock(() => Promise.resolve(undefined)),
            findMany: mock(() => Promise.resolve(mockCategories)),
          },
        },
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve({})),
          })),
        })),
      };

      const categoryService = new CategoryService(mockDb);

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
        description: 'Updated description',
        icon: 'utensils',
        color: 'bg-secondary',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockDb: any = {
        insert: mock(() => ({
          values: mock(() => ({
            returning: mock(() => Promise.resolve([])),
          })),
        })),
        query: {
          categories: {
            findFirst: mock(() => Promise.resolve(mockUpdatedCategory)),
            findMany: mock(() => Promise.resolve([])),
          },
        },
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve({})),
          })),
        })),
      };

      const categoryService = new CategoryService(mockDb);

      const result = await categoryService.update('cat-1', 'user-1', {
        name: 'Food & Groceries Updated',
        color: 'bg-secondary',
      });

      if (result) expect(result.name).toBe('Food & Groceries Updated');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should support partial updates', async () => {
      const mockUpdatedCategory: Category = {
        id: 'cat-1',
        user_id: 'user-1',
        name: 'Food & Groceries',
        type: 'expense',
        description: 'Daily food and grocery purchases',
        icon: 'shopping-cart',
        color: 'bg-primary',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockDb: any = {
        insert: mock(() => ({
          values: mock(() => ({
            returning: mock(() => Promise.resolve([])),
          })),
        })),
        query: {
          categories: {
            findFirst: mock(() => Promise.resolve(mockUpdatedCategory)),
            findMany: mock(() => Promise.resolve([])),
          },
        },
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve({})),
          })),
        })),
      };

      const categoryService = new CategoryService(mockDb);

      const result = await categoryService.update('cat-1', 'user-1', {
        icon: 'shopping-cart',
      });

      if (result) expect(result.icon).toBe('shopping-cart');
    });
  });

  describe('delete', () => {
    it('should soft delete category', async () => {
      const mockCategory: Category = {
        id: 'cat-1',
        user_id: 'user-1',
        name: 'Food & Groceries',
        type: 'expense',
        description: 'Daily food and grocery purchases',
        icon: 'utensils',
        color: 'bg-primary',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockDb: any = {
        insert: mock(() => ({
          values: mock(() => ({
            returning: mock(() => Promise.resolve([])),
          })),
        })),
        query: {
          categories: {
            findFirst: mock(() => Promise.resolve(mockCategory)),
            findMany: mock(() => Promise.resolve([])),
          },
        },
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve({})),
          })),
        })),
      };

      const categoryService = new CategoryService(mockDb);

      const result = await categoryService.delete('cat-1', 'user-1');

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('existsByName', () => {
    it('should return true if category name exists', async () => {
      const mockDb: any = {
        insert: mock(() => ({
          values: mock(() => ({
            returning: mock(() => Promise.resolve([])),
          })),
        })),
        query: {
          categories: {
            findFirst: mock(() => Promise.resolve({ name: 'Food & Groceries' })),
            findMany: mock(() => Promise.resolve([])),
          },
        },
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve({})),
          })),
        })),
      };

      const categoryService = new CategoryService(mockDb);

      const result = await categoryService.existsByName('Food & Groceries', 'user-1');

      expect(result).toBe(true);
    });

    it('should return false if category name does not exist', async () => {
      const mockDb: any = {
        insert: mock(() => ({
          values: mock(() => ({
            returning: mock(() => Promise.resolve([])),
          })),
        })),
        query: {
          categories: {
            findFirst: mock(() => Promise.resolve(undefined)),
            findMany: mock(() => Promise.resolve([])),
          },
        },
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve({})),
          })),
        })),
      };

      const categoryService = new CategoryService(mockDb);

      const result = await categoryService.existsByName('Non-existent', 'user-1');

      expect(result).toBe(false);
    });

    it('should exclude specific category id from check', async () => {
      const mockDb: any = {
        insert: mock(() => ({
          values: mock(() => ({
            returning: mock(() => Promise.resolve([])),
          })),
        })),
        query: {
          categories: {
            findFirst: mock(() => Promise.resolve(undefined)),
            findMany: mock(() => Promise.resolve([])),
          },
        },
        update: mock(() => ({
          set: mock(() => ({
            where: mock(() => Promise.resolve({})),
          })),
        })),
      };

      const categoryService = new CategoryService(mockDb);

      const result = await categoryService.existsByName('Food & Groceries', 'user-1', 'cat-1');

      expect(result).toBe(false);
    });
  });
});
