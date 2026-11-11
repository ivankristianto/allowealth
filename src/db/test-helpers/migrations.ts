import type { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { MIGRATIONS_DIR } from '@/db/migrate';

/** Build the app schema on an open handle from the real migrations, the way production does. */
export function applyMigrations(raw: Database): void {
  migrate(drizzle(raw), { migrationsFolder: MIGRATIONS_DIR });
}
