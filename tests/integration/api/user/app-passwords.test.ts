/**
 * The /api/user/app-passwords routes: creating with a preset or custom permissions,
 * reading one token, and editing it, against a throwaway SQLite file.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { join } from 'node:path';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { resetDb } from '@/db';
import * as schema from '@/db/schema/sqlite';
import { getCacheManager, resetCacheManager } from '@/lib/cache';
import { setTestEnv } from '@/lib/env';
import { clearRateLimitStore } from '@/lib/rate-limit';
import { APP_PASSWORD_WRITE_RATE_LIMIT } from '@/lib/mcp-app-password';
import { createSetupSqlDatabase, seedWorkspaceUser } from '../../../helpers/setup-sql-db';

const DB_PATH = join(import.meta.dir, `app-passwords-routes-${nanoid(8)}.test.sqlite`);
const testDb = createSetupSqlDatabase(DB_PATH);
const { db } = testDb;

const workspaceId = `ws-${nanoid(8)}`;
const userId = `usr-${nanoid(8)}`;
const otherUserId = `usr-${nanoid(8)}`;

const FRESH_SESSION = () => ({ createdAt: new Date() });
const STALE_SESSION = () => ({ createdAt: new Date(Date.now() - 16 * 60 * 1000) });

interface AppPasswordBody {
  id: string;
  name: string;
  permissions: string[];
  preset: string;
  limits: Record<string, unknown>;
}

const FOOD_CATEGORY = `cat-${nanoid(8)}`;
const FOREIGN_CATEGORY = `cat-${nanoid(8)}`;

interface ErrorBody {
  error: { code: string; message: string; details?: Array<{ message: string }> };
}

beforeAll(() => {
  seedWorkspaceUser(db, { workspaceId, userId });
  seedWorkspaceUser(db, { workspaceId, userId: otherUserId });
  const foreignWorkspaceId = `ws-${nanoid(8)}`;
  const foreignUserId = `usr-${nanoid(8)}`;
  seedWorkspaceUser(db, { workspaceId: foreignWorkspaceId, userId: foreignUserId });
  db.insert(schema.categories)
    .values(
      [
        { id: FOOD_CATEGORY, workspace_id: workspaceId, created_by_user_id: userId, name: 'Food' },
        {
          id: FOREIGN_CATEGORY,
          workspace_id: foreignWorkspaceId,
          created_by_user_id: foreignUserId,
          name: 'Food',
        },
      ].map((category) => ({ ...category, type: 'expense' as const }))
    )
    .run();
  setTestEnv({ DATABASE_URL: DB_PATH });
  resetDb();
});

afterAll(() => {
  setTestEnv(null);
  resetDb();
  testDb.cleanup();
});

beforeEach(() => {
  clearRateLimitStore();
  db.delete(schema.mcpAppPasswords).run();
});

function routeContext(
  request: Request,
  options: { user?: string | null; session?: { createdAt: Date }; id?: string } = {}
) {
  const user = options.user === undefined ? userId : options.user;
  return {
    request,
    url: new URL(request.url),
    params: { id: options.id },
    locals: {
      user: user ? { id: user, workspaceId } : null,
      session: options.session ?? FRESH_SESSION(),
    },
  } as never;
}

function jsonRequest(method: string, path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function post(body: unknown, options: { session?: { createdAt: Date } } = {}) {
  const { POST } = await import('@/pages/api/user/app-passwords/index');
  return POST(routeContext(jsonRequest('POST', '/api/user/app-passwords', body), options));
}

async function create(access: Record<string, unknown>): Promise<{ token: string; id: string }> {
  const response = await post({ name: 'Agent', expiry: '30', ...access });
  expect(response.status).toBe(201);
  const { data } = (await response.json()) as {
    data: { token: string; appPassword: AppPasswordBody };
  };
  return { token: data.token, id: data.appPassword.id };
}

async function patch(
  id: string,
  body: unknown,
  options: { user?: string | null; session?: { createdAt: Date } } = {}
) {
  const { PATCH } = await import('@/pages/api/user/app-passwords/[id]');
  return PATCH(
    routeContext(jsonRequest('PATCH', `/api/user/app-passwords/${id}`, body), { ...options, id })
  );
}

async function getOne(id: string, user = userId) {
  const { GET } = await import('@/pages/api/user/app-passwords/[id]');
  return GET(
    routeContext(new Request(`http://localhost/api/user/app-passwords/${id}`), { user, id })
  );
}

/** Fetches the edit form and returns the response with the props the partial was given. */
async function getEditForm(
  id: string,
  options: { user?: string; session?: { createdAt: Date }; requestedWith?: string | null } = {}
) {
  const { GET } = await import('@/pages/api/user/app-passwords/[id]');
  const requestedWith =
    options.requestedWith === undefined ? 'XMLHttpRequest' : options.requestedWith;
  const renderToString = spyOn(AstroContainer.prototype, 'renderToString');
  try {
    const response = await GET(
      routeContext(
        new Request(`http://localhost/api/user/app-passwords/${id}?_render=html`, {
          headers: requestedWith ? { 'X-Requested-With': requestedWith } : {},
        }),
        { user: options.user ?? userId, session: options.session, id }
      )
    );
    const props = renderToString.mock.calls[0]?.[1]?.props as
      | { appPassword: AppPasswordBody; recentSignIn: boolean; categories: Array<{ id: string }> }
      | undefined;
    return { response, props };
  } finally {
    renderToString.mockRestore();
  }
}

