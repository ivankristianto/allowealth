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
import type { AppPasswordLimits } from '@/lib/app-password-limits';
import { hashOAuthToken } from '@/lib/auth/oauth-token-hash';
import { resetCacheManager } from '@/lib/cache';
import { getSeededMcpOAuthClients } from '@/lib/mcp-oauth';
import { clearRateLimitStore } from '@/lib/rate-limit';
import { McpAppPasswordService } from '@/services/mcp-app-password.service';

const WORKSPACE_ID = 'mcp-limits-workspace';
const USER_ID = 'mcp-limits-user';
const OAUTH_CLIENT_ID = 'mcp-claude-desktop';
const service = new McpAppPasswordService(db);

let post: typeof import('@/pages/api/mcp').POST;

type ToolResult = { isError?: boolean; content: Array<{ text: string }> };

async function addExpense(token: string, category: string): Promise<ToolResult> {
  const response = await post({
    request: new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'add_expense',
          arguments: {
            amount: 25000,
            currency: 'IDR',
            category_name: category,
            account_name: 'Wallet',
          },
        },
      }),
    }),
  } as never);
  expect(response.status).toBe(200);
  return ((await response.json()) as { result: ToolResult }).result;
}

async function createAppPassword(limits: AppPasswordLimits) {
  const { token, appPassword } = await service.create({
    userId: USER_ID,
    name: 'Grocery agent',
    permissions: ['transactions:create'],
    expiry: '30',
  });
  await db.update(mcpAppPasswords).set({ limits }).where(eq(mcpAppPasswords.id, appPassword.id));
  return { token, id: appPassword.id };
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
    scopes: JSON.stringify(['openid', 'mcp', 'allowealth:transactions:create']),
  });
  return rawToken;
}

function workspaceTransactions() {
  return db
    .select({ category: transactions.category_id, tokenId: transactions.created_by_token_id })
    .from(transactions)
    .where(eq(transactions.workspace_id, WORKSPACE_ID));
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

describe('MCP app password limits', () => {
  beforeAll(async () => {
    ({ POST: post } = await import('@/pages/api/mcp'));
  });

  beforeEach(async () => {
    clearRateLimitStore();
    resetCacheManager();
    await resetFixtures();
    await db.insert(workspaces).values({ id: WORKSPACE_ID, name: 'MCP Limits', status: 'active' });
    await db.insert(users).values({
      id: USER_ID,
      workspace_id: WORKSPACE_ID,
      email: 'mcp-limits@example.com',
      name: 'MCP Limits Owner',
      role: 'admin',
    });
    await db
      .insert(authUsers)
      .values({ id: USER_ID, name: 'MCP Limits Owner', email: 'mcp-limits@example.com' });
    await db.insert(accounts).values({
      id: 'mcp-limits-wallet',
      workspace_id: WORKSPACE_ID,
      created_by_user_id: USER_ID,
      name: 'Wallet',
      type: 'cash',
      balance: '1000000',
      currency: 'IDR',
    });
    await db.insert(categories).values(
      ['Food', 'Travel'].map((name) => ({
        id: `mcp-limits-${name.toLowerCase()}`,
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_ID,
        name,
        type: 'expense' as const,
      }))
    );
  });

  afterAll(async () => {
    await resetFixtures();
    resetCacheManager();
  });

  test('add_expense writes to a listed category, names the limit for others, and records it', async () => {
    const { token, id } = await createAppPassword({ category_ids: ['mcp-limits-food'] });

    expect((await addExpense(token, 'Food')).isError).toBeUndefined();
    const refused = await addExpense(token, 'Travel');
    expect(refused.isError).toBe(true);
    expect(refused.content[0].text).toContain('category limit');

    expect(await workspaceTransactions()).toEqual([{ category: 'mcp-limits-food', tokenId: id }]);
    const denials = await db
      .select({ entityId: auditLogs.entity_id, newValue: auditLogs.new_value })
      .from(auditLogs)
      .where(and(eq(auditLogs.user_id, USER_ID), eq(auditLogs.action, 'token_denied')));
    expect(denials).toEqual([
      {
        entityId: id,
        newValue: JSON.stringify({
          subject: 'limit:category',
          limit: 'category',
          category_id: 'mcp-limits-travel',
        }),
      },
    ]);
  });

  test('an OAuth token has no limits and leaves created_by_token_id empty', async () => {
    const token = await createOAuthToken();

    expect((await addExpense(token, 'Travel')).isError).toBeUndefined();
    expect(await workspaceTransactions()).toEqual([
      { category: 'mcp-limits-travel', tokenId: null },
    ]);
  });
});
