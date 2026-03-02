import { type IDatabase, getActiveSchema } from '@/db';
import { and, eq, ne, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  createAccountCategorySchema,
  updateAccountCategorySchema,
  type CreateAccountCategoryInput,
  type UpdateAccountCategoryInput,
} from '@/lib/validation/account-categories';
import { AccountCategoryServiceError, ServiceErrorCode } from './service-errors';
import { DEFAULT_ACCOUNT_CATEGORIES } from '@/lib/constants';
import { CacheKeys, CacheTags, hashFilters, invalidateTags } from '@/lib/cache';
import { cacheOrFetch } from '@/lib/cache/cache-or-fetch';
import { createCrudService } from './base/crud.factory';

export { type CreateAccountCategoryInput, type UpdateAccountCategoryInput };

const MAX_CUSTOM_CATEGORIES = 50;

export class AccountCategoryService {
  private get schema() {
    return getActiveSchema();
  }

  private crud: ReturnType<typeof createCrudService<any, any, any>>;

  constructor(private db: IDatabase) {
    this.crud = createCrudService<any, any, any>(db, {
      getTable: () => getActiveSchema().accountCategories,
      getQuery: () => db.query.accountCategories,
      getId: () => getActiveSchema().accountCategories.id,
      getWorkspaceId: () => getActiveSchema().accountCategories.workspace_id,
    });
  }

  async create(input: CreateAccountCategoryInput) {
    const validated = createAccountCategorySchema.parse(input);

    if (!validated.is_system) {
      const customCount = await this.countCustom(validated.workspace_id);
      if (customCount >= MAX_CUSTOM_CATEGORIES) {
        throw new AccountCategoryServiceError(
          ServiceErrorCode.ACCOUNT_CATEGORY_LIMIT_REACHED,
          'Category limit reached',
          400
        );
      }
    }

    // Pre-check for name conflicts (fast-fail for UX)
    // The database unique constraint is the final source of truth for concurrent requests
    const nameExists = await this.existsByName(validated.name, validated.workspace_id);
    if (nameExists) {
      throw new AccountCategoryServiceError(
        ServiceErrorCode.CONFLICT,
        'Category name already exists',
        409
      );
    }

    const id = nanoid();
    const now = new Date();

    try {
      const [category] = await this.db
        .insert(this.schema.accountCategories)
        .values({
          id,
          workspace_id: validated.workspace_id,
          created_by_user_id: validated.created_by_user_id,
          name: validated.name,
          description: validated.description,
          is_liability: validated.is_liability,
          is_system: validated.is_system ?? false,
          sort_order: validated.sort_order ?? 0,
          created_at: now,
          updated_at: now,
        })
        .returning();

      await invalidateTags(
        [CacheTags.workspace(validated.workspace_id), CacheTags.ACCOUNT_CATEGORIES],
        'best-effort'
      );

      return category;
    } catch (error: any) {
      // Handle race condition: another request created the same name concurrently
      if (error.message?.includes('UNIQUE constraint failed')) {
        throw new AccountCategoryServiceError(
          ServiceErrorCode.CONFLICT,
          'Category name already exists',
          409
        );
      }
      throw error;
    }
  }

  async findById(id: string, workspaceId: string) {
    return this.crud.findById(id, workspaceId);
  }

  async findAll(
    workspaceId: string,
    filters?: {
      is_liability?: boolean;
      is_system?: boolean;
    }
  ) {
    const filtersHashValue = hashFilters(filters || {});
    const cacheKey = CacheKeys.accountCategories(workspaceId, filtersHashValue);

    const conditions = [eq(this.schema.accountCategories.workspace_id, workspaceId)];

    if (filters?.is_liability !== undefined) {
      conditions.push(eq(this.schema.accountCategories.is_liability, filters.is_liability));
    }

    if (filters?.is_system !== undefined) {
      conditions.push(eq(this.schema.accountCategories.is_system, filters.is_system));
    }

    return cacheOrFetch(
      cacheKey,
      { ttl: 3600, tags: [CacheTags.workspace(workspaceId), CacheTags.ACCOUNT_CATEGORIES] },
      () =>
        this.db.query.accountCategories.findMany({
          where: and(...conditions),
          orderBy: (accountCategories: any, { asc, desc }: any) => [
            desc(accountCategories.is_system),
            asc(accountCategories.sort_order),
            asc(accountCategories.name),
          ],
        })
    );
  }

  async findByName(name: string, workspaceId: string) {
    const result = await this.db.query.accountCategories.findFirst({
      where: and(
        eq(this.schema.accountCategories.workspace_id, workspaceId),
        eq(this.schema.accountCategories.name, name)
      ),
    });

    return result;
  }

