import { afterAll, afterEach, beforeEach, describe, expect, setSystemTime, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { auditLogs, users, workspaces } from '@/db/schema';
import { NoopDriver } from '@/lib/cache/drivers/noop';
import { recordTokenDenial } from './token-denial-audit';

const WORKSPACE_ID = 'token-denial-workspace';
const USER_ID = 'token-denial-user';
const token = {
  kind: 'app_password' as const,
  tokenId: 'pat_denial',
  tokenName: 'Probe agent',
  limits: {},
  userId: USER_ID,
  workspaceId: WORKSPACE_ID,
};
// The noop driver answers 1 to every increment, as Redis and Upstash do when they fail.
const deps = { cache: new NoopDriver() };
const START = new Date('2026-11-15T09:00:00Z');

function denialRows() {
  return db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.user_id, USER_ID), eq(auditLogs.action, 'token_denied')));
}

async function resetFixtures(): Promise<void> {
  await db.delete(auditLogs).where(eq(auditLogs.user_id, USER_ID));
  await db.delete(users).where(eq(users.id, USER_ID));
  await db.delete(workspaces).where(eq(workspaces.id, WORKSPACE_ID));
}

describe('recordTokenDenial without a working cache', () => {
  beforeEach(async () => {
    setSystemTime(START);
    await resetFixtures();
    await db.insert(workspaces).values({ id: WORKSPACE_ID, name: 'Denials', status: 'active' });
    await db.insert(users).values({
      id: USER_ID,
      workspace_id: WORKSPACE_ID,
      email: 'token-denial@example.com',
      name: 'Denial Owner',
      role: 'admin',
    });
  });

  afterEach(() => setSystemTime());
  afterAll(resetFixtures);

  test('records one row per token and subject every 10 minutes', async () => {
    const denial = { subject: 'transactions:create' as const, details: { method: 'POST' } };

    await recordTokenDenial(token, denial, deps);
    await recordTokenDenial(token, denial, deps);
    expect(await denialRows()).toHaveLength(1);

    setSystemTime(new Date(START.getTime() + 10 * 60_000 + 1_000));
    await recordTokenDenial(token, denial, deps);

    const rows = await denialRows();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      workspace_id: WORKSPACE_ID,
      entity_type: 'app_password',
      entity_id: 'pat_denial',
      actor_token_id: 'pat_denial',
      actor_token_kind: 'app_password',
      actor_token_name: 'Probe agent',
    });
    expect(JSON.parse(rows[0].new_value!)).toEqual({
      subject: 'transactions:create',
      method: 'POST',
    });
  });

  test('caps one token at five rows per 10 minutes across subjects', async () => {
    const subjects = [
      'transactions:create',
      'transactions:update',
      'transactions:delete',
      'recurring:write',
      'route:unlisted',
      'tool:unknown',
      'tool:get_dashboard',
    ] as const;

    for (const subject of subjects) {
      await recordTokenDenial(token, { subject, details: {} }, deps);
    }

    expect(await denialRows()).toHaveLength(5);
  });

  test('records an OAuth token against the mcp_token entity', async () => {
    await recordTokenDenial(
      { ...token, kind: 'oauth', tokenId: 'tok_oauth', tokenName: 'Claude Desktop' },
      { subject: 'tool:unknown', details: { tool: 'nope' } },
      deps
    );

    expect((await denialRows())[0]).toMatchObject({
      entity_type: 'mcp_token',
      actor_token_kind: 'oauth',
    });
  });
});
