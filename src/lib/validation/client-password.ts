/**
 * Client-side Password Validation
 *
 * Client-side password validation utility that matches server-side validation rules.
 * This ensures consistent validation across all layers (client/server/UI).
 *
 * @module lib/validation/client-password
 */

import { PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS, PASSWORD_ERROR_MESSAGES } from './password';

/**
 * Client-side password validation
 *
 * Matches server-side validation in src/lib/validation/password.ts
 *
 * Requirements:
 * - At least 12 characters long
 * - Contains at least one letter (uppercase or lowercase)
 * - Contains at least one number OR special character
 *
 * @param password - Password string to validate
 * @returns Array of error messages (empty if valid)
 *
 * @example
 * validatePasswordClient('mypassword123'); // [] (valid)
 * validatePasswordClient('short'); // ['Password must be at least 12 characters', ...]
 */
export function validatePasswordClient(password: string): string[] {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(PASSWORD_ERROR_MESSAGES.minLength);
  }

  if (!PASSWORD_REQUIREMENTS.hasLetter.test(password)) {
    errors.push(PASSWORD_ERROR_MESSAGES.hasLetter);
  }

  if (!PASSWORD_REQUIREMENTS.hasNumberOrSpecial.test(password)) {
    errors.push(PASSWORD_ERROR_MESSAGES.hasNumberOrSpecial);
  }

  return errors;
}

/**
 * Check if password meets all requirements
 *
 * @param password - Password string to validate
 * @returns true if password meets all requirements, false otherwise
 *
 * @example
 * isPasswordValid('mypassword123'); // true
 * isPasswordValid('short'); // false
 */
export function isPasswordValid(password: string): boolean {
  return validatePasswordClient(password).length === 0;
}
