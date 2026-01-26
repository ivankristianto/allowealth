import type { APIRoute } from 'astro';
import { paymentMethodService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { createPaymentMethodAPISchema } from '@/lib/validation';
import { logError } from '@/lib/utils';

/**
 * GET /api/payment-methods
 * List all payment methods for the user
 */
export const GET: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);
    const { url } = context;

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
    logError('Error fetching payment methods', error);
    return errorResponse('Failed to fetch payment methods', 500);
  }
};

/**
 * POST /api/payment-methods
 * Create a new payment method
 */
export const POST: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, createPaymentMethodAPISchema);

    if (isValidationError(validation)) {
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
    logError('Error creating payment method', error);
    return errorResponse('Failed to create payment method', 500);
  }
};
