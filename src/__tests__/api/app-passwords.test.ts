/**
 * App passwords end to end: the /api/user/app-passwords routes, /api/mcp and the
 * stdio server's auth cache, against a throwaway SQLite file next to this test.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { join } from 'node:path';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { resetDb } from '@/db';
import * as schema from '@/db/schema/sqlite';
import { setTestEnv } from '@/lib/env';
import { clearRateLimitStore } from '@/lib/rate-limit';
import { createFileDatabase, seedWorkspaceUser } from '../../../tests/helpers/file-db';

const DB_PATH = join(import.meta.dir, `app-passwords-int-${nanoid(8)}.sqlite`);
const testDb = createFileDatabase(DB_PATH);
const { db } = testDb;

const workspaceId = `ws-${nanoid(8)}`;
const userId = `usr-${nanoid(8)}`;
const otherUserId = `usr-${nanoid(8)}`;

const FRESH_SESSION = () => ({ createdAt: new Date() });
const STALE_SESSION = () => ({ createdAt: new Date(Date.now() - 16 * 60 * 1000) });

beforeAll(() => {
  seedWorkspaceUser(db, { workspaceId, userId });
  seedWorkspaceUser(db, { workspaceId, userId: otherUserId });
  setTestEnv({ DATABASE_URL: DB_PATH });
  resetDb();
});

afterAll(() => {
  setTestEnv(null);
  resetDb();
  delete process.env.ALLOWEALTH_ACCESS_TOKEN;
  testDb.cleanup();
});

beforeEach(() => {
  clearRateLimitStore();
});

function routeContext(
  request: Request,
  options: { user?: string; session?: { createdAt: Date }; id?: string } = {}
) {
  return {
    request,
    url: new URL(request.url),
    params: { id: options.id },
    locals: {
      user: options.user ? { id: options.user } : null,
      session: options.session ?? null,
    },
  } as never;
}

async function createAppPassword(
  scope: 'read' | 'read-write',
  options: { user?: string; session?: { createdAt: Date } } = {}
) {
  const { POST } = await import('@/pages/api/user/app-passwords/index');
  return POST(
    routeContext(
      new Request('http://localhost/api/user/app-passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `token ${scope}`, scope, expiry: '30' }),
      }),
      { user: options.user ?? userId, session: options.session ?? FRESH_SESSION() }
    )
  );
}

async function createToken(scope: 'read' | 'read-write') {
  const response = await createAppPassword(scope);
  const body = (await response.json()) as {
    data: { token: string; appPassword: { id: string } };
  };
  return { token: body.data.token, id: body.data.appPassword.id };
}

async function revokeToken(id: string, user = userId) {
  const { DELETE } = await import('@/pages/api/user/app-passwords/[id]');
  return DELETE(
    routeContext(
      new Request(`http://localhost/api/user/app-passwords/${id}`, { method: 'DELETE' }),
      { user, id }
    )
  );
}

async function callMcp(token: string, method: string, params?: Record<string, unknown>) {
  const { POST } = await import('@/pages/api/mcp');
  return POST(
    routeContext(
      new Request('http://localhost/api/mcp', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      })
    )
  );
}

describe('POST /api/user/app-passwords', () => {
  it('requires a sign-in from the last 15 minutes', async () => {
    const response = await createAppPassword('read', { session: STALE_SESSION() });

    expect(response.status).toBe(403);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
      'REAUTH_REQUIRED'
    );
  });

  it('creates a token, returns it once with no-store, and audit-logs it', async () => {
    const response = await createAppPassword('read');
    const body = (await response.json()) as {
      data: { token: string; appPassword: { id: string; scope: string } };
    };

    expect(response.status).toBe(201);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body.data.token).toStartWith('aw_pat_');
    expect(body.data.appPassword.scope).toBe('read');

    const audit = db
      .select()
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.entity_id, body.data.appPassword.id),
          eq(schema.auditLogs.entity_type, 'app_password')
        )
      )
      .all();
    expect(audit.map((row) => row.action)).toEqual(['create']);
    expect(JSON.stringify(audit)).not.toContain(body.data.token);
  });

  it('rejects an unknown scope', async () => {
    const { POST } = await import('@/pages/api/user/app-passwords/index');
    const response = await POST(
      routeContext(
        new Request('http://localhost/api/user/app-passwords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'x', scope: 'admin', expiry: '30' }),
        }),
        { user: userId, session: FRESH_SESSION() }
      )
    );
    expect(response.status).toBe(400);
  });
});

describe('/api/mcp with app passwords', () => {
  it('accepts a read-write token and lists every tool', async () => {
    const { token } = await createToken('read-write');

    const response = await callMcp(token, 'tools/list');
    const body = (await response.json()) as { result: { tools: Array<{ name: string }> } };

    expect(response.status).toBe(200);
    expect(body.result.tools.map((tool) => tool.name)).toContain('add_expense');
  });

  it('hides and refuses write tools for a read-only token', async () => {
    const { token } = await createToken('read');

    const list = (await (await callMcp(token, 'tools/list')).json()) as {
      result: { tools: Array<{ name: string }> };
    };
    const names = list.result.tools.map((tool) => tool.name);
    expect(names).toContain('list_categories');
    expect(names).not.toContain('add_expense');
    expect(names).not.toContain('add_income');

    const write = (await (
      await callMcp(token, 'tools/call', {
        name: 'add_expense',
        arguments: { amount: 1000, currency: 'IDR', category_name: 'Food', account_name: 'Cash' },
      })
    ).json()) as { result: { isError?: boolean; content: Array<{ text: string }> } };
    expect(write.result.isError).toBe(true);
    expect(write.result.content[0].text).toContain('read-write');

    const read = (await (
      await callMcp(token, 'tools/call', { name: 'list_categories', arguments: {} })
    ).json()) as { result: { isError?: boolean } };
    expect(read.result.isError).toBeUndefined();
  });

  it('refuses a token after it is revoked', async () => {
    const { token, id } = await createToken('read');
    expect((await callMcp(token, 'ping')).status).toBe(200);

    expect((await revokeToken(id)).status).toBe(200);
    expect((await callMcp(token, 'ping')).status).toBe(401);
    expect((await revokeToken(id)).status).toBe(404);
  });

  it("does not let a user revoke someone else's token", async () => {
    const { token, id } = await createToken('read');

    expect((await revokeToken(id, otherUserId)).status).toBe(404);
    expect((await callMcp(token, 'ping')).status).toBe(200);
  });

  it('refuses an expired token', async () => {
    const { token, id } = await createToken('read');
    db.update(schema.mcpAppPasswords)
      .set({ expires_at: new Date(Date.now() - 1000) })
      .where(eq(schema.mcpAppPasswords.id, id))
      .run();

    expect((await callMcp(token, 'ping')).status).toBe(401);
  });
});

describe('stdio MCP server auth with app passwords', () => {
  it('rejects a token revoked after the server cached its context', async () => {
    const { token, id } = await createToken('read');
    process.env.ALLOWEALTH_ACCESS_TOKEN = token;
    const { authenticate, getAuthContext } = await import('@mcp-server/auth');

    const auth = await authenticate();
    expect(auth).toMatchObject({ userId, workspaceId, tokenId: id, scope: 'read' });
    expect(await getAuthContext()).toMatchObject({ tokenId: id });

    expect((await revokeToken(id)).status).toBe(200);
    const error = await getAuthContext().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('no longer valid');
  });
});

describe('deleted users', () => {
  it('refuses tokens of a soft-deleted user on /api/mcp', async () => {
    const deletedUserId = `usr-${nanoid(8)}`;
    seedWorkspaceUser(db, { workspaceId, userId: deletedUserId });
    const response = await createAppPassword('read-write', { user: deletedUserId });
    const { token } = ((await response.json()) as { data: { token: string } }).data;
    expect((await callMcp(token, 'ping')).status).toBe(200);

    db.update(schema.users)
      .set({ deleted_at: new Date() })
      .where(eq(schema.users.id, deletedUserId))
      .run();
    expect((await callMcp(token, 'ping')).status).toBe(401);
  });
});
