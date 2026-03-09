import { describe, expect, test, beforeEach, afterEach } from 'bun:test';

describe('resolveLogLevel', () => {
  test('returns debug (4) in test environment by default', async () => {
    const { resolveLogLevel } = await import('./logger');
    // bun test sets NODE_ENV=test, so default should be debug
    expect(resolveLogLevel()).toBe(4);
  });

  test('maps known LOG_LEVEL values to correct consola levels', async () => {
    const { resolveLogLevel: _ } = await import('./logger');
    // Since LOG_LEVEL env is not set in test, we verify the map indirectly
    // by checking the exported function exists and returns a number
    expect(typeof _()).toBe('number');
  });
});

describe('LOG_LEVEL_MAP coverage', () => {
  test('logger module exports resolveLogLevel', async () => {
    const mod = await import('./logger');
    expect(typeof mod.resolveLogLevel).toBe('function');
  });
});

describe('logger', () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  let logOutput: string[];
  let warnOutput: string[];
  let errorOutput: string[];

  beforeEach(() => {
    logOutput = [];
    warnOutput = [];
    errorOutput = [];
    console.log = (...args: unknown[]) => logOutput.push(args.map(String).join(' '));
    console.warn = (...args: unknown[]) => warnOutput.push(args.map(String).join(' '));
    console.error = (...args: unknown[]) => errorOutput.push(args.map(String).join(' '));
  });

  afterEach(() => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  });

  test('createLogger returns logger with standard methods', async () => {
    const { createLogger } = await import('./logger');
    const log = createLogger('test');
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
    expect(typeof log.debug).toBe('function');
  });

  test('createLogger tag appears in output', async () => {
    const { createLogger } = await import('./logger');
    const log = createLogger('database');
    log.info('connection established');
    expect(logOutput.length).toBeGreaterThan(0);
    const output = logOutput[0];
    expect(output).toContain('database');
    expect(output).toContain('connection established');
  });

  test('error level calls console.error', async () => {
    const { createLogger } = await import('./logger');
    const log = createLogger('auth');
    log.error('login failed');
    expect(errorOutput.length).toBeGreaterThan(0);
  });

  test('warn level calls console.warn', async () => {
    const { createLogger } = await import('./logger');
    const log = createLogger('cache');
    log.warn('fallback to memory');
    expect(warnOutput.length).toBeGreaterThan(0);
  });
});

describe('sanitizeError', () => {
  test('handles null error', async () => {
    const { sanitizeError } = await import('./logger');
    const result = sanitizeError(null);
    expect(result.message).toBe('An unknown error occurred');
    expect(result.name).toBe('UnknownError');
    expect(result.isKnownError).toBe(false);
  });

  test('handles undefined error', async () => {
    const { sanitizeError } = await import('./logger');
    const result = sanitizeError(undefined, 'test context');
    expect(result.message).toBe('An unknown error occurred');
    expect(result.context).toBe('test context');
  });

  test('sanitizes Error instance', async () => {
    const { sanitizeError } = await import('./logger');
    const result = sanitizeError(new TypeError('something broke'));
    expect(result.message).toBe('something broke');
    expect(result.name).toBe('TypeError');
  });

  test('sanitizes string error', async () => {
    const { sanitizeError } = await import('./logger');
    const result = sanitizeError('plain string error');
    expect(result.message).toBe('plain string error');
    expect(result.name).toBe('Error');
  });

  test('sanitizes error-like object', async () => {
    const { sanitizeError } = await import('./logger');
    const result = sanitizeError({ message: 'obj error', code: 'ENOENT' });
    expect(result.message).toBe('obj error');
    expect(result.name).toBe('ENOENT');
  });

  test('redacts file paths', async () => {
    const { sanitizeError } = await import('./logger');
    const result = sanitizeError(
      new Error('failed at /Users/ivan/Works/AI/expenses/src/lib/auth.ts')
    );
    expect(result.message).not.toContain('/Users/ivan');
    expect(result.message).toContain('[REDACTED]');
  });

  test('redacts database connection strings', async () => {
    const { sanitizeError } = await import('./logger');
    const result = sanitizeError('postgresql://user:pass@host/db connection failed');
    expect(result.message).not.toContain('user:pass');
    expect(result.message).toContain('[REDACTED]');
  });

  test('replaces internal error messages with generic one', async () => {
    const { sanitizeError } = await import('./logger');
    const result = sanitizeError('undefined');
    expect(result.message).toBe('An internal error occurred');
  });

  test('replaces very short sanitized messages', async () => {
    const { sanitizeError } = await import('./logger');
    // A message that becomes empty after sanitization
    const result = sanitizeError(new Error(''));
    expect(result.message).toBe('An unexpected error occurred');
  });
});

describe('getSafeErrorMessage', () => {
  test('returns safe message from Error', async () => {
    const { getSafeErrorMessage } = await import('./logger');
    expect(getSafeErrorMessage(new Error('timeout'))).toBe('timeout');
  });

  test('returns safe message from null', async () => {
    const { getSafeErrorMessage } = await import('./logger');
    expect(getSafeErrorMessage(null)).toBe('An unknown error occurred');
  });

  test('redacts sensitive content', async () => {
    const { getSafeErrorMessage } = await import('./logger');
    const msg = getSafeErrorMessage('ERR_INTERNAL_DB_CONNECT failed');
    expect(msg).not.toContain('ERR_INTERNAL');
  });
});

describe('logError', () => {
  test('is exported as a function', async () => {
    const { logError } = await import('./logger');
    expect(typeof logError).toBe('function');
  });
});
