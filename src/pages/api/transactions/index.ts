import type { APIRoute } from 'astro';
import { transactionService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  requireAuth,
  getPaginationParams,
  isValidDate,
} from '@/lib/api-utils';
import { createTransactionAPISchema } from '@/lib/validation';
import { logError } from '@/lib/utils';

/**
 * GET /api/transactions
 * List all transactions with optional filters
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = await requireAuth({ request, url } as any);

    const { limit, offset } = getPaginationParams(url);

    // Parse filter params
    const filters: any = {
      user_id: userId,
      limit,
      offset,
    };

    const type = url.searchParams.get('type');
    if (type && (type === 'expense' || type === 'income')) {
      filters.type = type;
    }

    const categoryId = url.searchParams.get('category_id');
    if (categoryId) {
      filters.category_id = categoryId;
    }

    const paymentMethodId = url.searchParams.get('payment_method_id');
    if (paymentMethodId) {
      filters.payment_method_id = paymentMethodId;
    }

    const currency = url.searchParams.get('currency');
    if (currency && (currency === 'IDR' || currency === 'USD')) {
      filters.currency = currency;
    }

    const startDate = url.searchParams.get('start_date');
    if (startDate) {
      const parsedStartDate = new Date(startDate);
      if (!isValidDate(parsedStartDate)) {
        return errorResponse('Invalid start_date format', 400);
      }
      filters.start_date = parsedStartDate;
    }

    const endDate = url.searchParams.get('end_date');
    if (endDate) {
      const parsedEndDate = new Date(endDate);
      if (!isValidDate(parsedEndDate)) {
        return errorResponse('Invalid end_date format', 400);
      }
      filters.end_date = parsedEndDate;
    }

    const search = url.searchParams.get('search');
    if (search) {
      filters.search = search;
    }

    const transactions = await transactionService.findAll(filters);
    const total = await transactionService.count(filters);

    return successResponse({
      transactions,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching transactions', error);
    return errorResponse('Failed to fetch transactions', 500);
  }
};

/**
 * POST /api/transactions
 * Create a new transaction
 */
export const POST: APIRoute = async ({ request, url }) => {
  try {
    const userId = await requireAuth({ request, url } as any);

    // Validate Content-Type header
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return errorResponse('Content-Type must be application/json', 415, 'UNSUPPORTED_MEDIA_TYPE');
    }

    const validation = await validateBody(request, createTransactionAPISchema);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    // Convert date string (YYYY-MM-DD) to Date object
    // The validation ensures the string is in the correct format
    const transactionDate = new Date(validation.data.transaction_date + 'T00:00:00.000Z');

    const transaction = await transactionService.create({
      user_id: userId,
      type: validation.data.type,
      amount: validation.data.amount,
      currency: validation.data.currency,
      category_id: validation.data.category_id,
      payment_method_id: validation.data.payment_method_id,
      transaction_date: transactionDate,
      description: validation.data.description,
    });

    return successResponse(transaction, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error creating transaction', error);
    return errorResponse('Failed to create transaction', 500);
  }
};
