import { db, getActiveSchema } from '@/db';
import { getCacheManager, CacheKeys, CacheTags, simpleHash } from '@/lib/cache';
import { eq } from 'drizzle-orm';

const CACHE_TTL_SECONDS = 300;

export interface McpAuthContext {
  workspaceId: string;
  userId: string;
  tokenId: string;
}

async function lookupToken(token: string): Promise<McpAuthContext | null> {
  const schema = getActiveSchema();

  const tokenRecord = await db.query.oauthAccessToken.findFirst({
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

  const userRecord = await db.query.users.findFirst({
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

export async function validateMcpToken(token: string): Promise<McpAuthContext | null> {
  if (!token) return null;

  const tokenHash = simpleHash(token);
  const cacheKey = CacheKeys.mcpToken(tokenHash);
  const cache = getCacheManager();

  const cached = await cache.get<McpAuthContext>(cacheKey);
  if (cached) return cached;

  const result = await lookupToken(token);
  if (!result) return null;

  await cache.set(cacheKey, result, {
    ttl: CACHE_TTL_SECONDS,
    tags: [CacheTags.MCP_TOKENS, `mcp-token:${result.tokenId}`],
  });

  return result;
}

export async function invalidateMcpToken(tokenId: string): Promise<void> {
  const cache = getCacheManager();
  await cache.invalidateByTags([`mcp-token:${tokenId}`]);
}
