import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { validateTarget, getTarget, isD1, isD1Local } from './target';

describe('validateTarget', () => {
  it('accepts valid targets', () => {
    expect(validateTarget('sqlite')).toBe('sqlite');
    expect(validateTarget('d1')).toBe('d1');
    expect(validateTarget('d1-local')).toBe('d1-local');
    expect(validateTarget('postgres')).toBe('postgres');
  });
});

describe('getTarget', () => {
  const origTarget = process.env.AW_TARGET;

  afterEach(() => {
    if (origTarget !== undefined) {
      process.env.AW_TARGET = origTarget;
    } else {
      delete process.env.AW_TARGET;
    }
  });

  it('returns sqlite by default', () => {
    delete process.env.AW_TARGET;
    expect(getTarget()).toBe('sqlite');
  });

  it('returns AW_TARGET value', () => {
    process.env.AW_TARGET = 'd1';
    expect(getTarget()).toBe('d1');
  });
});

describe('isD1', () => {
  const origTarget = process.env.AW_TARGET;

  afterEach(() => {
    if (origTarget !== undefined) {
      process.env.AW_TARGET = origTarget;
    } else {
      delete process.env.AW_TARGET;
    }
  });

  it('returns true for d1 target', () => {
    process.env.AW_TARGET = 'd1';
    expect(isD1()).toBe(true);
  });

  it('returns true for d1-local target', () => {
    process.env.AW_TARGET = 'd1-local';
    expect(isD1()).toBe(true);
  });

  it('returns false for sqlite target', () => {
    delete process.env.AW_TARGET;
    expect(isD1()).toBe(false);
  });

  it('returns false for postgres target', () => {
    process.env.AW_TARGET = 'postgres';
    expect(isD1()).toBe(false);
  });
});

describe('isD1Local', () => {
  const origTarget = process.env.AW_TARGET;

  afterEach(() => {
    if (origTarget !== undefined) {
      process.env.AW_TARGET = origTarget;
    } else {
      delete process.env.AW_TARGET;
    }
  });

  it('returns true only for d1-local', () => {
    process.env.AW_TARGET = 'd1-local';
    expect(isD1Local()).toBe(true);
  });

  it('returns false for d1 (remote)', () => {
    process.env.AW_TARGET = 'd1';
    expect(isD1Local()).toBe(false);
  });
});

describe('resolveTarget D1 env setup', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.AW_TARGET = process.env.AW_TARGET;
    savedEnv.D1_ENABLED = process.env.D1_ENABLED;
    delete process.env.AW_TARGET;
    delete process.env.D1_ENABLED;
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val !== undefined) {
        process.env[key] = val;
      } else {
        delete process.env[key];
      }
    }
  });

  it('sets D1_ENABLED for d1 target', async () => {
    // Dynamically import to get fresh module behavior
    const { resolveTarget } = await import('./target');
    await resolveTarget({ target: 'd1' });

    expect(process.env.D1_ENABLED).toBe('true');
    expect(process.env.AW_TARGET).toBe('d1');
  });

  it('sets D1_ENABLED for d1-local target', async () => {
    const { resolveTarget } = await import('./target');
    await resolveTarget({ target: 'd1-local' });

    expect(process.env.D1_ENABLED).toBe('true');
    expect(process.env.AW_TARGET).toBe('d1-local');
  });

  it('does not set D1_ENABLED for sqlite target', async () => {
    const { resolveTarget } = await import('./target');
    await resolveTarget({ target: 'sqlite' });

    expect(process.env.D1_ENABLED).toBeUndefined();
  });

  it('does not set D1_ENABLED for postgres target', async () => {
    const { resolveTarget } = await import('./target');
    // resolveTarget for postgres tries to load .env.production which may not exist in test
    // Just verify env state by checking what resolveTarget does before the loadEnvFile call
    process.env.AW_TARGET = 'postgres';
    // With AW_TARGET already set, resolveTarget defers to it
    const result = await resolveTarget({ target: 'postgres' });
    expect(result).toBe('postgres');
    expect(process.env.D1_ENABLED).toBeUndefined();
  });
});
