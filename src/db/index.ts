import { drizzle } from 'drizzle-orm/bun-sqlite';
import Database from 'bun:sqlite';
import * as schema from './schema';

// Database connection (SQLite)
const dbUrl = process.env.DATABASE_URL || '.dev.db';
const sqlite = new Database(dbUrl);
const db = drizzle({
  client: sqlite,
  schema,
});

export * from './schema';
export { db };
