import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

// SQLite reads a decimal TEXT amount as REAL, so summing it directly drifts by
// fractions of a cent. Every currency stores at most 2 decimals (CURRENCY_META
// `decimals`, AMOUNT_PATTERN), so summing whole cents and dividing once is exact.
const MINOR_UNITS = 100;

/** One row's amount as integer cents. */
export function moneyCents(amount: SQLWrapper): SQL<number> {
  return sql<number>`CAST(ROUND(${amount} * ${sql.raw(String(MINOR_UNITS))}) AS INTEGER)`;
}

/** Sum of integer cents, for ORDER BY and comparisons. */
export function sumCents(cents: SQLWrapper): SQL<number> {
  return sql<number>`COALESCE(SUM(${cents}), 0)`;
}

/** Exact money total of a cents expression, 0 when there are no rows. */
export function sumMoney(cents: SQLWrapper): SQL<string> {
  return sql<string>`(${sumCents(cents)} / ${sql.raw(`${MINOR_UNITS}.0`)})`;
}

/** Exact money total of an amount column. */
export function sumAmount(amount: SQLWrapper): SQL<string> {
  return sumMoney(moneyCents(amount));
}
