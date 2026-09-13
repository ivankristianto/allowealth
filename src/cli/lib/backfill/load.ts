import type { BackfillClient } from './client';
import { DirectiveError } from './errors';
import type { LedgerEntry, MonthRef } from './ledger';
import { findGaps } from './ledger';
import { monthKey } from './plan';
import { assertOwnership, fetchMonthTransactions, purgeMonth } from './purge';
import { reconcileMonth } from './reconcile';
import type { ReconcileReport } from './reconcile';
import { historyTimestamps, nextSlot } from './snapshots';
import type { Plan } from './types';
import { verifyPlan } from './verify';

export interface LoadDeps {
  client: BackfillClient;
  readLedger: () => LedgerEntry[];
  claimMonth: (month: number, year: number, planHash: string) => void;
  commitMonth: (month: number, year: number) => void;
  savePlan: (plan: Plan) => void;
  readSavedPlan: (month: number, year: number) => Plan | null;
  hashPlan: (plan: Plan) => string;
  buildPlanForMonth: (month: number, year: number) => Plan;
  settle: (plan: Plan, accounts: { id: string; name: string }[]) => Promise<void>;
  earliest: MonthRef;
}

export interface LoadOptions {
  force?: boolean;
  dryRun?: boolean;
}

export interface LoadReport {
  month: number;
  year: number;
  dryRun: boolean;
  plan: Plan;
  purged: { transactions: number; budgets: number };
  created: { accounts: number; budgets: number; transactions: number; snapshots: number };
  reconciliation: ReconcileReport | null;
}

interface ApiAccount {
  id: string;
  name: string;
  balance?: string;
  currency?: string;
}

interface ApiCategory {
  id: string;
  name: string;
  type: 'expense' | 'income';
}

const TRANSACTION_CONCURRENCY = 4;

/** The day every snapshot in a plan is recorded on: the month's last. */
function snapshotDay(plan: Plan): string {
  return (plan.snapshots[0]?.recordedAt ?? '').slice(0, 10);
}

export class LoadError extends DirectiveError {}

/** Runs `worker` over `items` with bounded concurrency, preserving failures. */
async function inBatches<T>(items: T[], size: number, worker: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(worker));
  }
}

/** Reads only the local ledger, so a dry run can surface an ordering mistake too. */
function assertNoGap(deps: LoadDeps, month: number, year: number): void {
  const gaps = findGaps(deps.readLedger(), month, year, deps.earliest);
  if (gaps.length > 0) {
    throw new LoadError(
      `Cannot load ${monthKey(month, year)}: earlier months are not loaded — ${gaps.join(', ')}.\n` +
        `Months must load in order: a later month loaded first stamps the wrong origin balance ` +
        `onto every account it creates.`
    );
  }
}

function assertNotAlreadyLoaded(deps: LoadDeps, month: number, year: number, force: boolean): void {
  const existing = deps.readLedger().find((e) => e.month === month && e.year === year);
  if (existing?.status === 'loaded' && !force) {
    throw new LoadError(
      `${monthKey(month, year)} is already loaded. Re-run with --force to purge and reload it.`
    );
  }
}

async function ensureAccounts(
  client: BackfillClient,
  plan: Plan
): Promise<{ accounts: Map<string, ApiAccount>; created: number }> {
  const existing = await client.get<ApiAccount[]>('/api/accounts');
  const byName = new Map((existing ?? []).map((a) => [a.name, a]));
  let created = 0;

  const needed = new Map<string, { currency: string; opening: string }>();
  for (const snapshot of plan.snapshots) {
    needed.set(snapshot.account, { currency: snapshot.currency, opening: '0' });
  }
  for (const transaction of plan.transactions) {
    if (needed.has(transaction.account)) continue;
    needed.set(transaction.account, { currency: transaction.currency, opening: '0' });
  }

  for (const [name, spec] of needed) {
    const found = byName.get(name);
    if (found) {
      if (found.currency && found.currency !== spec.currency) {
        throw new LoadError(
          `Account "${name}" exists as ${found.currency} but this month needs ${spec.currency}.\n` +
            `Fix the currency in \`accounts\`, or rename one of them.`
        );
      }
      continue;
    }
    const account = await client.post<ApiAccount>('/api/accounts', {
      name,
      type: 'other',
      balance: spec.opening,
      currency: spec.currency,
    });
    byName.set(name, account);
    created++;
  }

  return { accounts: byName, created };
}

