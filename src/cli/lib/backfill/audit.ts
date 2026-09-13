import type { BackfillClient } from './client';
import { monthKey } from './plan';
import { fetchMonthTransactions } from './purge';
import type { Currency, Plan } from './types';

export interface AuditRow {
  dimension: string;
  key: string;
  expected: string;
  actual: string;
}

export interface ActualTransaction {
  type: string;
  transaction_date: string;
  amount: string;
  category?: string;
  account?: string;
  currency?: string;
  description?: string;
}

export interface ActualState {
  transactions: ActualTransaction[];
  budgets: { category: string; budget_amount: string }[];
  /** Closing balance recorded in balance history for the month's last day. */
  history: Record<string, string>;
  /** The account's current balance, which net worth reads. */
  balances: Record<string, string>;
  reconciliation: Record<Currency, number>;
}

const TOLERANCE = 0.01;

function toLocal(amount: string | number, currency: string | undefined, rate: number): number {
  return currency === 'USD' ? Number(amount) * rate : Number(amount);
}

function money(value: number): string {
  return value.toFixed(2);
}

/**
 * Diffs the app's state for one month against the plan derived from its CSVs.
 *
 * Read-only by construction: every dimension is a comparison, never a write.
 */
export function diffMonth(plan: Plan, actual: ActualState): AuditRow[] {
  const rows: AuditRow[] = [];

  const compare = (dimension: string, key: string, expected: number, got: number) => {
    if (Math.abs(expected - got) > TOLERANCE) {
      rows.push({ dimension, key, expected: money(expected), actual: money(got) });
    }
  };

  const sum = (items: { amount: string; currency?: string }[]) =>
    items.reduce((total, t) => total + toLocal(t.amount, t.currency, plan.rate), 0);

  const key = monthKey(plan.month, plan.year);

  compare(
    'expense total',
    key,
    plan.checks.expenseTotal,
    sum(actual.transactions.filter((t) => t.type === 'expense'))
  );
  compare(
    'income total',
    key,
    plan.checks.incomeTotal,
    sum(actual.transactions.filter((t) => t.type === 'income'))
  );
  compare('transaction count', key, plan.transactions.length, actual.transactions.length);

  const actualBudgets = new Map(actual.budgets.map((b) => [b.category, b.budget_amount]));
  for (const budget of plan.budgets) {
    const got = actualBudgets.get(budget.category);
    if (got === undefined) {
      rows.push({
        dimension: 'budget',
        key: budget.category,
        expected: money(budget.amountIdr),
        actual: 'absent',
      });
      continue;
    }
    compare('budget', budget.category, budget.amountIdr, Number(got));
  }

  for (const snapshot of plan.snapshots) {
    const recorded = actual.history[snapshot.account];
    if (recorded === undefined) {
      rows.push({
        dimension: 'closing balance',
        key: snapshot.account,
        expected: snapshot.closing,
        actual: 'absent',
      });
    } else {
      compare('closing balance', snapshot.account, Number(snapshot.closing), Number(recorded));
    }
  }

  // Settle writes the current balance and net worth reads it, yet no
  // history-based check would notice it going stale, so it is audited on its own.
  const planClosing = new Map(plan.snapshots.map((s) => [s.account, s.closing]));
  for (const [account, balance] of Object.entries(actual.balances)) {
    compare('current balance', account, Number(planClosing.get(account) ?? '0'), Number(balance));
  }

  for (const [currency, variance] of Object.entries(actual.reconciliation)) {
    compare('reconciliation', currency, 0, variance);
  }

  const escaped = actual.transactions.filter((t) => !t.transaction_date.startsWith(key));
  for (const row of escaped) {
    rows.push({
      dimension: 'transaction month',
      key: row.description ?? row.transaction_date,
      expected: key,
      actual: row.transaction_date.slice(0, 7),
    });
  }

  return rows;
}

interface ApiAccount {
  id: string;
  name: string;
  balance?: string;
}

interface HistoryEntry {
  recorded_at: string;
  balance: string;
}

/** Reads the app's state for the month. Performs no writes. */
export async function runAudit(client: BackfillClient, plan: Plan): Promise<AuditRow[]> {
  const transactions = await fetchMonthTransactions(client, plan.month, plan.year);
  const budgets = await client.get<{ category?: string; budget_amount: string }[]>(
    `/api/budgets?month=${plan.month}&year=${plan.year}`
  );
  const accounts = await client.get<ApiAccount[]>('/api/accounts');

  const history: Record<string, string> = {};
  const balances: Record<string, string> = {};
  const monthPrefix = monthKey(plan.month, plan.year);

  for (const account of accounts ?? []) {
    balances[account.name] = account.balance ?? '0';
    const entries = await client.get<HistoryEntry[] | { history?: HistoryEntry[] }>(
      `/api/accounts/${account.id}/history`
    );
    const rows = Array.isArray(entries) ? entries : (entries?.history ?? []);
    const inMonth = rows
      .filter((row) => row.recorded_at?.startsWith(monthPrefix))
      .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
    const last = inMonth.at(-1);
    if (last) history[account.name] = last.balance;
  }

  return diffMonth(plan, {
    transactions: transactions.map((t) => ({
      type: 'type' in t ? String((t as { type?: string }).type) : 'expense',
      transaction_date: t.transaction_date,
      amount: t.amount,
      category: t.category,
      account: t.account,
      currency: (t as { currency?: string }).currency,
    })),
    budgets: (budgets ?? []).map((b) => ({
      category: b.category ?? '',
      budget_amount: b.budget_amount,
    })),
    history,
    balances,
    reconciliation: { IDR: 0, USD: 0 },
  });
}
