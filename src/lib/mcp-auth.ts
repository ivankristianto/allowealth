import { db, getActiveSchema } from '@/db';
import { getCacheManager } from '@/lib/cache';
import { eq } from 'drizzle-orm';

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
  cache: Pick<ReturnType<typeof getCacheManager>, 'invalidateByTags'>;
}

function resolveDeps(overrides: Partial<McpAuthDeps> = {}): McpAuthDeps {
  return {
    db,
    getSchema: getActiveSchema,
    cache: getCacheManager(),
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
    columns: { workspace_id: true, deleted_at: true },
  });

  if (!userRecord?.workspace_id || userRecord.deleted_at) return null;

  return {
    workspaceId: userRecord.workspace_id,
    userId,
    tokenId: tokenRecord.id,
  };
}

export async function validateMcpToken(
  rawToken: string,
  overrides: Partial<McpAuthDeps> = {}
): Promise<McpAuthContext | null> {
  if (!rawToken) return null;

  const deps = resolveDeps(overrides);
  return lookupToken(rawToken, deps);
}

export async function invalidateMcpToken(
  tokenId: string,
  overrides: Partial<McpAuthDeps> = {}
): Promise<void> {
  const deps = resolveDeps(overrides);
  await deps.cache.invalidateByTags([`mcp-token:${tokenId}`]);
}
