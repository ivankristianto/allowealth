/**
 * Client-Side Validation Utilities
 *
 * Shared client-side validation functions for form validation.
 * These functions are designed to work in browser contexts and match
 * server-side validation rules to ensure consistent user experience.
 *
 * NOTE: These utilities are imported by Astro components which run
 * server-side, but the validation functions are used in client-side
 * <script> tags where they have browser APIs available (like checkValidity).
 *
 * WARNING: This file serves as the TypeScript reference implementation.
 * The JavaScript version at public/scripts/registration-validation.js
 * MUST be kept in sync with this file. When updating validation logic,
 * update BOTH files.
 */

import { PASSWORD_MIN_LENGTH, PASSWORD_REGEX_SOURCES } from './validation';

/**
 * Result of form validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates name field
 * @param name - The name to validate
 * @returns Error message if invalid, empty string if valid
 */
export function validateName(name: string): string {
  if (!name || name.trim().length < 2) {
    return 'Name must be at least 2 characters';
  }
  return '';
}

/**
 * Validates email field
 * @param email - The email to validate
 * @param emailInput - The HTML input element for email (for checkValidity)
 * @returns Error message if invalid, empty string if valid
 */
export function validateEmail(email: string, emailInput: HTMLInputElement | null): string {
  if (!email) {
    return 'Please enter a valid email address';
  }
  if (emailInput && !emailInput.checkValidity()) {
    return 'Please enter a valid email address';
  }
  return '';
}

/**
 * Validates password requirements
 * Requirements:
 * - At least 12 characters long
 * - Contains at least one letter (uppercase or lowercase)
 * - Contains at least one number OR special character
 *
 * @param password - The password to validate
 * @returns Array of password error messages (empty if valid)
 */
export function validatePasswordRequirements(password: string): string[] {
  const passwordErrors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    passwordErrors.push(`at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  const hasLetterPattern = new RegExp(PASSWORD_REGEX_SOURCES.hasLetter);
  const hasNumberOrSpecialPattern = new RegExp(PASSWORD_REGEX_SOURCES.hasNumberOrSpecial);

  if (!hasLetterPattern.test(password)) {
    passwordErrors.push('at least one letter');
  }

  if (!hasNumberOrSpecialPattern.test(password)) {
    passwordErrors.push('at least one number or special character');
  }

  return passwordErrors;
}

/**
 * Validates password field
 * @param password - The password to validate
 * @returns Error message if invalid, empty string if valid
 */
export function validatePassword(password: string): string {
  const passwordErrors = validatePasswordRequirements(password);
  if (passwordErrors.length > 0) {
    return `Password must include ${passwordErrors.join(', ')}`;
  }
  return '';
}

/**
 * Validates password confirmation
 * @param password - The password to validate
 * @param confirmPassword - The confirmation password to validate
 * @returns Error message if invalid, empty string if valid
 */
export function validatePasswordMatch(password: string, confirmPassword: string): string {
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return '';
}

/**
 * Validates the entire registration form
 *
 * @param data - Form data object with name, email, password, confirm-password
 * @param emailInput - The HTML email input element (for checkValidity)
 * @returns ValidationResult with isValid flag and array of error messages
 */
export function validateRegistrationForm(
  data: { name: string; email: string; password: string; 'confirm-password': string },
  emailInput: HTMLInputElement | null
): ValidationResult {
  const errors: string[] = [];

  // Validate name
  const nameError = validateName(data.name);
  if (nameError) {
    errors.push(nameError);
  }

  // Validate email format
  const emailError = validateEmail(data.email, emailInput);
  if (emailError) {
    errors.push(emailError);
  }

  // Validate password requirements
  const passwordError = validatePassword(data.password);
  if (passwordError) {
    errors.push(passwordError);
  }

  // Validate password match
  const matchError = validatePasswordMatch(data.password, data['confirm-password']);
  if (matchError) {
    errors.push(matchError);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Renders validation errors into an HTML string for alert display
 * @param errors - Array of error messages
 * @returns HTML string for error alert
 */
export function renderValidationErrors(errors: string[]): string {
  // Escape HTML to prevent XSS
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  return `
    <div role="alert" class="alert alert-error">
      <svg xmlns="http://www.w3.org/2000/svg" class="shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="m15 9-6 6"></path>
        <path d="m9 9 6 6"></path>
      </svg>
      <div>
        <h3 class="font-bold">Please fix the following errors:</h3>
        <ul class="text-xs mt-1 list-disc list-inside">
          ${errors.map((err) => `<li>${escapeHtml(err)}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

/**
 * HTML escaping utility to prevent XSS
 * @param text - The text to escape
 * @returns Escaped HTML string
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Global type declaration for the RegistrationValidation object
 * injected by public/scripts/registration-validation.js
 */
declare global {
  interface Window {
    RegistrationValidation: {
      validateName(name: string): string;
      validateEmail(email: string, emailInput: HTMLInputElement | null): string;
      validatePasswordRequirements(password: string): string[];
      validatePassword(password: string): string;
      validatePasswordMatch(password: string, confirmPassword: string): string;
      validateRegistrationForm(
        data: { name: string; email: string; password: string; 'confirm-password': string },
        emailInput: HTMLInputElement | null
      ): { isValid: boolean; errors: string[] };
      renderValidationErrors(errors: string[]): string;
      escapeHtml(text: string): string;
    };
  }
}

// Ensure this is treated as a module
export {};
