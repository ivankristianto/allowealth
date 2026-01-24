import type { APIRoute } from 'astro';
import { transactionService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  requireAuth,
  getPaginationParams,
  isValidDate,
  isValidationError,
} from '@/lib/api-utils';
import { createTransactionAPISchema } from '@/lib/validation';
import { logError, transformTransaction, safeParseAmount } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants/pagination';

/**
 * GET /api/transactions
 * List all transactions with optional filters
 */
export const GET: APIRoute = async (context) => {
  try {
    const userId = await requireAuth(context);
    const { url } = context;

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

    // Handle multiple category IDs (comma-separated)
    const categoryIds = url.searchParams.get('category_ids');
    if (categoryIds) {
      filters.category_ids = categoryIds.split(',').filter(Boolean);
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

    const rawTransactions = await transactionService.findAll(filters);
    const total = await transactionService.count(filters);

    // Transform to TransactionOutput format (snake_case for payment_method)
    const transactions = rawTransactions.map(transformTransaction);

    // Calculate month-based summary (only uses date range, not other filters)
    // This summary stays constant regardless of type/category/search filters
    let monthSummary = null;
    if (filters.start_date && filters.end_date) {
      const monthTransactions = await transactionService.findAll({
        user_id: userId,
        start_date: filters.start_date,
        end_date: filters.end_date,
        limit: PAGINATION.MAX_MONTH_TRANSACTIONS,
      });

      let income = 0;
      let expenses = 0;
      let expenseCount = 0;

      monthTransactions.forEach((t: any) => {
        const amount = safeParseAmount(t.amount);
        if (t.type === 'income') {
          income += amount;
        } else {
          expenses += Math.abs(amount);
          expenseCount++;
        }
      });

      monthSummary = {
        income,
        expenses,
        transactionCount: expenseCount,
      };
    }

    return successResponse({
      transactions,
      pagination: {
        limit,
        offset,
        total,
      },
      ...(monthSummary && { summary: monthSummary }),
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
export const POST: APIRoute = async (context) => {
  try {
    const userId = await requireAuth(context);
    const { request } = context;

    // Validate Content-Type header
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return errorResponse('Content-Type must be application/json', 415, 'UNSUPPORTED_MEDIA_TYPE');
    }

    const validation = await validateBody(request, createTransactionAPISchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    // Convert date string (YYYY-MM-DD) to Date object
    // The validation ensures the string is in the correct format
    const transactionDate = new Date(validation.data.transaction_date + 'T00:00:00.000Z');

    const rawTransaction = await transactionService.create({
      user_id: userId,
      type: validation.data.type,
      amount: validation.data.amount,
      currency: validation.data.currency,
      category_id: validation.data.category_id,
      payment_method_id: validation.data.payment_method_id,
      transaction_date: transactionDate,
      description: validation.data.description,
    });

    return successResponse(transformTransaction(rawTransaction), 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error creating transaction', error);
    return errorResponse('Failed to create transaction', 500);
  }
};
