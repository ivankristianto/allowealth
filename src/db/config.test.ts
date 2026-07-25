import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
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
  });

  test('returns sqlite config with custom DATABASE_URL', () => {
    process.env.DATABASE_URL = '/custom/path.db';
    const config = getDatabaseConfig();
    expect(config.dialect).toBe('sqlite');
    expect(config.url).toBe('/custom/path.db');
  });
});
