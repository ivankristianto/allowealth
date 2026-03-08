import { afterEach, describe, expect, it } from 'bun:test';
import { APP_MODES, getAppMode, isAppOnly } from './app-mode';
import { setTestEnv } from '@/lib/env';

describe('app mode policy', () => {
  afterEach(() => {
    setTestEnv(null);
  });

  it('defaults to full when APP_MODE is not set', () => {
    setTestEnv({
      APP_MODE: undefined,
    });

    expect(getAppMode()).toBe(APP_MODES.FULL);
    expect(isAppOnly()).toBe(false);
  });

  it('returns app_only when APP_MODE=app_only', () => {
    setTestEnv({
      APP_MODE: APP_MODES.APP_ONLY,
    });

    expect(getAppMode()).toBe(APP_MODES.APP_ONLY);
    expect(isAppOnly()).toBe(true);
  });

  it('falls back to full for invalid values', () => {
    setTestEnv({
      APP_MODE: 'invalid-value',
    });

    expect(getAppMode()).toBe(APP_MODES.FULL);
  });
});
