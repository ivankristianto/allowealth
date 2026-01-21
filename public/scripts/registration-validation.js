/**
 * Client-side validation for registration forms
 *
 * Shared validation functions used by registration page and form component.
 * This module exports global functions for use in inline scripts.
 *
 * WARNING: Password validation constants MUST be kept in sync with:
 * - src/lib/validation/password.ts
 * - src/lib/client-validation.ts
 *
 * When updating password requirements, update ALL THREE files.
 */

(function () {
  'use strict';

  // Password validation constants
  // These values MUST match src/lib/validation/password.ts
  const PASSWORD_MIN_LENGTH = 12;
  const HAS_LETTER_REGEX = /[A-Za-z]/;
  const HAS_NUMBER_OR_SPECIAL_REGEX = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

  /**
   * Validates name field
   * @param {string} name - The name to validate
   * @returns {string} Error message if invalid, empty string if valid
   */
  function validateName(name) {
    if (!name || name.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    return '';
  }

  /**
   * Validates email field using HTML5 validation
   * @param {string} email - The email to validate
   * @param {HTMLInputElement|null} emailInput - The HTML input element for email
   * @returns {string} Error message if invalid, empty string if valid
   */
  function validateEmail(email, emailInput) {
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
   * Requirements: 12+ chars, at least one letter, at least one number OR special char
   * @param {string} password - The password to validate
   * @returns {string[]} Array of password error messages (empty if valid)
   */
  function validatePasswordRequirements(password) {
    const passwordErrors = [];

    if (password.length < PASSWORD_MIN_LENGTH) {
      passwordErrors.push(`at least ${PASSWORD_MIN_LENGTH} characters`);
    }

    if (!HAS_LETTER_REGEX.test(password)) {
      passwordErrors.push('at least one letter');
    }

    if (!HAS_NUMBER_OR_SPECIAL_REGEX.test(password)) {
      passwordErrors.push('at least one number or special character');
    }

    return passwordErrors;
  }

  /**
   * Validates password field
   * @param {string} password - The password to validate
   * @returns {string} Error message if invalid, empty string if valid
   */
  function validatePassword(password) {
    const passwordErrors = validatePasswordRequirements(password);
    if (passwordErrors.length > 0) {
      return `Password must include ${passwordErrors.join(', ')}`;
    }
    return '';
  }

  /**
   * Validates password confirmation
   * @param {string} password - The password to validate
   * @param {string} confirmPassword - The confirmation password to validate
   * @returns {string} Error message if invalid, empty string if valid
   */
  function validatePasswordMatch(password, confirmPassword) {
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return '';
  }

  /**
   * Validates the entire registration form
   * @param {Object} data - Form data object
   * @param {string} data.name - The name to validate
   * @param {string} data.email - The email to validate
   * @param {string} data.password - The password to validate
   * @param {string} data.confirm-password - The confirmation password to validate
   * @param {HTMLInputElement|null} emailInput - The HTML email input element
   * @returns {{isValid: boolean, errors: string[]}} ValidationResult with isValid flag and errors array
   */
  function validateRegistrationForm(data, emailInput) {
    const errors = [];

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
   * @param {string[]} errors - Array of error messages
   * @returns {string} HTML string for error alert
   */
  function renderValidationErrors(errors) {
    const escapeHtml = (text) => {
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
   * @param {string} text - The text to escape
   * @returns {string} Escaped HTML string
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Export functions to global scope for use in inline scripts
  window.RegistrationValidation = {
    validateName,
    validateEmail,
    validatePasswordRequirements,
    validatePassword,
    validatePasswordMatch,
    validateRegistrationForm,
    renderValidationErrors,
    escapeHtml,
  };
})();
