import * as v from 'valibot';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DirectiveError } from './errors';

/** Thrown when the config is absent or does not validate. Always actionable. */
export class ConfigError extends DirectiveError {}

const currency = v.picklist(['IDR', 'USD']);

/**
 * A field the scaffold leaves blank for the operator to fill. Rejecting it here
 * turns "you have not finished the config" into one clear message, rather than
 * a confusing abort deep in owner resolution.
 */
const filledIn = v.pipe(v.string(), v.nonEmpty('Fill this in; the scaffold leaves it blank'));

export const configSchema = v.object({
  filenames: v.object({ transactions: v.string(), balance: v.string() }),
  members: v.object({ primary: filledIn, secondary: filledIn, fallback: filledIn }),
  accounts: v.array(v.object({ name: filledIn, currency, owner: filledIn })),
  accountAliases: v.array(v.object({ from: v.string(), to: v.string() })),
  duplicateRules: v.array(
    v.object({
      month: v.string(),
      name: v.string(),
      occurrence: v.number(),
      rename: v.string(),
    })
  ),
  syntheticAccounts: v.object({
    expense: filledIn,
    passiveIncome: v.record(v.string(), filledIn),
  }),
  categories: v.object({
    expense: v.array(filledIn),
    income: v.array(
      v.object({ name: filledIn, sourceType: v.picklist(['active', 'passive', 'other']) })
    ),
  }),
  categoryRenames: v.array(v.object({ from: v.string(), to: v.string() })),
  // Salary is routed by category to a member's own account. It is kept apart
  // from `incomeRouting`, which exists only for foreign-currency non-salary
  // income: a local-currency entry appearing there signals the scope drifting.
  salaryRouting: v.array(v.object({ category: filledIn, account: filledIn })),
  incomeRouting: v.array(v.object({ match: v.string(), account: v.string() })),
  suppressedRows: v.array(
    v.object({
      month: v.string(),
      side: v.picklist(['expense', 'income']),
      match: v.string(),
      reason: v.string(),
    })
  ),
  dateRules: v.object({
    incomeDayOfMonth: v.pipe(v.number(), v.minValue(1), v.maxValue(28)),
    // The first month of the range. Gap detection walks forward from here, so
    // without it a later month could be loaded first and stamp every account
    // with the wrong origin balance.
    earliestMonth: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}$/, 'Expected YYYY-MM')),
  }),
});

export type BackfillConfig = v.InferOutput<typeof configSchema>;

export function configPath(dataDir: string): string {
  return join(dataDir, '.aw-backfill', 'config.json');
}

export function loadConfig(dataDir: string): BackfillConfig {
  const path = configPath(dataDir);
  if (!existsSync(path)) {
    throw new ConfigError(
      `No config.json at ${path}\n` +
        `Run \`aw backfill scaffold --from <Mon> --to <Mon>\` to generate a skeleton, ` +
        `then set the currency for each account by hand.`
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new ConfigError(
      `Could not parse ${path} as JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const result = v.safeParse(configSchema, raw);
  if (!result.success) {
    const issues = result.issues.map((i) => `  ${v.getDotPath(i) ?? '(root)'}: ${i.message}`);
    throw new ConfigError(`Invalid config at ${path}:\n${issues.join('\n')}`);
  }

  const seen = new Set<string>();
  for (const account of result.output.accounts) {
    if (seen.has(account.name)) {
      throw new ConfigError(
        `Duplicate account name in roster: ${account.name}\nEdit \`accounts\` in ${path}.`
      );
    }
    seen.add(account.name);
  }
  return result.output;
}
