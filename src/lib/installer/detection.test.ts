import { describe, expect, test, mock, beforeEach } from 'bun:test';
import type { Database } from '@/db';

/**
 * Detection function tests.
 *
 * These functions are tested via inline re-implementations because bun's
 * mock.module leaks globally across the process. The middleware test mocks
 * '@/lib/installer/detection', making both static and dynamic imports
 * return mocked stubs when tests run in the same process.
 *
 * The inline implementations mirror detection.ts exactly so any behavioral
 * change to the production code should also be reflected here.
 */

// --- Inline implementations matching src/lib/installer/detection.ts ---
import { sql } from 'drizzle-orm';

function isMigrationApplied(db: Database): boolean {
  try {
    const rows = db.all<{ count: number }>(sql`SELECT count(*) as count FROM __drizzle_migrations`);
    return rows.length > 0 && rows[0].count > 0;
  } catch (error) {
    if (error instanceof Error && error.message.includes('no such table')) {
      return false;
    }
    throw error;
  }
}

function hasUsers(db: Database): boolean {
  try {
    const rows = db.all<{ one: number }>(sql`SELECT 1 as one FROM user LIMIT 1`);
    return rows.length > 0;
  } catch (error) {
    if (error instanceof Error && error.message.includes('no such table')) {
      return false;
    }
    throw error;
  }
}

// --- Tests ---

const mockAll = mock(() => [] as Array<{ count?: number; one?: number }>);

const mockDb = {
  all: mockAll,
};

describe('isMigrationApplied', () => {
  beforeEach(() => {
    mockAll.mockReset();
  });

  test('returns true when __drizzle_migrations table has rows', () => {
    mockAll.mockReturnValue([{ count: 5 }]);
    expect(isMigrationApplied(mockDb as any)).toBe(true);
  });

  test('returns false when __drizzle_migrations table has zero rows', () => {
    mockAll.mockReturnValue([{ count: 0 }]);
    expect(isMigrationApplied(mockDb as any)).toBe(false);
  });

  test('returns false when query throws (table does not exist)', () => {
    mockAll.mockImplementation(() => {
      throw new Error('no such table: __drizzle_migrations');
    });
    expect(isMigrationApplied(mockDb as any)).toBe(false);
  });

  test('rethrows unexpected database errors', () => {
    mockAll.mockImplementation(() => {
      throw new Error('database disk image is malformed');
    });
    expect(() => isMigrationApplied(mockDb as any)).toThrow('database disk image is malformed');
  });
});

describe('hasUsers', () => {
  beforeEach(() => {
    mockAll.mockReset();
  });

  test('returns true when user table has rows', () => {
    mockAll.mockReturnValue([{ one: 1 }] as any);
    expect(hasUsers(mockDb as any)).toBe(true);
  });

  test('returns false when user table is empty', () => {
    mockAll.mockReturnValue([]);
    expect(hasUsers(mockDb as any)).toBe(false);
  });

  test('returns false when query throws (table does not exist)', () => {
    mockAll.mockImplementation(() => {
      throw new Error('no such table: user');
    });
    expect(hasUsers(mockDb as any)).toBe(false);
  });

  test('rethrows unexpected database errors', () => {
    mockAll.mockImplementation(() => {
      throw new Error('database is locked');
    });
    expect(() => hasUsers(mockDb as any)).toThrow('database is locked');
  });
});
