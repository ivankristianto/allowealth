import type { BackfillConfig } from './config.schema';
import { decimal, fromLocal, lastDayOfMonth, LOCAL_CURRENCY as LOCAL } from './money';
import type { RawMonth, RawRow } from './parse';
import { assertCategoriesKnown, DetectionError, resolveAccounts } from './resolve';
import type { ResolvedAccount } from './resolve';
import type { Currency, MonthRef, Plan, PlanSnapshot, PlanTransaction } from './types';

export function monthKey({ month, year }: MonthRef): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * The first balance-history slot on a month's last day (`YYYY-MM-DD`): 12:00 UTC,
 * which is still that day in every timezone from UTC-11 to UTC+11.
 */
export function monthEndSlot(lastDay: string): string {
  return `${lastDay}T12:00:00.000Z`;
}

/**
 * Normalises a sheet date cell (`M/D/YYYY`, optionally with a time) to
 * `YYYY-MM-DD`, and refuses anything that would land outside the plan month.
 */
function normaliseDate(cell: string, ref: MonthRef, label: string): string {
  const parts = cell.trim().split(' ')[0]?.split('/') ?? [];
  if (parts.length !== 3) {
    throw new DetectionError(
      `Unreadable date "${cell}" on ${label}. Expected M/D/YYYY in the Date column.`
    );
  }
  const [m, d, y] = parts.map((p) => Number(p));
  if (!m || !d || !y || Number.isNaN(m) || Number.isNaN(d) || Number.isNaN(y)) {
    throw new DetectionError(
      `Unreadable date "${cell}" on ${label}. Expected M/D/YYYY in the Date column.`
    );
  }
  if (m !== ref.month || y !== ref.year) {
    throw new DetectionError(
      `Date "${cell}" on ${label} falls outside ${monthKey(ref)}.\n` +
        `Fix the cell in the CSV, or add a \`suppressedRows\` entry for this row.`
    );
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Matches `word` as a whole word anywhere, case-insensitively. */
function wholeWord(word: string): RegExp {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
}

/**
 * The member an expense belongs to: the owner every matching `expenseOwners`
 * rule agrees on, or `members.fallback` when none matches.
 */
function expenseOwner(description: string, category: string, config: BackfillConfig): string {
  const owners = new Set(
    config.expenseOwners
      .filter((rule) =>
        'category' in rule ? rule.category === category : wholeWord(rule.match).test(description)
      )
      .map((rule) => rule.owner)
  );

  if (owners.size > 1) {
    throw new DetectionError(
      `Expense "${description}" (${category}) matches \`expenseOwners\` rules for ` +
        `${[...owners].join(' and ')}; the owner is ambiguous.\n` +
        `Narrow the rules in \`expenseOwners\` so only one owner matches.`
    );
  }
  return [...owners][0] ?? config.members.fallback;
}

/** Matches `term` where it starts a word, so `INDON` also finds `INDON28`. */
function wordStart(term: string): RegExp {
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
}

/**
 * The account an expense is paid from: its owner's configured account. It must
 * appear in this month's sheet, or the loader would create it at a zero balance.
 */
function expenseAccount(
  owner: string,
  roster: Map<string, ResolvedAccount>,
  config: BackfillConfig
): string {
  const name = config.expenseAccounts[owner] ?? '';
  return rosterAccount(roster, name, `expenseAccounts.${owner}`).name;
}

function isSuppressed(
  row: RawRow,
  side: 'expense' | 'income',
  config: BackfillConfig,
  key: string
): boolean {
  return config.suppressedRows.some(
    (r) => r.month === key && r.side === side && row.description.includes(r.match)
  );
}

/** Blank is never zero: it means the export dropped a figure we must not invent. */
function requireLocalAmount(row: RawRow, side: string): number | null {
  if (row.amount.kind === 'value') return row.amount.value;
  if (row.amount.kind === 'invalid') {
    throw new DetectionError(`${side} row "${row.description}" has an unreadable amount.`);
  }
  if (row.usd.kind === 'value') {
    throw new DetectionError(
      `${side} row "${row.description}" has a blank local amount but a foreign amount of ` +
        `${row.usd.value}. This is a placeholder row.\n` +
        `Add a \`suppressedRows\` entry for it if it should not be loaded.`
    );
  }
  throw new DetectionError(
    `${side} row "${row.description}" has a blank amount.\n` +
      `Fill it in the CSV, or add a \`suppressedRows\` entry for it.`
  );
}

interface Route {
  account: string;
  currency: Currency;
  /** Set when `incomeRouting` placed the row, so Link 4 can subtract it. */
  byException?: boolean;
  /** Set when the rule allows a local-only row into a foreign account. */
  convert?: boolean;
}

function rosterAccount(
  roster: Map<string, ResolvedAccount>,
  name: string,
  field: string
): ResolvedAccount {
  const account = roster.get(name);
  if (!account) {
    throw new DetectionError(
      `\`${field}\` points at "${name}", which is not in this month's accounts.\n` +
        `Point it at an account that appears in the balance sheet.`
    );
  }
  return account;
}

/**
 * Salary routes by category to its member's account. Every other row goes where
 * the first matching `incomeRouting` rule sends it; with no match it aborts,
 * because there is no default account to put unexplained income in.
 */
function routeIncome(
  row: RawRow,
  category: string,
  config: BackfillConfig,
  roster: Map<string, ResolvedAccount>
): Route {
  const salary = config.salaryRouting.find((r) => r.category === row.category);
  if (salary) {
    const account = rosterAccount(roster, salary.account, 'salaryRouting');
    return { account: account.name, currency: account.currency };
  }

  const rule = config.incomeRouting.find(
    (r) =>
      (r.category === undefined || r.category === category) &&
      (r.match ?? []).every((term) => wordStart(term).test(row.description))
  );
  if (!rule) {
    throw new DetectionError(
      `Income row "${row.description}" (${category}) matches no routing rule.\n` +
        `Add an \`incomeRouting\` rule naming the account it is paid into.`
    );
  }
  const account = rosterAccount(roster, rule.account, 'incomeRouting');
  return {
    account: account.name,
    currency: account.currency,
    byException: true,
    ...(rule.convert ? { convert: true } : {}),
  };
}

/**
 * The amount in the account's currency. A foreign account takes the row's
 * foreign figure; only a rule marked `convert` may derive one from the local
 * amount at the month's rate.
 */
function amountFor(row: RawRow, route: Route, local: number, rate: number): number {
  if (route.currency === LOCAL) return local;
  if (row.usd.kind === 'value') return row.usd.value;
  if (route.convert) return fromLocal(local, route.currency, rate);
  throw new DetectionError(
    `Income row "${row.description}" routes to a ${route.currency} account ` +
      `but has no foreign amount.\n` +
      `Fill the foreign column in the CSV, set \`convert\` on its \`incomeRouting\` rule, ` +
      `or route it to a local-currency account.`
  );
}

function accountIncomeChecks(accounts: ResolvedAccount[]): Record<string, number> {
  // Denominated in each account's own currency, exactly as the sheet prints it.
  return Object.fromEntries(accounts.map((a) => [a.name, a.income]));
}

/** Turns a parsed month into the serialisable Plan the loader executes. */
export function buildPlan(raw: RawMonth, config: BackfillConfig): Plan {
  const key = monthKey(raw);
  assertCategoriesKnown(raw, config);

  const accounts = resolveAccounts(raw, config, key);
  const roster = new Map(accounts.map((a) => [a.name, a]));
  const renames = new Map(config.categoryRenames.map((r) => [r.from, r.to]));
  const rename = (category: string) => renames.get(category) ?? category;

  const transactions: PlanTransaction[] = [];
  const skipped: Plan['skipped'] = [];

  for (const row of raw.expenses) {
    if (isSuppressed(row, 'expense', config, key)) {
      skipped.push({ reason: 'suppressed', description: row.description });
      continue;
    }
    const amount = requireLocalAmount(row, 'Expense');
    if (amount === 0) {
      skipped.push({ reason: 'zero amount', description: row.description });
      continue;
    }
    const category = rename(row.category);
    const owner = expenseOwner(row.description, category, config);
    transactions.push({
      kind: 'expense',
      date: normaliseDate(row.date, raw, `expense "${row.description}"`),
      description: row.description,
      category,
      account: expenseAccount(owner, roster, config),
      owner,
      amount: decimal(amount),
      currency: LOCAL,
      localAmount: decimal(amount),
    });
  }

  // Income rows carry no usable date of their own, so they are all dated on the
  // configured day. That keeps every transaction inside its own month, which is
  // what makes a date-range purge unambiguous.
  const incomeDate = `${key}-${String(config.dateRules.incomeDayOfMonth).padStart(2, '0')}`;

  for (const row of raw.incomes) {
    if (isSuppressed(row, 'income', config, key)) {
      skipped.push({ reason: 'suppressed', description: row.description });
      continue;
    }
    const local = requireLocalAmount(row, 'Income');
    if (local === 0 && row.usd.kind !== 'value') {
      skipped.push({ reason: 'zero amount', description: row.description });
      continue;
    }
    const category = rename(row.category);
    const route = routeIncome(row, category, config, roster);
    const amount = amountFor(row, route, local, raw.rate);
    if (amount === 0) {
      skipped.push({ reason: 'zero amount', description: row.description });
      continue;
    }
    transactions.push({
      kind: 'income',
      date: incomeDate,
      description: row.description,
      category,
      account: route.account,
      // Income belongs to whoever owns the account it is paid into.
      owner: roster.get(route.account)!.owner,
      amount: decimal(amount),
      currency: route.currency,
      localAmount: decimal(local),
      ...(route.byException ? { routedByException: true } : {}),
    });
  }

  const lastDay = String(lastDayOfMonth(raw)).padStart(2, '0');
  // The account table is denominated in local currency for every account, so a
  // foreign account's balance is divided by the month's rate to reach the
  // currency the app holds it in. `localClosing` keeps the sheet's own figure.
  const snapshots: PlanSnapshot[] = accounts.map((a) => ({
    account: a.name,
    opening: decimal(fromLocal(a.awal, a.currency, raw.rate)),
    localOpening: decimal(a.awal),
    closing: decimal(fromLocal(a.akhir, a.currency, raw.rate)),
    localClosing: decimal(a.akhir),
    currency: a.currency,
    recordedAt: monthEndSlot(`${key}-${lastDay}`),
  }));

  return {
    month: raw.month,
    year: raw.year,
    rate: raw.rate,
    budgets: raw.budgets.map((b) => ({
      category: rename(b.category),
      amountIdr: b.budget,
      pct: b.pct,
    })),
    transactions,
    snapshots,
    checks: {
      expenseTotal: raw.totals.expense,
      incomeTotal: raw.totals.income,
      closingTotal: raw.totals.closing,
      accountIncome: accountIncomeChecks(accounts),
    },
    skipped,
  };
}
