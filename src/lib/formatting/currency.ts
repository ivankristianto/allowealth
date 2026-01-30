import Decimal from 'decimal.js';
import { DEFAULT_CURRENCY, type Currency } from '@/lib/constants/currency';
import {
  formatCurrency as formatCurrencyCore,
  formatCurrencyCompact as formatCurrencyCompactCore,
} from './currency-core';

Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
});

function safeDecimal(value: unknown): Decimal | null {
  try {
    const decimal = new Decimal((value ?? '0') as string | number);
    return decimal.isFinite() ? decimal : null;
  } catch {
    return null;
  }
}

function toNumber(value: string | number): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const decimal = safeDecimal(value);
  if (decimal === null) {
    return 0;
  }

  return decimal.toNumber();
}

export function formatCurrency(
  amount: string | number,
  currency: Currency | string = DEFAULT_CURRENCY
): string {
  return formatCurrencyCore(toNumber(amount), currency);
}

export function formatCurrencyCompact(
  amount: string | number,
  currency: Currency | string = DEFAULT_CURRENCY
): string {
  return formatCurrencyCompactCore(toNumber(amount), currency);
}
