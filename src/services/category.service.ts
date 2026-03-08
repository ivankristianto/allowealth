import { type IDatabase, getActiveSchema } from '@/db';
import { eq, and, ne } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@/lib/validation/categories';
import { CategoryServiceError, ServiceErrorCode } from './service-errors';
import { type PerfCollector, trackQuery } from '@/lib/perf';
import { CacheKeys, CacheTags, hashFilters, invalidateTags } from '@/lib/cache';
import { cacheOrFetch } from '@/lib/cache/cache-or-fetch';
import { createCrudService } from './base/crud.factory';

export { type CreateCategoryInput, type UpdateCategoryInput };

export class CategoryService {
  private get schema() {
    return getActiveSchema();
  }

  private crud: ReturnType<typeof createCrudService<any, any, any>>;

  /**
   * Create a new CategoryService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {
    this.crud = createCrudService<any, any, any>(db, {
      getTable: () => getActiveSchema().categories,
      getQuery: () => db.query.categories,
      getId: () => getActiveSchema().categories.id,
      getWorkspaceId: () => getActiveSchema().categories.workspace_id,
    });
  }

  /**
   * Create a new category
   * Note: Budget-related fields are now managed via the budgets table
   *
   * @param input - Category creation input
   * @param perf - Optional performance collector for timing metrics
   */
  async create(input: CreateCategoryInput, perf?: PerfCollector) {
    // Validate input using Zod schema
    const validated = createCategorySchema.parse(input);

    const id = nanoid();

    const [category] = await trackQuery('CategoryService.create', perf, async () => {
      return this.db
        .insert(this.schema.categories)
        .values({
          id,
          workspace_id: validated.workspace_id,
          created_by_user_id: validated.created_by_user_id,
          name: validated.name,
          type: validated.type,
          income_source_type:
            validated.type === 'income' ? (validated.income_source_type ?? 'other') : 'other',
          description: validated.description,
          icon: validated.icon,
          color: validated.color,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();
    });

    await invalidateTags(
      [CacheTags.workspace(validated.workspace_id), CacheTags.CATEGORIES],
      'best-effort'
    );

    return category;
  }

  /**
   * Find category by ID
   *
   * @param id - Category ID
   * @param workspaceId - Workspace ID
   * @param perf - Optional performance collector for timing metrics
   */
  async findById(id: string, workspaceId: string, perf?: PerfCollector) {
    return trackQuery('CategoryService.findById', perf, () => this.crud.findById(id, workspaceId));
  }

  /**
   * Find all categories for a workspace
   *
   * @param workspaceId - Workspace ID
   * @param filters - Optional filters for type and active status
   * @param perf - Optional performance collector for timing metrics
   */
  async findAll(
    workspaceId: string,
    filters?: { type?: 'expense' | 'income'; is_active?: boolean },
    perf?: PerfCollector
  ) {
    const filtersHashValue = hashFilters(filters || {});
    const cacheKey = CacheKeys.categories(workspaceId, filtersHashValue);

    const conditions = [eq(this.schema.categories.workspace_id, workspaceId)];

    if (filters?.type) {
      conditions.push(eq(this.schema.categories.type, filters.type));
    }

    if (filters?.is_active !== undefined) {
      conditions.push(eq(this.schema.categories.is_active, filters.is_active));
    }

    return cacheOrFetch(
      cacheKey,
      { ttl: 3600, tags: [CacheTags.workspace(workspaceId), CacheTags.CATEGORIES] },
      () =>
        trackQuery('CategoryService.findAll', perf, () =>
          this.db.query.categories.findMany({
            where: and(...conditions),
            orderBy: (categories: any, { asc }: any) => [asc(categories.name)],
          })
        ),
      perf
    );
  }

  /**
   * Update category
   * Note: Budget-related fields are now managed via the budgets table
   *
   * @param id - Category ID
   * @param workspaceId - Workspace ID
   * @param input - Category update input
   * @param perf - Optional performance collector for timing metrics
   */
  async update(id: string, workspaceId: string, input: UpdateCategoryInput, perf?: PerfCollector) {
    // Validate input using Zod schema
    const validated = updateCategorySchema.parse(input);
    const existingCategory = await this.findById(id, workspaceId, perf);
    const resolvedCategoryType = validated.type ?? existingCategory?.type;

    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.type !== undefined) updateData.type = validated.type;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.icon !== undefined) updateData.icon = validated.icon;
    if (validated.color !== undefined) updateData.color = validated.color;
    if (validated.is_active !== undefined) updateData.is_active = validated.is_active;
    if (resolvedCategoryType === 'expense') {
      updateData.income_source_type = 'other';
    } else if (validated.income_source_type !== undefined) {
      updateData.income_source_type =
        resolvedCategoryType === 'income' ? validated.income_source_type : 'other';
    }

    await trackQuery('CategoryService.update', perf, async () => {
      return this.db
        .update(this.schema.categories)
        .set(updateData)
        .where(
          and(
            eq(this.schema.categories.id, id),
            eq(this.schema.categories.workspace_id, workspaceId)
          )
        );
    });

    await invalidateTags([CacheTags.workspace(workspaceId), CacheTags.CATEGORIES], 'best-effort');

    return this.findById(id, workspaceId, perf);
  }

