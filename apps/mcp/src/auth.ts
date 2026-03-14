import { validateMcpToken } from '@/lib/mcp-auth';

export interface AuthContext {
  workspaceId: string;
  userId: string;
  tokenId: string;
}

let cachedContext: AuthContext | null = null;

/**
 * Authenticate the OAuth access token from environment and cache the result.
 * Called once on server startup.
 */
export async function authenticate(): Promise<AuthContext> {
  if (cachedContext) return cachedContext;

  const token = process.env.ALLOWEALTH_ACCESS_TOKEN;
  if (!token) {
    throw new Error('ALLOWEALTH_ACCESS_TOKEN environment variable is required');
  }

  const result = await validateMcpToken(token);
  if (!result) {
    throw new Error('Invalid or expired OAuth token. Check ALLOWEALTH_ACCESS_TOKEN.');
  }

  cachedContext = result;
  return cachedContext;
}

/**
 * Get the auth context, re-validating the token for expiry/revocation.
 * Does not re-hash — uses the cache layer in validateMcpToken.
 */
export async function getAuthContext(): Promise<AuthContext> {
  if (!cachedContext) {
    throw new Error('Not authenticated. Call authenticate() first.');
  }

  const token = process.env.ALLOWEALTH_ACCESS_TOKEN!;
  const result = await validateMcpToken(token);

  if (!result) {
    throw new Error('OAuth token is no longer valid.');
  }

  return result;
}
