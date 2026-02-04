import { describe, expect, test, beforeEach, afterEach } from 'bun:test';

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
