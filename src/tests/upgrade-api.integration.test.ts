import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { sql } from 'drizzle-orm';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSqliteMigrations } from '@/db/migrate';
import { EXPECTED_MIGRATION_COUNT } from '@/db/migration-constants';

let tmpDir: string;
let dbPath: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'allowealth-upgrade-test-'));
  dbPath = join(tmpDir, 'test.db');
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('upgrade integration', () => {
  it('fresh DB has no __drizzle_migrations table', () => {
    const raw = new Database(dbPath);
    const db = drizzle(raw);

    // A fresh DB should not have the migrations table
    let hasTable = true;
    try {
      db.all<{ count: number }>(sql`SELECT COUNT(*) as count FROM __drizzle_migrations`);
    } catch {
      hasTable = false;
    }
    raw.close();
    expect(hasTable).toBe(false);
  });

  it('runSqliteMigrations applies all migrations', () => {
    runSqliteMigrations(dbPath);

    const raw = new Database(dbPath);
    const result = raw.query('SELECT COUNT(*) as count FROM __drizzle_migrations').get() as {
      count: number;
    };
    raw.close();

    expect(result.count).toBe(EXPECTED_MIGRATION_COUNT);
  });

  it('after migrations, db.all() COUNT query returns expected count', () => {
    const raw = new Database(dbPath);
    const db = drizzle(raw);
    const rows = db.all<{ count: number }>(sql`SELECT COUNT(*) as count FROM __drizzle_migrations`);
    raw.close();

    expect(rows[0]?.count).toBe(EXPECTED_MIGRATION_COUNT);
  });

  it('running migrations again is idempotent', () => {
    // Should not throw or duplicate entries
    runSqliteMigrations(dbPath);

    const raw = new Database(dbPath);
    const result = raw.query('SELECT COUNT(*) as count FROM __drizzle_migrations').get() as {
      count: number;
    };
    raw.close();

    expect(result.count).toBe(EXPECTED_MIGRATION_COUNT);
  });
});
