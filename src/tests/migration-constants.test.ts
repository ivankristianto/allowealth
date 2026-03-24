import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EXPECTED_MIGRATION_COUNT } from '@/db/migration-constants';

describe('EXPECTED_MIGRATION_COUNT', () => {
  it('matches the actual number of entries in the drizzle journal', () => {
    const journalPath = resolve(process.cwd(), 'drizzle/sqlite/meta/_journal.json');
    const journal = JSON.parse(readFileSync(journalPath, 'utf-8'));
    expect(EXPECTED_MIGRATION_COUNT).toBe(journal.entries.length);
  });
});
