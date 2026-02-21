import {
  CURRENCY_META,
  DEFAULT_CURRENCY,
  isValidCurrency,
  type Currency,
} from '@/lib/constants/currency';

const compactThresholds = [
  { value: 1_000_000_000, suffix: 'B' },
  { value: 1_000_000, suffix: 'M' },
  { value: 1_000, suffix: 'K' },
] as const;

const numberFormatters = Object.fromEntries(
  Object.entries(CURRENCY_META).map(([code, meta]) => [
    code,
    new Intl.NumberFormat(meta.locale, {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    }),
  ])
) as Record<Currency, Intl.NumberFormat>;

const smallNumberFormatters = Object.fromEntries(
  Object.entries(CURRENCY_META).map(([code, meta]) => [
    code,
    new Intl.NumberFormat(meta.locale, {
      minimumFractionDigits: 0,
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

function formatCompactDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const fixed = rounded.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
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

export function formatCurrencyCompact(
  amount: number,
  currency: Currency | string = DEFAULT_CURRENCY
): string {
  const safeAmount = normalizeAmount(amount);
  const normalizedCurrency = normalizeCurrency(currency);
  const meta = CURRENCY_META[normalizedCurrency];
  const sign = safeAmount < 0 ? '-' : '';
  const absAmount = Math.abs(safeAmount);

  for (const threshold of compactThresholds) {
    if (absAmount >= threshold.value) {
      const compactValue = formatCompactDecimal(absAmount / threshold.value);
      return `${sign}${meta.symbol}${compactValue}${threshold.suffix}`;
    }
  }

  const formatted = smallNumberFormatters[normalizedCurrency].format(absAmount);
  return `${sign}${meta.symbol}${formatted}`;
}

export function formatCompactNumber(value: number): string {
  const safeAmount = normalizeAmount(value);
  const sign = safeAmount < 0 ? '-' : '';
  const absAmount = Math.abs(safeAmount);

  for (const threshold of compactThresholds) {
    if (absAmount >= threshold.value) {
      return `${sign}${formatCompactDecimal(absAmount / threshold.value)}${threshold.suffix}`;
    }
  }

  return `${sign}${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(absAmount)}`;
}
