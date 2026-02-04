import { db } from '@/db';
import { ApiKeyService } from '@/services/api-key.service';

export interface AuthContext {
  workspaceId: string;
  userId: string;
  apiKeyId: string;
}

let cachedContext: AuthContext | null = null;

/**
 * Authenticate the API key from environment and cache the result.
 * Called once on server startup.
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

  cachedContext = result;
  return cachedContext;
}

/**
 * Get the cached auth context. Must call authenticate() first.
 */
export function getAuthContext(): AuthContext {
  if (!cachedContext) {
    throw new Error('Not authenticated. Call authenticate() first.');
  }
  return cachedContext;
}