  async update(id: string, workspaceId: string, input: UpdateAccountCategoryInput) {
    const category = await this.findById(id, workspaceId);
    if (!category) {
      throw new AccountCategoryServiceError(
        ServiceErrorCode.ACCOUNT_CATEGORY_NOT_FOUND,
        'Category not found',
        404
      );
    }

    if (category.is_system) {
      throw new AccountCategoryServiceError(
        ServiceErrorCode.ACCOUNT_CATEGORY_SYSTEM_PROTECTED,
        'System categories cannot be modified',
        403
      );
    }

    const validated = updateAccountCategorySchema.parse(input);

    if (validated.name) {
      const nameExists = await this.existsByName(validated.name, workspaceId, id);
      if (nameExists) {
        throw new AccountCategoryServiceError(
          ServiceErrorCode.CONFLICT,
          'Category name already exists',
          409
        );
      }
    }

    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.is_liability !== undefined) updateData.is_liability = validated.is_liability;
    if (validated.sort_order !== undefined) updateData.sort_order = validated.sort_order;

    await this.db
      .update(this.schema.accountCategories)
      .set(updateData)
      .where(
        and(
          eq(this.schema.accountCategories.id, id),
          eq(this.schema.accountCategories.workspace_id, workspaceId)
        )
      );

    await invalidateTags(
      [CacheTags.workspace(workspaceId), CacheTags.ACCOUNT_CATEGORIES],
      'best-effort'
    );

    return this.findById(id, workspaceId);
  }

  async delete(id: string, workspaceId: string) {
    const category = await this.findById(id, workspaceId);
    if (!category) {
      throw new AccountCategoryServiceError(
        ServiceErrorCode.ACCOUNT_CATEGORY_NOT_FOUND,
        'Category not found',
        404
      );
    }

    if (category.is_system) {
      throw new AccountCategoryServiceError(
        ServiceErrorCode.ACCOUNT_CATEGORY_SYSTEM_PROTECTED,
        'System categories cannot be deleted',
        403
      );
    }

    const [result] = await (this.db as any)
      .select({
        count: sql<number>`count(*)`,
      })
      .from(this.schema.accounts)
      .where(
        and(
          eq(this.schema.accounts.workspace_id, workspaceId),
          eq(this.schema.accounts.category_id, id),
          sql`${this.schema.accounts.deleted_at} IS NULL`
        )
      );

    if ((result?.count ?? 0) > 0) {
      throw new AccountCategoryServiceError(
        ServiceErrorCode.ACCOUNT_CATEGORY_HAS_ACCOUNTS,
        `Cannot delete category with ${result.count} accounts. Reassign accounts first.`,
        409
      );
    }

    await this.db
      .delete(this.schema.accountCategories)
      .where(
        and(
          eq(this.schema.accountCategories.id, id),
          eq(this.schema.accountCategories.workspace_id, workspaceId)
        )
      );

    await invalidateTags(
      [CacheTags.workspace(workspaceId), CacheTags.ACCOUNT_CATEGORIES],
      'best-effort'
    );

    return { success: true };
  }

  async existsByName(name: string, workspaceId: string, excludeId?: string) {
    const conditions = [
      eq(this.schema.accountCategories.workspace_id, workspaceId),
      eq(this.schema.accountCategories.name, name),
    ];

    if (excludeId) {
      conditions.push(ne(this.schema.accountCategories.id, excludeId));
    }

    const result = await this.db.query.accountCategories.findFirst({
      where: and(...conditions),
    });

    return !!result;
  }

  private async countCustom(workspaceId: string) {
    const [result] = await (this.db as any)
      .select({
        count: sql<number>`count(*)`,
      })
      .from(this.schema.accountCategories)
      .where(
        and(
          eq(this.schema.accountCategories.workspace_id, workspaceId),
          eq(this.schema.accountCategories.is_system, false)
        )
      );

    return result?.count ?? 0;
  }

  /**
   * Seed default account categories for a workspace
   * Called after email verification for workspace owner
   */
  async seedDefaultCategories(workspaceId: string, userId: string): Promise<void> {
    // Idempotency guard: skip if categories already exist for this workspace
    const existing = await this.db.query.accountCategories.findFirst({
      where: eq(this.schema.accountCategories.workspace_id, workspaceId),
    });

    if (existing) {
      return;
    }

    const now = new Date();

    for (const category of DEFAULT_ACCOUNT_CATEGORIES) {
      const id = nanoid();
      await Promise.resolve(
        this.db.insert(this.schema.accountCategories).values({
          id,
          workspace_id: workspaceId,
          created_by_user_id: userId,
          name: category.name,
          description: category.description,
          is_liability: category.isLiability,
          is_system: true,
          sort_order: category.sortOrder,
          created_at: now,
          updated_at: now,
        })
      );
    }

    await invalidateTags(
      [CacheTags.workspace(workspaceId), CacheTags.ACCOUNT_CATEGORIES],
      'best-effort'
    );
  }
}
