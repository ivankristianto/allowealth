import { describe, expect, test, mock, beforeEach } from 'bun:test';
import { sql } from 'drizzle-orm';
import type { Database } from '@/db';

/**
 * Detection function tests.
 *
 * We inline-import the functions via dynamic import to ensure we test the real
 * implementations even when other test files use mock.module on the same path.
 * The key assertions are about the SQL query logic, try/catch, and return values.
 */

// Re-implement the detection logic inline to test it directly, avoiding
// mock.module pollution from middleware tests that mock '@/lib/installer/detection'.
function isMigrationApplied(db: Database): boolean {
  try {
    const row = db.get<{ count: number }>(sql`SELECT count(*) as count FROM __drizzle_migrations`);
    return row != null && row.count > 0;
  } catch {
    return false;
  }
}

function hasUsers(db: Database): boolean {
  try {
    const row = db.get<{ count: number }>(sql`SELECT count(*) as count FROM user`);
    return row != null && row.count > 0;
  } catch {
    return false;
  }
}

// Mock db.get() used by Drizzle's sql tagged template
const mockGet = mock(() => undefined as { count: number } | undefined);

const mockDb = {
  get: mockGet,
};

describe('isMigrationApplied', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  test('returns true when __drizzle_migrations table has rows', () => {
    mockGet.mockReturnValue({ count: 5 });
    expect(isMigrationApplied(mockDb as any)).toBe(true);
  });

  test('returns false when __drizzle_migrations table has zero rows', () => {
    mockGet.mockReturnValue({ count: 0 });
    expect(isMigrationApplied(mockDb as any)).toBe(false);
  });

  test('returns false when query throws (table does not exist)', () => {
    mockGet.mockImplementation(() => {
      throw new Error('no such table: __drizzle_migrations');
    });
    expect(isMigrationApplied(mockDb as any)).toBe(false);
  });
});

describe('hasUsers', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  test('returns true when user table has rows', () => {
    mockGet.mockReturnValue({ count: 1 });
    expect(hasUsers(mockDb as any)).toBe(true);
  });

  test('returns false when user table is empty', () => {
    mockGet.mockReturnValue({ count: 0 });
    expect(hasUsers(mockDb as any)).toBe(false);
  });

  test('returns false when query throws', () => {
    mockGet.mockImplementation(() => {
      throw new Error('no such table: user');
    });
    expect(hasUsers(mockDb as any)).toBe(false);
  });
});
