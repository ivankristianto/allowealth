/* eslint-disable no-console */
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { resolve } from 'node:path';

const MIGRATIONS_DIR = resolve(process.cwd(), 'drizzle/sqlite');
const DEFAULT_DB_PATH = 'db/.dev.db';
const DRIZZLE_MIGRATIONS_TABLE = '__drizzle_migrations';

function getCount(rawDb: Database, query: string): number {
  const row = rawDb.prepare(query).get() as { count: number };
  return Number(row.count);
}

function hasUntrackedExistingSchema(rawDb: Database): { tableCount: number } | null {
  const hasMigrationsTable =
    getCount(
      rawDb,
      `SELECT COUNT(*) AS count
       FROM sqlite_master
       WHERE type = 'table' AND name = '${DRIZZLE_MIGRATIONS_TABLE}'`
    ) > 0;

  const migrationRows = hasMigrationsTable
    ? getCount(rawDb, `SELECT COUNT(*) AS count FROM ${DRIZZLE_MIGRATIONS_TABLE}`)
    : 0;

  if (migrationRows > 0) {
    return null;
  }

  const tableCount = getCount(
    rawDb,
    `SELECT COUNT(*) AS count
     FROM sqlite_master
     WHERE type = 'table'
       AND name NOT LIKE 'sqlite_%'
       AND name != '${DRIZZLE_MIGRATIONS_TABLE}'`
  );

  return tableCount > 0 ? { tableCount } : null;
}

export function runSqliteMigrations(dbPath?: string): void {
  if (process.env.D1_ENABLED === 'true') {
    throw new Error(
      'SQLite migration runner does not support D1 targets. Use "aw --target=d1 db migrate" instead.'
    );
  }

  const targetPath = dbPath ?? process.env.DATABASE_URL ?? DEFAULT_DB_PATH;
  const rawDb = new Database(targetPath);

  try {
    const existingSchema = hasUntrackedExistingSchema(rawDb);
    if (existingSchema) {
      throw new Error(
        `Refusing to run migrations for "${targetPath}": ${DRIZZLE_MIGRATIONS_TABLE} is empty, but the database already has ${existingSchema.tableCount} table(s). ` +
          'This usually means the schema was initialized with "bun run db:setup". ' +
          'For dev or fresh installs, use "bun run db:reset" to recreate the DB with migration tracking. ' +
          'For existing environments, back up data before recreating the database.'
      );
    }

    const db = drizzle(rawDb);
    migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  } finally {
    rawDb.close();
  }
}

function main() {
  const targetPath = process.env.DATABASE_URL ?? DEFAULT_DB_PATH;

  console.log(`\nRunning SQLite migrations...\nDB: ${targetPath}\nMigrations: ${MIGRATIONS_DIR}\n`);
  runSqliteMigrations(targetPath);
  console.log('SQLite migrations applied successfully.');
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error('SQLite migration failed:', error);
    process.exit(1);
  }
}
