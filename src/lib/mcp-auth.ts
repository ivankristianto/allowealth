import { db, getActiveSchema } from '@/db';
import { hashOAuthToken } from '@/lib/auth/oauth-token-hash';
import { getCacheManager } from '@/lib/cache';
import { isAppPasswordToken } from '@/lib/mcp-app-password';
import { MCP_OAUTH_CLIENTS, getMcpOAuthClientName } from '@/lib/mcp-oauth';
import { oauthPermissionsFromScopes, parseStoredScopes } from '@/lib/mcp-oauth-scopes';
import type { Permission } from '@/lib/permissions/registry';
import { mcpAppPasswordService } from '@/services/mcp-app-password.service';
import { WorkspaceService } from '@/services/workspace.service';
import { eq } from 'drizzle-orm';

export interface McpAuthContext {
  kind: 'oauth' | 'app_password';
  workspaceId: string;
  userId: string;
  tokenId: string;
  /** The app password's name, or the OAuth client's display name. */
  tokenName: string;
  /** What the token may do on REST and MCP: expanded app password grants, or granted OAuth scopes. */
  permissions: readonly Permission[];
}

interface McpAuthDeps {
  db: {
    query: {
      oauthAccessToken: { findFirst(config: unknown): Promise<any> };
      users: { findFirst(config: unknown): Promise<any> };
    };
  };
  getSchema: () => Pick<ReturnType<typeof getActiveSchema>, 'oauthAccessToken' | 'users'>;
  cache: Pick<ReturnType<typeof getCacheManager>, 'invalidateByTags'>;
  appPasswords?: Pick<typeof mcpAppPasswordService, 'verify'>;
  workspaces: Pick<WorkspaceService, 'isWorkspaceActive'>;
}

function resolveDeps(overrides: Partial<McpAuthDeps> = {}): McpAuthDeps {
  return {
    db,
    getSchema: getActiveSchema,
    cache: getCacheManager(),
    workspaces: new WorkspaceService(db),
    ...overrides,
  };
}

const MCP_CLIENT_IDS: ReadonlySet<string> = new Set(MCP_OAUTH_CLIENTS.map((c) => c.clientId));

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
  const scopes = parseStoredScopes(tokenRecord.scopes);
  // Rejects tokens minted for other scopes or for clients that are not the seeded MCP clients.
  if (!scopes.includes('mcp')) return null;
  if (!MCP_CLIENT_IDS.has(tokenRecord.clientId)) return null;

  const userId = tokenRecord.userId;
  if (!userId) return null;

  const userRecord = await deps.db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { workspace_id: true, deleted_at: true },
  });

  if (!userRecord?.workspace_id || userRecord.deleted_at) return null;

  return {
    kind: 'oauth',
    workspaceId: userRecord.workspace_id,
    userId,
    tokenId: tokenRecord.id,
    tokenName: getMcpOAuthClientName(tokenRecord.clientId),
    permissions: oauthPermissionsFromScopes(scopes),
  };
}

export async function validateMcpToken(
  rawToken: string,
  overrides: Partial<McpAuthDeps> = {}
): Promise<McpAuthContext | null> {
  if (!rawToken) return null;

  const deps = resolveDeps(overrides);
  const context = isAppPasswordToken(rawToken)
    ? await (deps.appPasswords ?? mcpAppPasswordService).verify(rawToken)
    : await lookupToken(rawToken, deps);

  // An archived workspace locks out every MCP credential its members hold.
  if (!context || !(await deps.workspaces.isWorkspaceActive(context.workspaceId))) return null;
  return context;
}

export async function invalidateMcpToken(
  tokenId: string,
  overrides: Partial<McpAuthDeps> = {}
): Promise<void> {
  const deps = resolveDeps(overrides);
  await deps.cache.invalidateByTags([`mcp-token:${tokenId}`]);
}
