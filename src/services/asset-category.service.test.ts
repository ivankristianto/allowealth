/**
 * Unit tests for AssetCategoryService
 */

import { describe, it, expect, mock } from 'bun:test';
import { AssetCategoryService } from './asset-category.service';
import type { AssetCategory } from '@/lib/types/asset';

describe('AssetCategoryService', () => {
  it('should create a new asset category with valid input', async () => {
    const mockCategory: AssetCategory = {
      id: 'cat-1',
      user_id: 'user-1',
      name: 'Real Estate',
      description: 'Property investments',
      is_liability: false,
      is_system: false,
      sort_order: 100,
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
        assetCategories: {
          findFirst: mock(() => Promise.resolve(undefined)),
          findMany: mock(() => Promise.resolve([])),
        },
      },
      select: mock(() => ({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 0 }])),
        })),
      })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => Promise.resolve({})),
        })),
      })),
      delete: mock(() => ({
        where: mock(() => Promise.resolve({})),
      })),
    };

    const service = new AssetCategoryService(mockDb);

    const result = await service.create({
      user_id: 'user-1',
      name: 'Real Estate',
      description: 'Property investments',
      is_liability: false,
      is_system: false,
      sort_order: 100,
    });

    expect(result).toBeDefined();
    expect(result?.name).toBe('Real Estate');
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('should reject duplicate category names', async () => {
    const mockDb: any = {
      insert: mock(() => ({
        values: mock(() => ({
          returning: mock(() => Promise.resolve([])),
        })),
      })),
      query: {
        assetCategories: {
          findFirst: mock(() => Promise.resolve({ id: 'cat-1' })),
          findMany: mock(() => Promise.resolve([])),
        },
      },
      select: mock(() => ({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 0 }])),
        })),
      })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => Promise.resolve({})),
        })),
      })),
      delete: mock(() => ({
        where: mock(() => Promise.resolve({})),
      })),
    };

    const service = new AssetCategoryService(mockDb);

    await expect(
      service.create({
        user_id: 'user-1',
        name: 'Real Estate',
        description: 'Property investments',
        is_liability: false,
        is_system: false,
        sort_order: 100,
      })
    ).rejects.toThrow('Category name already exists');
  });

  it('should block updates to system categories', async () => {
    const mockDb: any = {
      insert: mock(() => ({
        values: mock(() => ({
          returning: mock(() => Promise.resolve([])),
        })),
      })),
      query: {
        assetCategories: {
          findFirst: mock(() =>
            Promise.resolve({
              id: 'cat-1',
              user_id: 'user-1',
              name: 'Cash',
              description: 'System category',
              is_liability: false,
              is_system: true,
              sort_order: 1,
              created_at: new Date(),
              updated_at: new Date(),
            })
          ),
          findMany: mock(() => Promise.resolve([])),
        },
      },
      select: mock(() => ({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 0 }])),
        })),
      })),
      update: mock(() => ({
        set: mock(() => ({
          where: mock(() => Promise.resolve({})),
        })),
      })),
      delete: mock(() => ({
        where: mock(() => Promise.resolve({})),
      })),
    };

    const service = new AssetCategoryService(mockDb);

    await expect(service.update('cat-1', 'user-1', { name: 'Cash Accounts' })).rejects.toThrow(
      'System categories cannot be modified'
    );
  });
});
