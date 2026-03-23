/* eslint-disable no-console */
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { resolve } from 'node:path';

const MIGRATIONS_DIR = resolve(process.cwd(), 'drizzle/sqlite');
const DEFAULT_DB_PATH = 'db/.dev.db';

export function runSqliteMigrations(dbPath?: string): void {
  if (process.env.D1_ENABLED === 'true') {
    throw new Error(
      'SQLite migration runner does not support D1 targets. Use "aw --target=d1 db migrate" instead.'
    );
  }

  const targetPath = dbPath ?? process.env.DATABASE_URL ?? DEFAULT_DB_PATH;
  const rawDb = new Database(targetPath);

  try {
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
