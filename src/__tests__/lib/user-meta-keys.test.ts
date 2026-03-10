import { describe, expect, it } from 'bun:test';
import {
  USER_META_KEYS,
  META_VALUE_SCHEMAS,
  META_DEFAULTS,
  VALID_META_KEYS,
  metaKeySchema,
} from '@/lib/constants/user-meta-keys';

describe('USER_META_KEYS.THEME', () => {
  it('has THEME key defined', () => {
    expect(USER_META_KEYS.THEME).toBe('theme');
  });

  it('THEME is in VALID_META_KEYS', () => {
    expect(VALID_META_KEYS).toContain('theme');
  });

  it('metaKeySchema accepts "theme"', () => {
    expect(() => metaKeySchema.parse('theme')).not.toThrow();
  });

  it('META_VALUE_SCHEMAS.theme accepts all four valid values', () => {
    const schema = META_VALUE_SCHEMAS[USER_META_KEYS.THEME];
    for (const value of ['system', 'light', 'dark', 'monochrome']) {
      expect(() => schema.parse(value)).not.toThrow();
    }
  });

  it('META_VALUE_SCHEMAS.theme rejects invalid values', () => {
    const schema = META_VALUE_SCHEMAS[USER_META_KEYS.THEME];
    expect(() => schema.parse('purple')).toThrow();
    expect(() => schema.parse('')).toThrow();
  });

  it('META_DEFAULTS.theme is "system"', () => {
    expect(META_DEFAULTS[USER_META_KEYS.THEME]).toBe('system');
  });
});
