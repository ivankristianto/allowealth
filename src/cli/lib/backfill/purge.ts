import type { BackfillClient } from './client';
import { DirectiveError } from './errors';
import { lastDayOfMonth } from './money';
import { monthKey } from './plan';
import type { MonthRef, Plan } from './types';

/**
 * Thrown when the month holds rows this tool cannot prove it wrote.
 *
 * Purge is date-range based, so it deletes everything in the month. Refusing
 * here is what stops it from destroying data that came from somewhere else.
 */
export class OwnershipError extends DirectiveError {}

export interface ExistingTransaction {
  id?: string;
  type?: string;
  transaction_date: string;
  amount: string;
  category?: string;
  account?: string;
  currency?: string;
}

interface ExistingBudget {
  id: string;
}

const DIFF_LIMIT = 10;

/** The date part of an ISO or date-only string. Not a parser; see plan.ts for that. */
function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function normaliseAmount(value: string): string {
  return String(Number(value));
}

function existingKey(row: ExistingTransaction): string {
  return [
    dateOnly(row.transaction_date),
    normaliseAmount(row.amount),
    row.category ?? '',
    row.account ?? '',
  ].join('|');
}

function plannedKey(row: Plan['transactions'][number]): string {
  return [dateOnly(row.date), normaliseAmount(row.amount), row.category, row.account].join('|');
}

function multiset(keys: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}

function describe(rows: string[]): string {
  const shown = rows.slice(0, DIFF_LIMIT).map((r) => `    ${r}`);
  if (rows.length > DIFF_LIMIT) shown.push(`    … and ${rows.length - DIFF_LIMIT} more`);
  return shown.join('\n');
}

/**
 * Proves this tool wrote what is currently in the month before deleting it.
 *
 * A month claimed as `loading` is owned regardless of its contents: that is a
 * partial load this tool abandoned, and the repairing re-run must be able to
 * clear it.
 */
export function assertOwnership(
  existing: ExistingTransaction[],
  savedPlan: Plan | null,
  ledgerStatus: 'loading' | 'loaded' | undefined,
  force: boolean
): void {
  if (existing.length === 0) return;
  if (ledgerStatus === 'loading') return;
  if (force) return;

  if (!savedPlan) {
    throw new OwnershipError(
      `The month holds ${existing.length} transaction(s) but this tool has no saved plan for it, ` +
        `so it cannot prove it wrote them.\n` +
        `Purge would delete everything in the month. Re-run with --force only if you are certain ` +
        `the data is expendable. --yes will not do: it only skips the prompt.`
    );
  }

  const actual = multiset(existing.map(existingKey));
  const planned = multiset(savedPlan.transactions.map(plannedKey));

  const unexpected: string[] = [];
  for (const [key, count] of actual) {
    const surplus = count - (planned.get(key) ?? 0);
    for (let i = 0; i < surplus; i++) unexpected.push(key);
  }

  const missing: string[] = [];
  for (const [key, count] of planned) {
    const shortfall = count - (actual.get(key) ?? 0);
    for (let i = 0; i < shortfall; i++) missing.push(key);
  }

  if (unexpected.length === 0 && missing.length === 0) return;

  throw new OwnershipError(
    `The month's rows diverge from the plan this tool saved, so it cannot prove it wrote them.\n` +
      (unexpected.length > 0
        ? `  In the app but not in the plan:\n${describe(unexpected)}\n`
        : '') +
      (missing.length > 0 ? `  In the plan but not in the app:\n${describe(missing)}\n` : '') +
      `Purge would delete everything in the month. Re-run with --force to proceed anyway. ` +
      `--yes will not do: it only skips the prompt.`
  );
}

/** The month's first and last calendar dates, for a date-range API query. */
function monthDateRange(ref: MonthRef): { start: string; end: string } {
  const lastDay = lastDayOfMonth(ref);
  const key = monthKey(ref);
  return { start: `${key}-01`, end: `${key}-${String(lastDay).padStart(2, '0')}` };
}

export async function fetchMonthTransactions(
  client: Pick<BackfillClient, 'getAll'>,
  ref: MonthRef
): Promise<ExistingTransaction[]> {
  const { start, end } = monthDateRange(ref);
  return client.getAll<ExistingTransaction>(
    `/api/transactions?start_date=${start}&end_date=${end}`,
    'transactions'
  );
}

/** Deletes every transaction and budget in the month. Ownership is proved by the caller. */
export async function purgeMonth(
  client: Pick<BackfillClient, 'getAll' | 'get' | 'post' | 'del'>,
  ref: MonthRef
): Promise<{ transactions: number; budgets: number }> {
  const transactions = await fetchMonthTransactions(client, ref);
  const ids = transactions.map((t) => t.id).filter((id): id is string => Boolean(id));

  // The bulk endpoint caps a request at 100 ids.
  for (let i = 0; i < ids.length; i += 100) {
    await client.post('/api/transactions/bulk', { action: 'delete', ids: ids.slice(i, i + 100) });
  }

  const budgets = await client.get<ExistingBudget[]>(
    `/api/budgets?month=${ref.month}&year=${ref.year}`
  );
  for (const budget of budgets ?? []) {
    await client.del(`/api/budgets/${budget.id}`);
  }

  return { transactions: ids.length, budgets: budgets?.length ?? 0 };
}
