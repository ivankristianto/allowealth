/**
 * User Meta Keys Constants
 *
 * Defines the allowlist of meta keys, their types, validation schemas, and defaults.
 * All meta keys must be validated against this allowlist at the service layer.
 */
import {
  email,
  maxLength,
  parse,
  picklist,
  pipe,
  string,
  type BaseIssue,
  type BaseSchema,
} from 'valibot';

/**
 * Allowed meta keys - only these keys can be stored in user_meta
 */
export const USER_META_KEYS = {
  SHOW_CONVERTED_TOTALS: 'show_converted_totals',
  SHOW_INDIVIDUAL_CURRENCIES: 'show_individual_currencies',
  PHONE: 'phone',
  THEME: 'theme',
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
  [USER_META_KEYS.THEME]: 'system',
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
 * Boolean values remain stored as 'true' or 'false' strings.
 */
export const META_VALUE_SCHEMAS: Record<
  UserMetaKey,
  BaseSchema<string, string, BaseIssue<unknown>>
> = {
  [USER_META_KEYS.SHOW_CONVERTED_TOTALS]: picklist(
    ['true', 'false'],
    'Value must be "true" or "false"'
  ),
  [USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES]: picklist(
    ['true', 'false'],
    'Value must be "true" or "false"'
  ),
  [USER_META_KEYS.PHONE]: pipe(
    string(),
    maxLength(50, 'Phone number must be at most 50 characters')
  ),
  [USER_META_KEYS.THEME]: picklist(
    ['system', 'light', 'dark', 'monochrome'],
    'Value must be "system", "light", "dark", or "monochrome"'
  ),
  [USER_META_KEYS.PENDING_EMAIL]: pipe(
    string(),
    email('Invalid email format'),
    maxLength(255, 'Email must be at most 255 characters')
  ),
};

const META_KEY_OPTIONS = [
  USER_META_KEYS.SHOW_CONVERTED_TOTALS,
  USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES,
  USER_META_KEYS.PHONE,
  USER_META_KEYS.THEME,
  USER_META_KEYS.PENDING_EMAIL,
] as const;

const INVALID_META_KEY_MESSAGE = `Invalid meta key. Must be one of: ${VALID_META_KEYS.join(', ')}`;

/**
 * Schema to validate meta key
 */
export const metaKeySchema = pipe(
  string(INVALID_META_KEY_MESSAGE),
  picklist(META_KEY_OPTIONS, INVALID_META_KEY_MESSAGE)
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
 * @returns The validated value or throws when validation fails
 */
export function validateMetaValue(key: UserMetaKey, value: string): string {
  // Check value size limit using actual byte length (not character count)
  const byteLength = new TextEncoder().encode(value).length;
  if (byteLength > META_VALUE_MAX_SIZE) {
    throw new Error(`Meta value exceeds maximum size of ${META_VALUE_MAX_SIZE} bytes`);
  }

  const schema = META_VALUE_SCHEMAS[key];
  return parse(schema, value);
}

/**
 * Type-safe user settings derived from meta values
 */
export interface UserSettings {
  showConvertedTotals: boolean;
  showIndividualCurrencies: boolean;
  phone: string;
  theme: string;
}

/**
 * Default user settings
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  showConvertedTotals: true,
  showIndividualCurrencies: true,
  phone: '',
  theme: 'system',
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
