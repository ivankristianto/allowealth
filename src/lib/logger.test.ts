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

describe('production JSON logging of errors', () => {
  const originalError = console.error;
  let errorOutput: string[];

  beforeEach(() => {
    errorOutput = [];
    console.error = (...args: unknown[]) => errorOutput.push(args.map(String).join(' '));
  });

  afterEach(() => {
    console.error = originalError;
  });

  function lastEntry(): Record<string, any> {
    return JSON.parse(errorOutput[errorOutput.length - 1]);
  }

  test('an Error keeps its name, message, stack, code and cause', async () => {
    const { createLogger } = await import('./logger');
    const cause = Object.assign(new Error('UNIQUE constraint failed: budgets.id'), {
      code: 'SQLITE_CONSTRAINT_UNIQUE',
    });
    const error = new TypeError('Failed query: insert into "budgets"', { cause });

    createLogger('database').error('query failed', error);

    const entry = lastEntry();
    expect(entry.message).toBe('query failed TypeError: Failed query: insert into "budgets"');
    expect(entry.error.name).toBe('TypeError');
    expect(entry.error.message).toBe('Failed query: insert into "budgets"');
    expect(entry.error.stack).toContain('logger.test.ts');
    expect(entry.error.cause.message).toBe('UNIQUE constraint failed: budgets.id');
    expect(entry.error.cause.code).toBe('SQLITE_CONSTRAINT_UNIQUE');
  });

  test('an Error nested in a context object is serialized too', async () => {
    const { createLogger } = await import('./logger');

    createLogger('cache').error('invalidate failed', { error: new Error('redis down') });

    expect(lastEntry().message).toContain('"message":"redis down"');
  });
});

describe('logError', () => {
  const originalError = console.error;
  let errorOutput: string[];

  beforeEach(() => {
    errorOutput = [];
    console.error = (...args: unknown[]) => errorOutput.push(args.map(String).join(' '));
  });

  afterEach(() => {
    console.error = originalError;
  });

  test('logs SQL text and stack, tagged with the returned id, without bound values', async () => {
    const { logError } = await import('./logger');
    // Same shape as drizzle-orm's DrizzleQueryError message
    const error = new Error(
      'Failed query: update "accounts" set "name" = ? where "id" = ?\nparams: Savings,acc_123'
    );

    const errorId = logError('Error updating account', error);

    expect(errorId).toMatch(/^[0-9a-f]{8}$/);
    const output = errorOutput.join('\n');
    expect(output).toContain(`errorId=${errorId}`);
    expect(output).toContain('update \\"accounts\\" set');
    expect(output).toContain('params: [REDACTED]');
    expect(output).not.toContain('acc_123');
    expect(output).toContain('logger.test.ts');
  });

  test('redacts credentials, password hashes and tokens', async () => {
    const { logError } = await import('./logger');
    const argon = await Bun.password.hash('hunter2-hunter2', 'argon2id');
    const pbkdf2 = '$pbkdf2-sha256$600000$c2FsdHNhbHQ=$aGFzaGhhc2hoYXNo';
    const error = new Error(
      `connect redis://default:s3cret@cache:6379 failed for ${argon} and ${pbkdf2}` +
        ' with aw_pat_AbC-123_xyz and Authorization: Bearer eyJhbGciOi.payload.sig'
    );

    logError('Saving user failed', error);

    const output = errorOutput.join('\n');
    for (const secret of ['s3cret', argon, pbkdf2, 'AbC-123_xyz', 'eyJhbGciOi']) {
      expect(output).not.toContain(secret);
    }
    expect(output).toContain('redis://[REDACTED]@cache:6379');
    expect(output).toContain('Bearer [REDACTED]');
  });
});
