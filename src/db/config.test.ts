import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { getDatabaseConfig } from './config';

describe('getDatabaseConfig', () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  const restore = (key: string, value: string | undefined) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  };

  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    restore('DATABASE_URL', originalUrl);
    restore('NODE_ENV', originalNodeEnv);
  });

  test('falls back to the dev database outside test runs', () => {
    process.env.NODE_ENV = 'development';
    const config = getDatabaseConfig();
    expect(config.dialect).toBe('sqlite');
    expect(config.url).toBe('db/.dev.db');
  });

  test('refuses the dev database fallback in test runs', () => {
    process.env.NODE_ENV = 'test';
    expect(() => getDatabaseConfig()).toThrow('Refusing to fall back to db/.dev.db');
  });

  test('returns sqlite config with custom DATABASE_URL', () => {
    process.env.DATABASE_URL = '/custom/path.db';
    const config = getDatabaseConfig();
    expect(config.dialect).toBe('sqlite');
    expect(config.url).toBe('/custom/path.db');
  });
});
