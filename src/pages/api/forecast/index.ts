/**
 * Forecast API Endpoint
 *
 * GET /api/forecast
 * Calculate wealth trajectory forecast based on user's current accounts
 * and projected monthly contributions with interest rates.
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { accountService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import {
  calculateForecast,
  aggregateAccountHistory,
  mergeRealAndForecast,
  calculateGrowthMultiple,
  calculateCurrentTotal,
  type ForecastResult,
  type AccountWithHistory,
} from '@/lib/forecast';
import Decimal from 'decimal.js';

// Validation schema for query parameters
const forecastQuerySchema = z.object({
  monthlyTopup: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0 && num <= 1000000000000; // Max 1 trillion IDR
      },
      { message: 'Monthly top-up must be between 0 and 1 trillion IDR' }
    )
    .transform((val) => (val ? parseFloat(val) : 5000000)), // Default: 5M IDR
  annualRate: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0 && num <= 100;
      },
      { message: 'Annual rate must be between 0 and 100%' }
    )
    .transform((val) => (val ? parseFloat(val) : 7)), // Default: 7%
  years: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const num = parseInt(val);
        return !isNaN(num) && num >= 1 && num <= 30; // Max 30 years per OpenAPI spec
      },
      { message: 'Years must be between 1 and 30' }
    )
    .transform((val) => (val ? parseInt(val) : 10)), // Default: 10 years
});

/**
 * GET /api/forecast
 * Calculate and return wealth trajectory forecast
 *
 * Query Parameters:
 * - monthlyTopup: Monthly contribution amount in IDR (default: 5000000)
 * - annualRate: Annual percentage yield (default: 7)
 * - years: Number of years to forecast (default: 10)
 *
 * Response:
 * - dataPoints: Array of monthly forecast data points
 * - summary: { year10Target, totalInterest, growthMultiple, currentTotal }
 * - input: { monthlyTopup, annualRate, years }
 */
export const GET: APIRoute = async (context) => {
  const { url } = context;

  try {
    const auth = getAuthenticatedUser(context);

    // Validate and parse query parameters
    const queryParams = {
      monthlyTopup: url.searchParams.get('monthlyTopup'),
      annualRate: url.searchParams.get('annualRate'),
      years: url.searchParams.get('years'),
    };

    const validation = forecastQuerySchema.safeParse(queryParams);

    // @TODO: P3 - Standardize error response format across all endpoints for consistency
    if (!validation.success) {
      return errorResponse(
        'Invalid query parameters',
        400,
        'VALIDATION_ERROR',
        validation.error.issues
      );
    }

    const { monthlyTopup, annualRate, years } = validation.data;

    // @TODO: Mock data - Add development mode check to return mock forecast data when no real accounts exist
    // This would allow testing the forecast UI without seeding account history data
    // Example: if (isDev && accountsWithHistory.length === 0) return mockForecastResponse()

    // Fetch workspace's accounts with history
    const accountsWithHistory = await accountService.findAllWithHistory(auth.workspaceId);

    // Convert to forecast-compatible format
    const forecastAccounts: AccountWithHistory[] = accountsWithHistory.map((account) => ({
      balance: parseFloat(account.balance),
      currency: account.currency as 'IDR' | 'USD',
      history: account.history,
    }));

    // Calculate current total
    const currentTotal = calculateCurrentTotal(forecastAccounts);

    // Generate forecast data
    const forecastData = calculateForecast(currentTotal, monthlyTopup, annualRate, years);

    // Aggregate real historical data
    const realHistoricalData = aggregateAccountHistory(forecastAccounts);

    // Merge real and forecast data
    const mergedData = mergeRealAndForecast(realHistoricalData, forecastData);

    // Calculate summary statistics
    const finalDataPoint = mergedData[mergedData.length - 1];
    const totalInterest = mergedData.reduce(
      (sum, point) => new Decimal(sum).plus(point.forecastInterest).toNumber(),
      0
    );
    const growthMultiple = calculateGrowthMultiple(finalDataPoint.forecastBalance, currentTotal);

    const result: ForecastResult = {
      dataPoints: mergedData,
      summary: {
        year10Target: finalDataPoint.forecastBalance,
        totalInterest: Math.round(totalInterest),
        growthMultiple,
        currentTotal: Math.round(currentTotal),
      },
      input: {
        monthlyTopup,
        annualRate,
        years,
      },
    };

    return successResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error calculating forecast', error);
    return errorResponse('Failed to calculate forecast', 500);
  }
};
