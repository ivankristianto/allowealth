/**
 * Password Validation Constants
 *
 * Centralized password validation requirements used across client and server.
 * Ensures consistency between UI validation and backend security rules.
 *
 * @module lib/validation/password
 */

/**
 * Minimum password length requirement
 *
 * Passwords must be at least this many characters long.
 */
export const PASSWORD_MIN_LENGTH = 12;

/**
 * Password requirement regex patterns
 *
 * These patterns define the character class requirements for passwords.
 * All patterns are compatible with both JavaScript RegExp and Zod schemas.
 */
export const PASSWORD_REQUIREMENTS = {
  /**
   * At least one letter (uppercase OR lowercase)
   *
   * The server validates for any letter, not separate uppercase/lowercase.
   * This matches the business requirement for "at least one letter".
   */
  hasLetter: /[a-zA-Z]/,

  /**
   * At least one number OR special character
   *
   * Accepts digits (0-9) or special characters (!@#$%^&* etc.)
   * User only needs to satisfy ONE of these, not both.
   */
  hasNumberOrSpecial: /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
} as const;

/**
 * Regex source strings for client-side validation
 *
 * These are the source strings of the regex patterns, used when RegExp objects
 * cannot be passed directly (e.g., in Astro's define:vars).
 * MUST be kept in sync with PASSWORD_REQUIREMENTS.
 */
export const PASSWORD_REGEX_SOURCES = {
  hasLetter: PASSWORD_REQUIREMENTS.hasLetter.source,
  hasNumberOrSpecial: PASSWORD_REQUIREMENTS.hasNumberOrSpecial.source,
} as const;

/**
 * Password requirement error messages
 *
 * User-friendly messages displayed when validation fails.
 * These should match the messages shown in the UI.
 */
export const PASSWORD_ERROR_MESSAGES = {
  minLength: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  hasLetter: 'Password must contain at least one letter',
  hasNumberOrSpecial: 'Password must contain at least one number or special character',
  general: `Password must be at least ${PASSWORD_MIN_LENGTH} characters with letters and numbers/special characters`,
} as const;

/**
 * Complete password validation regex
 *
 * Combined pattern that enforces all password requirements:
 * - Minimum length (12+ characters)
 * - At least one letter
 * - At least one number or special character
 *
 * Use this for combined validation when individual feedback isn't needed.
 */
export const PASSWORD_VALID_REGEX =
  /^(?=.*[a-zA-Z])(?=.*[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{12,}$/;

/**
 * Test if a password meets all requirements
 *
 * @param password - The password string to validate
 * @returns true if password meets all requirements, false otherwise
 *
 * @example
 * isPasswordValid('SecureP@ssw0rd'); // true
 * isPasswordValid('password'); // false (no number/special, too short)
 */
export function isPasswordValid(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    PASSWORD_REQUIREMENTS.hasLetter.test(password) &&
    PASSWORD_REQUIREMENTS.hasNumberOrSpecial.test(password)
  );
}

/**
 * Get detailed password validation results
 *
 * Returns individual requirement check results for user feedback.
 *
 * @param password - The password string to validate
 * @returns Object with validation status for each requirement
 *
 * @example
 * const result = getPasswordValidation('Pass1234');
 * // { valid: false, minLength: false, hasLetter: true, hasNumberOrSpecial: true }
 */
export function getPasswordValidation(password: string): {
  valid: boolean;
  minLength: boolean;
  hasLetter: boolean;
  hasNumberOrSpecial: boolean;
} {
  return {
    valid: isPasswordValid(password),
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasLetter: PASSWORD_REQUIREMENTS.hasLetter.test(password),
    hasNumberOrSpecial: PASSWORD_REQUIREMENTS.hasNumberOrSpecial.test(password),
  };
}

/**
 * Password strength calculation
 *
 * Calculates password strength based on met requirements.
 * Returns a strength level for UI display.
 *
 * @param password - The password string to evaluate
 * @returns Strength level: 'weak' | 'medium' | 'strong' | 'none' (if empty)
 *
 * @example
 * getPasswordStrength(''); // 'none'
 * getPasswordStrength('short'); // 'weak'
 * getPasswordStrength('longenoughpassword'); // 'medium'
 * getPasswordStrength('SecureP@ssw0rd'); // 'strong'
 */
export function getPasswordStrength(password: string): 'none' | 'weak' | 'medium' | 'strong' {
  if (password.length === 0) return 'none';

  const validation = getPasswordValidation(password);

  // Count met requirements (excluding 'valid' itself)
  const requirementCount = [
    validation.minLength,
    validation.hasLetter,
    validation.hasNumberOrSpecial,
  ].filter(Boolean).length;

  if (requirementCount <= 1) return 'weak';
  if (requirementCount === 2) return 'medium';
  return 'strong';
}

/**
 * Password examples for testing and documentation
 */
export const PASSWORD_EXAMPLES = {
  valid: [
    'SecureP@ssw0rd',
    'MyPassword123!',
    'Correct-Horse-Battery',
    'L0ng3rP@ssword',
    'lettersAndNumbers123',
  ],
  invalid: {
    tooShort: ['short', 'Pass1!', 'tooShort'],
    noLetter: ['123456789012', '123456789!@#'],
    noNumberOrSpecial: ['longenoughpassword', 'LongEnoughPassword'],
  },
} as const;
