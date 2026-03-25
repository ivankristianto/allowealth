/**
 * Installer Detection Functions
 *
 * Checks whether the database has been migrated and whether any users exist.
 * Used by the installer middleware to determine if the app needs first-run setup.
 */

import { sql } from 'drizzle-orm';
import type { Database } from '@/db';

/**
 * Check if Drizzle migrations have been applied.
 *
 * Queries the __drizzle_migrations table that Drizzle creates when running
 * migrations. Returns false if the table does not exist or has no rows.
 */
export function isMigrationApplied(db: Database): boolean {
  try {
    const rows = db.all<{ count: number }>(sql`SELECT count(*) as count FROM __drizzle_migrations`);
    return rows.length > 0 && rows[0].count > 0;
  } catch {
    return false;
  }
}

/**
 * Check if any users exist in the Better Auth user table.
 *
 * Returns false if the table does not exist or has no rows.
 */
export function hasUsers(db: Database): boolean {
  try {
    const rows = db.all<{ count: number }>(sql`SELECT count(*) as count FROM user`);
    return rows.length > 0 && rows[0].count > 0;
  } catch {
    return false;
  }
}
