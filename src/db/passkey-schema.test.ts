import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import { applyMigrations } from './test-helpers/migrations';

function getPasskeyColumns(db: Database): string[] {
  const rows = db.prepare("SELECT name FROM pragma_table_info('passkey')").all() as Array<{
    name: string;
  }>;
  return rows.map((row) => row.name);
}

describe('passkey schema coverage', () => {
  test('the migrations create the passkey table with updatedAt', () => {
    const db = new Database(':memory:');
    try {
      applyMigrations(db);
      expect(getPasskeyColumns(db)).toContain('updatedAt');
    } finally {
      db.close();
    }
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
  });
});
