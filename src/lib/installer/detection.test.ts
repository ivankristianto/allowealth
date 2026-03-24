import { describe, expect, test, mock, beforeEach } from 'bun:test';
import { isMigrationApplied, hasUsers } from './detection';

// Mock db.get() which is used by Drizzle's sql tagged template via db.get(sql`...`)
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
