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
  // `category` is the app's account category (a default such as 'Bank Account',
  // or a custom one `setup` creates). It decides type and liquidity, which, like
  // currency, are never inferred from the label.
  accounts: v.array(v.object({ name: filledIn, currency, owner: filledIn, category: filledIn })),
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
    category: filledIn,
  }),
  categories: v.object({
    expense: v.array(filledIn),
    income: v.array(
      v.object({ name: filledIn, sourceType: v.picklist(['active', 'passive', 'other']) })
    ),
  }),
  categoryRenames: v.array(v.object({ from: v.string(), to: v.string() })),
  // Which member owns an expense. A rule matches by exact category (after
  // renames) or by a whole word in the description; an expense no rule matches
  // belongs to `members.fallback`. Income needs no rule: it belongs to whoever
  // owns the account it is paid into. Strict, so a rule carrying both keys fails
  // rather than silently dropping one.
  expenseOwners: v.array(
    v.union([
      v.strictObject({ category: filledIn, owner: filledIn }),
      v.strictObject({ match: filledIn, owner: filledIn }),
    ])
  ),
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
        `then set the currency and category for each account by hand.`
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
  assertExpenseOwnersKnown(result.output, path);
  return result.output;
}

/** A rule naming a non-member or a misspelt category would otherwise never match. */
function assertExpenseOwnersKnown(config: BackfillConfig, path: string): void {
  const members = [config.members.primary, config.members.secondary];
  const categories = new Set(config.categories.expense);
  for (const rule of config.expenseOwners) {
    if (!members.includes(rule.owner)) {
      throw new ConfigError(
        `\`expenseOwners\` names "${rule.owner}", which is neither member ` +
          `(${members.join(', ')}).\nEdit \`expenseOwners\` in ${path}.`
      );
    }
    if ('category' in rule && !categories.has(rule.category)) {
      throw new ConfigError(
        `\`expenseOwners\` names the category "${rule.category}", which is not in ` +
          `\`categories.expense\`.\nEdit \`expenseOwners\` in ${path}.`
      );
    }
  }
}