async function listToolNames(token: string): Promise<string[]> {
  const { POST } = await import('@/pages/api/mcp');
  const response = await POST(
    routeContext(
      new Request('http://localhost/api/mcp', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      }),
      { user: null }
    )
  );
  const body = (await response.json()) as { result: { tools: Array<{ name: string }> } };
  return body.result.tools.map((tool) => tool.name).sort();
}

function storedPermissions(id: string) {
  return db
    .select({ permissions: schema.mcpAppPasswords.permissions })
    .from(schema.mcpAppPasswords)
    .where(eq(schema.mcpAppPasswords.id, id))
    .get()?.permissions;
}

function auditRows(id: string) {
  return db
    .select()
    .from(schema.auditLogs)
    .where(
      and(eq(schema.auditLogs.entity_id, id), eq(schema.auditLogs.entity_type, 'app_password'))
    )
    .all();
}

async function expectValidationError(response: Response, message: string): Promise<void> {
  expect(response.status).toBe(400);
  const body = (await response.json()) as ErrorBody;
  expect(body.error.code).toBe('VALIDATION_ERROR');
  expect(body.error.details?.map((detail) => detail.message)).toContain(message);
}

describe('POST /api/user/app-passwords', () => {
  it('requires a sign-in from the last 15 minutes', async () => {
    const response = await post(
      { name: 'x', scope: 'read', expiry: '30' },
      { session: STALE_SESSION() }
    );

    expect(response.status).toBe(403);
    expect(((await response.json()) as ErrorBody).error.code).toBe('REAUTH_REQUIRED');
  });

  it('creates a preset token, returns it once with no-store, and audit-logs it', async () => {
    const response = await post({ name: 'Reader', scope: 'read', expiry: '30' });
    const body = (await response.json()) as {
      data: { token: string; appPassword: AppPasswordBody };
    };

    expect(response.status).toBe(201);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body.data.token).toStartWith('aw_pat_');
    expect(body.data.appPassword).toMatchObject({ permissions: ['*:read'], preset: 'read' });
    expect(body.data.appPassword).not.toHaveProperty('scope');

    const audit = auditRows(body.data.appPassword.id);
    expect(audit.map((row) => row.action)).toEqual(['create']);
    expect(JSON.stringify(audit)).not.toContain(body.data.token);
  });

  it('creates a custom token with its permissions in registry order', async () => {
    const response = await post({
      name: 'Bookkeeper',
      expiry: '30',
      permissions: ['transactions:create', 'accounts:read', 'transactions:create'],
    });
    const { appPassword } = ((await response.json()) as { data: { appPassword: AppPasswordBody } })
      .data;

    expect(response.status).toBe(201);
    expect(appPassword).toMatchObject({
      permissions: ['transactions:create', 'accounts:read'],
      preset: 'custom',
    });
    expect(storedPermissions(appPassword.id)).toEqual(['transactions:create', 'accounts:read']);
  });

  it('creates a token with limits and records them in the activity log', async () => {
    const response = await post({
      name: 'Grocery agent',
      expiry: '30',
      scope: 'read-write',
      limits: { category_ids: [FOOD_CATEGORY], own_transactions_only: true },
    });
    const { appPassword } = ((await response.json()) as { data: { appPassword: AppPasswordBody } })
      .data;

    const limits = { category_ids: [FOOD_CATEGORY], own_transactions_only: true };
    expect(response.status).toBe(201);
    expect(appPassword.limits).toEqual(limits);
    expect(JSON.parse(auditRows(appPassword.id)[0]?.new_value ?? '{}')).toMatchObject({ limits });
  });

  it('refuses a category from another workspace and stores nothing', async () => {
    const response = await post({
      name: 'Grocery agent',
      expiry: '30',
      scope: 'read-write',
      limits: { category_ids: [FOREIGN_CATEGORY] },
    });

    expect(response.status).toBe(400);
    expect(((await response.json()) as ErrorBody).error.code).toBe('UNKNOWN_CATEGORY');
    expect(db.select().from(schema.mcpAppPasswords).all()).toEqual([]);
  });

  // Every rule lives in src/lib/validation/app-passwords.test.ts; this proves the route applies it.
  it('answers an invalid body with VALIDATION_ERROR and stores nothing', async () => {
    await expectValidationError(
      await post({ name: 'x', expiry: '30', permissions: ['*'] }),
      '* is not a permission'
    );
    expect(db.select().from(schema.mcpAppPasswords).all()).toEqual([]);
  });
});