async function categoryIndex(client: BackfillClient): Promise<Map<string, ApiCategory>> {
  const categories = await client.get<ApiCategory[]>('/api/categories');
  return new Map((categories ?? []).map((c) => [c.name, c]));
}

function requireId<T extends { id: string }>(
  index: Map<string, T>,
  name: string,
  kind: string
): string {
  const found = index.get(name);
  if (!found) {
    throw new LoadError(
      `No ${kind} named "${name}" exists in the workspace. Run \`aw backfill setup\` first.`
    );
  }
  return found.id;
}

/**
 * Loads one month.
 *
 * Dependencies are injected so the sequence can be exercised without a server.
 * Ordering is enforced rather than documented: loading a later month first
 * stamps the wrong origin balance onto an account, silently.
 */
export async function loadMonth(
  deps: LoadDeps,
  month: number,
  year: number,
  opts: LoadOptions
): Promise<LoadReport> {
  // Ordering is checked before the plan is even built: it needs no network and
  // an out-of-order dry run is just as wrong as an out-of-order load.
  assertNoGap(deps, month, year);

  const plan = deps.buildPlanForMonth(month, year);

  const verification = verifyPlan(plan);
  if (!verification.ok) {
    const lines = verification.failures.map(
      (f) => `  Link ${f.link} — ${f.label}: sheet ${f.expected}, plan ${f.actual}`
    );
    throw new LoadError(
      `${monthKey(month, year)} failed verification; nothing was written:\n${lines.join('\n')}`
    );
  }

  if (opts.dryRun) {
    return {
      month,
      year,
      dryRun: true,
      plan,
      purged: { transactions: 0, budgets: 0 },
      created: { accounts: 0, budgets: 0, transactions: 0, snapshots: 0 },
      reconciliation: null,
    };
  }

  assertNotAlreadyLoaded(deps, month, year, opts.force ?? false);

  const entries = deps.readLedger();
  const ledgerStatus = entries.find((e) => e.month === month && e.year === year)?.status;
  const existingRows = await fetchMonthTransactions(deps.client, month, year);
  assertOwnership(existingRows, deps.readSavedPlan(month, year), ledgerStatus, opts.force ?? false);

  // Claimed before the first write, so an aborted load stays purgeable. The
  // hash records which plan the claim belongs to, so a later re-derivation that
  // differs is visible in the ledger.
  deps.savePlan(plan);
  deps.claimMonth(month, year, deps.hashPlan(plan));

  const purged = await purgeMonth(deps.client, month, year);
  const { accounts, created: createdAccounts } = await ensureAccounts(deps.client, plan);
  const categories = await categoryIndex(deps.client);

  const openings = Object.fromEntries(
    plan.snapshots.map((s) => [s.account, Number(accounts.get(s.account)?.balance ?? 0)])
  );

  for (const budget of plan.budgets) {
    await deps.client.post('/api/budgets', {
      category_id: requireId(categories, budget.category, 'category'),
      month,
      year,
      budget_amount: String(budget.amountIdr),
      currency: 'IDR',
    });
  }

  await inBatches(plan.transactions, TRANSACTION_CONCURRENCY, async (transaction) => {
    await deps.client.post('/api/transactions', {
      type: transaction.kind,
      amount: transaction.amount,
      currency: transaction.currency,
      category_id: requireId(categories, transaction.category, 'category'),
      account_id: requireId(accounts, transaction.account, 'account'),
      transaction_date: transaction.date,
      description: transaction.description,
    });
  });

  // Snapshots are serial: they share a one-hour slot window per day and the
  // next free slot depends on the writes already made. Reusing an occupied
  // timestamp would overwrite the one lookup net worth depends on.
  const lastDay = snapshotDay(plan);
  for (const snapshot of plan.snapshots) {
    const accountId = requireId(accounts, snapshot.account, 'account');
    const taken = await historyTimestamps(deps.client, accountId);
    await deps.client.post(`/api/accounts/${accountId}/balance`, {
      balance: snapshot.closing,
      notes: `backfill ${monthKey(month, year)}`,
      recorded_at: nextSlot(taken, lastDay),
    });
  }

  const reconciliation = await reconcileMonth(deps.client, plan, openings);
  const drifted = reconciliation.perCurrency.filter((row) => !row.ok);
  if (drifted.length > 0) {
    const lines = drifted.map(
      (row) => `  Link 2 — ${row.currency}: plan ${row.expected}, app ${row.actual}`
    );
    throw new LoadError(
      `${monthKey(month, year)} loaded but does not reconcile:\n${lines.join('\n')}\n` +
        `The month stays claimed as loading, so a re-run will purge and reload it.`
    );
  }

  await deps.settle(
    plan,
    [...accounts.values()].map((a) => ({ id: a.id, name: a.name }))
  );

  deps.commitMonth(month, year);

  return {
    month,
    year,
    dryRun: false,
    plan,
    purged,
    created: {
      accounts: createdAccounts,
      budgets: plan.budgets.length,
      transactions: plan.transactions.length,
      snapshots: plan.snapshots.length,
    },
    reconciliation,
  };
}

