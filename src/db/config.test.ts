import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { setTestEnv } from '@/lib/env';
import { getDatabaseConfig } from './config';

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
    expect(config.isD1).toBe(false);
  });

  test('returns sqlite config with custom DATABASE_URL', () => {
    process.env.DATABASE_URL = '/custom/path.db';
    const config = getDatabaseConfig();
    expect(config.dialect).toBe('sqlite');
    expect(config.url).toBe('/custom/path.db');
  });
});

describe('D1 detection', () => {
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

  test('detects D1 when D1_ENABLED is set', () => {
    setTestEnv({ D1_ENABLED: 'true' });
    const config = getDatabaseConfig();
    expect(config.isD1).toBe(true);
    expect(config.dialect).toBe('sqlite');
  });

  test('D1 returns empty URL', () => {
    setTestEnv({ D1_ENABLED: 'true' });
    const config = getDatabaseConfig();
    expect(config.url).toBe('');
  });

  test('returns isD1 false when not set', () => {
    const config = getDatabaseConfig();
    expect(config.isD1).toBe(false);
  });
});
