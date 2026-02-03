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

export { type CreateCategoryInput, type UpdateCategoryInput };

export class CategoryService {
  private schema = getActiveSchema();

  /**
   * Create a new CategoryService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {}

  /**
   * Create a new category
   * Note: Budget-related fields are now managed via the budgets table
   */
  async create(input: CreateCategoryInput) {
    // Validate input using Zod schema
    const validated = createCategorySchema.parse(input);

    const id = nanoid();

    const [category] = await this.db
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

    return category;
  }

  /**
   * Find category by ID
   */
  async findById(id: string, workspaceId: string) {
    const result = await this.db.query.categories.findFirst({
      where: and(
        eq(this.schema.categories.id, id),
        eq(this.schema.categories.workspace_id, workspaceId)
      ),
    });

    return result;
  }

  /**
   * Find all categories for a workspace
   */
  async findAll(
    workspaceId: string,
    filters?: { type?: 'expense' | 'income'; is_active?: boolean }
  ) {
    const conditions = [eq(this.schema.categories.workspace_id, workspaceId)];

    if (filters?.type) {
      conditions.push(eq(this.schema.categories.type, filters.type));
    }

    if (filters?.is_active !== undefined) {
      conditions.push(eq(this.schema.categories.is_active, filters.is_active));
    }

    const result = await this.db.query.categories.findMany({
      where: and(...conditions),
      orderBy: (categories: any, { asc }: any) => [asc(categories.name)],
    });

    return result;
  }

  /**
   * Update category
   * Note: Budget-related fields are now managed via the budgets table
   */
  async update(id: string, workspaceId: string, input: UpdateCategoryInput) {
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

    await this.db
      .update(this.schema.categories)
      .set(updateData)
      .where(
        and(eq(this.schema.categories.id, id), eq(this.schema.categories.workspace_id, workspaceId))
      );

    return this.findById(id, workspaceId);
  }

  /**
   * Delete category (soft delete by marking inactive)
   */
  async delete(id: string, workspaceId: string) {
    // Check if category exists
    const category = await this.findById(id, workspaceId);
    if (!category) {
      throw new CategoryServiceError(
        ServiceErrorCode.CATEGORY_NOT_FOUND,
        'Category not found',
        404
      );
    }

    await this.db
      .update(this.schema.categories)
      .set({
        is_active: false,
        updated_at: new Date(),
      })
      .where(
        and(eq(this.schema.categories.id, id), eq(this.schema.categories.workspace_id, workspaceId))
      );

    return { success: true };
  }

  /**
   * Check if category name exists for workspace
   */
  async existsByName(name: string, workspaceId: string, excludeId?: string) {
    const conditions = [
      eq(this.schema.categories.workspace_id, workspaceId),
      eq(this.schema.categories.name, name),
      eq(this.schema.categories.is_active, true),
    ];

    if (excludeId) {
      conditions.push(ne(this.schema.categories.id, excludeId));
    }

    const result = await this.db.query.categories.findFirst({
      where: and(...conditions),
    });

    return !!result;
  }
}
