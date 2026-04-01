import { afterEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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

function getPasskeyColumns(db: Database): string[] {
  const rows = db.prepare("SELECT name FROM pragma_table_info('passkey')").all() as Array<{
    name: string;
  }>;
  return rows.map((row) => row.name);
}

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('passkey schema coverage', () => {
  test('setup.sql creates the passkey table with updatedAt', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'allowealth-passkey-setup-'));
    tempDirs.push(tempDir);

    const db = new Database(join(tempDir, 'setup.db'));
    const setupSql = readFileSync('src/db/setup.sql', 'utf8');

    executeStatements(db, setupSql);

    expect(getPasskeyColumns(db)).toContain('updatedAt');

    db.close();
  });

  test('db:reset uses db:migrate for migration-tracked schema creation', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const resetScript = packageJson.scripts['db:reset'];
    const migrateCommand = 'bun run db:migrate';
    const seedCommand = 'bun run db:seed';

    expect(resetScript).toContain(migrateCommand);
    expect(resetScript).toContain(seedCommand);
    expect(resetScript.indexOf(migrateCommand)).toBeLessThan(resetScript.indexOf(seedCommand));
    expect(resetScript).not.toContain('bun run db:setup');
  });
});
