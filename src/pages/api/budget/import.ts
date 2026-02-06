import type { APIRoute } from 'astro';
import { budgetService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';

/**
 * POST /api/budget/import
 * Import budget amounts from CSV file (update existing budgets by ID)
 * FormData: csv_file, month, year, currency
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    const formData = await context.request.formData();
    const csvFile = formData.get('csv_file') as File | null;
    const month = parseInt(formData.get('month') as string, 10);
    const year = parseInt(formData.get('year') as string, 10);
    const currency = formData.get('currency') as 'IDR' | 'USD';

    if (!csvFile) {
      return errorResponse('CSV file is required', 400);
    }

    // Limit file size to 1MB to prevent memory issues
    if (csvFile.size > 1_000_000) {
      return errorResponse('CSV file too large (max 1MB)', 413);
    }

    if (isNaN(month) || month < 1 || month > 12) {
      return errorResponse('Invalid month parameter', 400);
    }

    if (isNaN(year) || year < 2000 || year > 2100) {
      return errorResponse('Invalid year parameter', 400);
    }

    if (currency !== 'IDR' && currency !== 'USD') {
      return errorResponse('Invalid currency parameter', 400);
    }

    // Parse CSV — strip BOM, normalize line endings
    const rawText = await csvFile.text();
    const csvText = rawText
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    const lines = csvText.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      return errorResponse('CSV file must have a header row and at least one data row', 400);
    }

    // Parse header using the same CSV parser as data rows
    const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
    const idIdx = header.indexOf('budget_id');
    const amountIdx = header.indexOf('budget_amount');

    if (idIdx === -1 || amountIdx === -1) {
      return errorResponse('CSV must contain "budget_id" and "budget_amount" columns', 400);
    }

    // Parse rows (skip header)
    const rows: Array<{ budget_id: string; budget_amount: string }> = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]);
      const budgetId = cells[idIdx]?.trim();
      if (!budgetId) continue;

      rows.push({
        budget_id: budgetId,
        budget_amount: cells[amountIdx]?.trim() || '0',
      });
    }

    if (rows.length === 0) {
      return errorResponse('No valid data rows found in CSV', 400);
    }

    const result = await budgetService.importFromCSV(auth.workspaceId, rows, month, year, currency);

    return successResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error importing budget', error);
    const message = error instanceof Error ? error.message : 'Failed to import budget';
    return errorResponse(message, 500);
  }
};

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        cells.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  cells.push(current);

  return cells;
}
