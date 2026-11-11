import { beforeEach, describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as sqliteSchema from '@/db/schema/sqlite';
import { resetCacheManager } from '@/lib/cache';
import { createMemoryDb, seedWorkspaceOwner } from '@/db/test-helpers/memory-db';
import type { MemoryDb } from '@/db/test-helpers/memory-db';
import type { RecurringTemplate } from '@/lib/types/recurring';
import {
  FIXTURE_USER,
  FIXTURE_WORKSPACE,
  seedAccount,
  seedCategory,
} from './test-helpers/money-fixtures';
import { RecurringTemplateService } from './recurring-template.service';

function isoMonthsAgo(months: number, day = 5): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, day));
  return date.toISOString().slice(0, 10);
}

function seedTemplate(
  raw: MemoryDb['raw'],
  id: string,
  fields: {
    startDate: string;
    frequency?: 'weekly' | 'monthly';
    interval?: number;
    total?: number | null;
    endDate?: string | null;
    status?: string;
  }
) {
  raw.run(
    `INSERT INTO recurring_templates (id, workspace_id, created_by_user_id, name, type, amount, currency,
       category_id, account_id, day_of_month, frequency, interval_count, start_date, end_date,
       total_occurrences, status)
     VALUES (?, ?, ?, ?, 'expense', '100', 'USD', 'food', 'acc', 5, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      FIXTURE_WORKSPACE,
      FIXTURE_USER,
      `Template ${id}`,
      fields.frequency ?? 'monthly',
      fields.interval ?? 1,
      fields.startDate,
      fields.endDate ?? null,
      fields.total ?? null,
      fields.status ?? 'active',
    ]
  );
}

function seedFixture(memory: MemoryDb) {
  const { raw } = memory;
  seedWorkspaceOwner(raw, FIXTURE_WORKSPACE, FIXTURE_USER);
  seedAccount(raw, 'acc');
  seedCategory(raw, 'food');
  seedTemplate(raw, 'fresh', { startDate: isoMonthsAgo(3) });
  seedTemplate(raw, 'quarterly', { startDate: isoMonthsAgo(7), interval: 3 });
  seedTemplate(raw, 'weekly', { startDate: isoMonthsAgo(1), frequency: 'weekly' });
  seedTemplate(raw, 'installment', { startDate: isoMonthsAgo(6), total: 2 });
  seedTemplate(raw, 'ending', { startDate: isoMonthsAgo(4), endDate: isoMonthsAgo(1, 20) });
  seedTemplate(raw, 'resumed', { startDate: isoMonthsAgo(5) });
  seedTemplate(raw, 'paused', { startDate: isoMonthsAgo(2), status: 'paused' });
  for (const n of [1, 2]) {
    raw.run(
      `INSERT INTO recurring_occurrences (id, template_id, workspace_id, due_date, occurrence_number)
       VALUES (?, 'resumed', ?, ?, ?)`,
      [`occ-resumed-${n}`, FIXTURE_WORKSPACE, isoMonthsAgo(6 - n), n]
    );
  }
}

const occurrences = (raw: MemoryDb['raw']) =>
  raw
    .query(
      `SELECT template_id, due_date, occurrence_number, status FROM recurring_occurrences
       ORDER BY template_id, occurrence_number`
    )
    .all();

const statuses = (raw: MemoryDb['raw']) =>
  raw.query('SELECT id, status FROM recurring_templates ORDER BY id').all();

describe('RecurringTemplateService.generateOccurrences()', () => {
  let batched: MemoryDb;
  let reference: MemoryDb;
  let queries: string[];
  let service: RecurringTemplateService;

  beforeEach(() => {
    resetCacheManager();
    batched = createMemoryDb();
    reference = createMemoryDb();
    seedFixture(batched);
    seedFixture(reference);
    queries = [];
    service = new RecurringTemplateService(
      drizzle(batched.raw, {
        schema: sqliteSchema,
        logger: { logQuery: (query: string) => queries.push(query) },
      })
    );
  });

  /** The pre-batching behaviour: each active template generated on its own. */
  async function generatePerTemplate() {
    const referenceService = new RecurringTemplateService(reference.db);
    const templates = await reference.db.query.recurringTemplates.findMany();
    let created = 0;
    for (const template of templates) {
      const result = await (
        referenceService as unknown as {
          _generateForTemplate(t: RecurringTemplate): Promise<{ created: number }>;
        }
      )._generateForTemplate(template as unknown as RecurringTemplate);
      created += result.created;
    }
    return { created };
  }

  it('creates the same occurrences and completes the same templates as one template at a time', async () => {
    const result = await service.generateOccurrences(FIXTURE_WORKSPACE);
    const expected = await generatePerTemplate();

    expect(result).toEqual(expected);
    expect(result.created).toBeGreaterThan(10);
    expect(occurrences(batched.raw)).toEqual(occurrences(reference.raw));
    expect(statuses(batched.raw)).toEqual(statuses(reference.raw));
    expect(statuses(batched.raw)).toContainEqual({ id: 'installment', status: 'completed' });
  });

  it('is idempotent', async () => {
    const first = await service.generateOccurrences(FIXTURE_WORKSPACE);
    const rows = occurrences(batched.raw);
    const second = await service.generateOccurrences(FIXTURE_WORKSPACE);

    expect(first.created).toBeGreaterThan(0);
    expect(second.created).toBe(0);
    expect(occurrences(batched.raw)).toEqual(rows);
  });

  it('runs a fixed number of queries however many templates there are', async () => {
    await service.generateOccurrences(FIXTURE_WORKSPACE);

    // templates, latest occurrence per template, begin, insert, update, commit
    expect(queries.length).toBeLessThanOrEqual(6);
  });
});
