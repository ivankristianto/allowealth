import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { EXPECTED_MIGRATION_COUNT } from '@/db/migration-constants';

/**
 * MigrationService tests
 *
 * These test the core logic by importing MigrationService and mocking the db
 * module it depends on. Since MigrationService uses the shared `db` proxy
 * from @/db, we mock that module to control what the COUNT query returns.
 */

// We use bun:test mock.module to replace @/db with a controllable mock.
// Because we need to change mock behavior per-test, we use a mutable ref.
let mockCount: number | 'error' = EXPECTED_MIGRATION_COUNT;

const { mock } = await import('bun:test');
// @ts-expect-error -- mock.module is a bun:test runtime API not yet in TS definitions
mock.module('@/db', () => ({
  db: {
    all: () => {
      if (mockCount === 'error') {
        throw new Error('no such table: __drizzle_migrations');
      }
      return [{ count: mockCount }];
    },
  },
}));

// Import after mock is set up
const { MigrationService } = await import('@/services/migration.service');

afterAll(() => {
  (mock as any).restore();
});

describe('MigrationService.isMigrationPending', () => {
  beforeEach(() => {
    mockCount = EXPECTED_MIGRATION_COUNT;
    MigrationService._resetCache();
  });

  it('returns false when applied count equals expected', async () => {
    mockCount = EXPECTED_MIGRATION_COUNT;
    const result = await MigrationService.isMigrationPending();
    expect(result).toBe(false);
  });

  it('returns true when applied count is less than expected', async () => {
    mockCount = EXPECTED_MIGRATION_COUNT - 1;
    const result = await MigrationService.isMigrationPending();
    expect(result).toBe(true);
  });

  it('returns true when __drizzle_migrations table does not exist', async () => {
    mockCount = 'error';
    const result = await MigrationService.isMigrationPending();
    expect(result).toBe(true);
  });

  it('uses cached result after not-pending', async () => {
    mockCount = EXPECTED_MIGRATION_COUNT;
    await MigrationService.isMigrationPending(); // caches _notPending = true
    mockCount = EXPECTED_MIGRATION_COUNT - 1; // simulate change (shouldn't matter)
    const result = await MigrationService.isMigrationPending();
    expect(result).toBe(false); // still cached as not pending
  });
});

describe('MigrationService.getStatus', () => {
  beforeEach(() => {
    mockCount = EXPECTED_MIGRATION_COUNT;
    MigrationService._resetCache();
  });

  it('returns pending, applied, and expected counts', async () => {
    mockCount = 1;
    const status = await MigrationService.getStatus();
    expect(status.pending).toBe(true);
    expect(status.applied).toBe(1);
    expect(status.expected).toBe(EXPECTED_MIGRATION_COUNT);
  });

  it('returns pending false when up to date', async () => {
    mockCount = EXPECTED_MIGRATION_COUNT;
    const status = await MigrationService.getStatus();
    expect(status.pending).toBe(false);
    expect(status.applied).toBe(EXPECTED_MIGRATION_COUNT);
  });
});
