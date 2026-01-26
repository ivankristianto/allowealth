import type { APIRoute } from 'astro';
import { paymentMethodService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { updatePaymentMethodAPISchema } from '@/lib/validation';
import { logError } from '@/lib/utils';

/**
 * GET /api/payment-methods/:id
 * Get a single payment method by ID
 */
export const GET: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Payment method ID is required', 400);
    }

    const paymentMethod = await paymentMethodService.findById(id, userId);

    if (!paymentMethod) {
      return errorResponse('Payment method not found', 404);
    }

    return successResponse(paymentMethod);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching payment method', error);
    return errorResponse('Failed to fetch payment method', 500);
  }
};

/**
 * PUT /api/payment-methods/:id
 * Update a payment method
 */
export const PUT: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Payment method ID is required', 400);
    }

    const validation = await validateBody(context.request, updatePaymentMethodAPISchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const paymentMethod = await paymentMethodService.update(id, userId, validation.data);

    if (!paymentMethod) {
      return errorResponse('Payment method not found', 404);
    }

    return successResponse(paymentMethod);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error updating payment method', error);
    return errorResponse('Failed to update payment method', 500);
  }
};

/**
 * DELETE /api/payment-methods/:id
 * Soft delete a payment method (mark as inactive)
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Payment method ID is required', 400);
    }

    await paymentMethodService.delete(id, userId);

    return successResponse({ message: 'Payment method deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error deleting payment method', error);
    return errorResponse('Failed to delete payment method', 500);
  }
};
