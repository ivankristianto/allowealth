import type { APIRoute } from 'astro';
import { transactionService } from '@/services';
import type { CSVRow } from '@/services/transaction.service';
import { successResponse, errorResponse, requireAuth } from '@/lib/api-utils';
import { logError } from '@/lib/utils';

/**
 * POST /api/transactions/import
 * Import transactions from CSV file
 */
export const POST: APIRoute = async ({ request, url }) => {
  try {
    const userId = await requireAuth({ request, url } as any);

    // Parse form data with file
    const formData = await request.formData();
    const file = formData.get('csv_file') as File;

    if (!file) {
      return errorResponse('CSV file is required', 400);
    }

    if (!file.name.endsWith('.csv')) {
      return errorResponse('File must be a CSV', 400);
    }

    // Read file content
    const text = await file.text();

    // Parse CSV
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      return errorResponse('CSV file must contain at least a header row and one data row', 400);
    }

    // Parse header
    const headers = parseCSVLine(lines[0] ?? '');

    // Get column mapping from form data
    const columnMapping: Record<string, string> = {
      date: (formData.get('map_date') as string) || 'date',
      type: (formData.get('map_type') as string) || 'type',
      amount: (formData.get('map_amount') as string) || 'amount',
      currency: (formData.get('map_currency') as string) || 'currency',
      category: (formData.get('map_category') as string) || 'category',
      payment_method: (formData.get('map_payment_method') as string) || 'payment_method',
      description: (formData.get('map_description') as string) || 'description',
    };

    // Parse data rows
    const rows: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i] ?? '');
      if (values.length >= headers.length) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header.trim().toLowerCase()] = values[index]?.trim() || '';
        });
        rows.push(row as CSVRow);
      }
    }

    // Import transactions
    const result = await transactionService.importFromCSV(userId, rows, columnMapping);

    return successResponse({
      message: 'Import completed',
      result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error importing transactions', error);
    return errorResponse('Failed to import transactions', 500);
  }
};

/**
 * Parse a CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current);

  return result;
}
