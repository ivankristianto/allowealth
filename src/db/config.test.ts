import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { setTestEnv } from '@/lib/env';
import { detectDialect, getDatabaseConfig } from './config';

describe('detectDialect', () => {
  test('returns sqlite for file paths', () => {
    expect(detectDialect('db/.dev.db')).toBe('sqlite');
    expect(detectDialect('./database.db')).toBe('sqlite');
    expect(detectDialect('/absolute/path/to/db.sqlite')).toBe('sqlite');
  });

  test('returns postgresql for postgres:// URLs', () => {
    expect(detectDialect('postgres://user:pass@localhost:5432/db')).toBe('postgresql');
  });

  test('returns postgresql for postgresql:// URLs', () => {
    expect(detectDialect('postgresql://user:pass@localhost:5432/db')).toBe('postgresql');
  });

  // Edge case tests (P1-7)
  test('returns sqlite for empty string', () => {
    expect(detectDialect('')).toBe('sqlite');
  });

  test('handles URLs with special characters in password', () => {
    expect(detectDialect('postgres://user:p%40ss@localhost:5432/db')).toBe('postgresql');
    expect(detectDialect('postgresql://user:pass!@#$@localhost:5432/db')).toBe('postgresql');
  });

  test('is case insensitive for protocol detection', () => {
    expect(detectDialect('POSTGRES://user:pass@localhost/db')).toBe('postgresql');
    expect(detectDialect('PostgreSQL://user:pass@localhost/db')).toBe('postgresql');
    expect(detectDialect('Postgres://user:pass@localhost/db')).toBe('postgresql');
  });
});

describe('getDatabaseConfig', () => {
  const originalEnv = process.env.DATABASE_URL;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.DATABASE_URL = originalEnv;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  test('returns sqlite config by default', () => {
    const config = getDatabaseConfig();
    expect(config.dialect).toBe('sqlite');
    expect(config.url).toBe('db/.dev.db');
    expect(config.isSupabase).toBe(false);
    expect(config.isTransactionPooler).toBe(false);
    expect(config.poolConfig).toBeUndefined();
  });

  test('returns postgresql config for postgres URL', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const config = getDatabaseConfig();
    expect(config.dialect).toBe('postgresql');
    expect(config.url).toBe('postgresql://user:pass@localhost:5432/db');
    expect(config.isSupabase).toBe(false);
    expect(config.isTransactionPooler).toBe(false);
    expect(config.poolConfig).toEqual({ max: 1, idleTimeout: 20 });
  });

  test('detects Supabase URLs with transaction pooler', () => {
    process.env.DATABASE_URL =
      'postgresql://postgres.abc123:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
    const config = getDatabaseConfig();
    expect(config.dialect).toBe('postgresql');
    expect(config.isSupabase).toBe(true);
    expect(config.isTransactionPooler).toBe(true);
    expect(config.poolConfig).toEqual({ max: 1, idleTimeout: 20 });
  });

  test('detects Supabase URLs with .supabase.co domain', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@db.abc123.supabase.co:5432/postgres';
    const config = getDatabaseConfig();
    expect(config.isSupabase).toBe(true);
    expect(config.isTransactionPooler).toBe(false);
  });

  test('does not falsely detect supabase in non-Supabase URLs', () => {
    // URL with "supabase" in the path but not a Supabase domain
    process.env.DATABASE_URL = 'postgresql://user:pass@myserver.example.com:5432/supabase-clone';
    const config = getDatabaseConfig();
    expect(config.isSupabase).toBe(false);
    expect(config.isTransactionPooler).toBe(false);
  });
});

describe('Hyperdrive detection', () => {
  const originalEnv = process.env.DATABASE_URL;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    setTestEnv(null);
    if (originalEnv !== undefined) {
      process.env.DATABASE_URL = originalEnv;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  test('detects Hyperdrive when HYPERDRIVE_ENABLED is set', () => {
    setTestEnv({
      DATABASE_URL: 'postgresql://user:pass@hyperdrive-local:5432/postgres',
      HYPERDRIVE_ENABLED: 'true',
    });
    const config = getDatabaseConfig();
    expect(config.dialect).toBe('postgresql');
    expect(config.isHyperdrive).toBe(true);
    expect(config.isSupabase).toBe(false);
    expect(config.isTransactionPooler).toBe(false);
  });

  test('Hyperdrive overrides Supabase detection', () => {
    setTestEnv({
      DATABASE_URL: 'postgresql://user:pass@pooler.supabase.com:6543/postgres',
      HYPERDRIVE_ENABLED: 'true',
    });
    const config = getDatabaseConfig();
    expect(config.isHyperdrive).toBe(true);
    expect(config.isSupabase).toBe(false);
    expect(config.isTransactionPooler).toBe(false);
  });

  test('returns isHyperdrive false when not set', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const config = getDatabaseConfig();
    expect(config.isHyperdrive).toBe(false);
  });
});
