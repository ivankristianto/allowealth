import { describe, expect, test } from 'bun:test';
import { isTwoFactorEnabled } from './two-factor-status';

describe('isTwoFactorEnabled', () => {
  test('reads the twoFactor plugin flag from the session user', () => {
    expect(isTwoFactorEnabled({ id: 'u1', twoFactorEnabled: true })).toBe(true);
    expect(isTwoFactorEnabled({ id: 'u1', twoFactorEnabled: false })).toBe(false);
    expect(isTwoFactorEnabled({ id: 'u1', twoFactorEnabled: null })).toBe(false);
  });

  test('treats a missing user or flag as disabled', () => {
    expect(isTwoFactorEnabled(null)).toBe(false);
    expect(isTwoFactorEnabled(undefined)).toBe(false);
    expect(isTwoFactorEnabled({ id: 'u1' })).toBe(false);
  });
});
