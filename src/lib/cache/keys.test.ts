import { describe, it, expect } from 'bun:test';
import { CacheKeys, hashFilters } from './keys';
import { CacheTags } from './tags';

describe('CacheKeys', () => {
  it('should build budget key correctly', () => {
    const key = CacheKeys.budget('ws_123', 2026, 2, 'IDR');
    expect(key).toBe('cache:budget:ws_123:2026:2:IDR');
  });

  it('should build dashboard key correctly', () => {
    const key = CacheKeys.dashboard('ws_123', 2026, 2, 'IDR');
    expect(key).toBe('cache:dashboard:ws_123:2026:2:IDR');
  });

  it('should build transactions key correctly', () => {
    const key = CacheKeys.transactions('ws_123', 'abc12345');
    expect(key).toBe('cache:transactions:ws_123:abc12345');
  });

  it('should build settings key correctly', () => {
    const key = CacheKeys.settings('user_456');
    expect(key).toBe('cache:settings:user_456');
  });

  it('should build session key correctly', () => {
    const key = CacheKeys.session('sid_789');
    expect(key).toBe('cache:session:sid_789');
  });
});

describe('hashFilters', () => {
  it('should produce consistent hash for same filters', () => {
    const filters = { type: 'expense', limit: 10 };
    const hash1 = hashFilters(filters);
    const hash2 = hashFilters(filters);
    expect(hash1).toBe(hash2);
  });

  it('should produce same hash regardless of key order', () => {
    const filters1 = { type: 'expense', limit: 10 };
    const filters2 = { limit: 10, type: 'expense' };
    expect(hashFilters(filters1)).toBe(hashFilters(filters2));
  });

  it('should ignore undefined values', () => {
    const filters1 = { type: 'expense' };
    const filters2 = { type: 'expense', category: undefined };
    expect(hashFilters(filters1)).toBe(hashFilters(filters2));
  });

  it('should produce 8-character hash', () => {
    const hash = hashFilters({ foo: 'bar' });
    expect(hash).toHaveLength(8);
  });
});

describe('CacheTags', () => {
  it('should build workspace tag correctly', () => {
    expect(CacheTags.workspace('ws_123')).toBe('workspace:ws_123');
  });

  it('should build user tag correctly', () => {
    expect(CacheTags.user('user_456')).toBe('user:user_456');
  });

  it('should build session tag correctly', () => {
    expect(CacheTags.session('sid_789')).toBe('session:sid_789');
  });

  it('should have entity type constants', () => {
    expect(CacheTags.BUDGET).toBe('budget');
    expect(CacheTags.TRANSACTIONS).toBe('transactions');
    expect(CacheTags.SETTINGS).toBe('settings');
    expect(CacheTags.DASHBOARD).toBe('dashboard');
    expect(CacheTags.SESSION).toBe('session');
  });
});
