/**
 * HTML Validation Patterns Utility
 *
 * Reusable regex patterns for HTML form validation.
 * All patterns are compatible with both HTML pattern attributes and JavaScript RegExp.
 *
 * Usage in HTML:
 *   <input type="email" pattern={patterns.email.html} title={patterns.email.title} />
 *
 * Usage in TypeScript:
 *   const emailRegex = patterns.email.regex;
 *   const isValid = emailRegex.test(email);
 *
 * @module lib/validation/patterns
 */

/**
 * Email validation pattern
 *
 * Standard email validation regex compatible with ES2021+.
 *
 * Pattern breakdown:
 * - Local part: alphanumeric, dots, underscores, percent, plus, hyphen
 * - @ symbol required
 * - Domain: alphanumeric, dots, hyphens
 * - TLD: 2+ alphabetic characters
 *
 * HTML-compatible version excludes the /v flag since HTML pattern attributes
 * don't support regex flags. For client-side JS validation, use the .regex property.
 */
export const email = {
  /**
   * HTML pattern attribute value (without flags)
   * Compatible with HTML5 pattern attribute
   *
   * @example
   * <input type="email" pattern={email.html} title={email.title} />
   */
  html: '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$',

  /**
   * RegExp for email validation
   * Use this in TypeScript/JavaScript for server-side or client-side validation
   *
   * @example
   * if (email.regex.test(userEmail)) { ... }
   */
  regex: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/,

  /**
   * User-friendly error message for validation failures
   */
  title: 'Please enter a valid email address (e.g., user@example.com)',

  /**
   * Example valid emails for documentation/testing
   */
  examples: {
    valid: [
      'user@example.com',
      'first.last@example.co.uk',
      'user+tag@example.com',
      'user_name@example.io',
    ],
    invalid: ['user', 'user@', '@example.com', 'user @example.com', 'user@example'],
  },
} as const;

/**
 * Password validation patterns
 *
 * Individual patterns for password requirements that can be combined
 * as needed. Use these for granular password validation feedback.
 */
