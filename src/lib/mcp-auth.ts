import { db, getActiveSchema } from '@/db';
import { hashOAuthToken } from '@/lib/auth/oauth-token-hash';
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

  // The OAuth provider stores only the hash of each access token.
  const tokenRecord = await deps.db.query.oauthAccessToken.findFirst({
    where: eq(schema.oauthAccessToken.token, await hashOAuthToken(token)),
    columns: {
      id: true,
      expiresAt: true,
      revoked: true,
      userId: true,
    },
  });

  if (!tokenRecord) return null;
  // Set by the provider on sign-out, session revocation, or a replayed code.
  if (tokenRecord.revoked) return null;
  if (!tokenRecord.expiresAt || new Date(tokenRecord.expiresAt) < new Date()) return null;

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
