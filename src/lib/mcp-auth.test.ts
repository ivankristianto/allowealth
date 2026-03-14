import { describe, it, expect, beforeEach, mock } from 'bun:test';

const moduleMock = mock as typeof mock & {
  module: (specifier: string, factory: () => unknown) => void;
};

// ---- Mock DB ----
const mockFindFirst = mock(async () => null);
const mockDb = {
  query: {
    oauthAccessToken: { findFirst: mockFindFirst },
    users: { findFirst: mock(async () => null) },
  },
};

// ---- Mock cache ----
const mockCacheGet = mock(async () => null);
const mockCacheSet = mock(async () => {});
const mockCacheInvalidate = mock(async () => {});
const mockCache = {
  get: mockCacheGet,
  set: mockCacheSet,
  invalidateByTags: mockCacheInvalidate,
};

moduleMock.module('@/db', () => ({
  db: mockDb,
  getActiveSchema: () => ({
    oauthAccessToken: { accessToken: 'accessToken' },
    users: { id: 'id' },
  }),
}));

moduleMock.module('@/lib/cache', () => ({
  getCacheManager: () => mockCache,
  CacheKeys: { mcpToken: (h: string) => `cache:mcptoken:${h}` },
  CacheTags: { MCP_TOKENS: 'mcp_tokens' },
  simpleHash: (s: string) => s.slice(0, 8),
}));

// Import after mocks
import { validateMcpToken, invalidateMcpToken } from './mcp-auth';

describe('validateMcpToken', () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockCacheGet.mockReset();
    mockCacheSet.mockReset();
  });

  it('returns null for empty token', async () => {
    expect(await validateMcpToken('')).toBeNull();
  });

  it('returns null when token not found in DB', async () => {
    mockCacheGet.mockResolvedValue(null);
    mockDb.query.oauthAccessToken.findFirst = mock(async () => null);
    expect(await validateMcpToken('unknown-token')).toBeNull();
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
    expect(await validateMcpToken('valid-token')).toBeNull();
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

    const result = await validateMcpToken('valid-token');
    expect(result).toEqual({ workspaceId: 'ws-1', userId: 'user-1', tokenId: 'tok-1' });
    expect(mockCacheSet).toHaveBeenCalledTimes(1);
  });

  it('returns cached result without hitting DB', async () => {
    const cached = { workspaceId: 'ws-1', userId: 'user-1', tokenId: 'tok-1' };
    mockCacheGet.mockResolvedValue(cached);

    const result = await validateMcpToken('any-token');
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

    expect(await validateMcpToken('valid-token')).toBeNull();
  });
});

describe('invalidateMcpToken', () => {
  it('calls cache invalidateByTags with token tag', async () => {
    mockCacheInvalidate.mockResolvedValue(undefined);
    await invalidateMcpToken('tok-1');
    expect(mockCacheInvalidate).toHaveBeenCalledWith(['mcp-token:tok-1']);
  });
});