export const password = {
  /**
   * Minimum length requirement (12+ characters)
   */
  minLength: {
    html: '.{12,}',
    regex: /.{12,}/,
    title: 'At least 12 characters',
  },

  /**
   * Uppercase letter requirement (A-Z)
   */
  uppercase: {
    html: '[A-Z]',
    regex: /[A-Z]/,
    title: 'At least one uppercase letter (A-Z)',
  },

  /**
   * Lowercase letter requirement (a-z)
   */
  lowercase: {
    html: '[a-z]',
    regex: /[a-z]/,
    title: 'At least one lowercase letter (a-z)',
  },

  /**
   * Number requirement (0-9)
   */
  number: {
    html: '[0-9]',
    regex: /[0-9]/,
    title: 'At least one number (0-9)',
  },

  /**
   * Special character requirement
   * Matches: ! @ # $ % ^ & * ( ) _ + - = [ ] { } ; ' : " \ | , . < > / ?
   */
  special: {
    html: '[!@#$%^&*()_+\\-=\\[\\]{};\':\"\\\\|,.<>\\/?]',
    regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    title: 'At least one special character (!@#$%^&* etc.)',
  },

  /**
   * Combined password pattern for basic strength validation
   * Requires: 12+ chars, at least one letter, at least one number or special char
   *
   * Note: This is a simplified pattern. For production use, validate each
   * requirement individually to provide better user feedback.
   */
  combined: {
    html: '(?=.*[a-zA-Z])(?=.*[0-9!@#$%^&*()_+\\-=\\[\\]{};\':\"\\\\|,.<>\\/?]).{12,}',
    regex: /^(?=.*[a-zA-Z])(?=.*[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{12,}$/,
    title: 'At least 12 characters with letters and numbers/special characters',
  },

  /**
   * Examples for documentation/testing
   */
  examples: {
    valid: ['SecureP@ssw0rd', 'MyPassword123!', 'Correct-Horse-Battery'],
    invalid: ['password', 'Password', 'Pass123', 'short1A!'],
  },
} as const;

/**
 * URL validation pattern
 *
 * Supports HTTP, HTTPS, and FTP protocols with domain validation.
 * Note: For more comprehensive URL validation, consider using the URL constructor
 * in JavaScript or a dedicated URL validation library.
 */
export const url = {
  /**
   * HTML pattern attribute value
   */
  html: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)',

  /**
   * RegExp for URL validation
   */
  regex:
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\//=]*)/,

  /**
   * User-friendly error message
   */
  title: 'Please enter a valid URL (e.g., https://example.com)',

  /**
   * Examples for documentation/testing
   */
  examples: {
    valid: [
      'https://example.com',
      'http://www.example.com',
      'https://example.com/path?query=value',
    ],
    invalid: ['example.com', 'ftp://example.com', 'not a url'],
  },
} as const;

/**
 * Phone number validation pattern
 *
 * Supports common international phone number formats.
 * This is a basic pattern - for production, consider using a dedicated
 * phone validation library like libphonenumber-js.
 */
export const phone = {
  /**
   * HTML pattern attribute value
   * Supports: +1234567890, (123) 456-7890, 123-456-7890, etc.
   */
  html: '^\\+?[1-9]\\d{1,14}$|^\\(?[1-9]\\d{2,3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}$',

  /**
   * RegExp for phone validation
   */
  regex: /^\+?[1-9]\d{1,14}$|^\(?[1-9]\d{2,3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/,

  /**
   * User-friendly error message
   */
  title: 'Please enter a valid phone number',

  /**
   * Examples for documentation/testing
   */
  examples: {
    valid: ['+1234567890', '(123) 456-7890', '123-456-7890', '1234567890'],
    invalid: ['123', 'abc-def-ghij', '+0123456789'],
  },
} as const;

/**
 * Credit card number validation pattern
 *
 * Supports spaces and hyphens for formatting.
 * Note: This only validates format, not checksum (Luhn algorithm).
 * For production, validate using the Luhn algorithm and a payment processor.
 */
export const creditCard = {
  /**
   * HTML pattern attribute value
   */
  html: '[0-9]{13,19}|[0-9]{4}[\\s-][0-9]{4}[\\s-][0-9]{4}[\\s-][0-9]{4,7}',

  /**
   * RegExp for credit card validation
   */
  regex: /^[0-9]{13,19}$|^[0-9]{4}[\s-][0-9]{4}[\s-][0-9]{4}[\s-][0-9]{4,7}$/,
  title: 'Please enter a valid credit card number',
  examples: {
    valid: ['1234567890123456', '1234 5678 9012 3456', '1234-5678-9012-3456'],
    invalid: ['123', 'abcd-efgh-ijkl-mnop'],
  },
} as const;

/**
 * Postal code validation patterns
 *
 * Common patterns for US, UK, and Canadian postal codes.
 */
export const postalCode = {
  /**
   * US ZIP code (5 digits or 5+4 format)
   */
  us: {
    html: '\\d{5}(-\\d{4})?',
    regex: /^\d{5}(-\d{4})?$/,
    title: 'Please enter a valid US ZIP code (e.g., 12345 or 12345-6789)',
  },

  /**
   * UK postcode pattern
   */
  uk: {
    html: '[A-Z]{1,2}\\d[A-Z\\d]? ?\\d[A-Z]{2}',
    regex: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
    title: 'Please enter a valid UK postcode (e.g., SW1A 1AA)',
  },

  /**
   * Canadian postal code pattern
   */
  ca: {
    html: '[A-Z]\\d[A-Z] ?\\d[A-Z]\\d',
    regex: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i,
    title: 'Please enter a valid Canadian postal code (e.g., K1A 0B1)',
  },
} as const;

/**
 * Numeric validation patterns
 *
 * For validating numeric input with optional decimals.
 */
export const numeric = {
  /**
   * Positive integer (1 or greater)
   */
  positiveInteger: {
    html: '[1-9]\\d*',
    regex: /^[1-9]\d*$/,
    title: 'Please enter a positive number',
  },

  /**
   * Non-negative integer (0 or greater)
   */
  nonNegativeInteger: {
    html: '\\d+',
    regex: /^\d+$/,
    title: 'Please enter a non-negative number',
  },

  /**
   * Positive decimal number
   */
  positiveDecimal: {
    html: '(0\\.\\d+|[1-9]\\d*(\\.\\d+)?)',
    regex: /^(0\.\d+|[1-9]\d*(\.\d+)?)$/,
    title: 'Please enter a positive number',
  },

  /**
   * Percentage (0-100)
   */
  percentage: {
    html: '(100|0*\\d{1,2})(\\.\\d+)?%?',
    regex: /^(100|0*\d{1,2})(\.\d+)?%?$/,
    title: 'Please enter a percentage between 0 and 100',
  },
} as const;

/**
 * Date validation patterns
 *
 * Common date format patterns for HTML input validation.
 * Note: For robust date validation, use Date constructor or a date library.
 */
export const date = {
  /**
   * ISO 8601 date format (YYYY-MM-DD)
   */
  iso: {
    html: '\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])',
    regex: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
    title: 'Please enter a valid date (YYYY-MM-DD)',
  },

  /**
   * US date format (MM/DD/YYYY or MM-DD-YYYY)
   */
  us: {
    html: '(0[1-9]|1[0-2])[\\/\\-](0[1-9]|[12]\\d|3[01])[\\/\\-]\\d{4}',
    regex: /^(0[1-9]|1[0-2])[\/\-](0[1-9]|[12]\d|3[01])[\/\-]\d{4}$/,
    title: 'Please enter a valid date (MM/DD/YYYY)',
  },

  /**
   * European date format (DD/MM/YYYY or DD-MM-YYYY)
   */
  eu: {
    html: '(0[1-9]|[12]\\d|3[01])[\\/\\-](0[1-9]|1[0-2])[\\/\\-]\\d{4}',
    regex: /^(0[1-9]|[12]\d|3[01])[\/\-](0[1-9]|1[0-2])[\/\-]\d{4}$/,
    title: 'Please enter a valid date (DD/MM/YYYY)',
  },
} as const;

/**
 * Common username pattern
 *
 * Alphanumeric with underscores, hyphens, and dots.
 * Common pattern for usernames, handles, etc.
 */
export const username = {
  html: '[a-zA-Z0-9_-]{3,20}',
  regex: /^[a-zA-Z0-9_-]{3,20}$/,
  title: 'Username must be 3-20 characters (letters, numbers, underscores, hyphens only)',
  examples: {
    valid: ['user_name', 'UserName', 'user-123', 'user.name'],
    invalid: ['ab', 'user@name', 'user name', 'a' * 21],
  },
} as const;

/**
 * Export all patterns as a single object for convenience
 */
export const patterns = {
  email,
  password,
  url,
  phone,
  creditCard,
  postalCode,
  numeric,
  date,
  username,
} as const;

/**
 * Type exports for TypeScript usage
 */
export type ValidationPattern = keyof typeof patterns;
export type PasswordPattern = keyof typeof password;
