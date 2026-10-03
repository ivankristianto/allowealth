import type { BackfillClient } from './client';
import { closeEnough } from './money';
import { actualVariance, expectedVariance } from './reconcile';
import { monthKey } from './plan';
import { fetchMonthTransactions } from './purge';
import type { Currency, Plan, PlanTransaction } from './types';

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
  /** The member who created the row; the app treats them as its owner. */
  owner?: string;
}

export interface ActualState {
  transactions: ActualTransaction[];
  budgets: { category: string; budget_amount: string }[];
  /** Closing balance recorded in balance history for the month's last day. */
  history: Record<string, string>;
  /** The account's current balance, which net worth reads. */
  balances: Record<string, string>;
  /**
   * Account → closing balance of the NEWEST loaded month. Current balance is
   * settled against that month, not the audited one, so auditing an earlier
   * month must compare against it or every account reads as drifted.
   */
  newestClosing?: Record<string, string>;
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
 * Compares plan against app totals grouped by some key and by currency.
 *
 * Both sides are summed in the currency each transaction was posted in, so a
 * foreign amount is never converted: the month-end rate is not the rate a
 * receipt cleared at, and converting would invent a spread. Link 1 has already
 * tied the plan's amounts to the sheet's printed totals.
 *
 * Keys present on either side are reported, so a category the app holds but the
 * plan does not shows up rather than being skipped.
 */
function groupCompare(
  dimension: string,
  planned: PlanTransaction[],
  actual: ActualTransaction[],
  planKey: (t: PlanTransaction) => string,
  actualKey: (t: ActualTransaction) => string,
  compare: (dimension: string, key: string, expected: number, got: number) => void
): void {
  const sums = new Map<string, { expected: number; got: number }>();
  const bucket = (key: string, currency: string | undefined) => {
    const bucketKey = `${key} ${currency ?? 'IDR'}`;
    const found = sums.get(bucketKey) ?? { expected: 0, got: 0 };
    sums.set(bucketKey, found);
    return found;
  };

  for (const t of planned) bucket(planKey(t), t.currency).expected += Number(t.amount);
  for (const t of actual) bucket(actualKey(t), t.currency).got += Number(t.amount);

  for (const [key, { expected, got }] of sums) compare(dimension, key, expected, got);
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

  const key = monthKey(plan);

  for (const kind of ['expense', 'income'] as const) {
    groupCompare(
      `${kind} total`,
      plan.transactions.filter((t) => t.kind === kind),
      actual.transactions.filter((t) => t.type === kind),
      () => key,
      () => key,
      compare
    );
  }
  compare('transaction count', key, plan.transactions.length, actual.transactions.length);

  groupCompare(
    'expense per category',
    plan.transactions.filter((t) => t.kind === 'expense'),
    actual.transactions.filter((t) => t.type === 'expense'),
    (t) => t.category,
    (t) => t.category ?? '',
    compare
  );
  groupCompare(
    'income per category',
    plan.transactions.filter((t) => t.kind === 'income'),
    actual.transactions.filter((t) => t.type === 'income'),
    (t) => t.category,
    (t) => t.category ?? '',
    compare
  );
  groupCompare(
    'transactions per owner',
    plan.transactions,
    actual.transactions,
    (t) => `${t.owner} ${t.kind}`,
    (t) => `${t.owner ?? ''} ${t.type}`,
    compare
  );
  groupCompare(
    'income per account',
    plan.transactions.filter((t) => t.kind === 'income'),
    actual.transactions.filter((t) => t.type === 'income'),
    (t) => t.account,
    (t) => t.account ?? '',
    compare
  );

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
  // It settles to the newest loaded month, which is not necessarily this one.
  const settledTo =
    actual.newestClosing ??
    Object.fromEntries(plan.snapshots.map((s) => [s.account, s.closing] as const));
  for (const [account, balance] of Object.entries(actual.balances)) {
    compare('current balance', account, Number(settledTo[account] ?? '0'), Number(balance));
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

/**
 * The drift between the plan's per-currency variance and the same figure
 * computed from what the app holds for this month.
 *
 * End balances come from the month's balance history rather than the account's
 * current balance: current balance is settled to the newest loaded month, so it
 * would be the wrong end point for any earlier month.
 */
function auditReconciliation(
  plan: Plan,
  history: Record<string, string>,
  transactions: ActualTransaction[]
): Record<Currency, number> {
  const openings = Object.fromEntries(
    plan.snapshots.map((s) => [s.account, Number(s.opening)] as const)
  );

  const balances: Record<string, { balance: number; currency: Currency }> = {};
  for (const snapshot of plan.snapshots) {
    const recorded = history[snapshot.account];
    if (recorded === undefined) continue;
    balances[snapshot.account] = { balance: Number(recorded), currency: snapshot.currency };
  }

  const expected = expectedVariance(plan, openings);
  const actual = actualVariance(
    { balances, transactions: transactions.map((t) => ({ ...t, currency: t.currency })) },
    openings
  );

  return { IDR: actual.IDR - expected.IDR, USD: actual.USD - expected.USD };
}

/** A budget as `GET /api/budgets` returns it: the category is a nested object. */
interface ApiBudget {
  budget_amount: string;
  category?: { name?: string } | null;
}

/** Keys the app's budgets by category name, to compare against the plan. */
export function toActualBudgets(budgets: ApiBudget[]): ActualState['budgets'] {
  return budgets.map((b) => ({ category: b.category?.name ?? '', budget_amount: b.budget_amount }));
}

/** Reads the app's state for the month. Performs no writes. */
export async function runAudit(
  client: BackfillClient,
  plan: Plan,
  newestPlan?: Plan
): Promise<AuditRow[]> {
  const transactions = await fetchMonthTransactions(client, plan);
  const budgets = await client.get<ApiBudget[]>(
    `/api/budgets?month=${plan.month}&year=${plan.year}`
  );
  const accounts = await client.get<ApiAccount[]>('/api/accounts');

  const history: Record<string, string> = {};
  const balances: Record<string, string> = {};
  const monthPrefix = monthKey(plan);

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

  const monthTransactions = transactions.map((t) => ({
    type: 'type' in t ? String((t as { type?: string }).type) : 'expense',
    transaction_date: t.transaction_date,
    amount: t.amount,
    category: t.category,
    account: t.account,
    currency: (t as { currency?: string }).currency,
    owner: t.owner,
  }));

  return diffMonth(plan, {
    transactions: monthTransactions,
    budgets: toActualBudgets(budgets ?? []),
    history,
    balances,
    newestClosing: newestPlan
      ? Object.fromEntries(newestPlan.snapshots.map((s) => [s.account, s.closing] as const))
      : undefined,
    reconciliation: auditReconciliation(plan, history, monthTransactions),
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

  const defaultYear = args.year ? Number(args.year) : new Date().getFullYear();
  const ref = parseMonthArg(args.month, defaultYear);

  const plan = buildPlan(readMonth(dataDir, config, ref), config);

  // Current balance is settled against the newest loaded month, so auditing an
  // earlier month must compare against that month's closings, not this month's.
  const { newestLoaded, readLedger } = await import('./ledger');
  const { sameMonth } = await import('./money');
  const newest = newestLoaded(readLedger(dataDir));
  const newestPlan =
    newest && !sameMonth(newest, ref)
      ? buildPlan(readMonth(dataDir, config, newest), config)
      : undefined;

  const client = await createClient();
  const rows = await runAudit(client, plan, newestPlan);

  const label = monthKey(ref);

  if (args.json) {
    const { createOutput } = await import('../output');
    createOutput(args).write({ ...ref, ok: rows.length === 0, mismatches: rows }, '');
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
