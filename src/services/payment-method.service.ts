import { db, paymentMethods } from '@/db';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface CreatePaymentMethodInput {
  user_id: string;
  name: string;
  type: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'e_wallet';
}

export interface UpdatePaymentMethodInput {
  name?: string;
  type?: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'e_wallet';
  is_active?: boolean;
}

export class PaymentMethodService {
  /**
   * Create a new payment method
   */
  async create(input: CreatePaymentMethodInput) {
    const id = nanoid();

    const [paymentMethod] = await db
      .insert(paymentMethods)
      .values({
        id,
        user_id: input.user_id,
        name: input.name,
        type: input.type,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return paymentMethod;
  }

  /**
   * Find payment method by ID
   */
  async findById(id: string, user_id: string) {
    const result = await db.query.paymentMethods.findFirst({
      where: and(eq(paymentMethods.id, id), eq(paymentMethods.user_id, user_id)),
    });

    return result;
  }

  /**
   * Find all payment methods for a user
   */
  async findAll(user_id: string, filters?: { is_active?: boolean }) {
    const conditions = [eq(paymentMethods.user_id, user_id)];

    if (filters?.is_active !== undefined) {
      conditions.push(eq(paymentMethods.is_active, filters.is_active));
    }

    const result = await db.query.paymentMethods.findMany({
      where: and(...conditions),
      orderBy: (paymentMethods, { asc }) => [asc(paymentMethods.name)],
    });

    return result;
  }

  /**
   * Update payment method
   */
  async update(id: string, user_id: string, input: UpdatePaymentMethodInput) {
    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    await db
      .update(paymentMethods)
      .set(updateData)
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.user_id, user_id)));

    return this.findById(id, user_id);
  }

  /**
   * Delete payment method (soft delete by marking inactive)
   */
  async delete(id: string, user_id: string) {
    await db
      .update(paymentMethods)
      .set({
        is_active: false,
        updated_at: new Date(),
      })
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.user_id, user_id)));

    return { success: true };
  }
}

export const paymentMethodService = new PaymentMethodService();
