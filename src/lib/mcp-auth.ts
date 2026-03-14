import { db, getActiveSchema } from '@/db';
import { getCacheManager, CacheKeys, CacheTags, simpleHash } from '@/lib/cache';
import { eq } from 'drizzle-orm';

const CACHE_TTL_SECONDS = 300;

export interface McpAuthContext {
  workspaceId: string;
  userId: string;
  tokenId: string;
}

interface McpAuthDeps {
  db: {
    query: {
      oauthAccessToken: { findFirst: (config: unknown) => Promise<any> };
      users: { findFirst: (config: unknown) => Promise<any> };
    };
  };
  getSchema: () => Pick<ReturnType<typeof getActiveSchema>, 'oauthAccessToken' | 'users'>;
  cache: Pick<ReturnType<typeof getCacheManager>, 'get' | 'set' | 'invalidateByTags'>;
  cacheKeys: Pick<typeof CacheKeys, 'mcpToken'>;
  cacheTags: Pick<typeof CacheTags, 'MCP_TOKENS'>;
  hash: (token: string) => string;
}

function resolveDeps(overrides: Partial<McpAuthDeps> = {}): McpAuthDeps {
  return {
    db,
    getSchema: getActiveSchema,
    cache: getCacheManager(),
    cacheKeys: CacheKeys,
    cacheTags: CacheTags,
    hash: simpleHash,
    ...overrides,
  };
}

async function lookupToken(token: string, deps: McpAuthDeps): Promise<McpAuthContext | null> {
  const schema = deps.getSchema();

  const tokenRecord = await deps.db.query.oauthAccessToken.findFirst({
    where: eq(schema.oauthAccessToken.accessToken, token),
    columns: {
      id: true,
      accessTokenExpiresAt: true,
      userId: true,
    },
  });

  if (!tokenRecord) return null;
  if (new Date(tokenRecord.accessTokenExpiresAt) < new Date()) return null;

  const userId = tokenRecord.userId;
  if (!userId) return null;

  const userRecord = await deps.db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { workspace_id: true },
  });

  if (!userRecord?.workspace_id) return null;

  return {
    workspaceId: userRecord.workspace_id,
    userId,
    tokenId: tokenRecord.id,
  };
}

export async function validateMcpToken(
  token: string,
  overrides: Partial<McpAuthDeps> = {}
): Promise<McpAuthContext | null> {
  if (!token) return null;

  const deps = resolveDeps(overrides);
  const tokenHash = deps.hash(token);
  const cacheKey = deps.cacheKeys.mcpToken(tokenHash);

  const cached = await deps.cache.get<McpAuthContext>(cacheKey);
  if (cached) return cached;

  const result = await lookupToken(token, deps);
  if (!result) return null;

  await deps.cache.set(cacheKey, result, {
    ttl: CACHE_TTL_SECONDS,
    tags: [deps.cacheTags.MCP_TOKENS, `mcp-token:${result.tokenId}`],
  });

  return result;
}

export async function invalidateMcpToken(
  tokenId: string,
  overrides: Partial<McpAuthDeps> = {}
): Promise<void> {
  const deps = resolveDeps(overrides);
  await deps.cache.invalidateByTags([`mcp-token:${tokenId}`]);
}
