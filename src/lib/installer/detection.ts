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
 * Only swallows "no such table" errors; rethrows other DB errors.
 */
export function isMigrationApplied(db: Database): boolean {
  try {
    const rows = db.all<{ count: number }>(sql`SELECT count(*) as count FROM __drizzle_migrations`);
    return rows.length > 0 && rows[0].count > 0;
  } catch (error) {
    // Only swallow "no such table" errors (table doesn't exist yet)
    if (error instanceof Error && error.message.includes('no such table')) {
      return false;
    }
    // Re-throw other database errors
    throw error;
  }
}

/**
 * Check if any users exist in the Better Auth user table.
 *
 * Returns false if the table does not exist or has no rows.
 * Only swallows "no such table" errors; rethrows other DB errors.
 */
export function hasUsers(db: Database): boolean {
  try {
    const rows = db.all<{ one: number }>(sql`SELECT 1 as one FROM user LIMIT 1`);
    return rows.length > 0;
  } catch (error) {
    // Only swallow "no such table" errors (table doesn't exist yet)
    if (error instanceof Error && error.message.includes('no such table')) {
      return false;
    }
    // Re-throw other database errors
    throw error;
  }
}
