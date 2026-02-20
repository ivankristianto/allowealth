import { getMonthName } from '@/lib/utils/date';
import { PERIOD_SELECTOR_MONTH_LIMIT } from '@/lib/constants/period';

export interface BudgetPeriodOption {
  value: string;
  label: string;
}

interface BuildBudgetPeriodOptionsParams {
  selectedYear: number;
  selectedMonth: number;
  currentYear: number;
  currentMonth: number;
  allowNextMonthNavigation: boolean;
  lookbackMonths?: number;
}

function toDate(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}

function toPeriodKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function toPeriodLabel(date: Date): string {
  return `${getMonthName(date.getMonth() + 1)} ${date.getFullYear()}`;
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

export function parseBudgetPeriodKey(period: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

export function buildBudgetUrlForPeriod(period: string, currency: Currency): string {
  const parsed = parseBudgetPeriodKey(period);
  if (!parsed) return `/budget?currency=${currency}`;

  const params = new URLSearchParams();
  params.set('year', String(parsed.year));
  params.set('month', String(parsed.month));
  params.set('currency', currency);
  return `/budget?${params.toString()}`;
}

export function buildBudgetPeriodOptions({
  selectedYear,
  selectedMonth,
  currentYear,
  currentMonth,
  allowNextMonthNavigation,
  lookbackMonths = PERIOD_SELECTOR_MONTH_LIMIT,
}: BuildBudgetPeriodOptionsParams): BudgetPeriodOption[] {
  const selectedDate = toDate(selectedYear, selectedMonth);
  const currentDate = toDate(currentYear, currentMonth);
  const nextSelectedDate = toDate(selectedYear, selectedMonth + 1);

  const candidateLatest = allowNextMonthNavigation ? nextSelectedDate : selectedDate;
  const latestDate = maxDate(currentDate, candidateLatest);

  const boundedLookback = Math.max(1, lookbackMonths);
  const lookbackStartDate = toDate(
    latestDate.getFullYear(),
    latestDate.getMonth() + 2 - boundedLookback
  );
  const startDate = minDate(selectedDate, lookbackStartDate);

  const options: BudgetPeriodOption[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (cursor.getTime() <= latestDate.getTime()) {
    options.push({
      value: toPeriodKey(cursor),
      label: toPeriodLabel(cursor),
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Latest first to match selector navigation semantics across the app.
  return options.reverse();
}
