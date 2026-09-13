/**
 * Shared types for the CSV backfill pipeline.
 *
 * A `Plan` is the serialisable hand-off between derivation (parse + plan) and
 * transport (load). Nothing in this file knows about HTTP or the filesystem.
 */

export type Currency = 'IDR' | 'USD';

/**
 * A parsed amount cell. Blank and unparseable are distinct from zero so a new
 * export defect aborts instead of silently dropping a row.
 */
export type Amount =
  { kind: 'value'; value: number } | { kind: 'blank' } | { kind: 'invalid'; raw: string };

export interface PlanTransaction {
  kind: 'expense' | 'income';
  date: string; // YYYY-MM-DD
  description: string;
  category: string;
  account: string;
  amount: string; // decimal string, no separators
  currency: Currency;
  /**
   * The CSV's local-currency figure for this row. Link 4 compares in local
   * currency, because the foreign column would reintroduce the rate spread.
   */
  localAmount: string;
  /**
   * True when `incomeRouting` placed this row. The balance sheet's `Income`
   * column excludes such rows, so Link 4 subtracts them.
   */
  routedByException?: boolean;
}

export interface PlanSnapshot {
  account: string;
  /** First-appearance `Awal Bulan`, stored as the account's initial_balance. */
  opening: string;
  closing: string;
  currency: Currency;
  recordedAt: string; // ISO
}

export interface PlanBudget {
  category: string;
  amountIdr: number;
  pct: string;
}

export interface PlanChecks {
  expenseTotal: number;
  incomeTotal: number;
  closingTotal: number;
  accountIncome: Record<string, number>;
}

export interface PlanSkip {
  reason: string;
  description: string;
}

export interface Plan {
  month: number;
  year: number;
  rate: number;
  budgets: PlanBudget[];
  transactions: PlanTransaction[];
  snapshots: PlanSnapshot[];
  checks: PlanChecks;
  skipped: PlanSkip[];
  unmarkedOwner: string[];
}
