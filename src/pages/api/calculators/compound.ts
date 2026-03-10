/**
 * Compound Interest Calculator API Endpoint
 *
 * POST /api/calculators/compound
 * Calculate compound interest and return results
 */

import type { APIRoute } from 'astro';
import { integer, maxValue, minValue, object, pipe, number } from 'valibot';
import {
  successResponse,
  errorResponse,
  getAuthenticatedUser,
  isValidationError,
  validateBody,
} from '@/lib/api-utils';
import { workspaceMetaService } from '@/services';
import type { YearlyData } from '@/components/molecules/GrowthScheduleTable.astro';

// Validation schema for request body
const compoundInputSchema = object({
  principal: pipe(
    number(),
    minValue(0, 'Principal must be positive'),
    maxValue(1000000000000, 'Principal must be less than 1 trillion')
  ),
  rate: pipe(
    number(),
    minValue(0, 'Rate must be positive'),
    maxValue(100, 'Rate must be less than 100')
  ),
  years: pipe(
    number(),
    integer('Years must be an integer'),
    minValue(1, 'Years must be at least 1'),
    maxValue(50, 'Years must be at most 50')
  ),
});

export const POST: APIRoute = async (context) => {
  try {
    // Auth check - user must be logged in
    const auth = getAuthenticatedUser(context);
    const currency = await workspaceMetaService.getCurrency(auth.workspaceId);

    const validation = await validateBody(context.request, compoundInputSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { principal, rate, years } = validation.data;

    // Calculate compound interest
    const yearlyData: YearlyData[] = [];
    let currentBalance = principal;

    for (let year = 1; year <= years; year++) {
      const openingBalance = currentBalance;
      const interest = currentBalance * (rate / 100);
      currentBalance += interest;

      yearlyData.push({
        year,
        openingBalance,
        interest,
        closingBalance: currentBalance,
      });
    }

    // Calculate totals
    const totalInterest = yearlyData.reduce((sum, res) => sum + res.interest, 0);
    const finalBalance = yearlyData[yearlyData.length - 1].closingBalance;

    // Return JSON response
    return successResponse({
      totalInterest,
      finalBalance,
      yearlyData,
      currency,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Error calculating compound interest:', error);
    return errorResponse('Failed to calculate. Please try again.', 500);
  }
};
