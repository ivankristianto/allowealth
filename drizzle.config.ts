import type { Config } from 'drizzle-kit';
import { detectDialect } from './src/db/config';

const url = process.env.DATABASE_URL || 'db/.dev.db';
const dialect = detectDialect(url);

/**
 * Drizzle Kit Configuration
 *
 * Automatically configures migrations based on DATABASE_URL:
 * - SQLite: ./drizzle/sqlite/ with sqlite dialect
 * - PostgreSQL: ./drizzle/postgresql/ with postgresql dialect
 *
 * Usage:
 *   # SQLite (default)
 *   bun run db:generate
 *   bun run db:push
 *
 *   # PostgreSQL
 *   DATABASE_URL=postgresql://... bun run db:generate
 *   DATABASE_URL=postgresql://... bun run db:push
 */
const config: Config =
  dialect === 'postgresql'
    ? {
        schema: './src/db/schema/postgresql',
        out: './drizzle/postgresql',
        dialect: 'postgresql',
        dbCredentials: {
          url,
        },
      }
    : {
        schema: './src/db/schema/sqlite',
        out: './drizzle/sqlite',
        dialect: 'sqlite',
        dbCredentials: {
          url,
        },
      };

export default {
  ...config,
  verbose: true,
  strict: true,
} satisfies Config;
