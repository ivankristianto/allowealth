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

interface TokenLookupResult {
  auth: McpAuthContext;
  accessTokenExpiresAt: Date;
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

async function lookupToken(token: string, deps: McpAuthDeps): Promise<TokenLookupResult | null> {
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
    auth: {
      workspaceId: userRecord.workspace_id,
      userId,
      tokenId: tokenRecord.id,
    },
    accessTokenExpiresAt: tokenRecord.accessTokenExpiresAt,
  };
}

function getCacheTtlSeconds(accessTokenExpiresAt: Date): number {
  const secondsUntilExpiry = Math.floor((accessTokenExpiresAt.getTime() - Date.now()) / 1000);
  return Math.min(CACHE_TTL_SECONDS, secondsUntilExpiry);
}

export async function validateMcpToken(
  rawToken: string,
  overrides: Partial<McpAuthDeps> = {}
): Promise<McpAuthContext | null> {
  if (!rawToken) return null;

  const deps = resolveDeps(overrides);
  const tokenHash = deps.hash(rawToken);
  const cacheKey = deps.cacheKeys.mcpToken(tokenHash);

  const cached = await deps.cache.get<McpAuthContext>(cacheKey);
  if (cached) return cached;

  const lookup = await lookupToken(rawToken, deps);
  if (!lookup) return null;

  const ttl = getCacheTtlSeconds(lookup.accessTokenExpiresAt);
  if (ttl > 0) {
    await deps.cache.set(cacheKey, lookup.auth, {
      ttl,
      tags: [deps.cacheTags.MCP_TOKENS, `mcp-token:${lookup.auth.tokenId}`],
    });
  }

  return lookup.auth;
}

export async function invalidateMcpToken(
  tokenId: string,
  overrides: Partial<McpAuthDeps> = {}
): Promise<void> {
  const deps = resolveDeps(overrides);
  await deps.cache.invalidateByTags([`mcp-token:${tokenId}`]);
}
