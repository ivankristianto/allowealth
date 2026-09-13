import type { BackfillConfig } from './config.schema';
import type { RawAccountRow, RawMonth } from './parse';
import type { Currency } from './types';

/**
 * Thrown when the sheet contains something the config does not describe.
 *
 * Every message names the exact config field that resolves it, because the
 * operator reads it months after the config was written.
 */
export class DetectionError extends Error {}

export interface ResolvedAccount {
  name: string;
  currency: Currency;
  owner: string;
  awal: number;
  income: number;
  akhir: number;
}

function amountOr(
  amount: RawAccountRow['awal'],
  label: string,
  accountName: string,
  fallback: number
): number {
  if (amount.kind === 'value') return amount.value;
  if (amount.kind === 'blank') return fallback;
  throw new DetectionError(
    `Account "${accountName}" has an unreadable ${label}: ${amount.raw}\n` +
      `Fix the cell in the balance CSV, or add a \`suppressedRows\` entry.`
  );
}

/**
 * Resolves each sheet account row against the closed roster in config.
 *
 * Order is load-bearing: duplicate rules first (they key on the sheet's own
 * label), then aliases, then the roster lookup.
 */
export function resolveAccounts(
  raw: RawMonth,
  config: BackfillConfig,
  monthKey: string
): ResolvedAccount[] {
  const roster = new Map(config.accounts.map((a) => [a.name, a]));
  const aliases = new Map(config.accountAliases.map((a) => [a.from, a.to]));
  const resolved: ResolvedAccount[] = [];
  const claimed = new Set<string>();

  for (const row of raw.accounts) {
    const rule = config.duplicateRules.find(
      (r) => r.month === monthKey && r.name === row.name && r.occurrence === row.occurrence
    );

    if (!rule && row.occurrence > 1) {
      throw new DetectionError(
        `Account "${row.name}" appears ${row.occurrence} times in ${monthKey} with no rule.\n` +
          `Add a \`duplicateRules\` entry: ` +
          `{ "month": "${monthKey}", "name": "${row.name}", "occurrence": ${row.occurrence}, "rename": "..." }, ` +
          `and add the renamed account to \`accounts\` with its currency.`
      );
    }

    const labelled = rule ? rule.rename : row.name;
    const name = aliases.get(labelled) ?? labelled;
    const entry = roster.get(name);

    if (!entry) {
      throw new DetectionError(
        `Account "${name}" is not in the roster (month ${monthKey}).\n` +
          `Add it to \`accounts\` with its currency, or map it with an \`accountAliases\` entry ` +
          `if it is a renaming of an existing account.`
      );
    }

    if (claimed.has(name)) {
      throw new DetectionError(
        `Account "${name}" resolves twice in ${monthKey}.\n` +
          `Check \`accountAliases\` and \`duplicateRules\` for two labels collapsing onto one account.`
      );
    }
    claimed.add(name);

    resolved.push({
      name,
      currency: entry.currency,
      owner: entry.owner,
      awal: amountOr(row.awal, 'opening balance', name, 0),
      income: amountOr(row.income, 'income', name, 0),
      akhir: amountOr(row.akhir, 'closing balance', name, 0),
    });
  }

  return resolved;
}

/** Aborts when the sheet uses a category the config has never seen. */
export function assertCategoriesKnown(raw: RawMonth, config: BackfillConfig): void {
  const renames = new Map(config.categoryRenames?.map((r) => [r.from, r.to]) ?? []);
  const expense = new Set(config.categories.expense);
  const income = new Set(config.categories.income.map((c) => c.name));

  const check = (
    label: string,
    known: Set<string>,
    field: string,
    rows: { category: string }[]
  ) => {
    for (const row of rows) {
      if (row.category === '') continue;
      const name = renames.get(row.category) ?? row.category;
      if (known.has(name)) continue;
      throw new DetectionError(
        `Unknown ${label} category: "${row.category}"\n` +
          `Add it to \`categories.${field}\`, or map it with a \`categoryRenames\` entry.`
      );
    }
  };

  check('expense', expense, 'expense', raw.expenses);
  check('income', income, 'income', raw.incomes);
  check(
    'budget',
    expense,
    'expense',
    raw.budgets.map((b) => ({ category: b.category }))
  );
}
