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

  test('db:reset goes through aw db reset, which migrates before seeding', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(packageJson.scripts['db:reset']).toBe('bun run aw db reset');

    const source = readFileSync('src/cli/commands/db.ts', 'utf8');
    const resetBlock = source.slice(
      source.indexOf('reset: defineCommand'),
      source.indexOf('empty: defineCommand')
    );
    const migrateIndex = resetBlock.indexOf("'src/db/migrate.ts'");

    expect(migrateIndex).toBeGreaterThan(-1);
    expect(migrateIndex).toBeLessThan(resetBlock.indexOf("'src/db/seed/index.ts'"));
    expect(resetBlock).not.toContain('src/db/setup.ts');
  });
});
