import type { BackfillClient } from './client';
import { closeEnough, toLocal } from './money';
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
  /**
   * Per-currency variance, when the caller has it. Omitted rather than defaulted
   * to zero: a comparison of 0 against 0 would report "clean" without checking.
   */
  reconciliation?: Record<Currency, number>;
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
    if (!closeEnough(expected, got)) {
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

  for (const [currency, variance] of Object.entries(actual.reconciliation ?? {})) {
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
  });
}

/* eslint-disable no-console -- CLI output is intentional */

export interface AuditArgs {
  dir?: string;
  month?: string;
  year?: string;
  verbose?: boolean;
  json?: boolean;
}

/** Arg-parsing shell around `runAudit`. Returns the process exit code. */
export async function runAuditCommand(args: AuditArgs): Promise<number> {
  const { buildPlan } = await import('./plan');
  const { loadConfig } = await import('./config.schema');
  const { createClient, parseMonthArg, readMonth, resolveDataDir, UsageError } =
    await import('./runtime');

  const dataDir = resolveDataDir(args.dir, process.env.AW_BACKFILL_DIR);
  const config = loadConfig(dataDir);
  if (!args.month) throw new UsageError('Pass --month to name the month to audit.');

  const year = args.year ? Number(args.year) : new Date().getFullYear();
  const { month, year: y } = parseMonthArg(args.month, year);

  const plan = buildPlan(readMonth(dataDir, config, month, y), config);
  const client = await createClient();
  const rows = await runAudit(client, plan);

  const label = monthKey(month, y);

  if (args.json) {
    const { createOutput } = await import('../output');
    createOutput(args).write({ month, year: y, ok: rows.length === 0, mismatches: rows }, '');
    return rows.length === 0 ? 0 : 1;
  }

  if (args.verbose) {
    console.log(
      `${label}  plan: ${plan.transactions.length} transactions, ` +
        `${plan.budgets.length} budgets, ${plan.snapshots.length} snapshots.`
    );
    for (const t of plan.transactions) {
      console.log(
        `  ${t.date}  ${t.kind.padEnd(7)} ${t.amount.padStart(14)} ${t.currency}  ` +
          `${t.category} -> ${t.account}  ${t.description}`
      );
    }
    for (const s of plan.snapshots) {
      console.log(
        `  ${s.recordedAt.slice(0, 10)}  closing ${s.closing.padStart(14)} ${s.currency}  ${s.account}`
      );
    }
  }

  if (rows.length === 0) {
    console.log(`${label}  audit clean.`);
    return 0;
  }

  console.log(`${label}  ${rows.length} mismatch(es):`);
  for (const row of rows) {
    console.log(
      `  ${row.dimension.padEnd(20)} ${row.key.padEnd(30)} csv ${row.expected}  app ${row.actual}`
    );
  }
  return 1;
}
