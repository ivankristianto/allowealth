import { closeEnough, toLocal } from './money';
import { monthKey } from './plan';
import type { Plan } from './types';

export interface VerifyFailure {
  link: 1 | 4;
  label: string;
  expected: number;
  actual: number;
}

export interface VerifyResult {
  ok: boolean;
  failures: VerifyFailure[];
}

/**
 * Checks the plan against the sheet's own printed figures, before anything is
 * written.
 *
 * Link 1 compares the three totals. Link 4 compares per-account income, which
 * closes a hole Link 1 cannot see: the totals still match when every income
 * row is routed to the wrong account.
 */
export function verifyPlan(plan: Plan): VerifyResult {
  const failures: VerifyFailure[] = [];

  const record = (link: 1 | 4, label: string, expected: number, actual: number) => {
    if (!closeEnough(expected, actual)) {
      failures.push({ link, label, expected, actual });
    }
  };

  const expenseTotal = plan.transactions
    .filter((t) => t.kind === 'expense')
    .reduce((sum, t) => sum + toLocal(t.amount, t.currency, plan.rate), 0);
  record(1, 'expense total', plan.checks.expenseTotal, expenseTotal);

  const incomeTotal = plan.transactions
    .filter((t) => t.kind === 'income')
    .reduce((sum, t) => sum + toLocal(t.amount, t.currency, plan.rate), 0);
  record(1, 'income total', plan.checks.incomeTotal, incomeTotal);

  const closingTotal = plan.snapshots.reduce(
    (sum, s) => sum + toLocal(s.closing, s.currency, plan.rate),
    0
  );
  record(1, 'closing total', plan.checks.closingTotal, closingTotal);

  // The sheet's per-account Income column is denominated in each account's own
  // currency, so no conversion belongs here. Synthetic buckets have no column
  // to compare against and are deliberately out of Link 4's scope.
  const byAccount = new Map<string, number>();
  for (const t of plan.transactions) {
    if (t.kind !== 'income') continue;
    byAccount.set(t.account, (byAccount.get(t.account) ?? 0) + Number(t.amount));
  }
  for (const [account, expected] of Object.entries(plan.checks.accountIncome)) {
    record(4, `income into ${account}`, expected, byAccount.get(account) ?? 0);
  }

  const key = monthKey(plan.month, plan.year);
  const escaped = plan.transactions.filter((t) => !t.date.startsWith(key));
  if (escaped.length > 0) {
    failures.push({
      link: 1,
      label: `transactions dated outside ${key} (first: ${escaped[0]?.date})`,
      expected: 0,
      actual: escaped.length,
    });
  }

  return { ok: failures.length === 0, failures };
}
