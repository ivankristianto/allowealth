/**
 * Reports API Endpoint
 *
 * Supports both JSON and HTML responses for interactive reports page.
 *
 * Query Parameters:
 * - _render: 'json' | 'html' (default: 'json')
 * - _partial: 'all' | 'summary' | 'charts' | 'table' (default: 'all')
 * - range: 'monthly' | 'yearly' (default: 'monthly')
 * - period: Period key (e.g., '2024-02' for monthly, '2024' for yearly)
 *
 * @TODO: Wire with backend - Replace mock data with actual database queries
 */

import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import ReportSummaryCardsPartial from '@/components/partials/ReportSummaryCardsPartial.astro';
import ReportChartsPartial from '@/components/partials/ReportChartsPartial.astro';
import CategoryTablePartial from '@/components/partials/CategoryTablePartial.astro';

// Mock data generation based on range and period
function getMockReportData(range: 'monthly' | 'yearly', period: string) {
  if (range === 'yearly') {
    // Yearly mock data (aggregated for full year)
    return {
      summary: {
        totalIncome: 95700000, // Sum of 12 months
        totalExpenses: 80070000, // Sum of 12 months
        netSavings: 15630000,
        budgetHealth: 53, // percentage
        expenseCategories: 7,
      },
      expenseByCategory: [
        { name: 'Housing', value: 33600000 },
        { name: 'Transport', value: 21600000 },
        { name: 'Dining', value: 9360000 },
        { name: 'Utilities', value: 7200000 },
        { name: 'Groceries', value: 4320000 },
        { name: 'Entertainment', value: 2880000 },
        { name: 'Health', value: 1110000 },
      ],
      trendData: [
        { name: 'Jan', income: 9750000, expenses: 8500000 },
        { name: 'Feb', income: 9750000, expenses: 4735000 },
        { name: 'Mar', income: 7500000, expenses: 6200000 },
        { name: 'Apr', income: 8200000, expenses: 7100000 },
        { name: 'May', income: 7800000, expenses: 6800000 },
        { name: 'Jun', income: 8100000, expenses: 7000000 },
        { name: 'Jul', income: 7900000, expenses: 6500000 },
        { name: 'Aug', income: 8300000, expenses: 6900000 },
        { name: 'Sep', income: 7700000, expenses: 6300000 },
        { name: 'Oct', income: 8200000, expenses: 6900000 },
        { name: 'Nov', income: 8000000, expenses: 6500000 },
        { name: 'Dec', income: 4500000, expenses: 6635000 },
      ],
      categoryIntelligence: [
        { id: '1', name: 'Housing', spent: 33600000, budgetLimit: 40000000 },
        { id: '2', name: 'Transport', spent: 21600000, budgetLimit: 30000000 },
        { id: '3', name: 'Dining', spent: 9360000, budgetLimit: 36000000 },
        { id: '4', name: 'Utilities', spent: 7200000, budgetLimit: 48000000 },
        { id: '5', name: 'Groceries', spent: 4320000, budgetLimit: 96000000 },
        { id: '6', name: 'Entertainment', spent: 2880000, budgetLimit: 18000000 },
        { id: '7', name: 'Health', spent: 1110000, budgetLimit: null },
      ],
      resourceAllocationSubtitle: 'YEARLY EXPENSE BREAKDOWN',
      financialVelocitySubtitle: `${period} FLOW`,
    };
  }

  // Monthly mock data (default: February 2024)
  return {
    summary: {
      totalIncome: 9750000,
      totalExpenses: 4735000,
      netSavings: 5015000,
      budgetHealth: 8, // percentage
      expenseCategories: 6,
    },
    expenseByCategory: [
      { name: 'Utilities', value: 1850000 },
      { name: 'Dining', value: 905000 },
      { name: 'Health', value: 750000 },
      { name: 'Transport', value: 595000 },
      { name: 'Entertainment', value: 420000 },
      { name: 'Groceries', value: 215000 },
    ],
    trendData: [
      { name: 'Dec', income: 25245000, expenses: 33719000 },
      { name: 'Jan', income: 60525000, expenses: 41816000 },
      { name: 'Feb', income: 9750000, expenses: 4735000 },
    ],
    categoryIntelligence: [
      { id: '1', name: 'Utilities', spent: 1850000, budgetLimit: 4000000 },
      { id: '2', name: 'Dining', spent: 905000, budgetLimit: 3000000 },
      { id: '3', name: 'Health', spent: 750000, budgetLimit: null },
      { id: '4', name: 'Transport', spent: 595000, budgetLimit: 2500000 },
      { id: '5', name: 'Entertainment', spent: 420000, budgetLimit: 1500000 },
      { id: '6', name: 'Groceries', spent: 215000, budgetLimit: 8000000 },
      { id: '7', name: 'Housing', spent: 0, budgetLimit: 40000000 },
    ],
    resourceAllocationSubtitle: 'EXPENSE MIX',
    financialVelocitySubtitle: 'TRAILING 3 MONTHS',
  };
}

export const GET: APIRoute = async ({ url }) => {
  // Parse and validate query parameters
  const renderParam = url.searchParams.get('_render');
  const render = renderParam === 'html' ? 'html' : 'json';

  const partialParam = url.searchParams.get('_partial');
  const validPartials = ['all', 'summary', 'charts', 'table'];
  const partial = validPartials.includes(partialParam || '') ? partialParam! : 'all';

  const rangeParam = url.searchParams.get('range');
  const range: 'monthly' | 'yearly' = rangeParam === 'yearly' ? 'yearly' : 'monthly';

  // Validate period format (YYYY-MM for monthly, YYYY for yearly)
  const periodParam = url.searchParams.get('period') || '';
  const monthlyRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
  const yearlyRegex = /^\d{4}$/;
  const isValidPeriod =
    range === 'monthly' ? monthlyRegex.test(periodParam) : yearlyRegex.test(periodParam);
  const period = isValidPeriod ? periodParam : range === 'monthly' ? '2024-02' : '2024';

  // @TODO: Wire with backend - Replace with actual data fetching
  // Example: const data = await reportsService.getReportData(userId, range, period);
  const data = getMockReportData(range, period);

  // Return JSON response
  if (render === 'json') {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Return HTML response
  if (render === 'html') {
    try {
      const container = await AstroContainer.create();
      let html = '';

      // Render requested partials
      if (partial === 'all' || partial === 'summary') {
        const summaryHtml = await container.renderToString(ReportSummaryCardsPartial, {
          props: data.summary,
        });
        html += `<!-- PARTIAL:summary -->\n${summaryHtml}\n`;
      }

      if (partial === 'all' || partial === 'charts') {
        const chartsHtml = await container.renderToString(ReportChartsPartial, {
          props: {
            expenseByCategory: data.expenseByCategory,
            trendData: data.trendData,
            resourceAllocationSubtitle: data.resourceAllocationSubtitle,
            financialVelocitySubtitle: data.financialVelocitySubtitle,
          },
        });
        html += `<!-- PARTIAL:charts -->\n${chartsHtml}\n`;
      }

      if (partial === 'all' || partial === 'table') {
        const tableHtml = await container.renderToString(CategoryTablePartial, {
          props: {
            categories: data.categoryIntelligence,
            subtitle: 'SORTED BY FUNCTIONAL VOLUME',
          },
        });
        html += `<!-- PARTIAL:table -->\n${tableHtml}\n`;
      }

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    } catch (error) {
      console.error('Error rendering partials:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  return new Response('Bad Request: Invalid _render parameter', { status: 400 });
};
