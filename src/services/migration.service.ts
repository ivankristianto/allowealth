/**
 * MigrationService
 *
 * Detects pending database migrations and runs them on demand.
 *
 * Uses the shared `db` proxy from @/db, which auto-selects the correct
 * driver (bun:sqlite for local dev, D1 for Cloudflare Workers).
 * isMigrationPending() and getStatus() run a lightweight COUNT query.
 * runMigrations() dynamically imports migrate.ts (which uses bun:sqlite)
 * and returns 501 for Workers deployments.
 */

import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { EXPECTED_MIGRATION_COUNT } from '@/db/migration-constants';

export interface MigrationStatus {
  pending: boolean;
  applied: number;
  expected: number;
}

export interface MigrationResult {
  success: boolean;
  error?: string;
}

export class MigrationService {
  /**
   * Check if there are pending migrations.
   *
   * Queries __drizzle_migrations for applied count and compares against
   * EXPECTED_MIGRATION_COUNT. Returns true (pending) if the table doesn't
   * exist yet (fresh DB) or if applied count < expected.
   */
  static async isMigrationPending(): Promise<boolean> {
    const status = await this.getStatus();
    return status.pending;
  }

  /**
   * Return migration status with counts for the /api/admin/upgrade/status endpoint.
   */
  static async getStatus(): Promise<MigrationStatus> {
    try {
      const result = db.get<{ count: number }>(
        sql`SELECT COUNT(*) as count FROM __drizzle_migrations`
      );
      const applied = Number(result?.count ?? 0);
      return {
        pending: applied < EXPECTED_MIGRATION_COUNT,
        applied,
        expected: EXPECTED_MIGRATION_COUNT,
      };
    } catch {
      // Table doesn't exist yet (fresh/corrupt DB) — treat as pending
      return {
        pending: true,
        applied: 0,
        expected: EXPECTED_MIGRATION_COUNT,
      };
    }
  }

  /**
   * Run pending SQLite migrations.
   *
   * Only works when DEPLOY_TARGET is 'node' or unset (Bun/SQLite environments).
   * Returns a 501-style error object for Cloudflare D1 / Workers deployments.
   *
   * Note: runSqliteMigrations() is imported dynamically to avoid pulling
   * bun:sqlite into the module graph for Workers builds.
   */
  static async runMigrations(): Promise<MigrationResult> {
    const deployTarget = process.env.DEPLOY_TARGET;
    const isWorkersTarget =
      deployTarget === 'cloudflare' || deployTarget === 'vercel' || deployTarget === 'netlify';

    if (isWorkersTarget) {
      return {
        success: false,
        error:
          'Web-triggered migrations are not supported in this deployment. Run: bun run db:migrate',
      };
    }

    try {
      // Dynamic import keeps bun:sqlite out of the Workers module graph
      const { runSqliteMigrations } = await import('@/db/migrate');
      runSqliteMigrations();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
