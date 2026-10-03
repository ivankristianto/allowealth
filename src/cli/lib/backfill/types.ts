/**
 * Shared types for the CSV backfill pipeline.
 *
 * A `Plan` is the serialisable hand-off between derivation (parse + plan) and
 * transport (load). Nothing in this file knows about HTTP or the filesystem.
 */

export type Currency = 'IDR' | 'USD';

/**
 * One calendar month.
 *
 * `Plan`, `RawMonth` and `LedgerEntry` all carry `month` and `year` flat, so
 * each satisfies this structurally and can be passed wherever a month is
 * wanted — without changing any on-disk shape.
 */
export interface MonthRef {
  month: number;
  year: number;
}

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
   * The member who owns the row in the app, which records whoever posts it.
   * Expenses follow `expenseOwners`; everything else is `members.fallback`.
   */
  owner: string;
  /**
   * True when `incomeRouting` placed this row. The balance sheet's `Income`
   * column excludes such rows, so Link 4 subtracts them.
   */
  routedByException?: boolean;
}

export interface PlanSnapshot {
  account: string;
  /** First-appearance `Awal Bulan`, in `currency`, stored as initial_balance. */
  opening: string;
  /** `Akhir Bulan` in `currency` — divided by the rate for a foreign account. */
  closing: string;
  /**
   * The sheet's own `Akhir Bulan` figure, always local currency.
   *
   * The account table is written in local currency for every account, so Link 1
   * sums this against the sheet's printed total. Converting `closing` back would
   * reintroduce the rounding the division introduced.
   */
  localClosing: string;
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
