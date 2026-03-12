import { eq, and, gt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { type IDatabase, runTransaction } from '@/db';
import { hashOpaqueToken } from '@/lib/crypto/token-hash';

export interface TokenConfig {
  getTable: () => any;
  getQuery: () => { findFirst: (config?: any) => Promise<any> };
  getUserIdCol: () => any;
  getTokenCol: () => any;
  getExpiresAtCol: () => any;
}

export function createTokenService(db: IDatabase, config: TokenConfig) {
  return {
    async createToken(userId: string, expiryMinutes: number): Promise<string> {
      const token = nanoid(64);
      const tokenHash = await hashOpaqueToken(token);
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      await runTransaction(db, async (tx) => {
        await tx.delete(config.getTable()).where(eq(config.getUserIdCol(), userId));
        await tx.insert(config.getTable()).values({
          id: nanoid(),
          [config.getUserIdCol().name]: userId,
          [config.getTokenCol().name]: tokenHash,
          [config.getExpiresAtCol().name]: expiresAt,
        } as any);
      });

      return token;
    },

    async validateToken(token: string): Promise<{ userId: string } | null> {
      const tokenHash = await hashOpaqueToken(token);
      const row = await config.getQuery().findFirst({
        where: and(eq(config.getTokenCol(), tokenHash), gt(config.getExpiresAtCol(), new Date())),
      });
      if (!row) return null;
      return { userId: row[config.getUserIdCol().name] };
    },

    async consumeToken(token: string): Promise<void> {
      const tokenHash = await hashOpaqueToken(token);
      await db.delete(config.getTable()).where(eq(config.getTokenCol(), tokenHash));
    },
  };
}
