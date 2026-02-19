import { eq, and } from 'drizzle-orm';
import type { IDatabase } from '@/db';

const META_VALUE_MAX_BYTES = 4096;

export interface MetaConfig<TKey extends string> {
  getTable: () => any;
  getQuery: () => {
    findFirst: (config?: any) => Promise<any>;
    findMany: (config?: any) => Promise<any[]>;
  };
  getEntityIdCol: () => any;
  getKeyCol: () => any;
  getValueCol: () => any;
  validateKey: (key: string) => key is TKey;
}

export function createMetaService<TKey extends string>(db: IDatabase, config: MetaConfig<TKey>) {
  const keyColName = config.getKeyCol().name;
  const valueColName = config.getValueCol().name;

  return {
    async get(entityId: string, key: TKey): Promise<string | null> {
      const row = await config.getQuery().findFirst({
        where: and(eq(config.getEntityIdCol(), entityId), eq(config.getKeyCol(), key)),
      });
      return row?.[valueColName] ?? null;
    },

    async set(entityId: string, key: TKey, value: string): Promise<void> {
      if (!config.validateKey(key)) {
        throw new Error(`Invalid meta key: ${key}`);
      }
      const byteLength = new TextEncoder().encode(value).length;
      if (byteLength > META_VALUE_MAX_BYTES) {
        throw new Error(`Meta value exceeds ${META_VALUE_MAX_BYTES} byte limit`);
      }
      await db
        .insert(config.getTable())
        .values({
          [config.getEntityIdCol().name]: entityId,
          [keyColName]: key,
          [valueColName]: value,
        } as any)
        .onConflictDoUpdate({
          target: [config.getEntityIdCol(), config.getKeyCol()],
          set: { [valueColName]: value },
        });
    },

    async delete(entityId: string, key: TKey): Promise<void> {
      await db
        .delete(config.getTable())
        .where(and(eq(config.getEntityIdCol(), entityId), eq(config.getKeyCol(), key)));
    },

    async getAll(entityId: string): Promise<Partial<Record<TKey, string>>> {
      const rows = await config.getQuery().findMany({
        where: eq(config.getEntityIdCol(), entityId),
      });
      return Object.fromEntries(rows.map((r: any) => [r[keyColName], r[valueColName]])) as Partial<
        Record<TKey, string>
      >;
    },
  };
}
