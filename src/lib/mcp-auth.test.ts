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

const MCP_GRANT = { clientId: 'mcp-claude-desktop', scopes: JSON.stringify(['openid', 'mcp']) };

function liveToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tok-1',
    expiresAt: new Date(Date.now() + 3600_000),
    revoked: null,
    userId: 'user-1',
    ...MCP_GRANT,
    ...overrides,
  };
}

import { hashOAuthToken } from '@/lib/auth/oauth-token-hash';
import { MCP_OAUTH_CLIENTS } from '@/lib/mcp-oauth';
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
      ...MCP_GRANT,
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
      ...MCP_GRANT,
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

  it('selects the scopes and client id so they can be checked', async () => {
    let capturedColumns: Record<string, boolean> | undefined;
    mockDb.query.oauthAccessToken.findFirst = mock(
      async (config: { columns: Record<string, boolean> }) => {
        capturedColumns = config.columns;
        return null;
      }
    ) as typeof mockFindFirst;

    await validateMcpToken('raw-bearer-token', testDeps);

    expect(capturedColumns).toMatchObject({ scopes: true, clientId: true });
  });

  it('rejects a token granted without the mcp scope', async () => {
    mockDb.query.oauthAccessToken.findFirst = mock(async () =>
      liveToken({ scopes: JSON.stringify(['openid']) })
    );
    mockDb.query.users.findFirst = mock(async () => ({ workspace_id: 'ws-1' }));

    expect(await validateMcpToken('openid-only-token', testDeps)).toBeNull();
  });

  it('does not treat a scope that only starts with mcp as mcp', async () => {
    mockDb.query.oauthAccessToken.findFirst = mock(async () =>
      liveToken({ scopes: JSON.stringify(['openid', 'mcpx']) })
    );
    mockDb.query.users.findFirst = mock(async () => ({ workspace_id: 'ws-1' }));

    expect(await validateMcpToken('lookalike-scope-token', testDeps)).toBeNull();
  });

  it('rejects a token whose scopes column is not a JSON array', async () => {
    mockDb.query.oauthAccessToken.findFirst = mock(async () => liveToken({ scopes: 'openid mcp' }));
    mockDb.query.users.findFirst = mock(async () => ({ workspace_id: 'ws-1' }));

    expect(await validateMcpToken('malformed-scope-token', testDeps)).toBeNull();
  });

  it('rejects a token minted for a client that is not a seeded MCP client', async () => {
    mockDb.query.oauthAccessToken.findFirst = mock(async () =>
      liveToken({ clientId: 'user-registered-client' })
    );
    mockDb.query.users.findFirst = mock(async () => ({ workspace_id: 'ws-1' }));

    expect(await validateMcpToken('foreign-client-token', testDeps)).toBeNull();
  });

  it('accepts an mcp token from every seeded MCP client', async () => {
    mockDb.query.users.findFirst = mock(async () => ({ workspace_id: 'ws-1' }));

    for (const { clientId } of MCP_OAUTH_CLIENTS) {
      mockDb.query.oauthAccessToken.findFirst = mock(async () => liveToken({ clientId }));
      expect(await validateMcpToken('valid-token', testDeps)).toEqual({
        workspaceId: 'ws-1',
        userId: 'user-1',
        tokenId: 'tok-1',
      });
    }
  });

  it('returns McpAuthContext for valid token', async () => {
    mockCacheGet.mockResolvedValue(null);
    const expiresAt = new Date(Date.now() + 3600_000);
    mockDb.query.oauthAccessToken.findFirst = mock(async () => ({
      id: 'tok-1',
      expiresAt,
      revoked: null,
      userId: 'user-1',
      ...MCP_GRANT,
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
      ...MCP_GRANT,
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
      ...MCP_GRANT,
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
      ...MCP_GRANT,
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

describe('validateMcpToken app password dispatch', () => {
  const appPasswordContext = {
    workspaceId: 'ws-1',
    userId: 'user-1',
    tokenId: 'pat_1',
    scope: 'read' as const,
  };

  beforeEach(() => {
    mockDb.query.oauthAccessToken.findFirst = mock(async () => null);
    mockDb.query.users.findFirst = mock(async () => null);
  });

  it('sends aw_pat_ tokens to the app password verifier and never to the OAuth table', async () => {
    const verify = mock(async () => appPasswordContext);

    const result = await validateMcpToken('aw_pat_abc', {
      ...testDeps,
      appPasswords: { verify },
    });

    expect(result).toEqual(appPasswordContext);
    expect(verify).toHaveBeenCalledWith('aw_pat_abc');
    expect(mockDb.query.oauthAccessToken.findFirst).not.toHaveBeenCalled();
  });

  it('does not fall back to the OAuth lookup when an app password is refused', async () => {
    const verify = mock(async () => null);

    expect(
      await validateMcpToken('aw_pat_revoked', { ...testDeps, appPasswords: { verify } })
    ).toBeNull();
    expect(mockDb.query.oauthAccessToken.findFirst).not.toHaveBeenCalled();
  });

  it('leaves OAuth tokens on the OAuth path with no scope restriction', async () => {
    const verify = mock(async () => appPasswordContext);
    mockDb.query.oauthAccessToken.findFirst = mock(async () => ({
      id: 'tok-1',
      expiresAt: new Date(Date.now() + 3600_000),
      revoked: null,
      userId: 'user-1',
      ...MCP_GRANT,
    }));
    mockDb.query.users.findFirst = mock(async () => ({ workspace_id: 'ws-1', deleted_at: null }));

    const result = await validateMcpToken('oauth-token', { ...testDeps, appPasswords: { verify } });

    expect(verify).not.toHaveBeenCalled();
    expect(result).toEqual({ workspaceId: 'ws-1', userId: 'user-1', tokenId: 'tok-1' });
    expect(result?.scope).toBeUndefined();
  });
});
