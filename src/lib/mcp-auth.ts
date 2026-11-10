import { db, getActiveSchema } from '@/db';
import { hashOAuthToken } from '@/lib/auth/oauth-token-hash';
import { getCacheManager } from '@/lib/cache';
import { isAppPasswordToken, type AppPasswordScope } from '@/lib/mcp-app-password';
import { MCP_OAUTH_CLIENTS } from '@/lib/mcp-oauth';
import { mcpAppPasswordService } from '@/services/mcp-app-password.service';
import { eq } from 'drizzle-orm';

export interface McpAuthContext {
  workspaceId: string;
  userId: string;
  tokenId: string;
  /** Set for app passwords only; OAuth tokens have full MCP access. */
  scope?: AppPasswordScope;
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
  appPasswords?: Pick<typeof mcpAppPasswordService, 'verify'>;
}

function resolveDeps(overrides: Partial<McpAuthDeps> = {}): McpAuthDeps {
  return {
    db,
    getSchema: getActiveSchema,
    cache: getCacheManager(),
    ...overrides,
  };
}

const MCP_CLIENT_IDS: ReadonlySet<string> = new Set(MCP_OAUTH_CLIENTS.map((c) => c.clientId));

// The Better Auth adapter stores `string[]` columns as JSON text on SQLite.
function grantsMcpScope(scopes: unknown): boolean {
  if (typeof scopes !== 'string') return false;
  try {
    const parsed: unknown = JSON.parse(scopes);
    return Array.isArray(parsed) && parsed.includes('mcp');
  } catch {
    return false;
  }
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
      clientId: true,
      scopes: true,
    },
  });

  if (!tokenRecord) return null;
  // Set by the provider on sign-out, session revocation, or a replayed code.
  if (tokenRecord.revoked) return null;
  if (!tokenRecord.expiresAt || new Date(tokenRecord.expiresAt) < new Date()) return null;
  // Rejects tokens minted for other scopes or for clients that are not the seeded MCP clients.
  if (!grantsMcpScope(tokenRecord.scopes)) return null;
  if (!MCP_CLIENT_IDS.has(tokenRecord.clientId)) return null;

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
  if (isAppPasswordToken(rawToken)) {
    return (overrides.appPasswords ?? mcpAppPasswordService).verify(rawToken);
  }

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
