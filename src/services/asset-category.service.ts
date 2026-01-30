import { assetCategories, assets, type IDatabase } from '@/db';
import { and, eq, ne, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  createAssetCategorySchema,
  updateAssetCategorySchema,
  type CreateAssetCategoryInput,
  type UpdateAssetCategoryInput,
} from '@/lib/validation/asset-categories';
import { AssetCategoryServiceError, ServiceErrorCode } from './service-errors';

export { type CreateAssetCategoryInput, type UpdateAssetCategoryInput };

const MAX_CUSTOM_CATEGORIES = 50;

export class AssetCategoryService {
  constructor(private db: IDatabase) {}

  async create(input: CreateAssetCategoryInput) {
    const validated = createAssetCategorySchema.parse(input);

    if (!validated.is_system) {
      const customCount = await this.countCustom(validated.user_id);
      if (customCount >= MAX_CUSTOM_CATEGORIES) {
        throw new AssetCategoryServiceError(
          ServiceErrorCode.ASSET_CATEGORY_LIMIT_REACHED,
          'Category limit reached',
          400
        );
      }
    }

    const nameExists = await this.existsByName(validated.name, validated.user_id);
    if (nameExists) {
      throw new AssetCategoryServiceError(
        ServiceErrorCode.CONFLICT,
        'Category name already exists',
        409
      );
    }

    const id = nanoid();
    const now = new Date();

    const [category] = await this.db
      .insert(assetCategories)
      .values({
        id,
        user_id: validated.user_id,
        name: validated.name,
        description: validated.description,
        is_liability: validated.is_liability,
        is_system: validated.is_system ?? false,
        sort_order: validated.sort_order ?? 0,
        created_at: now,
        updated_at: now,
      })
      .returning();

    return category;
  }

  async findById(id: string, user_id: string) {
    const result = await this.db.query.assetCategories.findFirst({
      where: and(eq(assetCategories.id, id), eq(assetCategories.user_id, user_id)),
    });

    return result;
  }

  async findAll(
    user_id: string,
    filters?: {
      is_liability?: boolean;
      is_system?: boolean;
    }
  ) {
    const conditions = [eq(assetCategories.user_id, user_id)];

    if (filters?.is_liability !== undefined) {
      conditions.push(eq(assetCategories.is_liability, filters.is_liability));
    }

    if (filters?.is_system !== undefined) {
      conditions.push(eq(assetCategories.is_system, filters.is_system));
    }

    const result = await this.db.query.assetCategories.findMany({
      where: and(...conditions),
      orderBy: (assetCategories: any, { asc, desc }: any) => [
        desc(assetCategories.is_system),
        asc(assetCategories.sort_order),
        asc(assetCategories.name),
      ],
    });

    return result;
  }

  async findByName(name: string, user_id: string) {
    const result = await this.db.query.assetCategories.findFirst({
      where: and(eq(assetCategories.user_id, user_id), eq(assetCategories.name, name)),
    });

    return result;
  }

  async update(id: string, user_id: string, input: UpdateAssetCategoryInput) {
    const category = await this.findById(id, user_id);
    if (!category) {
      throw new AssetCategoryServiceError(
        ServiceErrorCode.ASSET_CATEGORY_NOT_FOUND,
        'Category not found',
        404
      );
    }

    if (category.is_system) {
      throw new AssetCategoryServiceError(
        ServiceErrorCode.ASSET_CATEGORY_SYSTEM_PROTECTED,
        'System categories cannot be modified',
        403
      );
    }

    const validated = updateAssetCategorySchema.parse(input);

    if (validated.name) {
      const nameExists = await this.existsByName(validated.name, user_id, id);
      if (nameExists) {
        throw new AssetCategoryServiceError(
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
      .update(assetCategories)
      .set(updateData)
      .where(and(eq(assetCategories.id, id), eq(assetCategories.user_id, user_id)));

    return this.findById(id, user_id);
  }

  async delete(id: string, user_id: string) {
    const category = await this.findById(id, user_id);
    if (!category) {
      throw new AssetCategoryServiceError(
        ServiceErrorCode.ASSET_CATEGORY_NOT_FOUND,
        'Category not found',
        404
      );
    }

    if (category.is_system) {
      throw new AssetCategoryServiceError(
        ServiceErrorCode.ASSET_CATEGORY_SYSTEM_PROTECTED,
        'System categories cannot be deleted',
        403
      );
    }

    const [result] = await (this.db as any)
      .select({
        count: sql<number>`count(*)`,
      })
      .from(assets)
      .where(
        and(
          eq(assets.user_id, user_id),
          eq(assets.category_id, id),
          sql`${assets.deleted_at} IS NULL`
        )
      );

    if ((result?.count ?? 0) > 0) {
      throw new AssetCategoryServiceError(
        ServiceErrorCode.ASSET_CATEGORY_HAS_ASSETS,
        `Cannot delete category with ${result.count} assets. Reassign assets first.`,
        409
      );
    }

    await this.db
      .delete(assetCategories)
      .where(and(eq(assetCategories.id, id), eq(assetCategories.user_id, user_id)));

    return { success: true };
  }

  async existsByName(name: string, user_id: string, excludeId?: string) {
    const conditions = [eq(assetCategories.user_id, user_id), eq(assetCategories.name, name)];

    if (excludeId) {
      conditions.push(ne(assetCategories.id, excludeId));
    }

    const result = await this.db.query.assetCategories.findFirst({
      where: and(...conditions),
    });

    return !!result;
  }

  private async countCustom(user_id: string) {
    const [result] = await (this.db as any)
      .select({
        count: sql<number>`count(*)`,
      })
      .from(assetCategories)
      .where(and(eq(assetCategories.user_id, user_id), eq(assetCategories.is_system, false)));

    return result?.count ?? 0;
  }
}
