import type { Currency, MonthRef } from './types';

/**
 * Decimal representation, and nothing wider. Every comparison in the
 * verification links uses this: a real routing or rounding error exceeds it,
 * while decimal representation noise does not.
 */
export const TOLERANCE = 0.01;

export const LOCAL_CURRENCY: Currency = 'IDR';

/** Converts a foreign amount into the local currency at the month's rate. */
export function toLocal(
  amount: string | number,
  currency: string | undefined,
  rate: number
): number {
  return currency === LOCAL_CURRENCY || currency === undefined
    ? Number(amount)
    : Number(amount) * rate;
}

/**
 * Converts a local-currency amount into a foreign currency at the month's rate.
 *
 * The exports write every balance in local currency, including for accounts the
 * app holds in a foreign one, so this recovers the figure the account is
 * denominated in.
 */
export function fromLocal(
  amount: string | number,
  currency: string | undefined,
  rate: number
): number {
  return currency === LOCAL_CURRENCY || currency === undefined
    ? Number(amount)
    : Number(amount) / rate;
}

export function lastDayOfMonth({ month, year }: MonthRef): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Formats a decimal as the API's amount string: no separators, no exponent. */
export function decimal(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export function closeEnough(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE;
}

/** Months as a single comparable number, so ordering needs no nested compare. */
export function ordinal({ month, year }: MonthRef): number {
  return year * 12 + month;
}

export function sameMonth(a: MonthRef, b: MonthRef): boolean {
  return a.month === b.month && a.year === b.year;
}

export function nextMonth({ month, year }: MonthRef): MonthRef {
  return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };
}