/* eslint-disable no-console -- CLI output is intentional */

export interface LoadArgs {
  dir?: string;
  month?: string;
  from?: string;
  to?: string;
  year?: string;
  force?: boolean;
  'dry-run'?: boolean;
  json?: boolean;
}

/**
 * Stands in for the client during a dry run. Every method throws, so any future
 * change that reaches the network before the dry-run early return fails loudly
 * instead of silently signing in.
 */
export function offlineClient(): BackfillClient {
  const refuse = (): never => {
    throw new LoadError('A dry run must not make requests; this is a bug in the load sequence.');
  };
  return {
    signIn: refuse,
    get: refuse,
    post: refuse,
    patch: refuse,
    del: refuse,
    getAll: refuse,
  } as unknown as BackfillClient;
}

/** Arg-parsing shell around `loadMonth`. */
export async function runLoadCommand(args: LoadArgs): Promise<void> {
  const { buildPlan } = await import('./plan');
  const { loadConfig } = await import('./config.schema');
  const ledger = await import('./ledger');
  const { settle } = await import('./snapshots');
  const {
    createClient,
    earliestFromConfig,
    monthRange,
    parseMonthArg,
    readMonth,
    resolveDataDir,
    UsageError,
  } = await import('./runtime');

  const dataDir = resolveDataDir(args.dir, process.env.AW_BACKFILL_DIR);
  const config = loadConfig(dataDir);
  const year = args.year ? Number(args.year) : new Date().getFullYear();

  let months: MonthRef[];
  if (args.month) {
    months = [parseMonthArg(args.month, year)];
  } else if (args.from && args.to) {
    months = monthRange(parseMonthArg(args.from, year), parseMonthArg(args.to, year));
  } else {
    throw new UsageError('Pass --month, or --from and --to for a range.');
  }

  // A dry run must not touch the network: the operator dry-runs every month
  // before the app is even set up, and a sign-in here would block that.
  const dryRun = args['dry-run'] === true;
  const client = dryRun ? offlineClient() : await createClient();

  const deps: LoadDeps = {
    client,
    readLedger: () => ledger.readLedger(dataDir),
    claimMonth: (month, y, hash) => ledger.claimMonth(dataDir, month, y, hash),
    commitMonth: (month, y) => ledger.commitMonth(dataDir, month, y),
    savePlan: (plan) => ledger.savePlan(dataDir, plan),
    readSavedPlan: (month, y) => ledger.readSavedPlan(dataDir, month, y),
    hashPlan: ledger.hashPlan,
    buildPlanForMonth: (month, y) => buildPlan(readMonth(dataDir, config, month, y), config),
    settle: (plan, accounts) => settle(client, plan, accounts),
    earliest: earliestFromConfig(config),
  };

  const { createOutput } = await import('../output');
  const out = createOutput(args);
  const reports: LoadReport[] = [];

  for (const { month, year: y } of months) {
    const report = await loadMonth(deps, month, y, { force: args.force, dryRun });
    reports.push(report);
    if (out.json) continue;

    const label = monthKey(month, y);
    if (report.dryRun) {
      console.log(
        `${label}  dry run: ${report.plan.transactions.length} transactions, ` +
          `${report.plan.budgets.length} budgets, ${report.plan.snapshots.length} snapshots. ` +
          `Nothing written.`
      );
    } else {
      console.log(
        `${label}  loaded: ${report.created.transactions} transactions, ` +
          `${report.created.budgets} budgets, ${report.created.snapshots} snapshots ` +
          `(purged ${report.purged.transactions}).`
      );
    }
    for (const skip of report.plan.skipped) {
      console.log(`  skipped (${skip.reason}): ${skip.description}`);
    }
    for (const row of report.plan.unmarkedOwner) {
      console.log(`  owner fell back to the default: ${row}`);
    }
  }

  if (out.json) out.write(reports, '');
}
