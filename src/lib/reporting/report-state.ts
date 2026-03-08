/**
 * Shared report state helpers
 *
 * Provides URL-building and state normalization for report pages
 * (Overview, Expenses, Income) so filter context is preserved
 * when switching between sections.
 */

import type { Currency } from '@/lib/constants/currency';

export interface ReportState {
  range: 'monthly' | 'yearly';
  period: string;
  currency?: Currency;
  userId?: string;
}

/**
 * Build a report URL preserving filter state across sections.
 */
export function buildReportUrl(basePath: string, state: ReportState): string {
  const params = new URLSearchParams();
  params.set('range', state.range);
  params.set('period', state.period);

  if (state.currency) params.set('currency', state.currency);
  if (state.userId) params.set('user_id', state.userId);

  return `${basePath}?${params.toString()}`;
}

/**
 * Normalize mismatched period values.
 * E.g. when switching from monthly to yearly, "2026-02" → "2026".
 */
export function normalizeReportState(state: Partial<ReportState>): ReportState {
  const range = state.range ?? 'monthly';
  let period = state.period ?? '';

  if (range === 'yearly' && period.includes('-')) {
    period = period.split('-')[0];
  }

  if (range === 'monthly' && period.length === 4) {
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    period = `${period}-${month}`;
  }

  return {
    range,
    period,
    currency: state.currency,
    userId: state.userId,
  };
}

/**
 * Read report state from current URL search params.
 */
export function readReportStateFromUrl(url: URL): Partial<ReportState> {
  const state: Partial<ReportState> = {};

  const range = url.searchParams.get('range');
  if (range === 'monthly' || range === 'yearly') state.range = range;

  const period = url.searchParams.get('period');
  if (period) state.period = period;

  const currency = url.searchParams.get('currency');
  if (currency) state.currency = currency as Currency;

  const userId = url.searchParams.get('user_id');
  if (userId) state.userId = userId;

  return state;
}

/** Report section identifiers. */
export type ReportSection = 'overview' | 'expenses' | 'income';

/** Map section → base path. */
export const REPORT_SECTION_PATHS: Record<ReportSection, string> = {
  overview: '/reports',
  expenses: '/reports/expenses',
  income: '/reports/income',
};
