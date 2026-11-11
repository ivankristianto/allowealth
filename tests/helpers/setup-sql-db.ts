import { Database as SqliteDatabase } from 'bun:sqlite';
import { rmSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from '@/db/schema/sqlite';
import { applyMigrations } from '@/db/test-helpers/migrations';

/** A throwaway SQLite file built from the migrations, as the test preload does. */
export function createSetupSqlDatabase(path: string) {
  const raw = new SqliteDatabase(path);
  applyMigrations(raw);
  raw.run('PRAGMA foreign_keys = ON;');

  return {
    raw,
    db: drizzle(raw, { schema }),
    cleanup() {
      raw.close();
      for (const suffix of ['', '-wal', '-shm']) rmSync(`${path}${suffix}`, { force: true });
    },
  };
}

export function seedWorkspaceUser(
  db: ReturnType<typeof createSetupSqlDatabase>['db'],
  ids: { workspaceId: string; userId: string }
): void {
  const now = new Date();
  db.insert(schema.workspaces)
    .values({
      id: ids.workspaceId,
      name: 'Test Workspace',
      status: 'active',
      created_at: now,
      updated_at: now,
    })
    .onConflictDoNothing()
    .run();
  db.insert(schema.users)
    .values({
      id: ids.userId,
      workspace_id: ids.workspaceId,
      email: `${ids.userId}@example.test`,
      name: 'Test User',
      role: 'member',
      created_at: now,
      updated_at: now,
    })
    .run();
}
