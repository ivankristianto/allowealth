import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { DrizzleQueryError, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import * as schema from '@/db/schema/sqlite';
import { hashOAuthToken } from '@/lib/auth/oauth-token-hash';
import { MAX_APP_PASSWORDS_PER_USER } from '@/lib/mcp-app-password';
import { createSetupSqlDatabase, seedWorkspaceUser } from '../../tests/helpers/setup-sql-db';
import { AppPasswordError, McpAppPasswordService } from './mcp-app-password.service';

const DB_PATH = join(import.meta.dir, `mcp-app-password-test-${nanoid(8)}.sqlite`);
const testDb = createSetupSqlDatabase(DB_PATH);
const { db } = testDb;

let clock = new Date('2026-06-01T00:00:00Z');
const service = new McpAppPasswordService(db, () => clock);

let workspaceId: string;
let userId: string;

afterAll(() => testDb.cleanup());

beforeEach(() => {
  clock = new Date('2026-06-01T00:00:00Z');
  workspaceId = `ws-${nanoid(8)}`;
  userId = `usr-${nanoid(8)}`;
  seedWorkspaceUser(db, { workspaceId, userId });
});

function advance(ms: number) {
  clock = new Date(clock.getTime() + ms);
}

describe('McpAppPasswordService.create', () => {
  test('returns an aw_pat_ token once and stores only its hash', async () => {
    const { token, appPassword } = await service.create({
      userId,
      name: 'Nightly import',
      scope: 'read',
      expiry: '30',
    });

    expect(token).toMatch(/^aw_pat_[A-Za-z0-9_-]{43}$/);
    expect(appPassword.tokenHint).toBe(token.slice(0, 11));
    expect(appPassword.expiresAt?.toISOString()).toBe('2026-07-01T00:00:00.000Z');

    const row = db
      .select()
      .from(schema.mcpAppPasswords)
      .where(eq(schema.mcpAppPasswords.id, appPassword.id))
      .get();
    expect(row?.token_hash).toBe(await hashOAuthToken(token));
    expect(JSON.stringify(row)).not.toContain(token);
    expect(row?.workspace_id).toBe(workspaceId);
  });

  test('stores no expiry only when "never" is chosen', async () => {
    const { appPassword } = await service.create({
      userId,
      name: 'CI',
      scope: 'read-write',
      expiry: 'never',
    });
    expect(appPassword.expiresAt).toBeNull();
  });

  test('refuses users without a workspace', async () => {
    db.update(schema.users).set({ workspace_id: null }).where(eq(schema.users.id, userId)).run();

    const error = await service
      .create({ userId, name: 'x', scope: 'read', expiry: '30' })
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: 'NO_WORKSPACE' });
  });

  test(`caps each user at ${MAX_APP_PASSWORDS_PER_USER} app passwords`, async () => {
    for (let i = 0; i < MAX_APP_PASSWORDS_PER_USER; i++) {
      await service.create({ userId, name: `t${i}`, scope: 'read', expiry: '30' });
    }

    const error = await service
      .create({ userId, name: 'one more', scope: 'read', expiry: '30' })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AppPasswordError);
    expect(error).toMatchObject({ code: 'LIMIT_REACHED' });
  });
});

