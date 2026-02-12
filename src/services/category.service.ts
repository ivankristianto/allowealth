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
import { getCacheManager, CacheKeys, CacheTags, hashFilters } from '@/lib/cache';

export { type CreateCategoryInput, type UpdateCategoryInput };

export class CategoryService {
  private get schema() {
    return getActiveSchema();
  }

  /**
   * Create a new CategoryService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {}

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
          description: validated.description,
          icon: validated.icon,
          color: validated.color,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();
    });

    // Invalidate category cache
    const cache = getCacheManager();
    await cache.invalidateByTags([
      CacheTags.workspace(validated.workspace_id),
      CacheTags.CATEGORIES,
    ]);

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
    const result = await trackQuery('CategoryService.findById', perf, async () => {
      return this.db.query.categories.findFirst({
        where: and(
          eq(this.schema.categories.id, id),
          eq(this.schema.categories.workspace_id, workspaceId)
        ),
      });
    });

    return result;
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
    type CategoryRow = Awaited<ReturnType<typeof this.db.query.categories.findMany>>;

    const filtersHashValue = hashFilters(filters || {});
    const cache = getCacheManager();
    const cacheKey = CacheKeys.categories(workspaceId, filtersHashValue);

    // Cache read - fail-silent
    let cached: CategoryRow | null = null;
    try {
      cached = await cache.get<CategoryRow>(cacheKey, perf);
    } catch {
      // Cache read failed, continue to DB fetch
    }
    if (cached) {
      return cached;
    }

    const conditions = [eq(this.schema.categories.workspace_id, workspaceId)];

    if (filters?.type) {
      conditions.push(eq(this.schema.categories.type, filters.type));
    }

    if (filters?.is_active !== undefined) {
      conditions.push(eq(this.schema.categories.is_active, filters.is_active));
    }

    const result = await trackQuery('CategoryService.findAll', perf, async () => {
      return this.db.query.categories.findMany({
        where: and(...conditions),
        orderBy: (categories: any, { asc }: any) => [asc(categories.name)],
      });
    });

    // Cache write - fail-silent
    try {
      await cache.set(cacheKey, result, {
        ttl: 3600,
        tags: [CacheTags.workspace(workspaceId), CacheTags.CATEGORIES],
      });
    } catch {
      // Cache write failed, continue without caching
    }

    return result;
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

    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.type !== undefined) updateData.type = validated.type;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.icon !== undefined) updateData.icon = validated.icon;
    if (validated.color !== undefined) updateData.color = validated.color;
    if (validated.is_active !== undefined) updateData.is_active = validated.is_active;

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

    // Invalidate category cache
    const cache = getCacheManager();
    await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.CATEGORIES]);

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

    // Invalidate category cache
    const cache = getCacheManager();
    await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.CATEGORIES]);

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
}
