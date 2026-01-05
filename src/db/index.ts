import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

// Database connection (SQLite)
const dbUrl = process.env.DATABASE_URL || '.dev.db';
const sqlite = new Database(dbUrl);
const db = drizzle(sqlite, { schema });

export * from './schema';
export { db };
