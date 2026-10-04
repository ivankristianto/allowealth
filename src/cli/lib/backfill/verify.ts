import { closeEnough, LOCAL_CURRENCY, TOLERANCE, toLocal } from './money';
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

  // Totals sum the CSV's own local column, never a converted foreign amount.
  // The reference rate is a month-end figure while receipts cleared at other
  // rates, so converting would introduce a spread the sheet's printed totals do
  // not contain — and Link 1 is exact, every month.
  const expenseTotal = plan.transactions
    .filter((t) => t.kind === 'expense')
    .reduce((sum, t) => sum + Number(t.localAmount), 0);
  record(1, 'expense total', plan.checks.expenseTotal, expenseTotal);

  const incomeTotal = plan.transactions
    .filter((t) => t.kind === 'income')
    .reduce((sum, t) => sum + Number(t.localAmount), 0);
  record(1, 'income total', plan.checks.incomeTotal, incomeTotal);

  // Closing balances are no exception: the sheet's account table is written in
  // local currency for every account, so `Total Akhir Bulan` is the plain sum of
  // that column. `localClosing` is it, untouched by the foreign-account division.
  const closingTotal = plan.snapshots.reduce((sum, s) => sum + Number(s.localClosing), 0);
  record(1, 'closing total', plan.checks.closingTotal, closingTotal);

  // The total above cannot see the converted figure, and that is the one the app
  // actually receives — a conversion that went the wrong way leaves
  // `localClosing` untouched and the total still exact. So each balance is
  // checked back against the column it came from, to the precision the two
  // decimal places allow: half a cent of the account's own currency. A balance
  // `foreignBalances` states was never converted, so it has nothing to check.
  for (const snapshot of plan.snapshots) {
    if (snapshot.stated) continue;
    const slack = snapshot.currency === LOCAL_CURRENCY ? TOLERANCE : TOLERANCE + plan.rate / 200;
    const local = toLocal(snapshot.closing, snapshot.currency, plan.rate);
    if (Math.abs(local - Number(snapshot.localClosing)) > slack) {
      failures.push({
        link: 1,
        label: `closing balance for ${snapshot.account} does not convert back`,
        expected: Number(snapshot.localClosing),
        actual: local,
      });
    }
  }

  // Link 4 compares in local currency: the foreign column would reintroduce the
  // rate spread. Rows placed by `incomeRouting` are subtracted, because the
  // sheet's Income column excludes them — it is zero outside salary.
  const byAccount = new Map<string, number>();
  for (const t of plan.transactions) {
    if (t.kind !== 'income' || t.routedByRule) continue;
    byAccount.set(t.account, (byAccount.get(t.account) ?? 0) + Number(t.localAmount));
  }
  for (const [account, expected] of Object.entries(plan.checks.accountIncome)) {
    record(4, `income into ${account}`, expected, byAccount.get(account) ?? 0);
  }

  const key = monthKey(plan);
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
