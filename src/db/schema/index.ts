/**
 * Schema exports
 *
 * This file exports SQLite schema by default for TypeScript type inference.
 * At runtime, the correct schema (SQLite or PostgreSQL) is selected dynamically
 * in src/db/index.ts based on DATABASE_URL format.
 *
 * Both schemas are structurally compatible, so types work correctly across dialects.
 *
 * Directory structure:
 * - ./sqlite/     SQLite-specific schemas (integer timestamps, sqliteTable)
 * - ./postgresql/ PostgreSQL-specific schemas (native timestamps, pgTable)
 */

// Export SQLite schema by default for type inference during development
// Runtime selection happens in src/db/index.ts
export * from './sqlite';
