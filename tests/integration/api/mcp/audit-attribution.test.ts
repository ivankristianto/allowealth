import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  accounts,
  auditLogs,
  categories,
  mcpAppPasswords,
  oauthAccessToken,
  oauthClient,
  transactions,
  user as authUsers,
  users,
  workspaces,
} from '@/db/schema';
import { hashOAuthToken } from '@/lib/auth/oauth-token-hash';
import { resetCacheManager } from '@/lib/cache';
import { getSeededMcpOAuthClients } from '@/lib/mcp-oauth';
import { clearRateLimitStore } from '@/lib/rate-limit';
import { McpAppPasswordService } from '@/services/mcp-app-password.service';

const WORKSPACE_ID = 'mcp-audit-workspace';
const USER_ID = 'mcp-audit-user';
const OAUTH_CLIENT_ID = 'mcp-claude-desktop';
const service = new McpAppPasswordService(db);

let post: typeof import('@/pages/api/mcp').POST;

async function callTool(token: string, name: string, args: Record<string, unknown> = {}) {
  const response = await post({
    request: new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name, arguments: args },
      }),
    }),
  } as never);
  expect(response.status).toBe(200);
  return ((await response.json()) as { result: { isError?: boolean } }).result;
}

const addExpense = (token: string) =>
  callTool(token, 'add_expense', {
    amount: 25000,
    currency: 'IDR',
    category_name: 'Food',
    account_name: 'Wallet',
    date: '2026-11-01',
  });

function auditRows(action: string) {
  return db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.user_id, USER_ID), eq(auditLogs.action, action)));
}

// The service writes the create event fire-and-forget, after the tool returns.
async function waitForAuditRow(action: string) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const [row] = await auditRows(action);
    if (row) return row;
    await Bun.sleep(10);
  }
  throw new Error(`no ${action} audit row`);
}

async function createOAuthToken(): Promise<string> {
  const [seeded] = getSeededMcpOAuthClients().filter((c) => c.clientId === OAUTH_CLIENT_ID);
  await db
    .insert(oauthClient)
    .values({
      id: `client-${OAUTH_CLIENT_ID}`,
      clientId: seeded.clientId,
      name: seeded.name,
      redirectUris: JSON.stringify(seeded.redirectUris),
    })
    .onConflictDoNothing();
  const rawToken = `oauth-${crypto.randomUUID()}`;
  await db.insert(oauthAccessToken).values({
    id: `at-${crypto.randomUUID()}`,
    token: await hashOAuthToken(rawToken),
    clientId: OAUTH_CLIENT_ID,
    userId: USER_ID,
    expiresAt: new Date(Date.now() + 3_600_000),
    scopes: JSON.stringify(['openid', 'mcp']),
  });
  return rawToken;
}

async function resetFixtures(): Promise<void> {
  await db.delete(auditLogs).where(eq(auditLogs.user_id, USER_ID));
  await db.delete(oauthAccessToken).where(eq(oauthAccessToken.userId, USER_ID));
  await db.delete(transactions).where(eq(transactions.workspace_id, WORKSPACE_ID));
  await db.delete(accounts).where(eq(accounts.workspace_id, WORKSPACE_ID));
  await db.delete(categories).where(eq(categories.workspace_id, WORKSPACE_ID));
  await db.delete(mcpAppPasswords).where(eq(mcpAppPasswords.user_id, USER_ID));
  await db.delete(authUsers).where(eq(authUsers.id, USER_ID));
  await db.delete(users).where(eq(users.id, USER_ID));
  await db.delete(workspaces).where(eq(workspaces.id, WORKSPACE_ID));
}

describe('MCP audit attribution', () => {
  beforeAll(async () => {
    ({ POST: post } = await import('@/pages/api/mcp'));
  });

  beforeEach(async () => {
    clearRateLimitStore();
    resetCacheManager();
    await resetFixtures();
    await db.insert(workspaces).values({ id: WORKSPACE_ID, name: 'MCP Audit', status: 'active' });
    await db.insert(users).values({
      id: USER_ID,
      workspace_id: WORKSPACE_ID,
      email: 'mcp-audit@example.com',
      name: 'MCP Audit Owner',
      role: 'admin',
    });
    await db
      .insert(authUsers)
      .values({ id: USER_ID, name: 'MCP Audit Owner', email: 'mcp-audit@example.com' });
    await db.insert(accounts).values({
      id: 'mcp-audit-wallet',
      workspace_id: WORKSPACE_ID,
      created_by_user_id: USER_ID,
      name: 'Wallet',
      type: 'cash',
      balance: '1000000',
      currency: 'IDR',
    });
    await db.insert(categories).values({
      id: 'mcp-audit-food',
      workspace_id: WORKSPACE_ID,
      created_by_user_id: USER_ID,
      name: 'Food',
      type: 'expense',
    });
  });

  afterAll(async () => {
    await resetFixtures();
    resetCacheManager();
  });

  test('a write with an app password records the token', async () => {
    const { token, appPassword } = await service.create({
      userId: USER_ID,
      name: 'Budget agent',
      permissions: ['transactions:create'],
      expiry: '30',
    });

    expect((await addExpense(token)).isError).toBeUndefined();

    expect(await waitForAuditRow('create')).toMatchObject({
      entity_type: 'transaction',
      actor_token_id: appPassword.id,
      actor_token_kind: 'app_password',
      actor_token_name: 'Budget agent',
    });
  });

  test("a write with an OAuth token records the token and its client's name", async () => {
    const token = await createOAuthToken();
    const [tokenRow] = await db
      .select({ id: oauthAccessToken.id })
      .from(oauthAccessToken)
      .where(eq(oauthAccessToken.userId, USER_ID));

    expect((await addExpense(token)).isError).toBeUndefined();

    expect(await waitForAuditRow('create')).toMatchObject({
      actor_token_id: tokenRow.id,
      actor_token_kind: 'oauth',
      actor_token_name: 'Claude Desktop',
    });
  });

  test('denied tool calls are recorded once each, with unknown tools under one subject', async () => {
    const { token, appPassword } = await service.create({
      userId: USER_ID,
      name: 'Reader',
      permissions: ['accounts:read'],
      expiry: '30',
    });

    expect((await callTool(token, 'get_dashboard')).isError).toBe(true);
    expect((await callTool(token, 'get_dashboard')).isError).toBe(true);
    expect((await callTool(token, 'no_such_tool')).isError).toBe(true);
    expect((await callTool(token, 'another_made_up_tool')).isError).toBe(true);

    const denials = await auditRows('token_denied');
    expect(denials).toHaveLength(2);
    expect(denials[0]).toMatchObject({
      workspace_id: WORKSPACE_ID,
      entity_type: 'app_password',
      entity_id: appPassword.id,
      actor_token_id: appPassword.id,
      actor_token_name: 'Reader',
    });
    expect(denials.map((row) => JSON.parse(row.new_value!))).toEqual(
      expect.arrayContaining([
        {
          subject: 'tool:get_dashboard',
          tool: 'get_dashboard',
          missing: ['transactions:read', 'budgets:read'],
        },
        { subject: 'tool:unknown', tool: 'no_such_tool' },
      ])
    );
  });
});
