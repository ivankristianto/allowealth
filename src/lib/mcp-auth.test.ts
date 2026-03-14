import { beforeEach, describe, expect, it, mock } from 'bun:test';
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
const mockCache = {
  get: mockCacheGet,
  set: mockCacheSet,
  invalidateByTags: mockCacheInvalidate,
};

const testDeps = {
  db: mockDb,
  getSchema: () => ({
    oauthAccessToken,
    users,
  }),
  cache: mockCache,
  cacheKeys: { mcpToken: (hash: string) => `cache:mcptoken:${hash}` },
  cacheTags: { MCP_TOKENS: 'mcp_tokens' as const },
  hash: (token: string) => token.slice(0, 8),
};

import { invalidateMcpToken, validateMcpToken } from './mcp-auth';

describe('validateMcpToken', () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockCacheGet.mockReset();
    mockCacheSet.mockReset();
    mockCacheInvalidate.mockReset();
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
      accessToken: 'valid-token',
      accessTokenExpiresAt: expiredAt,
      userId: 'user-1',
    }));
    expect(await validateMcpToken('valid-token', testDeps)).toBeNull();
  });

  it('returns McpAuthContext for valid token', async () => {
    mockCacheGet.mockResolvedValue(null);
    const expiresAt = new Date(Date.now() + 3600_000);
    mockDb.query.oauthAccessToken.findFirst = mock(async () => ({
      id: 'tok-1',
      accessToken: 'valid-token',
      accessTokenExpiresAt: expiresAt,
      userId: 'user-1',
    }));
    mockDb.query.users.findFirst = mock(async () => ({
      workspace_id: 'ws-1',
    }));

    const result = await validateMcpToken('valid-token', testDeps);
    expect(result).toEqual({ workspaceId: 'ws-1', userId: 'user-1', tokenId: 'tok-1' });
    expect(mockCacheSet).toHaveBeenCalledWith(
      'cache:mcptoken:valid-to',
      { workspaceId: 'ws-1', userId: 'user-1', tokenId: 'tok-1' },
      { ttl: 300, tags: ['mcp_tokens', 'mcp-token:tok-1'] }
    );
  });

  it('caps cache TTL to the token remaining lifetime', async () => {
    mockCacheGet.mockResolvedValue(null);
    const expiresAt = new Date(Date.now() + 60_000);
    mockDb.query.oauthAccessToken.findFirst = mock(async () => ({
      id: 'tok-1',
      accessToken: 'short-lived-token',
      accessTokenExpiresAt: expiresAt,
      userId: 'user-1',
    }));
    mockDb.query.users.findFirst = mock(async () => ({
      workspace_id: 'ws-1',
    }));

    const result = await validateMcpToken('short-lived-token', testDeps);
    expect(result).toEqual({ workspaceId: 'ws-1', userId: 'user-1', tokenId: 'tok-1' });
    expect(mockCacheSet).toHaveBeenCalledWith(
      'cache:mcptoken:short-li',
      { workspaceId: 'ws-1', userId: 'user-1', tokenId: 'tok-1' },
      { ttl: 60, tags: ['mcp_tokens', 'mcp-token:tok-1'] }
    );
  });

  it('returns cached result without hitting DB', async () => {
    const cached = { workspaceId: 'ws-1', userId: 'user-1', tokenId: 'tok-1' };
    mockCacheGet.mockResolvedValue(cached);

    const result = await validateMcpToken('any-token', testDeps);
    expect(result).toEqual(cached);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it('returns null when user has no workspaceId', async () => {
    mockCacheGet.mockResolvedValue(null);
    const expiresAt = new Date(Date.now() + 3600_000);
    mockDb.query.oauthAccessToken.findFirst = mock(async () => ({
      id: 'tok-1',
      accessToken: 'valid-token',
      accessTokenExpiresAt: expiresAt,
      userId: 'user-1',
    }));
    mockDb.query.users.findFirst = mock(async () => ({ workspace_id: null }));

    expect(await validateMcpToken('valid-token', testDeps)).toBeNull();
  });
});

describe('invalidateMcpToken', () => {
  it('calls cache invalidateByTags with token tag', async () => {
    mockCacheInvalidate.mockResolvedValue(undefined);
    await invalidateMcpToken('tok-1', testDeps);
    expect(mockCacheInvalidate).toHaveBeenCalledWith(['mcp-token:tok-1']);
  });
});
