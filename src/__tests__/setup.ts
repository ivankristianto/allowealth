/**
 * Test preload: points DATABASE_URL at the test database, builds it from the
 * real migrations, and silences console.error from error-path tests.
 */

import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { applyMigrations } from '@/db/test-helpers/migrations';
import { resolveTestDatabaseUrl } from '@/lib/test-helpers/test-database-url';

// Must run before any test imports @/db, which opens DATABASE_URL on first use
const TEST_DB_PATH = resolveTestDatabaseUrl(process.env);
process.env.DATABASE_URL = TEST_DB_PATH;

function setupTestDatabase() {
  const dbDir = dirname(TEST_DB_PATH);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  // Start fresh: an older test DB may lack migration history, which the migrator refuses
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(`${TEST_DB_PATH}${suffix}`, { force: true });
  }

  const db = new Database(TEST_DB_PATH);
  try {
    applyMigrations(db);
  } finally {
    db.close();
  }
}

setupTestDatabase();

// Replace console.error with a no-op during tests
// This prevents noisy output when testing error handling paths
console.error = () => {};
