/**
 * Expected number of applied Drizzle migrations.
 *
 * IMPORTANT: Update this constant whenever you add a new migration file.
 * A test in src/tests/migration-constants.test.ts enforces that this matches
 * drizzle/sqlite/meta/_journal.json — a mismatch causes a CI failure.
 *
 * This constant is intentionally in its own file (not migrate.ts) because
 * migrate.ts imports bun:sqlite, which is incompatible with Cloudflare Workers.
 * This file has zero runtime dependencies and is safe to import from middleware.
 */
export const EXPECTED_MIGRATION_COUNT = 2;
