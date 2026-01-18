import type { APIRoute } from 'astro';
import { transactionService } from '@/services';
import { errorResponse, requireAuth, isValidDate } from '@/lib/api-utils';
import { logError } from '@/lib/utils';

/**
 * GET /api/transactions/export
 * Export transactions to CSV
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = await requireAuth({ request, url } as any);

    // Parse filter params (same as list endpoint)
    const filters: any = {
      user_id: userId,
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

    // Generate CSV
    const csv = await transactionService.exportToCSV(filters);

    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const filename = `transactions_${today}.csv`;

    // Return CSV file
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error exporting transactions', error);
    return errorResponse('Failed to export transactions', 500);
  }
};
