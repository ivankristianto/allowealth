import { db } from '@/db';
import { ApiKeyService } from '@/services/api-key.service';

export interface AuthContext {
  workspaceId: string;
  userId: string;
  tokenId: string;
}

let cachedContext: AuthContext | null = null;

/**
 * Authenticate the API key from environment and cache the result.
 * Called once on server startup (expensive PBKDF2 verification).
 */
export async function authenticate(): Promise<AuthContext> {
  if (cachedContext) return cachedContext;

  const apiKey = process.env.ALLOWEALTH_API_KEY;
  if (!apiKey) {
    throw new Error('ALLOWEALTH_API_KEY environment variable is required');
  }

  const service = new ApiKeyService(db);
  const result = await service.validate(apiKey);

  if (!result) {
    throw new Error('Invalid API key. Check ALLOWEALTH_API_KEY.');
  }

  cachedContext = {
    workspaceId: result.workspaceId,
    userId: result.userId,
    tokenId: result.apiKeyId,
  };
  return cachedContext;
}

/**
 * Get the auth context with a lightweight revocation/expiry check.
 * Verifies the key hasn't been revoked or expired since startup
 * without re-running PBKDF2.
 */
export async function getAuthContext(): Promise<AuthContext> {
  if (!cachedContext) {
    throw new Error('Not authenticated. Call authenticate() first.');
  }

  const key = await new ApiKeyService(db).getStatus(cachedContext.tokenId);

  if (!key || key.deleted_at || (key.expires_at && new Date(key.expires_at) < new Date())) {
    throw new Error('API key is no longer valid.');
  }

  return cachedContext;
}