describe('McpAppPasswordService.verify', () => {
  test('accepts a valid token and returns its scope', async () => {
    const { token, appPassword } = await service.create({
      userId,
      name: 'Agent',
      scope: 'read',
      expiry: '90',
    });

    expect(await service.verify(token)).toEqual({
      workspaceId,
      userId,
      tokenId: appPassword.id,
      scope: 'read',
    });
  });

  test('refuses unknown and non-prefixed tokens', async () => {
    expect(await service.verify('aw_pat_doesnotexist')).toBeNull();
    expect(await service.verify('some-oauth-token')).toBeNull();
  });

  test('refuses an expired token', async () => {
    const { token } = await service.create({ userId, name: 'Old', scope: 'read', expiry: '30' });

    advance(30 * 24 * 60 * 60 * 1000);
    expect(await service.verify(token)).toBeNull();
  });

  test('refuses a revoked token', async () => {
    const { token, appPassword } = await service.create({
      userId,
      name: 'Gone',
      scope: 'read-write',
      expiry: '30',
    });
    expect(await service.verify(token)).not.toBeNull();

    expect(await service.revoke(userId, appPassword.id)).toEqual({
      id: appPassword.id,
      name: 'Gone',
    });
    expect(await service.verify(token)).toBeNull();
  });

  test('refuses tokens of a soft-deleted user', async () => {
    const { token } = await service.create({ userId, name: 'x', scope: 'read', expiry: 'never' });

    db.update(schema.users)
      .set({ deleted_at: new Date() })
      .where(eq(schema.users.id, userId))
      .run();
    expect(await service.verify(token)).toBeNull();
  });

  test('refuses tokens once the user leaves the workspace', async () => {
    const { token } = await service.create({ userId, name: 'x', scope: 'read', expiry: 'never' });
    const otherWorkspace = `ws-${nanoid(8)}`;
    seedWorkspaceUser(db, { workspaceId: otherWorkspace, userId: `usr-${nanoid(8)}` });

    db.update(schema.users)
      .set({ workspace_id: otherWorkspace })
      .where(eq(schema.users.id, userId))
      .run();
    expect(await service.verify(token)).toBeNull();

    db.update(schema.users).set({ workspace_id: null }).where(eq(schema.users.id, userId)).run();
    expect(await service.verify(token)).toBeNull();
  });

  test('deletes tokens with the user row', async () => {
    const { token, appPassword } = await service.create({
      userId,
      name: 'x',
      scope: 'read',
      expiry: '30',
    });

    db.delete(schema.users).where(eq(schema.users.id, userId)).run();
    expect(await service.verify(token)).toBeNull();
    expect(
      db
        .select()
        .from(schema.mcpAppPasswords)
        .where(eq(schema.mcpAppPasswords.id, appPassword.id))
        .get()
    ).toBeUndefined();
  });

  test('records last use at most once a minute', async () => {
    const { token, appPassword } = await service.create({
      userId,
      name: 'x',
      scope: 'read',
      expiry: '30',
    });
    const lastUsed = () =>
      db
        .select({ at: schema.mcpAppPasswords.last_used_at })
        .from(schema.mcpAppPasswords)
        .where(eq(schema.mcpAppPasswords.id, appPassword.id))
        .get()?.at;

    await service.verify(token);
    const first = lastUsed();
    expect(first?.toISOString()).toBe(clock.toISOString());

    advance(30_000);
    await service.verify(token);
    expect(lastUsed()?.getTime()).toBe(first?.getTime());

    advance(31_000);
    await service.verify(token);
    expect(lastUsed()?.toISOString()).toBe(clock.toISOString());
  });
});

describe('McpAppPasswordService.revoke and listForUser', () => {
  test("cannot revoke another user's token", async () => {
    const { token, appPassword } = await service.create({
      userId,
      name: 'Mine',
      scope: 'read',
      expiry: '30',
    });
    const otherUser = `usr-${nanoid(8)}`;
    seedWorkspaceUser(db, { workspaceId, userId: otherUser });

    expect(await service.revoke(otherUser, appPassword.id)).toBeNull();
    expect(await service.verify(token)).not.toBeNull();
  });

  test('lists newest first and flags expired tokens', async () => {
    await service.create({ userId, name: 'first', scope: 'read', expiry: '30' });
    advance(60_000);
    await service.create({ userId, name: 'second', scope: 'read-write', expiry: 'never' });
    advance(31 * 24 * 60 * 60 * 1000);

    const list = await service.listForUser(userId);
    expect(list.map((item) => [item.name, item.isExpired])).toEqual([
      ['second', false],
      ['first', true],
    ]);
  });
});

describe('McpAppPasswordService database errors', () => {
  test('never include the token hash in the error message', async () => {
    const brokenPath = join(import.meta.dir, `mcp-app-password-broken-${nanoid(8)}.sqlite`);
    const broken = createSetupSqlDatabase(brokenPath);
    try {
      seedWorkspaceUser(broken.db, { workspaceId, userId });
      broken.raw.run('DROP TABLE mcp_app_passwords');
      const brokenService = new McpAppPasswordService(broken.db, () => clock);
      const token = 'aw_pat_' + 'a'.repeat(43);

      const verifyError = await brokenService.verify(token).catch((caught: Error) => caught);
      expect(verifyError).toBeInstanceOf(Error);
      expect((verifyError as Error).message).toContain('no such table');
      expect((verifyError as Error).message).not.toContain(await hashOAuthToken(token));
      expect((verifyError as Error).message).not.toContain('params');

      const createError = await brokenService
        .create({ userId, name: 'x', scope: 'read', expiry: '30' })
        .catch((caught: Error) => caught);
      expect(createError).toBeInstanceOf(Error);
      expect((createError as Error).message).not.toContain('params');
    } finally {
      broken.cleanup();
    }
  });

  test('strip bound params from Drizzle query errors', async () => {
    const token = 'aw_pat_' + 'b'.repeat(43);
    const tokenHash = await hashOAuthToken(token);
    const failingQuery = {
      limit: () =>
        Promise.reject(
          new DrizzleQueryError(
            'select ... where token_hash = ?',
            [tokenHash],
            new Error('disk I/O error')
          )
        ),
    };
    const failingDb = {
      select: () => ({ from: () => ({ innerJoin: () => ({ where: () => failingQuery }) }) }),
    };
    const failingService = new McpAppPasswordService(failingDb as never, () => clock);

    const error = await failingService.verify(token).catch((caught: Error) => caught);
    expect((error as Error).message).toBe('Checking the app password failed: disk I/O error');
    expect((error as Error).message).not.toContain(tokenHash);
  });
});
