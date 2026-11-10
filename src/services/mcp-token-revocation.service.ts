import { type DbTransaction, type IDatabase, getActiveSchema, runTransaction } from '@/db';
import { eq } from 'drizzle-orm';
import { getCacheManager, CacheTags } from '@/lib/cache';
import { createLogger } from '@/lib/logger';

const log = createLogger('mcp-token-revocation');

type TokenRow = { id: string };

async function invalidateRevokedMcpTokenTags(userId: string, tokenRows: TokenRow[]): Promise<void> {
  if (tokenRows.length === 0) {
    return;
  }

  const cache = getCacheManager();
  const tags = [...tokenRows.map((token) => `mcp-token:${token.id}`), CacheTags.MCP_TOKENS];

  try {
    await cache.invalidateByTags(tags);
  } catch (error) {
    log.warn('Failed to invalidate MCP token cache after revocation', { userId, error });
  }
}

async function invalidateMcpTokenTagsBestEffort(
  userId: string,
  tokenRows: TokenRow[],
  invalidateByTags?: (tags: string[]) => Promise<void>
): Promise<void> {
  const tags = [...tokenRows.map((token) => `mcp-token:${token.id}`), CacheTags.MCP_TOKENS];

  try {
    if (invalidateByTags) {
      await invalidateByTags(tags);
      return;
    }

    await invalidateRevokedMcpTokenTags(userId, tokenRows);
  } catch (error) {
    log.warn('Failed to invalidate MCP token cache after revocation', { userId, error });
  }
}

function deleteMcpTokens(tx: DbTransaction, userId: string): TokenRow[] {
  const schema = getActiveSchema();

  const tokenRows = tx.query.oauthAccessToken
    .findMany({
      where: eq(schema.oauthAccessToken.userId, userId),
      columns: { id: true },
    })
    .sync();

  // Refresh tokens first, so no client can mint a new access token afterwards.
  tx.delete(schema.oauthRefreshToken).where(eq(schema.oauthRefreshToken.userId, userId)).run();
  tx.delete(schema.oauthAccessToken).where(eq(schema.oauthAccessToken.userId, userId)).run();

  return tokenRows;
}

export async function revokeMcpTokensForUser(
  db: IDatabase,
  userId: string,
  options: { invalidateByTags?: (tags: string[]) => Promise<void> } = {}
): Promise<void> {
  const tokenRows = runTransaction(db, (tx) => deleteMcpTokens(tx, userId));
  await invalidateMcpTokenTagsBestEffort(userId, tokenRows, options.invalidateByTags);
}

export async function softDeleteUserAndRevokeMcpTokens(
  db: IDatabase,
  userId: string,
  options: { invalidateByTags?: (tags: string[]) => Promise<void> } = {}
): Promise<void> {
  const schema = getActiveSchema();
  const now = new Date();

  const revokedTokenRows = runTransaction(db, (tx) => {
    tx.update(schema.users)
      .set({
        deleted_at: now,
        updated_at: now,
      })
      .where(eq(schema.users.id, userId))
      .run();

    return deleteMcpTokens(tx, userId);
  });

  if (options.invalidateByTags) {
    await invalidateMcpTokenTagsBestEffort(userId, revokedTokenRows, options.invalidateByTags);
    return;
  }

  await invalidateRevokedMcpTokenTags(userId, revokedTokenRows);
}
