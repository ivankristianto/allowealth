import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { oauthAccessToken, oauthRefreshToken } from '@/db/schema/sqlite';
import { CacheTags } from '@/lib/cache';
import { countRows, createMemoryDb, seedWorkspaceOwner } from '@/db/test-helpers/memory-db';
import { McpAppPasswordService } from './mcp-app-password.service';
import { SuperAdminService } from './super-admin.service';
import { createMockDatabase } from './test-helpers/mocks';

const mockInvalidateByTags = mock(async () => {});

import {
  revokeMcpTokensForUser,
  softDeleteUserAndRevokeMcpTokens,
} from './mcp-token-revocation.service';

describe('mcp-token-revocation.service', () => {
  beforeEach(() => {
    mockInvalidateByTags.mockReset();
  });

  it('deletes user MCP access and refresh tokens and invalidates token cache tags', async () => {
    const db = createMockDatabase() as any;

    db.query.oauthAccessToken = {
      findMany: mock(async () => [{ id: 'tok-1' }, { id: 'tok-2' }]),
    };

    await revokeMcpTokensForUser(db, 'user-1', {
      invalidateByTags: mockInvalidateByTags,
    });

    expect(db.delete).toHaveBeenCalledWith(oauthRefreshToken);
    expect(db.delete).toHaveBeenCalledWith(oauthAccessToken);
    expect(mockInvalidateByTags).toHaveBeenCalledWith([
      'mcp-token:tok-1',
      'mcp-token:tok-2',
      CacheTags.MCP_TOKENS,
    ]);
  });

  it('soft deletes the user and revokes MCP tokens in one transaction flow', async () => {
    const db = createMockDatabase() as any;

    db.query.oauthAccessToken = {
      findMany: mock(async () => [{ id: 'tok-1' }]),
    };

    await softDeleteUserAndRevokeMcpTokens(db, 'user-1', {
      invalidateByTags: mockInvalidateByTags,
    });

    expect(db.transaction).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalled();
    expect(db.delete).toHaveBeenCalled();
    expect(mockInvalidateByTags).toHaveBeenCalledWith(['mcp-token:tok-1', CacheTags.MCP_TOKENS]);
  });

  it('propagates deletion failures so the transaction can roll back', async () => {
    const db = createMockDatabase() as any;

    db.query.oauthAccessToken = {
      findMany: mock(async () => [{ id: 'tok-1' }]),
    };
    db.delete = mock(() => ({
      where: mock(async () => {
        throw new Error('delete failed');
      }),
    }));

    await expect(softDeleteUserAndRevokeMcpTokens(db, 'user-1')).rejects.toThrow('delete failed');
  });

  it('does not fail the operation when cache invalidation fails after commit', async () => {
    const db = createMockDatabase() as any;

    db.query.oauthAccessToken = {
      findMany: mock(async () => [{ id: 'tok-1' }]),
    };

    await expect(
      softDeleteUserAndRevokeMcpTokens(db, 'user-1', {
        invalidateByTags: async () => {
          throw new Error('cache failed');
        },
      })
    ).resolves.toBeUndefined();
  });

  it('keeps the user active and tokens intact when revocation fails mid-transaction', async () => {
    const { db, raw } = createMemoryDb();
    seedWorkspaceOwner(raw, 'ws-revoke', 'user-revoke');
    raw.run(`INSERT INTO user (id, name, email) VALUES ('user-revoke', 'Owner', 'o@example.test')`);
    raw.run(
      `INSERT INTO oauthClient (id, clientId, redirectUris) VALUES ('client-1', 'client-1', '[]')`
    );
    raw.run(
      `INSERT INTO oauthRefreshToken (id, token, clientId, userId, scopes)
       VALUES ('rt-1', 'rt-token', 'client-1', 'user-revoke', 'mcp')`
    );
    raw.run(
      `INSERT INTO oauthAccessToken (id, token, clientId, userId, scopes)
       VALUES ('at-1', 'at-token', 'client-1', 'user-revoke', 'mcp')`
    );
    raw.run(
      `CREATE TRIGGER fail_access_token_delete BEFORE DELETE ON oauthAccessToken
       BEGIN SELECT RAISE(ABORT, 'forced failure'); END;`
    );

    await expect(
      softDeleteUserAndRevokeMcpTokens(db, 'user-revoke', {
        invalidateByTags: mockInvalidateByTags,
      })
    ).rejects.toThrow('forced failure');

    expect(countRows(raw, 'users', `id = 'user-revoke' AND deleted_at IS NULL`)).toBe(1);
    expect(countRows(raw, 'oauthRefreshToken')).toBe(1);
    expect(countRows(raw, 'oauthAccessToken')).toBe(1);
    expect(mockInvalidateByTags).not.toHaveBeenCalled();
  });

  it('deletes app passwords with the user so reactivation does not bring them back', async () => {
    const { db, raw } = createMemoryDb();
    seedWorkspaceOwner(raw, 'ws-pat', 'user-pat');
    const appPasswords = new McpAppPasswordService(db);
    const { token } = await appPasswords.create({
      userId: 'user-pat',
      name: 'Nightly sync',
      scope: 'read',
      expiry: 'never',
    });
    expect(await appPasswords.verify(token)).not.toBeNull();

    await softDeleteUserAndRevokeMcpTokens(db, 'user-pat', {
      invalidateByTags: mockInvalidateByTags,
    });

    expect(countRows(raw, 'mcp_app_passwords')).toBe(0);

    await new SuperAdminService(db).reactivateUser('user-pat');

    expect(countRows(raw, 'users', `id = 'user-pat' AND deleted_at IS NULL`)).toBe(1);
    expect(await appPasswords.verify(token)).toBeNull();
  });

  it('keeps app passwords when the soft delete rolls back', async () => {
    const { db, raw } = createMemoryDb();
    seedWorkspaceOwner(raw, 'ws-pat-rb', 'user-pat-rb');
    const { token } = await new McpAppPasswordService(db).create({
      userId: 'user-pat-rb',
      name: 'CI',
      scope: 'read-write',
      expiry: '30',
    });
    raw.run(
      `CREATE TRIGGER fail_access_token_delete BEFORE DELETE ON oauthAccessToken
       BEGIN SELECT RAISE(ABORT, 'forced failure'); END;`
    );
    raw.run(
      `INSERT INTO user (id, name, email) VALUES ('user-pat-rb', 'Owner', 'rb@example.test')`
    );
    raw.run(
      `INSERT INTO oauthClient (id, clientId, redirectUris) VALUES ('client-rb', 'client-rb', '[]')`
    );
    raw.run(
      `INSERT INTO oauthAccessToken (id, token, clientId, userId, scopes)
       VALUES ('at-rb', 'at-rb-token', 'client-rb', 'user-pat-rb', 'mcp')`
    );

    await expect(
      softDeleteUserAndRevokeMcpTokens(db, 'user-pat-rb', {
        invalidateByTags: mockInvalidateByTags,
      })
    ).rejects.toThrow('forced failure');

    expect(countRows(raw, 'mcp_app_passwords')).toBe(1);
    expect(await new McpAppPasswordService(db).verify(token)).not.toBeNull();
  });
});
