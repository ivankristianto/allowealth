import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { resetCacheManager } from '@/lib/cache';

let GET: (context: unknown) => Promise<Response>;

const WS = 'ws-due-before';
const OTHER_WS = 'ws-due-before-other';
const USER = 'user-due-before';
const OTHER_USER = 'user-due-before-other';

interface OccurrenceRow {
  id: string;
  due_date: string;
  status: string;
}

function context(query: string) {
  const url = `http://localhost/api/recurring/occurrences?${query}`;
  return {
    url: new URL(url),
    request: new Request(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } }),
    locals: { user: { id: USER, workspaceId: WS, role: 'admin' }, perf: undefined },
  };
}

async function fetchOccurrences(query: string): Promise<{ status: number; body: any }> {
  const response = await GET(context(query));
  return { status: response.status, body: await response.json() };
}

function seedWorkspace(workspaceId: string, userId: string, templateId: string) {
  db.run(sql`INSERT INTO workspaces (id, name) VALUES (${workspaceId}, 'Due before test')`);
  db.run(
    sql`INSERT INTO users (id, workspace_id, email, name, role)
        VALUES (${userId}, ${workspaceId}, ${`${userId}@example.test`}, 'Owner', 'admin')`
  );
  db.run(
    sql`INSERT INTO budget_categories (id, workspace_id, created_by_user_id, name, type)
        VALUES (${`${templateId}-cat`}, ${workspaceId}, ${userId}, 'Bills', 'expense')`
  );
  db.run(
    sql`INSERT INTO accounts (id, workspace_id, created_by_user_id, name, type, account_class,
          balance, currency, status, last_updated, created_at, updated_at)
        VALUES (${`${templateId}-acc`}, ${workspaceId}, ${userId}, 'Checking', 'bank', 'liquid',
          '0', 'USD', 'active', 0, 0, 0)`
  );
  db.run(
    sql`INSERT INTO recurring_templates (id, workspace_id, created_by_user_id, name, type, amount,
          currency, category_id, account_id, day_of_month, start_date)
        VALUES (${templateId}, ${workspaceId}, ${userId}, 'Internet', 'expense', '40', 'USD',
          ${`${templateId}-cat`}, ${`${templateId}-acc`}, 10, '2026-01-10')`
  );
}

let occurrenceNumber = 0;

function seedOccurrence(
  workspaceId: string,
  templateId: string,
  id: string,
  dueDate: string,
  status = 'pending'
) {
  occurrenceNumber += 1;
  db.run(
    sql`INSERT INTO recurring_occurrences (id, template_id, workspace_id, due_date,
          occurrence_number, status)
        VALUES (${id}, ${templateId}, ${workspaceId}, ${dueDate}, ${occurrenceNumber}, ${status})`
  );
}

function cleanUp() {
  for (const workspaceId of [WS, OTHER_WS]) {
    db.run(sql`DELETE FROM recurring_occurrences WHERE workspace_id = ${workspaceId}`);
    db.run(sql`DELETE FROM recurring_templates WHERE workspace_id = ${workspaceId}`);
    db.run(sql`DELETE FROM accounts WHERE workspace_id = ${workspaceId}`);
    db.run(sql`DELETE FROM budget_categories WHERE workspace_id = ${workspaceId}`);
    db.run(sql`DELETE FROM users WHERE workspace_id = ${workspaceId}`);
    db.run(sql`DELETE FROM workspaces WHERE id = ${workspaceId}`);
  }
}

const ids = (body: any) => (body.data.occurrences as OccurrenceRow[]).map((row) => row.id);

describe('GET /api/recurring/occurrences?due_before', () => {
  beforeAll(async () => {
    ({ GET } = await import('@/pages/api/recurring/occurrences/index'));
    cleanUp();
    seedWorkspace(WS, USER, 'rt-due-before');
    seedWorkspace(OTHER_WS, OTHER_USER, 'rt-due-before-other');
    seedOccurrence(WS, 'rt-due-before', 'occ-march', '2026-03-10');
    seedOccurrence(WS, 'rt-due-before', 'occ-april-paid', '2026-04-10', 'confirmed');
    seedOccurrence(WS, 'rt-due-before', 'occ-may', '2026-05-10');
    seedOccurrence(WS, 'rt-due-before', 'occ-june-15', '2026-06-15');
    seedOccurrence(WS, 'rt-due-before', 'occ-june-16', '2026-06-16');
    seedOccurrence(WS, 'rt-due-before', 'occ-july', '2026-07-10');
    seedOccurrence(OTHER_WS, 'rt-due-before-other', 'occ-other-ws', '2026-05-01');
  });

  beforeEach(() => {
    resetCacheManager();
  });

  afterAll(cleanUp);

  it('returns pending items from every earlier month, up to and including the date', async () => {
    const { status, body } = await fetchOccurrences('status=pending&due_before=2026-06-15');

    expect(status).toBe(200);
    expect(ids(body)).toEqual(['occ-march', 'occ-may', 'occ-june-15']);
    expect(body.data.total).toBe(3);
  });

  it('excludes confirmed items only when status=pending', async () => {
    const { body } = await fetchOccurrences('status=all&due_before=2026-06-15');

    expect(ids(body)).toContain('occ-april-paid');
  });

  it('applies an explicit month as well', async () => {
    const { body } = await fetchOccurrences('status=pending&month=2026-06&due_before=2026-06-15');

    expect(ids(body)).toEqual(['occ-june-15']);
  });

  it('keeps the one-month window when due_before is absent', async () => {
    const { body } = await fetchOccurrences('status=pending&month=2026-05');

    expect(ids(body)).toEqual(['occ-may']);
  });

  it('does not label a due_before list with the current month', async () => {
    const response = await GET(context('status=pending&due_before=2026-01-01&_render=html'));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('RecurringPendingListPartial');
    expect(html).not.toContain('monthLabel=');
  });

  it('labels the list with the month when one is given', async () => {
    const response = await GET(
      context('status=pending&month=2026-06&due_before=2026-06-01&_render=html')
    );

    expect(await response.text()).toContain('monthLabel="June 2026"');
  });

  it('rejects a date that is malformed or not on the calendar', async () => {
    for (const value of ['2026-6-15', 'today', '2026-02-31']) {
      const { status, body } = await fetchOccurrences(`status=pending&due_before=${value}`);
      expect(status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    }
  });
});
