import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema',
  out: './drizzle',

  dialect: 'sqlite',

  dbCredentials: {
    url: process.env.DATABASE_URL || 'db/.dev.db',
  },

  verbose: true,
  strict: true,
} satisfies Config;