describe('GET /api/user/app-passwords/{id}', () => {
  it("returns the caller's own token and 404 for anyone else's", async () => {
    const { id } = await create({ scope: 'read-write' });

    const own = await getOne(id);
    expect(own.status).toBe(200);
    expect(
      ((await own.json()) as { data: { appPassword: AppPasswordBody } }).data.appPassword
    ).toMatchObject({ id, permissions: ['*'], preset: 'read-write' });

    expect((await getOne(id, otherUserId)).status).toBe(404);
  });
});

describe('GET /api/user/app-passwords/{id}?_render=html', () => {
  // Under bun the container prints the component tag instead of its markup, so these check
  // which partial rendered and the props it got; the markup itself was checked in a browser.
  it('renders the edit form partial for the requested token, with the workspace categories', async () => {
    await create({ scope: 'read' });
    const { id } = await create({
      permissions: ['budgets:read'],
      limits: { category_ids: [FOOD_CATEGORY] },
    });

    const { response, props } = await getEditForm(id);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/html');
    expect(await response.text()).toContain('SecurityAppPasswordEditPartial.astro');
    expect(props?.recentSignIn).toBe(true);
    expect(props?.appPassword).toMatchObject({
      id,
      permissions: ['budgets:read'],
      limits: { category_ids: [FOOD_CATEGORY] },
    });
    expect(props?.categories.map((category) => category.id)).toEqual([FOOD_CATEGORY]);
  });

  it('asks the partial for the sign-in notice when the session is old', async () => {
    const { id } = await create({ scope: 'read' });

    const { response, props } = await getEditForm(id, { session: STALE_SESSION() });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('recentSignIn="false"');
    expect(props?.recentSignIn).toBe(false);
  });

  it("returns 404 for another user's token without rendering", async () => {
    const { id } = await create({ scope: 'read' });

    const { response, props } = await getEditForm(id, { user: otherUserId });

    expect(response.status).toBe(404);
    expect(props).toBeUndefined();
  });

  it('refuses an HTML request without X-Requested-With', async () => {
    const { id } = await create({ scope: 'read' });

    const { response, props } = await getEditForm(id, { requestedWith: null });

    expect(response.status).toBe(403);
    expect(props).toBeUndefined();
  });
});

