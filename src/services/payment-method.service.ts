import { paymentMethods, type IDatabase } from '@/db';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
  type CreatePaymentMethodInput,
  type UpdatePaymentMethodInput,
} from '@/lib/validation/payment-methods';
import { PaymentMethodServiceError, ServiceErrorCode } from './service-errors';

export { type CreatePaymentMethodInput, type UpdatePaymentMethodInput };

export class PaymentMethodService {
  /**
   * Create a new PaymentMethodService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {}

  /**
   * Create a new payment method
   */
  async create(input: CreatePaymentMethodInput) {
    // Validate input using Zod schema
    const validated = createPaymentMethodSchema.parse(input);

    const id = nanoid();

    const [paymentMethod] = await this.db
      .insert(paymentMethods)
      .values({
        id,
        user_id: validated.user_id,
        name: validated.name,
        type: validated.type,
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
    const result = await this.db.query.paymentMethods.findFirst({
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

    const result = await this.db.query.paymentMethods.findMany({
      where: and(...conditions),
      orderBy: (paymentMethods: any, { asc }: any) => [asc(paymentMethods.name)],
    });

    return result;
  }

  /**
   * Update payment method
   */
  async update(id: string, user_id: string, input: UpdatePaymentMethodInput) {
    // Validate input using Zod schema
    const validated = updatePaymentMethodSchema.parse(input);

    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.type !== undefined) updateData.type = validated.type;
    if (validated.is_active !== undefined) updateData.is_active = validated.is_active;

    await this.db
      .update(paymentMethods)
      .set(updateData)
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.user_id, user_id)));

    return this.findById(id, user_id);
  }

  /**
   * Delete payment method (soft delete by marking inactive)
   */
  async delete(id: string, user_id: string) {
    // Check if payment method exists
    const paymentMethod = await this.findById(id, user_id);
    if (!paymentMethod) {
      throw new PaymentMethodServiceError(
        ServiceErrorCode.PAYMENT_METHOD_NOT_FOUND,
        'Payment method not found',
        404
      );
    }

    await this.db
      .update(paymentMethods)
      .set({
        is_active: false,
        updated_at: new Date(),
      })
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.user_id, user_id)));

    return { success: true };
  }
}
