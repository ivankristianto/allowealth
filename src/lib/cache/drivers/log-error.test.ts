import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { RedisDriver } from './redis';
import { UpstashDriver } from './upstash';

const SECRET_KEY = 'better-auth:SESSION-TOKEN-4f2c9a';
const SECRET_VALUE = 'VALUE-SECRET-77e1';
const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;

const originalConsole = CONSOLE_METHODS.map((method) => [method, console[method]] as const);
let captured: string[] = [];

beforeEach(() => {
  captured = [];
  for (const method of CONSOLE_METHODS) {
    console[method] = (...args: unknown[]) => {
      captured.push(args.map(String).join(' '));
    };
  }
});

afterEach(() => {
  for (const [method, original] of originalConsole) console[method] = original;
});

function logged(): string {
  return captured.join('\n');
}

function upstashError(): Error {
  const error = new Error(`WRONGPASS invalid password, command was: ["get","${SECRET_KEY}"]`);
  error.name = 'UpstashError';
  return error;
}

function failingUpstashClient() {
  const fail = mock(() => Promise.reject(upstashError()));
  return {
    get: fail,
    set: fail,
    del: fail,
    eval: fail,
    getdel: fail,
    pipeline: () => ({ sadd: () => {}, expire: () => {}, smembers: () => {}, exec: fail }),
  };
}

function failingRedisClient() {
  const fail = mock(() => Promise.reject(new Error('ERR connection refused')));
  return { get: fail, set: fail, del: fail, send: fail, sadd: fail, smembers: fail };
}

describe('cache driver failure logs', () => {
  it('Upstash logs the operation and error but never the key', async () => {
    const driver = new UpstashDriver('https://cache.example.test', 'test-token');
    (driver as unknown as { redis: unknown }).redis = failingUpstashClient();

    await driver.get(SECRET_KEY);
    await driver.set(SECRET_KEY, { token: SECRET_VALUE }, { tags: [SECRET_KEY] });
    await driver.delete(SECRET_KEY);
    await driver.increment(SECRET_KEY, 60);
    await driver.getAndDelete(SECRET_KEY);
    await driver.invalidateByTags([SECRET_KEY]);

    expect(logged()).not.toContain(SECRET_KEY);
    expect(logged()).toContain('Get failed');
    expect(logged()).toContain('WRONGPASS invalid password');
  });

  it('Redis logs the operation and error but never the key', async () => {
    const driver = new RedisDriver('redis://cache.example.test:6379');
    (driver as unknown as { redis: unknown }).redis = failingRedisClient();

    await driver.get(SECRET_KEY);
    await driver.set(SECRET_KEY, { token: SECRET_VALUE }, { tags: [SECRET_KEY] });
    await driver.delete(SECRET_KEY);
    await driver.increment(SECRET_KEY, 60);
    await driver.getAndDelete(SECRET_KEY);
    await driver.invalidateByTags([SECRET_KEY]);

    expect(logged()).not.toContain(SECRET_KEY);
    expect(logged()).toContain('Get failed');
    expect(logged()).toContain('ERR connection refused');
  });

  it('Redis does not log a stored value that fails to parse', async () => {
    const driver = new RedisDriver('redis://cache.example.test:6379');
    (driver as unknown as { redis: unknown }).redis = {
      get: mock(() => Promise.resolve(SECRET_VALUE)),
    };

    expect(await driver.get(SECRET_KEY)).toBeNull();

    expect(logged()).not.toContain(SECRET_VALUE);
    expect(logged()).not.toContain(SECRET_KEY);
    expect(logged()).toContain('not valid JSON');
  });
});