describe('PATCH /api/user/app-passwords/{id}', () => {
  it('narrows permissions, takes effect on the next request, and audit-logs the change', async () => {
    const { token, id } = await create({ scope: 'read-write' });
    expect(await listToolNames(token)).toContain('add_expense');

    const response = await patch(id, { permissions: ['accounts:read'] });
    expect(response.status).toBe(200);
    expect(
      ((await response.json()) as { data: { appPassword: AppPasswordBody } }).data.appPassword
    ).toMatchObject({ id, name: 'Agent', permissions: ['accounts:read'], preset: 'custom' });

    expect(await listToolNames(token)).toEqual([
      'get_account_summary',
      'get_token_info',
      'list_accounts',
    ]);

    const update = auditRows(id).find((row) => row.action === 'update');
    expect(JSON.parse(update?.old_value ?? '{}')).toMatchObject({ permissions: ['*'] });
    expect(JSON.parse(update?.new_value ?? '{}')).toMatchObject({
      permissions: ['accounts:read'],
    });
  });

  it("invalidates the token's cache tag, as revoking does", async () => {
    const { id } = await create({ scope: 'read' });
    resetCacheManager();
    const invalidate = spyOn(getCacheManager(), 'invalidateByTags');
    try {
      expect((await patch(id, { scope: 'read-write' })).status).toBe(200);
      expect(invalidate).toHaveBeenCalledWith([`mcp-token:${id}`]);
    } finally {
      invalidate.mockRestore();
      resetCacheManager();
    }
  });

  it('renames without touching permissions, and switches back to a preset', async () => {
    const { id } = await create({ permissions: ['budgets:read'] });

    const renamed = await patch(id, { name: '  Budget bot  ' });
    expect(
      ((await renamed.json()) as { data: { appPassword: AppPasswordBody } }).data.appPassword
    ).toMatchObject({ name: 'Budget bot', permissions: ['budgets:read'] });

    expect((await patch(id, { scope: 'read' })).status).toBe(200);
    expect(storedPermissions(id)).toEqual(['*:read']);
  });

  it('sets and clears limits, logging both values, and refuses an unknown category', async () => {
    const { id } = await create({ scope: 'read-write' });
    const limits = { category_ids: [FOOD_CATEGORY] };

    const limited = await patch(id, { limits });
    expect(limited.status).toBe(200);
    expect(
      ((await limited.json()) as { data: { appPassword: AppPasswordBody } }).data.appPassword.limits
    ).toEqual(limits);

    const refused = await patch(id, { limits: { category_ids: ['cat-missing'] } });
    expect(refused.status).toBe(400);
    expect(((await refused.json()) as ErrorBody).error.code).toBe('UNKNOWN_CATEGORY');

    expect((await patch(id, { limits: {} })).status).toBe(200);
    const updates = auditRows(id).filter((row) => row.action === 'update');
    expect(updates.map((row) => JSON.parse(row.new_value ?? '{}').limits)).toEqual([limits, {}]);
    expect(JSON.parse(updates[1]?.old_value ?? '{}').limits).toEqual(limits);
  });

  it("returns 404 for another user's token and leaves it unchanged", async () => {
    const { id } = await create({ scope: 'read' });

    const response = await patch(id, { scope: 'read-write' }, { user: otherUserId });

    expect(response.status).toBe(404);
    expect(((await response.json()) as ErrorBody).error.code).toBe('NOT_FOUND');
    expect(storedPermissions(id)).toEqual(['*:read']);
  });

  it('requires a sign-in from the last 15 minutes', async () => {
    const { id } = await create({ scope: 'read' });

    const response = await patch(id, { scope: 'read-write' }, { session: STALE_SESSION() });

    expect(response.status).toBe(403);
    expect(((await response.json()) as ErrorBody).error.code).toBe('REAUTH_REQUIRED');
    expect(storedPermissions(id)).toEqual(['*:read']);
  });

  it('requires a signed-in user', async () => {
    const { id } = await create({ scope: 'read' });
    expect((await patch(id, { name: 'x' }, { user: null })).status).toBe(401);
  });

  it('answers an invalid body with VALIDATION_ERROR and leaves the token unchanged', async () => {
    const { id } = await create({ scope: 'read' });

    await expectValidationError(
      await patch(id, { permissions: [] }),
      'Choose at least one permission'
    );
    expect(storedPermissions(id)).toEqual(['*:read']);
  });

  it('is rate limited per user like create', async () => {
    const { id } = await create({ scope: 'read' });

    for (let i = 0; i < APP_PASSWORD_WRITE_RATE_LIMIT.maxRequests; i++) {
      expect((await patch(id, { name: `n${i}` })).status).toBe(200);
    }
    expect((await patch(id, { name: 'one more' })).status).toBe(429);
  });
});
