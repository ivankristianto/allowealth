import { describe, expect, it } from 'bun:test';
import { MigrationService } from '@/services/migration.service';
import { EXPECTED_MIGRATION_COUNT } from '@/db/migration-constants';

// Helper: create a mock db that returns a specific count from __drizzle_migrations
function mockDb(count: number) {
  return {
    get: () => ({ count }),
  } as any;
}

// Helper: create a mock db that throws on any query (simulates missing table)
function errorDb(message = 'no such table: __drizzle_migrations') {
  return {
    get: () => {
      throw new Error(message);
    },
  } as any;
}

describe('MigrationService.isMigrationPending', () => {
  it('returns false when applied count equals expected', async () => {
    const db = mockDb(EXPECTED_MIGRATION_COUNT);
    const result = await MigrationService.isMigrationPending(db);
    expect(result).toBe(false);
  });

  it('returns true when applied count is less than expected', async () => {
    const db = mockDb(EXPECTED_MIGRATION_COUNT - 1);
    const result = await MigrationService.isMigrationPending(db);
    expect(result).toBe(true);
  });

  it('returns true when __drizzle_migrations table does not exist', async () => {
    const db = errorDb();
    const result = await MigrationService.isMigrationPending(db);
    expect(result).toBe(true);
  });
});

describe('MigrationService.getStatus', () => {
  it('returns pending, applied, and expected counts', async () => {
    const db = mockDb(1);
    const status = await MigrationService.getStatus(db);
    expect(status.pending).toBe(true);
    expect(status.applied).toBe(1);
    expect(status.expected).toBe(EXPECTED_MIGRATION_COUNT);
  });

  it('returns pending false when up to date', async () => {
    const db = mockDb(EXPECTED_MIGRATION_COUNT);
    const status = await MigrationService.getStatus(db);
    expect(status.pending).toBe(false);
    expect(status.applied).toBe(EXPECTED_MIGRATION_COUNT);
  });
});
