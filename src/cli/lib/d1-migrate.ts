/* eslint-disable no-console -- CLI output is intentional */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execFileSync } from 'child_process';

const D1_DATABASE_NAME = 'allowealth-db';
const MIGRATIONS_DIR = 'drizzle/sqlite';
const JOURNAL_PATH = `${MIGRATIONS_DIR}/meta/_journal.json`;

interface JournalEntry {
  idx: number;
  tag: string;
}

interface Journal {
  version: string;
  dialect: string;
  entries: Array<{
    idx: number;
    version: string;
    when: number;
    tag: string;
    breakpoints: boolean;
  }>;
}

/**
 * Parse journal file into simplified entries (idx + tag).
 */
export function parseJournal(journal: Journal): JournalEntry[] {
  return journal.entries.map((e) => ({ idx: e.idx, tag: e.tag }));
}

/**
 * Find migrations that haven't been applied yet.
 */
export function findPendingMigrations(all: JournalEntry[], appliedTags: string[]): JournalEntry[] {
  const appliedSet = new Set(appliedTags);
  return all.filter((entry) => !appliedSet.has(entry.tag));
}

/**
 * Execute a SQL command against D1 via wrangler.
 */
function d1Execute(sql: string, local: boolean): string {
  const result = execFileSync(
    'wrangler',
    ['d1', 'execute', D1_DATABASE_NAME, local ? '--local' : '--remote', '--command', sql],
    { encoding: 'utf-8' }
  );
  return result;
}

/**
 * Execute a SQL command and return JSON output from D1.
 */
function d1ExecuteJson(sql: string, local: boolean): Record<string, unknown>[] {
  const result = execFileSync(
    'wrangler',
    ['d1', 'execute', D1_DATABASE_NAME, local ? '--local' : '--remote', '--command', sql, '--json'],
    { encoding: 'utf-8' }
  );
  const parsed = JSON.parse(result) as Array<{ results?: Record<string, unknown>[] }>;
  // wrangler d1 --json returns an array of result sets
  return parsed[0]?.results ?? [];
}

/**
 * Ensure the migration tracking table exists on D1.
 */
function ensureTrackingTable(local: boolean): void {
  d1Execute(
    `CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch())
    );`,
    local
  );
}

/**
 * Get list of already-applied migration tags from D1.
 */
function getAppliedTags(local: boolean): string[] {
  const rows = d1ExecuteJson('SELECT tag FROM __drizzle_migrations ORDER BY id;', local);
  return rows.map((row) => row.tag as string);
}

/**
 * Read and split a migration SQL file into individual statements.
 * Splits on Drizzle's `--> statement-breakpoint` markers.
 */
function readMigrationStatements(tag: string): string[] {
  const filePath = resolve(MIGRATIONS_DIR, `${tag}.sql`);
  if (!existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }
  const content = readFileSync(filePath, 'utf-8');
  return content
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Run all pending D1 migrations.
 */
export async function migrateD1(options: { local: boolean }): Promise<void> {
  const { local } = options;
  const target = local ? 'local' : 'remote';

  console.log(`\nD1 Migration (${target})`);
  console.log('='.repeat(40));

  // 1. Read journal
  const journalPath = resolve(JOURNAL_PATH);
  if (!existsSync(journalPath)) {
    console.error(`Journal not found: ${journalPath}`);
    console.error('Run "aw db generate" first to create migrations.');
    process.exit(1);
  }

  const journal: Journal = JSON.parse(readFileSync(journalPath, 'utf-8'));
  const allMigrations = parseJournal(journal);

  if (allMigrations.length === 0) {
    console.log('No migrations found in journal.');
    return;
  }

  console.log(`Found ${allMigrations.length} migration(s) in journal.`);

  // 2. Ensure tracking table exists
  ensureTrackingTable(local);

  // 3. Get applied migrations
  const appliedTags = getAppliedTags(local);
  console.log(`Already applied: ${appliedTags.length}`);

  // 4. Find pending
  const pending = findPendingMigrations(allMigrations, appliedTags);

  if (pending.length === 0) {
    console.log('\nAll migrations are up to date.');
    return;
  }

  console.log(`Pending: ${pending.length}\n`);

  // 5. Apply each pending migration
  for (const migration of pending) {
    console.log(`Applying: ${migration.tag}...`);

    const statements = readMigrationStatements(migration.tag);

    for (let i = 0; i < statements.length; i++) {
      try {
        d1Execute(statements[i], local);
      } catch (error) {
        console.error(`\nFailed on statement ${i + 1}/${statements.length} of ${migration.tag}`);
        console.error(`Statements 1-${i} were already applied.`);
        console.error('Resolve manually, then re-run migration.');
        throw error;
      }
    }

    // Record as applied
    const safeTag = migration.tag.replace(/'/g, "''");
    d1Execute(`INSERT INTO __drizzle_migrations (tag) VALUES ('${safeTag}');`, local);

    console.log(`  Applied ${migration.tag} (${statements.length} statements)`);
  }

  console.log(`\nApplied ${pending.length} migration(s) successfully.`);
}
