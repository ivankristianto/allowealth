import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { EXPECTED_MIGRATION_COUNT } from '@/db/migration-constants';
import { MigrationService } from '@/services/migration.service';

/**
 * MigrationService tests
 *
 * These tests focus on core logic by injecting a minimal db adapter for the
 * COUNT query. This avoids global module mocks that can leak into other tests.
 */

let mockCount: number | 'error' = EXPECTED_MIGRATION_COUNT;
const mockDb = {
  all: mock(async () => {
    if (mockCount === 'error') {
      throw new Error('no such table: __drizzle_migrations');
    }
    return [{ count: mockCount }];
  }),
};

describe('MigrationService.isMigrationPending', () => {
  beforeEach(() => {
    mockCount = EXPECTED_MIGRATION_COUNT;
    MigrationService._resetCache();
    mockDb.all.mockClear();
  });

  it('returns false when applied count equals expected', async () => {
    mockCount = EXPECTED_MIGRATION_COUNT;
    const result = await MigrationService.isMigrationPending(mockDb);
    expect(result).toBe(false);
  });

  it('returns true when applied count is less than expected', async () => {
    mockCount = EXPECTED_MIGRATION_COUNT - 1;
    const result = await MigrationService.isMigrationPending(mockDb);
    expect(result).toBe(true);
  });

  it('returns true when __drizzle_migrations table does not exist', async () => {
    mockCount = 'error';
    const result = await MigrationService.isMigrationPending(mockDb);
    expect(result).toBe(true);
  });

  it('uses cached result after not-pending', async () => {
    mockCount = EXPECTED_MIGRATION_COUNT;
    await MigrationService.isMigrationPending(mockDb); // caches _notPending = true
    mockCount = EXPECTED_MIGRATION_COUNT - 1; // simulate change (shouldn't matter)
    const result = await MigrationService.isMigrationPending(mockDb);
    expect(result).toBe(false); // still cached as not pending
    expect(mockDb.all).toHaveBeenCalledTimes(1);
  });
});

describe('MigrationService.getStatus', () => {
  beforeEach(() => {
    mockCount = EXPECTED_MIGRATION_COUNT;
    MigrationService._resetCache();
    mockDb.all.mockClear();
  });

  it('returns pending, applied, and expected counts', async () => {
    mockCount = 1;
    const status = await MigrationService.getStatus(mockDb);
    expect(status.pending).toBe(true);
    expect(status.applied).toBe(1);
    expect(status.expected).toBe(EXPECTED_MIGRATION_COUNT);
  });

  it('returns pending false when up to date', async () => {
    mockCount = EXPECTED_MIGRATION_COUNT;
    const status = await MigrationService.getStatus(mockDb);
    expect(status.pending).toBe(false);
    expect(status.applied).toBe(EXPECTED_MIGRATION_COUNT);
  });
});
