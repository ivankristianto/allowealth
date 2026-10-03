import * as v from 'valibot';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DirectiveError } from './errors';
import { LOCAL_CURRENCY } from './money';

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
  // The account each member's expenses are paid from, keyed by member name. An
  // expense is recorded against its owner's account, so `expenseOwners` decides
  // both who an expense belongs to and where it is paid from.
  expenseAccounts: v.record(v.string(), filledIn),
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
  // Salary is routed by category to a member's own account. The sheet's
  // `Income` column records exactly these rows, which is what Link 4 checks.
  salaryRouting: v.array(v.object({ category: filledIn, account: filledIn })),
  // Every other income row is placed by the first rule that matches it: by
  // exact category (after renames), by terms that must all start a word in the
  // description, or both. A row no rule matches aborts the plan. `convert`
  // lets a rule credit a foreign-currency account with a row that carries only
  // a local amount, divided by the month's rate.
  incomeRouting: v.array(
    v.pipe(
      v.strictObject({
        category: v.optional(filledIn),
        match: v.optional(v.pipe(v.array(filledIn), v.minLength(1))),
        account: filledIn,
        convert: v.optional(v.boolean()),
      }),
      v.check(
        (rule) => rule.category !== undefined || rule.match !== undefined,
        'A rule needs a `category`, a `match`, or both'
      )
    )
  ),
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
  assertExpenseAccountsKnown(result.output, path);
  assertIncomeRoutingKnown(result.output, path);
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

/**
 * Every member needs a paying account, or an expense they own has nowhere to go.
 * It must be a local-currency roster account: expenses are posted in local currency.
 */
function assertExpenseAccountsKnown(config: BackfillConfig, path: string): void {
  const members = [config.members.primary, config.members.secondary];
  for (const member of Object.keys(config.expenseAccounts)) {
    if (!members.includes(member)) {
      throw new ConfigError(
        `\`expenseAccounts\` names "${member}", which is neither member ` +
          `(${members.join(', ')}).\nEdit \`expenseAccounts\` in ${path}.`
      );
    }
  }
  for (const member of members) {
    const name = config.expenseAccounts[member];
    if (!name) {
      throw new ConfigError(
        `\`expenseAccounts\` has no account for "${member}".\n` +
          `Add the account their expenses are paid from to \`expenseAccounts\` in ${path}.`
      );
    }
    const account = config.accounts.find((a) => a.name === name);
    if (!account || account.currency !== LOCAL_CURRENCY) {
      throw new ConfigError(
        `\`expenseAccounts\` gives "${member}" the account "${name}", which is not a ` +
          `local-currency account in \`accounts\`.\nEdit \`expenseAccounts\` in ${path}.`
      );
    }
  }
}

/** A rule pointing at an account outside the roster would only fail mid-plan. */
function assertIncomeRoutingKnown(config: BackfillConfig, path: string): void {
  const roster = new Set(config.accounts.map((a) => a.name));
  for (const rule of config.incomeRouting) {
    if (!roster.has(rule.account)) {
      throw new ConfigError(
        `\`incomeRouting\` points at "${rule.account}", which is not in \`accounts\`.\n` +
          `Edit \`incomeRouting\` in ${path}.`
      );
    }
  }
}
