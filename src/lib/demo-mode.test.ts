import { afterEach, describe, expect, it } from 'bun:test';

import { setTestEnv } from '@/lib/env';

import { isDemoMode } from './demo-mode';

describe('isDemoMode', () => {
  afterEach(() => {
    setTestEnv(null);
  });

  it('returns false when DEMO_MODE is not set', () => {
    setTestEnv({ DEMO_MODE: undefined });

    expect(isDemoMode()).toBe(false);
  });

  it('returns true when DEMO_MODE=true', () => {
    setTestEnv({ DEMO_MODE: 'true' });

    expect(isDemoMode()).toBe(true);
  });

  it('returns false when DEMO_MODE=false', () => {
    setTestEnv({ DEMO_MODE: 'false' });

    expect(isDemoMode()).toBe(false);
  });

  it('returns false for non-"true" values', () => {
    setTestEnv({ DEMO_MODE: '1' });

    expect(isDemoMode()).toBe(false);
  });
});
