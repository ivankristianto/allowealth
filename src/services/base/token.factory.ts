import { eq, and, gt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { IDatabase } from '@/db';

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
      // Delete any existing tokens for this user
      await db.delete(config.getTable()).where(eq(config.getUserIdCol(), userId));

      const token = nanoid(64);
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      await db.insert(config.getTable()).values({
        id: nanoid(),
        [config.getUserIdCol().name]: userId,
        [config.getTokenCol().name]: token,
        [config.getExpiresAtCol().name]: expiresAt,
      } as any);

      return token;
    },

    async validateToken(token: string): Promise<{ userId: string } | null> {
      const row = await config.getQuery().findFirst({
        where: and(eq(config.getTokenCol(), token), gt(config.getExpiresAtCol(), new Date())),
      });
      if (!row) return null;
      return { userId: row[config.getUserIdCol().name] };
    },

    async consumeToken(token: string): Promise<void> {
      await db.delete(config.getTable()).where(eq(config.getTokenCol(), token));
    },
  };
}
