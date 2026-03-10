import { describe, expect, it } from 'bun:test';
import { parse } from 'valibot';
import {
  USER_META_KEYS,
  META_VALUE_SCHEMAS,
  META_DEFAULTS,
  VALID_META_KEYS,
  metaKeySchema,
  validateMetaValue,
} from '@/lib/constants/user-meta-keys';

describe('USER_META_KEYS.THEME', () => {
  it('has THEME key defined', () => {
    expect(USER_META_KEYS.THEME).toBe('theme');
  });

  it('THEME is in VALID_META_KEYS', () => {
    expect(VALID_META_KEYS).toContain('theme');
  });

  it('metaKeySchema accepts "theme"', () => {
    expect(parse(metaKeySchema, 'theme')).toBe('theme');
  });

  it('META_VALUE_SCHEMAS.theme accepts all four valid values', () => {
    const schema = META_VALUE_SCHEMAS[USER_META_KEYS.THEME];
    for (const value of ['system', 'light', 'dark', 'monochrome']) {
      expect(parse(schema, value)).toBe(value);
    }
  });

  it('META_VALUE_SCHEMAS.theme rejects invalid values', () => {
    const schema = META_VALUE_SCHEMAS[USER_META_KEYS.THEME];
    expect(() => parse(schema, 'purple')).toThrow();
    expect(() => parse(schema, '')).toThrow();
  });

  it('META_DEFAULTS.theme is "system"', () => {
    expect(META_DEFAULTS[USER_META_KEYS.THEME]).toBe('system');
  });

  it('validateMetaValue accepts boolean meta values', () => {
    expect(validateMetaValue(USER_META_KEYS.SHOW_CONVERTED_TOTALS, 'true')).toBe('true');
    expect(validateMetaValue(USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES, 'false')).toBe('false');
  });

  it('validateMetaValue rejects invalid boolean meta values', () => {
    expect(() => validateMetaValue(USER_META_KEYS.SHOW_CONVERTED_TOTALS, 'yes')).toThrow();
    expect(() => validateMetaValue(USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES, '')).toThrow();
  });

  it('validateMetaValue accepts all valid theme values', () => {
    for (const value of ['system', 'light', 'dark', 'monochrome']) {
      expect(validateMetaValue(USER_META_KEYS.THEME, value)).toBe(value);
    }
  });

  it('validateMetaValue accepts a valid pending email', () => {
    expect(validateMetaValue(USER_META_KEYS.PENDING_EMAIL, 'test@example.com')).toBe(
      'test@example.com'
    );
  });

  it('validateMetaValue rejects an invalid pending email', () => {
    expect(() => validateMetaValue(USER_META_KEYS.PENDING_EMAIL, 'not-an-email')).toThrow();
  });
});
