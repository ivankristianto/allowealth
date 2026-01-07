import { db, transactions, categories, paymentMethods } from '@/db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { categoryService } from './category.service';
import { paymentMethodService } from './payment-method.service';
import {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from '@/lib/validation/transactions';

export { type CreateTransactionInput, type UpdateTransactionInput };

export interface TransactionFilters {
  user_id: string;
  type?: 'expense' | 'income';
  category_id?: string;
  payment_method_id?: string;
  currency?: 'IDR' | 'USD';
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

export class TransactionService {
  /**
   * Create a new transaction
   */
  async create(input: CreateTransactionInput) {
    // Validate input using Zod schema
    const validated = createTransactionSchema.parse(input);

    // Verify category exists and belongs to user
    const category = await categoryService.findById(validated.category_id, validated.user_id);
    if (!category || !category.is_active) {
      throw new Error('Category not found or inactive');
    }

    // Verify payment method exists and belongs to user
    const paymentMethod = await paymentMethodService.findById(
      validated.payment_method_id,
      validated.user_id
    );
    if (!paymentMethod || !paymentMethod.is_active) {
      throw new Error('Payment method not found or inactive');
    }

    const id = nanoid();

    const [transaction] = await db
      .insert(transactions)
      .values({
        id,
        user_id: validated.user_id,
        type: validated.type,
        amount: validated.amount,
        currency: validated.currency,
        category_id: validated.category_id,
        payment_method_id: validated.payment_method_id,
        transaction_date: validated.transaction_date,
        description: validated.description,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return this.findById(id, validated.user_id);
  }

  /**
   * Find transaction by ID (with relations)
   */
  async findById(id: string, user_id: string) {
    const result = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), eq(transactions.user_id, user_id)),
      with: {
        category: true,
        paymentMethod: true,
      },
    });

    return result;
  }

  /**
   * Find all transactions with filters
   */
  async findAll(filters: TransactionFilters) {
    const conditions = [
      eq(transactions.user_id, filters.user_id),
      sql`${transactions.deleted_at} IS NULL`,
    ];

    if (filters.type) {
      conditions.push(eq(transactions.type, filters.type));
    }

    if (filters.category_id) {
      conditions.push(eq(transactions.category_id, filters.category_id));
    }

    if (filters.payment_method_id) {
      conditions.push(eq(transactions.payment_method_id, filters.payment_method_id));
    }

    if (filters.currency) {
      conditions.push(eq(transactions.currency, filters.currency));
    }

    if (filters.start_date) {
      conditions.push(gte(transactions.transaction_date, filters.start_date));
    }

    if (filters.end_date) {
      conditions.push(lte(transactions.transaction_date, filters.end_date));
    }

    const result = await db.query.transactions.findMany({
      where: and(...conditions),
      with: {
        category: true,
        paymentMethod: true,
      },
      orderBy: [desc(transactions.transaction_date), desc(transactions.created_at)],
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });

    return result;
  }

  /**
   * Update transaction
   */
  async update(id: string, user_id: string, input: UpdateTransactionInput) {
    // Validate input using Zod schema
    const validated = updateTransactionSchema.parse(input);

    // Verify category if being updated
    if (validated.category_id !== undefined) {
      const category = await categoryService.findById(validated.category_id, user_id);
      if (!category || !category.is_active) {
        throw new Error('Category not found or inactive');
      }
    }

    // Verify payment method if being updated
    if (validated.payment_method_id !== undefined) {
      const paymentMethod = await paymentMethodService.findById(
        validated.payment_method_id,
        user_id
      );
      if (!paymentMethod || !paymentMethod.is_active) {
        throw new Error('Payment method not found or inactive');
      }
    }

    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (validated.type !== undefined) updateData.type = validated.type;
    if (validated.amount !== undefined) updateData.amount = validated.amount;
    if (validated.currency !== undefined) updateData.currency = validated.currency;
    if (validated.category_id !== undefined) updateData.category_id = validated.category_id;
    if (validated.payment_method_id !== undefined)
      updateData.payment_method_id = validated.payment_method_id;
    if (validated.transaction_date !== undefined)
      updateData.transaction_date = validated.transaction_date;
    if (validated.description !== undefined) updateData.description = validated.description;

    await db
      .update(transactions)
      .set(updateData)
      .where(and(eq(transactions.id, id), eq(transactions.user_id, user_id)));

    return this.findById(id, user_id);
  }

  /**
   * Soft delete transaction
   */
  async delete(id: string, user_id: string) {
    await db
      .update(transactions)
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where(and(eq(transactions.id, id), eq(transactions.user_id, user_id)));

    return { success: true };
  }

  /**
   * Get transaction count
   */
  async count(filters: Omit<TransactionFilters, 'limit' | 'offset'>) {
    const conditions = [
      eq(transactions.user_id, filters.user_id),
      sql`${transactions.deleted_at} IS NULL`,
    ];

    if (filters.type) {
      conditions.push(eq(transactions.type, filters.type));
    }

    if (filters.category_id) {
      conditions.push(eq(transactions.category_id, filters.category_id));
    }

    if (filters.payment_method_id) {
      conditions.push(eq(transactions.payment_method_id, filters.payment_method_id));
    }

    if (filters.currency) {
      conditions.push(eq(transactions.currency, filters.currency));
    }

    if (filters.start_date) {
      conditions.push(gte(transactions.transaction_date, filters.start_date));
    }

    if (filters.end_date) {
      conditions.push(lte(transactions.transaction_date, filters.end_date));
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(...conditions));

    return result[0]?.count || 0;
  }
}

export const transactionService = new TransactionService();
