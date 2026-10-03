import type { BackfillClient } from './client';
import { DirectiveError } from './errors';
import { lastDayOfMonth } from './money';
import { monthEndSlot, monthKey } from './plan';
import type { Plan } from './types';

/**
 * Thrown when a day's 12:00:00–12:59:59 UTC window is full.
 *
 * A write past the window drifts toward the next day in the timezones east of
 * UTC, where the app's month boundary would file it under the following month,
 * so it aborts instead.
 */
export class SlotExhaustedError extends DirectiveError {}

export interface AccountRef {
  id: string;
  name: string;
}

interface HistoryEntry {
  recorded_at: string;
}

/**
 * Picks the next free timestamp on `lastDay`, starting at 12:00:00 UTC.
 *
 * Balance history is keyed by timestamp, so two snapshots on the same day need
 * distinct slots; one hour is reserved for them. The app cuts months at
 * midnight in the server's local time, so the hour sits mid-day in UTC: it
 * falls on `lastDay` in every timezone from UTC-11 to UTC+11, where 23:00 UTC
 * would already be the next month east of UTC.
 */
export function nextSlot(existing: string[], lastDay: string): string {
  const sameDay = existing
    .filter((value) => value.startsWith(lastDay))
    .map((value) => Date.parse(value))
    .filter((value) => !Number.isNaN(value));

  const base = Date.parse(monthEndSlot(lastDay));
  const candidate = sameDay.length === 0 ? base : Math.max(base, Math.max(...sameDay) + 1000);
  const windowEnd = base + 60 * 60 * 1000 - 1;

  if (candidate > windowEnd) {
    throw new SlotExhaustedError(
      `No free balance-history slot left on ${lastDay}: the 12:00:00–12:59:59 UTC window is full.\n` +
        `A later timestamp would drift toward the next month and corrupt its closing balance.`
    );
  }
  return new Date(candidate).toISOString();
}

/**
 * Writes each account's current balance to match the newest loaded month.
 *
 * Covers every account the workspace knows, not just the newest month's
 * roster: otherwise a since-closed account keeps an old balance and net worth
 * counts an account that no longer exists.
 *
 * Writes only where the balance differs: in an in-order load the month-end
 * snapshot has already set it. A write is dated in the newest month's
 * month-end slot, so a backfill never leaves an entry dated today.
 */
export async function settle(
  client: Pick<BackfillClient, 'get' | 'post'>,
  plan: Plan,
  accounts: AccountRef[]
): Promise<void> {
  const closing = new Map(plan.snapshots.map((s) => [s.account, s.closing]));
  // Read fresh: the snapshots written moments ago moved these balances.
  const current = new Map(
    (await client.get<{ id: string; balance?: string }[]>('/api/accounts')).map((a) => [
      a.id,
      a.balance,
    ])
  );
  const lastDay = `${monthKey(plan)}-${String(lastDayOfMonth(plan)).padStart(2, '0')}`;

  for (const account of accounts) {
    const target = closing.get(account.name) ?? '0';
    if (Number(current.get(account.id)) === Number(target)) continue;

    await client.post(`/api/accounts/${account.id}/balance`, {
      balance: target,
      notes: 'backfill settle',
      recorded_at: nextSlot(await historyTimestamps(client, account.id), lastDay),
    });
  }
}

/** Reads an account's existing balance-history timestamps, for slot selection. */
export async function historyTimestamps(
  client: Pick<BackfillClient, 'get'>,
  accountId: string
): Promise<string[]> {
  const history = await client.get<HistoryEntry[] | { history?: HistoryEntry[] }>(
    `/api/accounts/${accountId}/history`
  );
  const rows = Array.isArray(history) ? history : (history?.history ?? []);
  return rows.map((row) => row.recorded_at).filter(Boolean);
}
