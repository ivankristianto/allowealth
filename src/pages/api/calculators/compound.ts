/**
 * POST /api/calculators/compound: yearly compound interest schedule.
 * `?_render=html` returns the rendered CalculatorResultsPartial instead of JSON.
 */

import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { integer, maxValue, minValue, object, pipe, number } from 'valibot';
import {
  successResponse,
  errorResponse,
  getAuthenticatedUser,
  isValidationError,
  validateBody,
} from '@/lib/api-utils';
import {
  HTML_RENDER_REQUEST_REQUIRED_MESSAGE,
  createRenderHelper,
  isRejectedHtmlRenderRequest,
} from '@/lib/api/renderResponse';
import { workspaceMetaService } from '@/services';
import type { YearlyData } from '@/components/molecules/GrowthScheduleTable.astro';
import CalculatorResultsPartial from '@/components/partials/CalculatorResultsPartial.astro';
import { createLogger } from '@/lib/logger';

const log = createLogger('calculators');

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
  const render = createRenderHelper(context.url, context.request);

  if (isRejectedHtmlRenderRequest(context.url, context.request)) {
    return render.error(HTML_RENDER_REQUEST_REQUIRED_MESSAGE, 403);
  }

  try {
    // Auth check - user must be logged in
    const auth = getAuthenticatedUser(context);
    const currency = await workspaceMetaService.getCurrency(auth.workspaceId);

    const validation = await validateBody(context.request, compoundInputSchema);

    if (isValidationError(validation)) {
      if (render.wantsHtml()) {
        return render.error(validation.error.issues[0]?.message ?? 'Validation failed', 400);
      }
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

    const results = { totalInterest, finalBalance, yearlyData, currency };

    if (render.wantsHtml()) {
      const container = await AstroContainer.create();
      const html = await container.renderToString(CalculatorResultsPartial, { props: results });
      return render.html(html);
    }

    return successResponse(results);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return render.wantsHtml()
        ? render.error('Unauthorized', 401)
        : errorResponse('Unauthorized', 401);
    }
    log.error('Error calculating compound interest', error);
    return render.wantsHtml()
      ? render.error('Failed to calculate. Please try again.', 500)
      : errorResponse('Failed to calculate. Please try again.', 500);
  }
};
