import {
  CURRENCY_META,
  DEFAULT_CURRENCY,
  isValidCurrency,
  type Currency,
} from '@/lib/constants/currency';

const numberFormatters = Object.fromEntries(
  Object.entries(CURRENCY_META).map(([code, meta]) => [
    code,
    new Intl.NumberFormat(meta.locale, {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    }),
  ])
) as Record<Currency, Intl.NumberFormat>;

function normalizeCurrency(code?: Currency | string): Currency {
  if (code && isValidCurrency(code)) {
    return code;
  }
  return DEFAULT_CURRENCY;
}

function normalizeAmount(amount: number): number {
  return Number.isFinite(amount) ? amount : 0;
}

export function formatCurrency(
  amount: number,
  currency: Currency | string = DEFAULT_CURRENCY
): string {
  const safeAmount = normalizeAmount(amount);
  const normalizedCurrency = normalizeCurrency(currency);
  const meta = CURRENCY_META[normalizedCurrency];
  const sign = safeAmount < 0 ? '-' : '';
  const formatted = numberFormatters[normalizedCurrency].format(Math.abs(safeAmount));
  return `${sign}${meta.symbol}${formatted}`;
}
