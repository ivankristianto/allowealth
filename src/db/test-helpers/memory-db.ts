import { Database as SqliteDriver } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as sqliteSchema from '@/db/schema/sqlite';
import type { Database } from '@/db';
import { applyMigrations } from './migrations';

export interface MemoryDb {
  db: Database;
  raw: SqliteDriver;
}

/** In-memory SQLite with the full app schema, isolated from every on-disk database. */
export function createMemoryDb(): MemoryDb {
  const raw = new SqliteDriver(':memory:');
  applyMigrations(raw);
  raw.run('PRAGMA foreign_keys = ON;');
  return { db: drizzle(raw, { schema: sqliteSchema }), raw };
}

export function countRows(raw: SqliteDriver, table: string, where = '1 = 1'): number {
  const row = raw.query(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`).get() as { n: number };
  return row.n;
}

export function seedWorkspaceOwner(raw: SqliteDriver, workspaceId: string, userId: string): void {
  raw.run(`INSERT INTO workspaces (id, name) VALUES (?, 'Test Workspace')`, [workspaceId]);
  raw.run(
    `INSERT INTO users (id, workspace_id, email, name, role) VALUES (?, ?, ?, 'Test Owner', 'admin')`,
    [userId, workspaceId, `${userId}@example.test`]
  );
}
