import type { ForecastFilters } from '@/lib/types/recurring';

const ACCOUNT_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_ACCOUNT_ID_LENGTH = 64;
export const MAX_FORECAST_ACCOUNT_IDS = 50;
const VALID_MONTH_COUNTS = [3, 6, 12, 24] as const;

export type ForecastMonthCount = (typeof VALID_MONTH_COUNTS)[number];

export function parseForecastType(value: string | null | undefined): ForecastFilters['type'] {
  if (value === 'income' || value === 'expense') return value;
  return undefined;
}

export function parseForecastStatus(value: string | null | undefined): ForecastFilters['status'] {
  if (value === 'active' || value === 'paused' || value === 'all') return value;
  return 'active';
}

export function normalizeForecastAccountIds(accountIds?: string[]): string[] | undefined {
  if (!accountIds || accountIds.length === 0) return undefined;

  const uniqueSorted = Array.from(
    new Set(
      accountIds
        .map((accountId) => accountId.trim())
        .filter(
          (accountId) =>
            accountId.length > 0 &&
            accountId.length <= MAX_ACCOUNT_ID_LENGTH &&
            ACCOUNT_ID_PATTERN.test(accountId)
        )
    )
  ).sort();

  if (uniqueSorted.length === 0) return undefined;
  return uniqueSorted.slice(0, MAX_FORECAST_ACCOUNT_IDS);
}

export function parseForecastAccountIds(params: URLSearchParams): string[] | undefined {
  const rawValues = params.getAll('accounts');
  if (rawValues.length === 0) return undefined;

  const parsed = rawValues.flatMap((value) => value.split(','));
  return normalizeForecastAccountIds(parsed);
}

export function parseForecastMonthCount(value: string | null | undefined): ForecastMonthCount {
  const num = Number(value);
  const validMonthCount = VALID_MONTH_COUNTS.find((monthCount) => monthCount === num);
  return validMonthCount ?? 12;
}

export function buildForecastFilters(
  params: URLSearchParams
): ForecastFilters & { monthCount: ForecastMonthCount } {
  const type = parseForecastType(params.get('type'));
  const status = parseForecastStatus(params.get('status'));
  const accountIds = parseForecastAccountIds(params);
  const monthCount = parseForecastMonthCount(params.get('monthCount'));

  return {
    ...(type && { type }),
    ...(status && { status }),
    ...(accountIds && { accountIds }),
    monthCount,
  };
}

export function normalizeForecastFilters(filters: ForecastFilters = {}): ForecastFilters {
  const type = parseForecastType(filters.type ?? null);
  const status = parseForecastStatus(filters.status ?? null);
  const accountIds = normalizeForecastAccountIds(filters.accountIds);

  return {
    ...(type && { type }),
    ...(status && { status }),
    ...(accountIds && { accountIds }),
  };
}
