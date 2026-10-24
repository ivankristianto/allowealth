import type { Config } from 'drizzle-kit';

const url = process.env.DATABASE_URL || 'db/.dev.db';

/**
 * Drizzle Kit Configuration
 *
 * SQLite only -- used for migrations in every environment.
 *
 * Usage:
 *   bun run db:generate
 *   bun run db:push
 */
export default {
  schema: './src/db/schema/sqlite',
  out: './drizzle/sqlite',
  dialect: 'sqlite',
  dbCredentials: {
    url,
  },
  verbose: true,
  strict: true,
} satisfies Config;
