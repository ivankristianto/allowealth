import { describe, it, expect, afterEach } from 'bun:test';
import { getSignupMode, isPublicSignupEnabled } from './signup-mode';
import { setTestEnv } from '@/lib/env';

describe('signup mode policy', () => {
  afterEach(() => {
    setTestEnv(null);
  });

  it('defaults to invite_only when SIGNUP_MODE is not set', () => {
    setTestEnv({
      SIGNUP_MODE: undefined,
    });

    expect(getSignupMode()).toBe('invite_only');
    expect(isPublicSignupEnabled()).toBe(false);
  });

  it('returns public when SIGNUP_MODE=public', () => {
    setTestEnv({
      SIGNUP_MODE: 'public',
    });

    expect(getSignupMode()).toBe('public');
    expect(isPublicSignupEnabled()).toBe(true);
  });

  it('falls back to invite_only for invalid values', () => {
    setTestEnv({
      SIGNUP_MODE: 'invalid-value',
    });

    expect(getSignupMode()).toBe('invite_only');
  });
});