  /**
   * Delete category (soft delete by marking inactive)
   *
   * @param id - Category ID
   * @param workspaceId - Workspace ID
   * @param perf - Optional performance collector for timing metrics
   */
  async delete(id: string, workspaceId: string, perf?: PerfCollector) {
    // Check if category exists
    const category = await this.findById(id, workspaceId, perf);
    if (!category) {
      throw new CategoryServiceError(
        ServiceErrorCode.CATEGORY_NOT_FOUND,
        'Category not found',
        404
      );
    }

    await trackQuery('CategoryService.delete', perf, async () => {
      return this.db
        .update(this.schema.categories)
        .set({
          is_active: false,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(this.schema.categories.id, id),
            eq(this.schema.categories.workspace_id, workspaceId)
          )
        );
    });

    await invalidateTags([CacheTags.workspace(workspaceId), CacheTags.CATEGORIES], 'best-effort');

    return { success: true };
  }

  /**
   * Check if category name exists for workspace
   *
   * @param name - Category name to check
   * @param workspaceId - Workspace ID
   * @param excludeId - Optional category ID to exclude from check
   * @param perf - Optional performance collector for timing metrics
   */
  async existsByName(name: string, workspaceId: string, excludeId?: string, perf?: PerfCollector) {
    const conditions = [
      eq(this.schema.categories.workspace_id, workspaceId),
      eq(this.schema.categories.name, name),
      eq(this.schema.categories.is_active, true),
    ];

    if (excludeId) {
      conditions.push(ne(this.schema.categories.id, excludeId));
    }

    const result = await trackQuery('CategoryService.existsByName', perf, async () => {
      return this.db.query.categories.findFirst({
        where: and(...conditions),
      });
    });

    return !!result;
  }

  /**
   * Seed default expense categories for onboarding.
   * Idempotent — skips if any expense categories already exist.
   * Returns the created category IDs mapped by name.
   */
  async seedDefaultExpenseCategories(
    workspaceId: string,
    userId: string
  ): Promise<Map<string, string>> {
    const { DEFAULT_EXPENSE_CATEGORIES } = await import('@/lib/constants/default-categories');

    // Idempotency: skip if any expense categories exist
    const existing = await this.db.query.categories.findFirst({
      where: and(
        eq(this.schema.categories.workspace_id, workspaceId),
        eq(this.schema.categories.type, 'expense'),
        eq(this.schema.categories.is_active, true)
      ),
      columns: { id: true },
    });

    if (existing) {
      // Return existing categories mapped by name
      const all = await this.findAll(workspaceId, { type: 'expense' });
      const map = new Map<string, string>();
      for (const cat of all) {
        map.set(cat.name, cat.id);
      }
      return map;
    }

    const now = new Date();
    const categoryMap = new Map<string, string>();

    for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
      const id = nanoid();
      await this.db.insert(this.schema.categories).values({
        id,
        workspace_id: workspaceId,
        created_by_user_id: userId,
        name: cat.name,
        type: 'expense',
        icon: cat.icon,
        color: cat.color,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
      categoryMap.set(cat.name, id);
    }

    await invalidateTags([CacheTags.workspace(workspaceId), CacheTags.CATEGORIES], 'best-effort');

    return categoryMap;
  }
}
