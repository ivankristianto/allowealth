import { beforeEach, describe, expect, it } from 'bun:test';
import { resetCacheManager } from '@/lib/cache';
import { createMemoryDb, seedWorkspaceOwner } from '@/db/test-helpers/memory-db';
import type { MemoryDb } from '@/db/test-helpers/memory-db';
import { getCurrentDateISO } from '@/lib/utils/date';
import {
  FIXTURE_USER,
  FIXTURE_WORKSPACE,
  seedAccount,
  seedCategory,
} from './test-helpers/money-fixtures';
import { RecurringOccurrenceService, resetOccurrenceTopUps } from './recurring-occurrence.service';

function isoMonthsAgo(months: number, day = 5): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, day))
    .toISOString()
    .slice(0, 10);
}

function seedTemplate(raw: MemoryDb['raw'], id: string, startDate: string) {
  raw.run(
    `INSERT INTO recurring_templates (id, workspace_id, created_by_user_id, name, type, amount, currency,
       category_id, account_id, day_of_month, frequency, interval_count, start_date, status)
     VALUES (?, ?, ?, ?, 'expense', '100', 'USD', 'food', 'acc', 5, 'monthly', 1, ?, 'active')`,
    [id, FIXTURE_WORKSPACE, FIXTURE_USER, `Bill ${id}`, startDate]
  );
}

const occurrenceCount = (raw: MemoryDb['raw'], templateId: string) =>
  (
    raw
      .query('SELECT COUNT(*) AS n FROM recurring_occurrences WHERE template_id = ?')
      .get(templateId) as { n: number }
  ).n;

describe('RecurringOccurrenceService occurrence top-up', () => {
  let memory: MemoryDb;
  let service: RecurringOccurrenceService;
  const today = getCurrentDateISO('UTC');

  beforeEach(() => {
    resetCacheManager();
    resetOccurrenceTopUps();
    memory = createMemoryDb();
    seedWorkspaceOwner(memory.raw, FIXTURE_WORKSPACE, FIXTURE_USER);
    seedAccount(memory.raw, 'acc');
    seedCategory(memory.raw, 'food');
    service = new RecurringOccurrenceService(memory.db);
  });

  it('lists unpaid bills from months nobody generated', async () => {
    seedTemplate(memory.raw, 'rent', isoMonthsAgo(3));
    expect(occurrenceCount(memory.raw, 'rent')).toBe(0);

    const { occurrences } = await service.findPending(FIXTURE_WORKSPACE, {
      status: 'pending',
      due_before: today,
    });

    expect(occurrences.length).toBeGreaterThanOrEqual(3);
    expect(occurrences.every((occurrence) => occurrence.due_date <= today)).toBe(true);
    expect(occurrenceCount(memory.raw, 'rent')).toBeGreaterThan(occurrences.length);
  });

  it('tops up once per workspace day', async () => {
    await service.getStats(FIXTURE_WORKSPACE);
    seedTemplate(memory.raw, 'late', isoMonthsAgo(1));

    await service.getStats(FIXTURE_WORKSPACE);
    expect(occurrenceCount(memory.raw, 'late')).toBe(0);

    resetOccurrenceTopUps();
    await service.getStats(FIXTURE_WORKSPACE);
    expect(occurrenceCount(memory.raw, 'late')).toBeGreaterThan(0);
  });
});
