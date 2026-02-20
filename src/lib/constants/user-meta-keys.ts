/**
 * User Meta Keys Constants
 *
 * Defines the allowlist of meta keys, their types, validation schemas, and defaults.
 * All meta keys must be validated against this allowlist at the service layer.
 */
import { z } from 'zod';

/**
 * Allowed meta keys - only these keys can be stored in user_meta
 */
export const USER_META_KEYS = {
  SHOW_CONVERTED_TOTALS: 'show_converted_totals',
  SHOW_INDIVIDUAL_CURRENCIES: 'show_individual_currencies',
  PHONE: 'phone',
  BIO: 'bio',
  PENDING_EMAIL: 'pending_email',
} as const;

/**
 * Type for valid meta key values
 */
export type UserMetaKey = (typeof USER_META_KEYS)[keyof typeof USER_META_KEYS];

/**
 * Array of all valid meta keys for validation
 */
export const VALID_META_KEYS = Object.values(USER_META_KEYS);

/**
 * Default values for each meta key (stored as strings in database)
 */
export const META_DEFAULTS: Record<UserMetaKey, string> = {
  [USER_META_KEYS.SHOW_CONVERTED_TOTALS]: 'true',
  [USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES]: 'true',
  [USER_META_KEYS.PHONE]: '',
  [USER_META_KEYS.BIO]: '',
  [USER_META_KEYS.PENDING_EMAIL]: '',
};

/**
 * Maximum size for meta_value in bytes (4KB)
 */
export const META_VALUE_MAX_SIZE = 4096;

/**
 * Validation schemas for each meta key's value
 *
 * Note: All values are stored as strings in the database.
 * Boolean values are stored as 'true' or 'false' strings.
 */
export const META_VALUE_SCHEMAS: Record<UserMetaKey, z.ZodType<string>> = {
  [USER_META_KEYS.SHOW_CONVERTED_TOTALS]: z.enum(['true', 'false'], {
    message: 'Value must be "true" or "false"',
  }),
  [USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES]: z.enum(['true', 'false'], {
    message: 'Value must be "true" or "false"',
  }),
  [USER_META_KEYS.PHONE]: z.string().max(50, 'Phone number must be at most 50 characters'),
  [USER_META_KEYS.BIO]: z.string().max(500, 'Bio must be at most 500 characters'),
  [USER_META_KEYS.PENDING_EMAIL]: z
    .email({ message: 'Invalid email format' })
    .max(255, 'Email must be at most 255 characters'),
};

/**
 * Schema to validate meta key
 */
export const metaKeySchema = z.enum(
  [
    USER_META_KEYS.SHOW_CONVERTED_TOTALS,
    USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES,
    USER_META_KEYS.PHONE,
    USER_META_KEYS.BIO,
    USER_META_KEYS.PENDING_EMAIL,
  ],
  {
    message: `Invalid meta key. Must be one of: ${VALID_META_KEYS.join(', ')}`,
  }
);

/**
 * Check if a string is a valid meta key
 */
export function isValidMetaKey(key: string): key is UserMetaKey {
  return VALID_META_KEYS.includes(key as UserMetaKey);
}

/**
 * Validate a meta value against its key's schema
 * @param key - The meta key
 * @param value - The value to validate
 * @returns The validated value or throws ZodError
 */
export function validateMetaValue(key: UserMetaKey, value: string): string {
  // Check value size limit using actual byte length (not character count)
  const byteLength = new TextEncoder().encode(value).length;
  if (byteLength > META_VALUE_MAX_SIZE) {
    throw new Error(`Meta value exceeds maximum size of ${META_VALUE_MAX_SIZE} bytes`);
  }

  const schema = META_VALUE_SCHEMAS[key];
  return schema.parse(value);
}

/**
 * Type-safe user settings derived from meta values
 */
export interface UserSettings {
  showConvertedTotals: boolean;
  showIndividualCurrencies: boolean;
  phone: string;
  bio: string;
}

/**
 * Default user settings
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  showConvertedTotals: true,
  showIndividualCurrencies: true,
  phone: '',
  bio: '',
};

/**
 * Convert string meta value to boolean
 */
export function metaValueToBoolean(
  value: string | null | undefined,
  defaultValue: boolean
): boolean {
  if (value === null || value === undefined) return defaultValue;
  return value === 'true';
}

/**
 * Convert boolean to meta value string
 */
export function booleanToMetaValue(value: boolean): string {
  return value ? 'true' : 'false';
}
