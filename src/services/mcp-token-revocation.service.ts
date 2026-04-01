import { type IDatabase, getActiveSchema } from '@/db';
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

export async function revokeMcpTokensForUser(
  db: IDatabase,
  userId: string,
  options: {
    tx?: IDatabase;
    invalidateCache?: boolean;
    invalidateByTags?: (tags: string[]) => Promise<void>;
  } = {}
): Promise<void> {
  const database = options.tx ?? db;
  const schema = getActiveSchema();

  const tokenRows = (await database.query.oauthAccessToken.findMany({
    where: eq(schema.oauthAccessToken.userId, userId),
    columns: { id: true },
  })) as TokenRow[];

  await database.delete(schema.oauthAccessToken).where(eq(schema.oauthAccessToken.userId, userId));

  if (options.invalidateCache !== false) {
    await invalidateMcpTokenTagsBestEffort(userId, tokenRows, options.invalidateByTags);
  }
}

export async function softDeleteUserAndRevokeMcpTokens(
  db: IDatabase,
  userId: string,
  options: { invalidateByTags?: (tags: string[]) => Promise<void> } = {}
): Promise<void> {
  const schema = getActiveSchema();
  const now = new Date();
  let revokedTokenRows: TokenRow[] = [];

  await db.transaction(async (tx) => {
    revokedTokenRows = (await tx.query.oauthAccessToken.findMany({
      where: eq(schema.oauthAccessToken.userId, userId),
      columns: { id: true },
    })) as TokenRow[];

    await tx
      .update(schema.users)
      .set({
        deleted_at: now,
        updated_at: now,
      })
      .where(eq(schema.users.id, userId));

    await revokeMcpTokensForUser(db, userId, { tx, invalidateCache: false });
  });

  if (options.invalidateByTags) {
    await invalidateMcpTokenTagsBestEffort(userId, revokedTokenRows, options.invalidateByTags);
    return;
  }

  await invalidateRevokedMcpTokenTags(userId, revokedTokenRows);
}
