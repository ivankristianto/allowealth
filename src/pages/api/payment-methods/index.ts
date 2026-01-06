import type { APIRoute } from 'astro';
import { z } from 'zod';
import { paymentMethodService } from '@/services';
import { successResponse, errorResponse, validateBody, requireAuth } from '@/lib/api-utils';

// Validation schemas
const createPaymentMethodSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'e_wallet']),
});

/**
 * GET /api/payment-methods
 * List all payment methods for the user
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = requireAuth({ request, url } as any);

    const isActiveParam = url.searchParams.get('is_active');

    const filters: any = {};
    if (isActiveParam !== null) {
      filters.is_active = isActiveParam === 'true';
    }

    const paymentMethods = await paymentMethodService.findAll(userId, filters);

    return successResponse(paymentMethods);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Error fetching payment methods:', error);
    return errorResponse('Failed to fetch payment methods', 500);
  }
};

/**
 * POST /api/payment-methods
 * Create a new payment method
 */
export const POST: APIRoute = async ({ request, url }) => {
  try {
    const userId = requireAuth({ request, url } as any);

    const validation = await validateBody(request, createPaymentMethodSchema);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const paymentMethod = await paymentMethodService.create({
      user_id: userId,
      name: validation.data.name,
      type: validation.data.type,
    });

    return successResponse(paymentMethod, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Error creating payment method:', error);
    return errorResponse('Failed to create payment method', 500);
  }
};
