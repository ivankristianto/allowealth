import type { BackfillConfig } from './config.schema';
import type { RawMonth } from './parse';

export interface ScaffoldResult {
  config: Partial<BackfillConfig>;
  ambiguities: string[];
}

/** Lowercase, collapse whitespace, strip punctuation — the shape a human sees. */
function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((v) => v !== ''))];
}

/**
 * Turns a range of parsed months into a config skeleton.
 *
 * Currency defaults to the local one for every account and must be corrected by
 * hand: it cannot be recovered from the data once an account is created wrong.
 */
export function scaffoldConfig(months: RawMonth[]): ScaffoldResult {
  const accountNames = unique(months.flatMap((m) => m.accounts.map((a) => a.name)));

  const byNormalised = new Map<string, string[]>();
  for (const name of accountNames) {
    const key = normalise(name);
    byNormalised.set(key, [...(byNormalised.get(key) ?? []), name]);
  }

  const ambiguities = [...byNormalised.values()]
    .filter((spellings) => spellings.length > 1)
    .map(
      (spellings) =>
        `These names differ only by whitespace or punctuation and may be one account: ` +
        spellings.map((s) => `"${s}"`).join(', ')
    );

  const expense = unique(months.flatMap((m) => m.expenses.map((r) => r.category)));
  const income = unique(months.flatMap((m) => m.incomes.map((r) => r.category)));

  return {
    config: {
      accounts: accountNames.map((name) => ({ name, currency: 'IDR' as const, owner: '' })),
      accountAliases: [],
      duplicateRules: [],
      categories: {
        expense,
        // Source type is a judgement the sheet does not record; the operator sets it.
        income: income.map((name) => ({ name, sourceType: 'other' as const })),
      },
      categoryRenames: [],
      incomeRouting: [],
      suppressedRows: [],
    },
    ambiguities,
  };
}
