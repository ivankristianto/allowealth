import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSqliteMigrations } from './migrate';

function getJournalEntryCount(): number {
  const journalPath = join(process.cwd(), 'drizzle/sqlite/meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
    entries: Array<unknown>;
  };
  return journal.entries.length;
}

function removeSqlComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
}

function executeStatements(db: Database, sql: string) {
  const statements = sql
    .replaceAll('--> statement-breakpoint', ';')
    .split(';')
    .map((statement) => removeSqlComments(statement))
    .filter(Boolean);

  for (const statement of statements) {
    db.prepare(statement).run();
  }
}

describe('runSqliteMigrations', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'allowealth-migrate-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('applies all migrations using bun:sqlite', () => {
    const dbPath = join(tempDir, 'migrate.db');
    runSqliteMigrations(dbPath);

    const db = new Database(dbPath);
    try {
      const row = db.prepare('SELECT COUNT(*) AS count FROM __drizzle_migrations').get() as {
        count: number;
      };

      expect(row.count).toBe(getJournalEntryCount());
    } finally {
      db.close();
    }
  });

  it('fails with a clear error when schema exists without migration history', () => {
    const dbPath = join(tempDir, 'setup-without-migrations.db');
    const db = new Database(dbPath);

    try {
      const setupSql = readFileSync(join(process.cwd(), 'src/db/setup.sql'), 'utf8');
      executeStatements(db, setupSql);
    } finally {
      db.close();
    }

    expect(() => runSqliteMigrations(dbPath)).toThrow(
      '__drizzle_migrations is empty, but the database already has'
    );
  });
});
