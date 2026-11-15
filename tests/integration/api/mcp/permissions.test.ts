import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  mcpAppPasswords,
  oauthAccessToken,
  oauthClient,
  user as authUsers,
  users,
  workspaces,
} from '@/db/schema';
import { hashOAuthToken } from '@/lib/auth/oauth-token-hash';
import { getSeededMcpOAuthClients } from '@/lib/mcp-oauth';
import { expandPermissionGrants, type PermissionGrant } from '@/lib/permissions/registry';
import { clearRateLimitStore } from '@/lib/rate-limit';
import { McpAppPasswordService } from '@/services/mcp-app-password.service';

const WORKSPACE_ID = 'mcp-permissions-workspace';
const USER_ID = 'mcp-permissions-user';
const service = new McpAppPasswordService(db);

let post: typeof import('@/pages/api/mcp').POST;

interface ToolCallResult {
  isError?: boolean;
  content: Array<{ type: string; text: string }>;
}

async function createTokenWithGrants(grants: readonly PermissionGrant[]): Promise<string> {
  const { token } = await service.create({
    userId: USER_ID,
    name: `mcp ${crypto.randomUUID()}`,
    permissions: [...grants],
    expiry: '30',
  });
  return token;
}

const OAUTH_CLIENT_ID = 'mcp-claude-desktop';

/** Inserts an access token row the way the OAuth provider stores it on SQLite. */
async function createOAuthTokenWithScopes(scopes: string[]): Promise<string> {
  const seeded = getSeededMcpOAuthClients().find((c) => c.clientId === OAUTH_CLIENT_ID)!;
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
    scopes: JSON.stringify(scopes),
  });
  return rawToken;
}

async function rpc(token: string, method: string, params?: Record<string, unknown>) {
  const response = await post({
    request: new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    }),
  } as never);
  expect(response.status).toBe(200);
  return ((await response.json()) as { result: unknown }).result;
}

async function listToolNames(token: string): Promise<string[]> {
  const result = (await rpc(token, 'tools/list')) as { tools: Array<{ name: string }> };
  return result.tools.map((tool) => tool.name).sort();
}

async function callTool(
  token: string,
  name: string,
  args: Record<string, unknown> = {}
): Promise<ToolCallResult> {
  return (await rpc(token, 'tools/call', { name, arguments: args })) as ToolCallResult;
}

async function resetFixtures(): Promise<void> {
  await db.delete(mcpAppPasswords).where(eq(mcpAppPasswords.user_id, USER_ID));
  await db.delete(oauthAccessToken).where(eq(oauthAccessToken.userId, USER_ID));
  await db.delete(authUsers).where(eq(authUsers.id, USER_ID));
  await db.delete(users).where(eq(users.id, USER_ID));
  await db.delete(workspaces).where(eq(workspaces.id, WORKSPACE_ID));
}

