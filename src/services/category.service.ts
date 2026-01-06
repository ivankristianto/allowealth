import { db, categories } from '@/db';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface CreateCategoryInput {
  user_id: string;
  name: string;
  type: 'expense' | 'income';
  currency: 'IDR' | 'USD';
  percentage?: string;
  budget_amount?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  type?: 'expense' | 'income';
  currency?: 'IDR' | 'USD';
  percentage?: string;
  budget_amount?: string;
  is_active?: boolean;
}

export class CategoryService {
  /**
   * Create a new category
   */
  async create(input: CreateCategoryInput) {
    const id = nanoid();

    const [category] = await db
      .insert(categories)
      .values({
        id,
        user_id: input.user_id,
        name: input.name,
        type: input.type,
        currency: input.currency,
        percentage: input.percentage || '0',
        budget_amount: input.budget_amount || '0',
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
    const result = await db.query.categories.findFirst({
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

    const result = await db.query.categories.findMany({
      where: and(...conditions),
      orderBy: (categories, { asc }) => [asc(categories.name)],
    });

    return result;
  }

  /**
   * Update category
   */
  async update(id: string, user_id: string, input: UpdateCategoryInput) {
    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.currency !== undefined) updateData.currency = input.currency;
    if (input.percentage !== undefined) updateData.percentage = input.percentage;
    if (input.budget_amount !== undefined) updateData.budget_amount = input.budget_amount;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    await db
      .update(categories)
      .set(updateData)
      .where(and(eq(categories.id, id), eq(categories.user_id, user_id)));

    return this.findById(id, user_id);
  }

  /**
   * Delete category (soft delete by marking inactive)
   */
  async delete(id: string, user_id: string) {
    await db
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
      conditions.push(sql`${categories.id} != ${excludeId}`);
    }

    const result = await db.query.categories.findFirst({
      where: and(...conditions),
    });

    return !!result;
  }
}

export const categoryService = new CategoryService();
