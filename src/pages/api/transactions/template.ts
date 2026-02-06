import type { APIRoute } from 'astro';

/**
 * GET /api/transactions/template
 * Returns a CSV template file with expected column headers and a sample row.
 */
export const GET: APIRoute = async () => {
  const headers = ['date', 'type', 'amount', 'currency', 'category', 'asset', 'description'];
  const sampleRow = [
    '2025-01-15',
    'expense',
    '150000',
    'IDR',
    'Food & Dining',
    'Bank Account',
    'Lunch',
  ];

  const csv = [headers.join(','), sampleRow.join(',')].join('\n');

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="transactions-template.csv"',
    },
  });
};
