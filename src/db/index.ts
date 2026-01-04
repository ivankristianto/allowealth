import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleMySQL } from 'drizzle-orm/mysql2';
import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import * as schema from './schema';

// Database connection based on environment
const env = process.env.NODE_ENV || 'development';
const dbUrl = process.env.DATABASE_URL;

let db: ReturnType<typeof drizzle> | ReturnType<typeof drizzleMySQL>;

if (env === 'production' && dbUrl?.startsWith('mysql://')) {
  // Production: MySQL
  const connection = mysql.createConnection(dbUrl);
  db = drizzleMySQL(connection, { schema });
} else {
  // Development: SQLite
  const sqlite = new Database('.dev.db');
  db = drizzle(sqlite, { schema });
}

export * from './schema';
export { db };
