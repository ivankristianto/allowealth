import type { APIRoute } from 'astro';
import { budgetService } from '@/services';
import { errorResponse, requireAuth } from '@/lib/api-utils';
import { logError } from '@/lib/utils';

/**
 * GET /api/budget/export
 * Export budget overview to CSV
 * Query params: year, month, currency
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = await requireAuth({ request, url } as any);

    const yearParam = url.searchParams.get('year');
    const monthParam = url.searchParams.get('month');
    const currency = url.searchParams.get('currency') as 'IDR' | 'USD' | null;

    // Default to current month if not specified
    const now = new Date();
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
    const selectedCurrency = currency || 'IDR';

    // Validate inputs
    if (isNaN(year) || year < 2000 || year > 2100) {
      return errorResponse('Invalid year parameter', 400);
    }

    if (isNaN(month) || month < 1 || month > 12) {
      return errorResponse('Invalid month parameter', 400);
    }

    if (selectedCurrency !== 'IDR' && selectedCurrency !== 'USD') {
      return errorResponse('Invalid currency parameter', 400);
    }

    // Generate CSV
    const csv = await budgetService.exportToCSV(userId, year, month, selectedCurrency);

    // Generate filename with date
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const monthName = monthNames[month - 1];
    const filename = `budget_${year}_${monthName}.csv`;

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
    logError('Error exporting budget', error);
    return errorResponse('Failed to export budget', 500);
  }
};
