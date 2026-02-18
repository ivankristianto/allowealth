import { eq, and } from 'drizzle-orm';
import type { IDatabase } from '@/db';

export interface CrudConfig {
  getTable: () => any;
  getQuery: () => {
    findFirst: (config?: any) => Promise<any>;
    findMany: (config?: any) => Promise<any[]>;
  };
  getId: () => any;
  getWorkspaceId: () => any;
}

export function createCrudService<T, TCreate, TUpdate = Partial<TCreate>>(
  db: IDatabase,
  config: CrudConfig
) {
  return {
    async findById(id: string, workspaceId: string): Promise<T | undefined> {
      return config.getQuery().findFirst({
        where: and(eq(config.getId(), id), eq(config.getWorkspaceId(), workspaceId)),
      });
    },

    async findAll(workspaceId: string): Promise<T[]> {
      return config.getQuery().findMany({
        where: eq(config.getWorkspaceId(), workspaceId),
      });
    },

    async create(input: TCreate): Promise<T> {
      const [row] = await db
        .insert(config.getTable())
        .values(input as any)
        .returning();
      return row as T;
    },

    async update(id: string, workspaceId: string, input: TUpdate): Promise<T> {
      const [row] = await db
        .update(config.getTable())
        .set(input as any)
        .where(and(eq(config.getId(), id), eq(config.getWorkspaceId(), workspaceId)))
        .returning();
      return row as T;
    },

    async delete(id: string, workspaceId: string): Promise<void> {
      await db
        .delete(config.getTable())
        .where(and(eq(config.getId(), id), eq(config.getWorkspaceId(), workspaceId)));
    },
  };
}
