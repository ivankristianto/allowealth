import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { SQL } from 'drizzle-orm';
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import { oauthAccessToken, users } from '@/db/schema/sqlite';

const mockFindFirst = mock(async () => null);
const mockDb = {
  query: {
    oauthAccessToken: { findFirst: mockFindFirst },
    users: { findFirst: mock(async () => null) },
  },
};

const mockCacheGet = mock(async () => null);
const mockCacheSet = mock(async () => {});
const mockCacheInvalidate = mock(async () => {});

const testDeps = {
  db: mockDb,
  getSchema: () => ({
    oauthAccessToken,
    users,
  }),
  cache: { invalidateByTags: mockCacheInvalidate },
};

import { hashOAuthToken } from '@/lib/auth/oauth-token-hash';
import { invalidateMcpToken, validateMcpToken } from './mcp-auth';

describe('validateMcpToken', () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockCacheGet.mockReset();
    mockCacheSet.mockReset();
    mockCacheInvalidate.mockReset();
    mockDb.query.oauthAccessToken.findFirst = mockFindFirst;
    mockDb.query.users.findFirst = mock(async () => null);
  });

  it('returns null for empty token', async () => {
    expect(await validateMcpToken('', testDeps)).toBeNull();
  });

  it('returns null when token not found in DB', async () => {
    mockCacheGet.mockResolvedValue(null);
    mockDb.query.oauthAccessToken.findFirst = mock(async () => null);
    expect(await validateMcpToken('unknown-token', testDeps)).toBeNull();
  });

  it('returns null for expired token', async () => {
    mockCacheGet.mockResolvedValue(null);
    const expiredAt = new Date(Date.now() - 1000);
    mockDb.query.oauthAccessToken.findFirst = mock(async () => ({
      id: 'tok-1',
      expiresAt: expiredAt,
      revoked: null,
      userId: 'user-1',
    }));
    expect(await validateMcpToken('valid-token', testDeps)).toBeNull();
  });

  it('returns null for a token revoked by sign-out or session revocation', async () => {
    mockDb.query.oauthAccessToken.findFirst = mock(async () => ({
      id: 'tok-1',
      expiresAt: new Date(Date.now() + 3600_000),
      revoked: new Date(),
      userId: 'user-1',
    }));
    mockDb.query.users.findFirst = mock(async () => ({ workspace_id: 'ws-1' }));

    expect(await validateMcpToken('valid-token', testDeps)).toBeNull();
  });

  it('returns null when the token has no expiry', async () => {
    mockDb.query.oauthAccessToken.findFirst = mock(async () => ({
      id: 'tok-1',
      expiresAt: null,
      revoked: null,
      userId: 'user-1',
    }));
    mockDb.query.users.findFirst = mock(async () => ({ workspace_id: 'ws-1' }));

    expect(await validateMcpToken('valid-token', testDeps)).toBeNull();
  });

  it('looks the token up by its hash, never the raw value', async () => {
    let capturedWhere: SQL | undefined;
    mockDb.query.oauthAccessToken.findFirst = mock(async (config: { where: SQL }) => {
      capturedWhere = config.where;
      return null;
    }) as typeof mockFindFirst;

    await validateMcpToken('raw-bearer-token', testDeps);

    const config = { where: capturedWhere! };
    const { params } = new SQLiteSyncDialect().sqlToQuery(config.where);
    expect(params).toEqual([await hashOAuthToken('raw-bearer-token')]);
  });

  it('returns McpAuthContext for valid token', async () => {
    mockCacheGet.mockResolvedValue(null);
    const expiresAt = new Date(Date.now() + 3600_000);
    mockDb.query.oauthAccessToken.findFirst = mock(async () => ({
      id: 'tok-1',
      expiresAt,
      revoked: null,
      userId: 'user-1',
    }));
    mockDb.query.users.findFirst = mock(async () => ({
      workspace_id: 'ws-1',
    }));

    const result = await validateMcpToken('valid-token', testDeps);
    expect(result).toEqual({ workspaceId: 'ws-1', userId: 'user-1', tokenId: 'tok-1' });
    expect(mockCacheSet).not.toHaveBeenCalled();
  });

  it('does not write successful auth results into cache', async () => {
    mockCacheGet.mockResolvedValue(null);
    const expiresAt = new Date(Date.now() + 60_000);
    mockDb.query.oauthAccessToken.findFirst = mock(async () => ({
      id: 'tok-1',
      expiresAt,
      revoked: null,
      userId: 'user-1',
    }));
    mockDb.query.users.findFirst = mock(async () => ({
      workspace_id: 'ws-1',
    }));

    const result = await validateMcpToken('short-lived-token', testDeps);
    expect(result).toEqual({ workspaceId: 'ws-1', userId: 'user-1', tokenId: 'tok-1' });
    expect(mockCacheSet).not.toHaveBeenCalled();
  });

  it('does not accept cached auth without a fresh DB validation', async () => {
    mockCacheGet.mockResolvedValue({ workspaceId: 'ws-1', userId: 'user-1', tokenId: 'tok-1' });

    const result = await validateMcpToken('any-token', testDeps);
    expect(result).toBeNull();
  });

  it('returns null when user has no workspaceId', async () => {
    mockCacheGet.mockResolvedValue(null);
    const expiresAt = new Date(Date.now() + 3600_000);
    mockDb.query.oauthAccessToken.findFirst = mock(async () => ({
      id: 'tok-1',
      expiresAt,
      revoked: null,
      userId: 'user-1',
    }));
    mockDb.query.users.findFirst = mock(async () => ({ workspace_id: null }));

    expect(await validateMcpToken('valid-token', testDeps)).toBeNull();
  });

  it('returns null for soft-deleted users', async () => {
    const expiresAt = new Date(Date.now() + 3600_000);
    mockDb.query.oauthAccessToken.findFirst = mock(async () => ({
      id: 'tok-1',
      expiresAt,
      revoked: null,
      userId: 'user-1',
    }));
    mockDb.query.users.findFirst = mock(async () => ({
      workspace_id: 'ws-1',
      deleted_at: new Date(),
    }));

    expect(await validateMcpToken('valid-token', testDeps)).toBeNull();
  });

  it('always checks the database even when a cached value exists', async () => {
    mockCacheGet.mockResolvedValue({
      workspaceId: 'ws-cached',
      userId: 'user-1',
      tokenId: 'tok-1',
    });
    mockDb.query.oauthAccessToken.findFirst = mock(async () => null);

    const result = await validateMcpToken('valid-token', testDeps);

    expect(result).toBeNull();
    expect(mockDb.query.oauthAccessToken.findFirst).toHaveBeenCalled();
  });
});

describe('invalidateMcpToken', () => {
  it('calls cache invalidateByTags with token tag', async () => {
    mockCacheInvalidate.mockResolvedValue(undefined);
    await invalidateMcpToken('tok-1', testDeps);
    expect(mockCacheInvalidate).toHaveBeenCalledWith(['mcp-token:tok-1']);
  });
});
