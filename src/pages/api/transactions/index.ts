import type { APIRoute } from 'astro';
import { z } from 'zod';
import { transactionService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  requireAuth,
  getPaginationParams,
} from '@/lib/api-utils';

// Validation schemas
const createTransactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid number with up to 2 decimal places'),
  currency: z.enum(['IDR', 'USD']),
  category_id: z.string().min(1),
  payment_method_id: z.string().min(1),
  transaction_date: z.string().datetime(),
  description: z.string().optional(),
});

/**
 * GET /api/transactions
 * List all transactions with optional filters
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = requireAuth({ request, url } as any);

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
      filters.start_date = new Date(startDate);
    }

    const endDate = url.searchParams.get('end_date');
    if (endDate) {
      filters.end_date = new Date(endDate);
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
    console.error('Error fetching transactions:', error);
    return errorResponse('Failed to fetch transactions', 500);
  }
};

/**
 * POST /api/transactions
 * Create a new transaction
 */
export const POST: APIRoute = async ({ request, url }) => {
  try {
    const userId = requireAuth({ request, url } as any);

    const validation = await validateBody(request, createTransactionSchema);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const transaction = await transactionService.create({
      user_id: userId,
      type: validation.data.type,
      amount: validation.data.amount,
      currency: validation.data.currency,
      category_id: validation.data.category_id,
      payment_method_id: validation.data.payment_method_id,
      transaction_date: new Date(validation.data.transaction_date),
      description: validation.data.description,
    });

    return successResponse(transaction, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Error creating transaction:', error);
    return errorResponse('Failed to create transaction', 500);
  }
};
