import { categories, type IDatabase } from '@/db';
import { eq, and, sql } from 'drizzle-orm';
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
  /**
   * Create a new CategoryService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {}

  /**
   * Create a new category
   */
  async create(input: CreateCategoryInput) {
    // Validate input using Zod schema
    const validated = createCategorySchema.parse(input);

    const id = nanoid();

    const [category] = await this.db
      .insert(categories)
      .values({
        id,
        user_id: validated.user_id,
        name: validated.name,
        type: validated.type,
        currency: validated.currency,
        percentage: validated.percentage,
        budget_amount: validated.budget_amount,
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
  async findById(id: string, user_id: string) {
    const result = await this.db.query.categories.findFirst({
      where: and(eq(categories.id, id), eq(categories.user_id, user_id)),
    });

    return result;
  }

  /**
   * Find all categories for a user
   */
  async findAll(user_id: string, filters?: { type?: 'expense' | 'income'; is_active?: boolean }) {
    const conditions = [eq(categories.user_id, user_id)];

    if (filters?.type) {
      conditions.push(eq(categories.type, filters.type));
    }

    if (filters?.is_active !== undefined) {
      conditions.push(eq(categories.is_active, filters.is_active));
    }

    const result = await this.db.query.categories.findMany({
      where: and(...conditions),
      orderBy: (categories, { asc }) => [asc(categories.name)],
    });

    return result;
  }

  /**
   * Update category
   */
  async update(id: string, user_id: string, input: UpdateCategoryInput) {
    // Validate input using Zod schema
    const validated = updateCategorySchema.parse(input);

    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.type !== undefined) updateData.type = validated.type;
    if (validated.currency !== undefined) updateData.currency = validated.currency;
    if (validated.percentage !== undefined) updateData.percentage = validated.percentage;
    if (validated.budget_amount !== undefined) updateData.budget_amount = validated.budget_amount;
    if (validated.is_active !== undefined) updateData.is_active = validated.is_active;

    await this.db
      .update(categories)
      .set(updateData)
      .where(and(eq(categories.id, id), eq(categories.user_id, user_id)));

    return this.findById(id, user_id);
  }

  /**
   * Delete category (soft delete by marking inactive)
   */
  async delete(id: string, user_id: string) {
    // Check if category exists
    const category = await this.findById(id, user_id);
    if (!category) {
      throw new CategoryServiceError(
        ServiceErrorCode.CATEGORY_NOT_FOUND,
        'Category not found',
        404
      );
    }

    await this.db
      .update(categories)
      .set({
        is_active: false,
        updated_at: new Date(),
      })
      .where(and(eq(categories.id, id), eq(categories.user_id, user_id)));

    return { success: true };
  }

  /**
   * Check if category name exists for user
   */
  async existsByName(name: string, user_id: string, excludeId?: string) {
    const conditions = [
      eq(categories.user_id, user_id),
      eq(categories.name, name),
      eq(categories.is_active, true),
    ];

    if (excludeId) {
      // Validate excludeId format to prevent SQL injection
      if (!/^[a-zA-Z0-9_-]+$/.test(excludeId)) {
        throw new Error('Invalid category ID format');
      }
      conditions.push(sql`${categories.id} != ${excludeId}`);
    }

    const result = await this.db.query.categories.findFirst({
      where: and(...conditions),
    });

    return !!result;
  }
}
