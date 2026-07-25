import { describe, it, expect, afterEach } from 'bun:test';
import { validateTarget, getTarget, resolveTarget } from './target';

describe('validateTarget', () => {
  it('accepts valid targets', () => {
    expect(validateTarget('sqlite')).toBe('sqlite');
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
    process.env.AW_TARGET = 'sqlite';
    expect(getTarget()).toBe('sqlite');
  });
});

describe('resolveTarget', () => {
  const origTarget = process.env.AW_TARGET;

  afterEach(() => {
    if (origTarget !== undefined) {
      process.env.AW_TARGET = origTarget;
    } else {
      delete process.env.AW_TARGET;
    }
  });

  it('sets AW_TARGET for the sqlite target', async () => {
    delete process.env.AW_TARGET;
    const result = await resolveTarget({ target: 'sqlite' });

    expect(result).toBe('sqlite');
    expect(process.env.AW_TARGET).toBe('sqlite');
  });

  it('defers to AW_TARGET already set by the parent command', async () => {
    process.env.AW_TARGET = 'sqlite';
    const result = await resolveTarget({ target: 'sqlite' });

    expect(result).toBe('sqlite');
  });
});
