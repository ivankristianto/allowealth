import type { BackfillClient } from './client';
import type { LedgerEntry, MonthRef } from './ledger';
import { findGaps } from './ledger';
import { monthKey } from './plan';
import { assertOwnership, fetchMonthTransactions, purgeMonth } from './purge';
import { reconcileMonth } from './reconcile';
import type { ReconcileReport } from './reconcile';
import type { Plan } from './types';
import { verifyPlan } from './verify';

export interface LoadDeps {
  client: BackfillClient;
  readLedger: () => LedgerEntry[];
  claimMonth: (month: number, year: number, planHash: string) => void;
  commitMonth: (month: number, year: number) => void;
  savePlan: (plan: Plan) => void;
  readSavedPlan: (month: number, year: number) => Plan | null;
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

export class LoadError extends Error {}

/** Runs `worker` over `items` with bounded concurrency, preserving failures. */
async function inBatches<T>(items: T[], size: number, worker: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(worker));
  }
}

function assertNoGap(deps: LoadDeps, month: number, year: number, force: boolean): void {
  const entries = deps.readLedger();
  const gaps = findGaps(entries, month, year, deps.earliest);
  if (gaps.length > 0) {
    throw new LoadError(
      `Cannot load ${monthKey(month, year)}: earlier months are not loaded — ${gaps.join(', ')}.\n` +
        `Months must load in order: a later month loaded first stamps the wrong origin balance ` +
        `onto every account it creates.`
    );
  }

  const existing = entries.find((e) => e.month === month && e.year === year);
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

  assertNoGap(deps, month, year, opts.force ?? false);

  const entries = deps.readLedger();
  const ledgerStatus = entries.find((e) => e.month === month && e.year === year)?.status;
  const existingRows = await fetchMonthTransactions(deps.client, month, year);
  assertOwnership(existingRows, deps.readSavedPlan(month, year), ledgerStatus, opts.force ?? false);

  // Claimed before the first write, so an aborted load stays purgeable.
  deps.savePlan(plan);
  deps.claimMonth(month, year, '');

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
  // next free slot depends on the writes already made.
  for (const snapshot of plan.snapshots) {
    await deps.client.post(
      `/api/accounts/${requireId(accounts, snapshot.account, 'account')}/balance`,
      {
        balance: snapshot.closing,
        notes: `backfill ${monthKey(month, year)}`,
        recorded_at: snapshot.recordedAt,
      }
    );
  }

  const reconciliation = await reconcileMonth(deps.client, plan, openings);

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
