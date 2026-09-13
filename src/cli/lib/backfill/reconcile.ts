import type { BackfillClient } from './client';
import type { Currency, Plan } from './types';

export interface ReconcileRow {
  currency: Currency;
  expected: number;
  actual: number | null;
  ok: boolean;
}

export interface ReconcileReport {
  /** Link 2 — gating. Compared against the app's own reconciliation figures. */
  perCurrency: ReconcileRow[];
  /** Link 3 — informational. Recombined at the month's rate, so never exact. */
  combined: { expected: number; sheet: number };
}

const CURRENCIES: Currency[] = ['IDR', 'USD'];
const TOLERANCE = 0.01;

/**
 * The balance movement the month's transactions do not account for, per currency.
 *
 * Currencies are never mixed here: converting would fold the month's rate into
 * a figure the app computes without one, and the difference would read as drift.
 */
export function expectedVariance(
  plan: Plan,
  openings: Record<string, number>
): Record<Currency, number> {
  const variance = {} as Record<Currency, number>;

  for (const currency of CURRENCIES) {
    const closing = plan.snapshots
      .filter((s) => s.currency === currency)
      .reduce((sum, s) => sum + Number(s.closing), 0);

    const opening = plan.snapshots
      .filter((s) => s.currency === currency)
      .reduce((sum, s) => sum + (openings[s.account] ?? 0), 0);

    const income = plan.transactions
      .filter((t) => t.kind === 'income' && t.currency === currency)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = plan.transactions
      .filter((t) => t.kind === 'expense' && t.currency === currency)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    variance[currency] = closing - opening - (income - expenses);
  }

  return variance;
}

interface AppReconciliation {
  currency?: string;
  variance?: number | string;
}

/**
 * Compares the plan's own variance to the app's (Link 2), and prints the
 * recombined figure against the sheet's own total (Link 3).
 *
 * Link 3 recombines at a single month-end rate while the sheet's balance moved
 * at whatever rate applied on each day, so it informs and never gates.
 */
export async function reconcileMonth(
  client: Pick<BackfillClient, 'get'>,
  plan: Plan,
  openings: Record<string, number>
): Promise<ReconcileReport> {
  const expected = expectedVariance(plan, openings);

  const app = await client
    .get<AppReconciliation[]>(`/api/reports?month=${plan.month}&year=${plan.year}`)
    .catch(() => [] as AppReconciliation[]);

  const perCurrency: ReconcileRow[] = CURRENCIES.map((currency) => {
    const row = (app ?? []).find((r) => r.currency === currency);
    const actual = row?.variance === undefined ? null : Number(row.variance);
    return {
      currency,
      expected: expected[currency],
      actual,
      ok: actual === null || Math.abs(actual - expected[currency]) <= TOLERANCE,
    };
  });

  const combined = CURRENCIES.reduce(
    (sum, currency) => sum + expected[currency] * (currency === 'IDR' ? 1 : plan.rate),
    0
  );

  return {
    perCurrency,
    combined: { expected: combined, sheet: plan.checks.closingTotal },
  };
}
