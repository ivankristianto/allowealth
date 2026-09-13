import type { BackfillClient } from './client';
import { closeEnough, LOCAL_CURRENCY } from './money';
import { fetchMonthTransactions } from './purge';
import type { Currency, Plan } from './types';

export interface ReconcileRow {
  currency: Currency;
  /** Variance the plan predicts: (Σ closing − Σ opening) − (Σ income − Σ expenses). */
  expected: number;
  /** The same figure computed from what actually landed in the app. */
  actual: number;
  ok: boolean;
}

export interface ReconcileReport {
  /** Link 2 — gating. The app's own state must reconcile the way the plan predicts. */
  perCurrency: ReconcileRow[];
  /** Link 3 — informational. Recombined at one month-end rate, so never exact. */
  combined: { expected: number; sheet: number };
}

const CURRENCIES: Currency[] = ['IDR', 'USD'];

/**
 * The balance movement the month's transactions do not account for, per currency.
 *
 * Currencies are never mixed here: converting would fold the month's rate into a
 * figure computed without one, and the difference would read as drift.
 */
export function expectedVariance(
  plan: Plan,
  openings: Record<string, number>
): Record<Currency, number> {
  const variance = {} as Record<Currency, number>;

  for (const currency of CURRENCIES) {
    const accounts = plan.snapshots.filter((s) => s.currency === currency);
    const closing = accounts.reduce((sum, s) => sum + Number(s.closing), 0);
    const opening = accounts.reduce((sum, s) => sum + (openings[s.account] ?? 0), 0);

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

export interface AppState {
  /** Account name → the balance the app now holds, in that account's currency. */
  balances: Record<string, { balance: number; currency: Currency }>;
  transactions: { type: string; amount: string; currency?: string }[];
}

/**
 * The same variance, computed from the app's own state rather than the plan's.
 *
 * This is what makes Link 2 independent: it reads back what actually landed,
 * so a write the API silently altered shows up as drift.
 */
export function actualVariance(
  app: AppState,
  openings: Record<string, number>
): Record<Currency, number> {
  const variance = {} as Record<Currency, number>;

  for (const currency of CURRENCIES) {
    const accounts = Object.entries(app.balances).filter(([, a]) => a.currency === currency);
    const closing = accounts.reduce((sum, [, a]) => sum + a.balance, 0);
    const opening = accounts.reduce((sum, [name]) => sum + (openings[name] ?? 0), 0);

    const rows = app.transactions.filter((t) => (t.currency ?? LOCAL_CURRENCY) === currency);
    const income = rows
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = rows
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    variance[currency] = closing - opening - (income - expenses);
  }

  return variance;
}

interface ApiAccount {
  name: string;
  balance?: string;
  currency?: string;
}

/**
 * Reads the month back out of the app and compares it to the plan.
 *
 * The app computes reconciliation only for its own accounts page, with no API
 * route, so the figure is recomputed here from the accounts and transactions
 * the API does expose. Failures propagate: a gate that swallows its own errors
 * is not a gate.
 */
export async function reconcileMonth(
  client: Pick<BackfillClient, 'get' | 'getAll'>,
  plan: Plan,
  openings: Record<string, number>
): Promise<ReconcileReport> {
  const expected = expectedVariance(plan, openings);

  const accounts = await client.get<ApiAccount[]>('/api/accounts');
  const transactions = await fetchMonthTransactions(client, plan.month, plan.year);

  const planned = new Set(plan.snapshots.map((s) => s.account));
  const balances: AppState['balances'] = {};
  for (const account of accounts ?? []) {
    if (!planned.has(account.name)) continue;
    balances[account.name] = {
      balance: Number(account.balance ?? 0),
      currency: (account.currency as Currency) ?? LOCAL_CURRENCY,
    };
  }

  const actual = actualVariance(
    {
      balances,
      transactions: transactions.map((t) => ({
        type: t.type ?? 'expense',
        amount: t.amount,
        currency: t.currency,
      })),
    },
    openings
  );

  const perCurrency: ReconcileRow[] = CURRENCIES.map((currency) => ({
    currency,
    expected: expected[currency],
    actual: actual[currency],
    ok: closeEnough(expected[currency], actual[currency]),
  }));

  const combined = CURRENCIES.reduce(
    (sum, currency) => sum + expected[currency] * (currency === LOCAL_CURRENCY ? 1 : plan.rate),
    0
  );

  return { perCurrency, combined: { expected: combined, sheet: plan.checks.closingTotal } };
}
