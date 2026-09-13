import type { BackfillClient } from './client';
import type { BackfillConfig } from './config.schema';

export interface SetupReport {
  created: string[];
  alreadyCorrect: string[];
  skipped: string[];
  warnings: string[];
}

export interface SetupOptions {
  createUser?: boolean;
  email?: string;
  name?: string;
}

interface ApiCategory {
  id: string;
  name: string;
  type: 'expense' | 'income';
  income_source_type?: string;
  transaction_count?: number;
}

interface TransactionPage {
  pagination?: { total?: number };
}

/**
 * The subset of the client setup uses. Declared structurally so the
 * reconciliation can be tested without a server.
 */
type SetupClient = Pick<BackfillClient, 'get' | 'post' | 'patch' | 'del'>;

async function countTransactions(client: SetupClient, category: ApiCategory): Promise<number> {
  if (typeof category.transaction_count === 'number') return category.transaction_count;
  const page = await client.get<TransactionPage>(
    `/api/transactions?category_id=${encodeURIComponent(category.id)}&limit=1`
  );
  return page?.pagination?.total ?? 0;
}

/**
 * Reconciles the workspace's categories with the config, check-then-act, so a
 * re-run is a no-op rather than a second set of duplicates.
 *
 * Accounts are deliberately not created here: they are created on first
 * appearance during load, where the opening balance for that month is known.
 */
export async function runSetup(
  client: SetupClient,
  config: BackfillConfig,
  opts: SetupOptions
): Promise<SetupReport> {
  const report: SetupReport = { created: [], alreadyCorrect: [], skipped: [], warnings: [] };

  const existing = await client.get<ApiCategory[]>('/api/categories');
  const byName = new Map(existing.map((c) => [c.name, c]));

  // Renames run first: a seeded category being renamed must not be mistaken
  // for a missing one and duplicated.
  for (const { from, to } of config.categoryRenames) {
    const found = byName.get(from);
    if (!found) continue;
    if (byName.has(to)) {
      report.warnings.push(
        `Cannot rename category "${from}" to "${to}": "${to}" already exists. Left as is.`
      );
      continue;
    }
    await client.patch(`/api/categories/${found.id}`, { name: to });
    byName.delete(from);
    byName.set(to, { ...found, name: to });
    report.alreadyCorrect.push(`category:${to} (renamed from ${from})`);
  }

  const wanted: { name: string; type: 'expense' | 'income'; sourceType?: string }[] = [
    ...config.categories.expense.map((name) => ({ name, type: 'expense' as const })),
    ...config.categories.income.map((c) => ({
      name: c.name,
      type: 'income' as const,
      sourceType: c.sourceType,
    })),
  ];

  for (const category of wanted) {
    const found = byName.get(category.name);
    if (found) {
      report.alreadyCorrect.push(`category:${category.name}`);
      continue;
    }
    const created = await client.post<ApiCategory>('/api/categories', {
      name: category.name,
      type: category.type,
      ...(category.type === 'income' ? { income_source_type: category.sourceType ?? 'other' } : {}),
    });
    byName.set(category.name, created);
    report.created.push(`category:${category.name}`);
  }

  // Every id that should survive: the wanted categories as they now stand, which
  // already accounts for the renames above.
  const keepIds = new Set(
    wanted.map((c) => byName.get(c.name)?.id).filter((id): id is string => Boolean(id))
  );

  for (const category of existing) {
    if (keepIds.has(category.id)) continue;

    const count = await countTransactions(client, category);
    if (count > 0) {
      report.warnings.push(
        `Category "${category.name}" is not in the config but holds ${count} transaction(s); ` +
          `left in place. Add it to \`categories\` or move its transactions first.`
      );
      continue;
    }
    await client.del(`/api/categories/${category.id}`);
    report.skipped.push(`deleted empty category:${category.name}`);
  }

  if (opts.createUser) {
    await createSecondaryMember(client, config, opts, report);
  }

  return report;
}

/**
 * Creates the second household member.
 *
 * Kept out of the main setup path because sign-up is rate limited: folding it
 * in would let an accidental re-run strand the operator for an hour.
 */
async function createSecondaryMember(
  client: SetupClient,
  config: BackfillConfig,
  opts: SetupOptions,
  report: SetupReport
): Promise<void> {
  const password = process.env.AW_BACKFILL_SECONDARY_PASSWORD;
  if (!password) {
    throw new Error(
      'AW_BACKFILL_SECONDARY_PASSWORD is not set.\n' +
        'Export it in the environment; there is no password flag, so a secret ' +
        'cannot land in shell history.'
    );
  }
  if (!opts.email) {
    throw new Error('--create-user needs --email for the second member.');
  }

  const invitation = await client.post<{ token?: string }>('/api/workspace/invitations', {
    email: opts.email,
    role: 'member',
  });
  if (!invitation?.token) {
    throw new Error('The invitation was created but returned no token; cannot complete sign-up.');
  }

  await client.post('/api/auth/sign-up/email', {
    email: opts.email,
    password,
    name: opts.name ?? config.members.secondary,
    invitationToken: invitation.token,
  });
  report.created.push(`user:${config.members.secondary}`);
}

/* eslint-disable no-console -- CLI output is intentional */

export interface SetupArgs {
  dir?: string;
  'create-user'?: boolean;
  email?: string;
  name?: string;
  json?: boolean;
}

/** Arg-parsing shell around `runSetup`. */
export async function runSetupCommand(args: SetupArgs): Promise<void> {
  const { loadConfig } = await import('./config.schema');
  const { createClient, resolveDataDir } = await import('./runtime');

  const dataDir = resolveDataDir(args.dir, process.env.AW_BACKFILL_DIR);
  const config = loadConfig(dataDir);
  const client = await createClient();

  const report = await runSetup(client, config, {
    createUser: args['create-user'],
    email: args.email,
    name: args.name,
  });

  const { createOutput } = await import('../output');
  const out = createOutput(args);
  if (out.json) {
    out.write(report, '');
    return;
  }

  for (const item of report.created) console.log(`created  ${item}`);
  for (const item of report.alreadyCorrect) console.log(`ok       ${item}`);
  for (const item of report.skipped) console.log(`removed  ${item}`);
  for (const warning of report.warnings) console.log(`WARNING  ${warning}`);
}