describe('MCP tool access by token permissions', () => {
  beforeAll(async () => {
    ({ POST: post } = await import('@/pages/api/mcp'));
  });

  beforeEach(async () => {
    clearRateLimitStore();
    await resetFixtures();
    await db
      .insert(workspaces)
      .values({ id: WORKSPACE_ID, name: 'MCP Workspace', status: 'active' });
    await db.insert(users).values({
      id: USER_ID,
      workspace_id: WORKSPACE_ID,
      email: 'mcp-permissions@example.com',
      name: 'MCP Owner',
      role: 'admin',
    });
    await db
      .insert(authUsers)
      .values({ id: USER_ID, name: 'MCP Owner', email: 'mcp-permissions@example.com' });
  });

  afterAll(resetFixtures);

  test('a token holding only transactions:create sees and calls only the add tools', async () => {
    const token = await createTokenWithGrants(['transactions:create']);

    expect(await listToolNames(token)).toEqual(['add_expense', 'add_income', 'get_token_info']);

    const denied = await callTool(token, 'list_transactions');
    expect(denied).toEqual({
      isError: true,
      content: [
        { type: 'text', text: 'Tool list_transactions needs the transactions:read permission.' },
      ],
    });

    // Invalid arguments fail inside the handler, which shows the permission check let it through.
    const allowed = await callTool(token, 'add_expense');
    expect(allowed.isError).toBe(true);
    expect(allowed.content[0].text).toStartWith('Error: Invalid ');
  });

  test('get_dashboard needs all three of its permissions', async () => {
    const twoOfThree = await createTokenWithGrants(['transactions:read', 'accounts:read']);

    expect(await listToolNames(twoOfThree)).toEqual([
      'get_account_summary',
      'get_token_info',
      'list_accounts',
      'list_transactions',
    ]);
    const denied = await callTool(twoOfThree, 'get_dashboard');
    expect(denied.isError).toBe(true);
    expect(denied.content[0].text).toBe('Tool get_dashboard needs the budgets:read permission.');

    const allThree = await createTokenWithGrants([
      'transactions:read',
      'accounts:read',
      'budgets:read',
    ]);
    expect(await listToolNames(allThree)).toContain('get_dashboard');
  });

  test('a denial names every missing permission', async () => {
    const token = await createTokenWithGrants(['transactions:read']);

    const denied = await callTool(token, 'get_dashboard');
    expect(denied.content[0].text).toBe(
      'Tool get_dashboard needs the accounts:read, budgets:read permissions.'
    );
  });

  test('a tool missing from TOOL_PERMISSIONS is refused to a token holding every permission', async () => {
    const token = await createTokenWithGrants(['*']);

    expect(await callTool(token, 'drop_all_data')).toEqual({
      isError: true,
      content: [{ type: 'text', text: 'Tool drop_all_data is not available.' }],
    });
  });

  test('an Object.prototype member name is refused like any other unknown tool', async () => {
    const token = await createTokenWithGrants(['*']);

    for (const name of ['constructor', 'hasOwnProperty', '__proto__', 'toString']) {
      expect(await callTool(token, name)).toEqual({
        isError: true,
        content: [{ type: 'text', text: `Tool ${name} is not available.` }],
      });
    }
  });

  test('a token with no permissions sees and calls only get_token_info', async () => {
    const token = await createTokenWithGrants([]);

    expect(await listToolNames(token)).toEqual(['get_token_info']);
    const result = await callTool(token, 'get_token_info');
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toMatchObject({ preset: 'custom', permissions: [] });
  });

  test('get_token_info describes a read preset token with the HTTP rate limit', async () => {
    const { token, appPassword } = await service.create({
      userId: USER_ID,
      name: 'Morning summary',
      permissions: ['*:read'],
      expiry: '30',
    });
    const stored = await service.findForUser(USER_ID, appPassword.id);

    const result = await callTool(token, 'get_token_info');

    expect(JSON.parse(result.content[0].text)).toEqual({
      kind: 'app_password',
      id: appPassword.id,
      name: 'Morning summary',
      preset: 'read',
      permissions: expandPermissionGrants(['*:read']),
      expires_at: stored?.expiresAt?.toISOString(),
      created_at: stored?.createdAt.toISOString(),
      rate_limit: { limit: 60, window_seconds: 60 },
    });
  });

  test('get_token_info lists exactly the permissions of a custom token', async () => {
    const token = await createTokenWithGrants(['transactions:create', 'budgets:read']);

    const info = JSON.parse((await callTool(token, 'get_token_info')).content[0].text);

    expect(info).toMatchObject({
      preset: 'custom',
      permissions: ['transactions:create', 'budgets:read'],
    });
  });

  test('an OAuth token sees and calls only the tools its permission scopes cover', async () => {
    const token = await createOAuthTokenWithScopes([
      'openid',
      'mcp',
      'allowealth:transactions:create',
    ]);

    expect(await listToolNames(token)).toEqual(['add_expense', 'add_income', 'get_token_info']);
    expect(await callTool(token, 'list_transactions')).toEqual({
      isError: true,
      content: [
        { type: 'text', text: 'Tool list_transactions needs the transactions:read permission.' },
      ],
    });
    expect(JSON.parse((await callTool(token, 'get_token_info')).content[0].text)).toEqual({
      kind: 'oauth',
      permissions: ['transactions:create'],
    });
  });

  test('an OAuth token with only openid and mcp sees and calls only get_token_info', async () => {
    const token = await createOAuthTokenWithScopes(['openid', 'mcp']);

    expect(await listToolNames(token)).toEqual(['get_token_info']);
    expect((await callTool(token, 'list_accounts')).isError).toBe(true);
    expect(JSON.parse((await callTool(token, 'get_token_info')).content[0].text)).toEqual({
      kind: 'oauth',
      permissions: [],
    });
  });
});
