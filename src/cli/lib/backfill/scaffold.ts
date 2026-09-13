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

/* eslint-disable no-console -- CLI output is intentional */

export interface ScaffoldArgs {
  dir?: string;
  from?: string;
  to?: string;
  year?: string;
  force?: boolean;
}

/** Arg-parsing shell around `scaffoldConfig`. Writes only into the data directory. */
export async function runScaffoldCommand(args: ScaffoldArgs): Promise<void> {
  const { existsSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { configPath, loadConfig } = await import('./config.schema');
  const { monthRange, parseMonthArg, readMonth, resolveDataDir, UsageError } =
    await import('./runtime');

  const dataDir = resolveDataDir(args.dir, process.env.AW_BACKFILL_DIR);
  const path = configPath(dataDir);

  if (existsSync(path) && !args.force) {
    throw new UsageError(`${path} already exists. Pass --force to overwrite it.`);
  }
  if (!args.from || !args.to) {
    throw new UsageError('Pass --from and --to to name the month range to scan.');
  }

  const year = args.year ? Number(args.year) : new Date().getFullYear();
  const months = monthRange(parseMonthArg(args.from, year), parseMonthArg(args.to, year));

  // Scaffolding runs before a config exists, so filename templates come from an
  // existing config when there is one and from the default shape otherwise.
  let templates = { transactions: '{mon}-{year}.csv', balance: 'Balance {mon}-{year}.csv' };
  try {
    templates = loadConfig(dataDir).filenames;
  } catch {
    // No config yet: that is the normal case for scaffolding.
  }

  const raw = months.map((m) =>
    readMonth(dataDir, { filenames: templates } as never, m.month, m.year)
  );
  const { config, ambiguities } = scaffoldConfig(raw);

  const skeleton = {
    filenames: templates,
    members: { primary: '', secondary: '', fallback: '' },
    ...config,
    syntheticAccounts: { expense: '', passiveIncome: {} },
    dateRules: {
      incomeDayOfMonth: 10,
      earliestMonth: `${months[0]!.year}-${String(months[0]!.month).padStart(2, '0')}`,
    },
  };

  mkdirSync(join(dataDir, '.aw-backfill'), { recursive: true });
  writeFileSync(path, `${JSON.stringify(skeleton, null, 2)}\n`);

  console.log(`Wrote ${path}`);
  console.log('Set the currency, owner and member names by hand before running a load.');
  for (const note of ambiguities) console.log(`  ! ${note}`);
}
