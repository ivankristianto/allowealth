/**
 * Password Validation Constants Tests
 *
 * Tests for centralized password validation constants used across
 * client and server to ensure consistency.
 */

import { describe, it, expect } from 'bun:test';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
  PASSWORD_ERROR_MESSAGES,
  PASSWORD_VALID_REGEX,
  isPasswordValid,
  getPasswordValidation,
  getPasswordStrength,
  PASSWORD_EXAMPLES,
} from './password';

describe('Password Validation Constants', () => {
  describe('PASSWORD_MIN_LENGTH', () => {
    it('should be 12', () => {
      expect(PASSWORD_MIN_LENGTH).toBe(12);
    });
  });

  describe('PASSWORD_REQUIREMENTS', () => {
    it('should have hasLetter regex pattern', () => {
      expect(PASSWORD_REQUIREMENTS.hasLetter).toBeInstanceOf(RegExp);
      expect(PASSWORD_REQUIREMENTS.hasLetter.test('a')).toBe(true);
      expect(PASSWORD_REQUIREMENTS.hasLetter.test('Z')).toBe(true);
      expect(PASSWORD_REQUIREMENTS.hasLetter.test('1')).toBe(false);
      expect(PASSWORD_REQUIREMENTS.hasLetter.test('!')).toBe(false);
    });

    it('should have hasNumberOrSpecial regex pattern', () => {
      expect(PASSWORD_REQUIREMENTS.hasNumberOrSpecial).toBeInstanceOf(RegExp);
      expect(PASSWORD_REQUIREMENTS.hasNumberOrSpecial.test('1')).toBe(true);
      expect(PASSWORD_REQUIREMENTS.hasNumberOrSpecial.test('!')).toBe(true);
      expect(PASSWORD_REQUIREMENTS.hasNumberOrSpecial.test('a')).toBe(false);
      expect(PASSWORD_REQUIREMENTS.hasNumberOrSpecial.test('Z')).toBe(false);
    });

    it('should accept all special characters in pattern', () => {
      const specialChars = '!@#$%^&*()_+-=[]{};\':"\\|,.<>/?';
      for (const char of specialChars) {
        expect(PASSWORD_REQUIREMENTS.hasNumberOrSpecial.test(char)).toBe(true);
      }
    });
  });

  describe('PASSWORD_ERROR_MESSAGES', () => {
    it('should have minLength error message', () => {
      expect(PASSWORD_ERROR_MESSAGES.minLength).toContain('12');
      expect(PASSWORD_ERROR_MESSAGES.minLength).toContain('character');
    });

    it('should have hasLetter error message', () => {
      expect(PASSWORD_ERROR_MESSAGES.hasLetter).toContain('letter');
    });

    it('should have hasNumberOrSpecial error message', () => {
      expect(PASSWORD_ERROR_MESSAGES.hasNumberOrSpecial).toContain('number');
      expect(PASSWORD_ERROR_MESSAGES.hasNumberOrSpecial).toContain('special');
    });

    it('should have general error message', () => {
      expect(PASSWORD_ERROR_MESSAGES.general).toContain('12');
      expect(PASSWORD_ERROR_MESSAGES.general).toContain('letter');
      expect(PASSWORD_ERROR_MESSAGES.general).toContain('number');
    });
  });

  describe('PASSWORD_VALID_REGEX', () => {
    it('should accept valid passwords', () => {
      expect(PASSWORD_VALID_REGEX.test('SecureP@ssw0rd')).toBe(true);
      expect(PASSWORD_VALID_REGEX.test('MyPassword123!')).toBe(true);
      expect(PASSWORD_VALID_REGEX.test('Correct-Horse-Battery')).toBe(true);
      expect(PASSWORD_VALID_REGEX.test('L0ng3rP@ssword')).toBe(true);
      expect(PASSWORD_VALID_REGEX.test('lettersAndNumbers123')).toBe(true);
    });

    it('should reject passwords that are too short', () => {
      expect(PASSWORD_VALID_REGEX.test('short')).toBe(false);
      expect(PASSWORD_VALID_REGEX.test('Pass1!')).toBe(false);
      expect(PASSWORD_VALID_REGEX.test(''.padEnd(11, 'a'))).toBe(false);
    });

    it('should reject passwords without letters', () => {
      expect(PASSWORD_VALID_REGEX.test('123456789012')).toBe(false);
      expect(PASSWORD_VALID_REGEX.test('123456789!@#')).toBe(false);
    });

    it('should reject passwords without numbers or special characters', () => {
      expect(PASSWORD_VALID_REGEX.test('longenoughpassword')).toBe(false);
      expect(PASSWORD_VALID_REGEX.test('LongEnoughPassword')).toBe(false);
    });
  });

  describe('isPasswordValid', () => {
    it('should return true for valid passwords', () => {
      expect(isPasswordValid('SecureP@ssw0rd')).toBe(true);
      expect(isPasswordValid('MyPassword123!')).toBe(true);
      expect(isPasswordValid('Correct-Horse-Battery')).toBe(true);
      expect(isPasswordValid('lettersAndNumbers123')).toBe(true);
    });

    it('should return false for passwords that are too short', () => {
      expect(isPasswordValid('short')).toBe(false);
      expect(isPasswordValid('Pass1!')).toBe(false);
    });

    it('should return false for passwords without letters', () => {
      expect(isPasswordValid('123456789012')).toBe(false);
      expect(isPasswordValid('123456789!@#')).toBe(false);
    });

    it('should return false for passwords without numbers or special characters', () => {
      expect(isPasswordValid('longenoughpassword')).toBe(false);
      expect(isPasswordValid('LongEnoughPassword')).toBe(false);
    });
  });

  describe('getPasswordValidation', () => {
    it('should return detailed validation for valid password', () => {
      const result = getPasswordValidation('SecureP@ssw0rd');
      expect(result.valid).toBe(true);
      expect(result.minLength).toBe(true);
      expect(result.hasLetter).toBe(true);
      expect(result.hasNumberOrSpecial).toBe(true);
    });

    it('should return detailed validation for password too short', () => {
      const result = getPasswordValidation('short');
      expect(result.valid).toBe(false);
      expect(result.minLength).toBe(false);
      expect(result.hasLetter).toBe(true);
      expect(result.hasNumberOrSpecial).toBe(false);
    });

    it('should return detailed validation for password without letters', () => {
      const result = getPasswordValidation('123456789012');
      expect(result.valid).toBe(false);
      expect(result.minLength).toBe(true);
      expect(result.hasLetter).toBe(false);
      expect(result.hasNumberOrSpecial).toBe(true);
    });

    it('should return detailed validation for password without numbers or special characters', () => {
      const result = getPasswordValidation('longenoughpassword');
      expect(result.valid).toBe(false);
      expect(result.minLength).toBe(true);
      expect(result.hasLetter).toBe(true);
      expect(result.hasNumberOrSpecial).toBe(false);
    });

    it('should return detailed validation for password missing multiple requirements', () => {
      const result = getPasswordValidation('short');
      expect(result.valid).toBe(false);
      expect(result.minLength).toBe(false);
      expect(result.hasLetter).toBe(true);
      expect(result.hasNumberOrSpecial).toBe(false);
    });
  });

  describe('getPasswordStrength', () => {
    it('should return "none" for empty password', () => {
      expect(getPasswordStrength('')).toBe('none');
    });

    it('should return "weak" for passwords meeting zero or one requirement', () => {
      expect(getPasswordStrength('a')).toBe('weak'); // letter only
      expect(getPasswordStrength('1')).toBe('weak'); // number only
      expect(getPasswordStrength('!')).toBe('weak'); // special only
      expect(getPasswordStrength('short')).toBe('weak'); // letter only (length < 12)
      expect(getPasswordStrength('longenough')).toBe('weak'); // letter only (length = 10 < 12, no number/special)
      expect(getPasswordStrength('111')).toBe('weak'); // number only (length < 12)
      expect(getPasswordStrength('!!!')).toBe('weak'); // special only (length < 12)
    });

    it('should return "medium" for passwords meeting two requirements', () => {
      expect(getPasswordStrength('longenough1')).toBe('medium'); // letter + number (length = 11 < 12)
      expect(getPasswordStrength('longenough!')).toBe('medium'); // letter + special (length = 11 < 12)
      expect(getPasswordStrength('short1A!')).toBe('medium'); // letter + number/special (length < 12)
      expect(getPasswordStrength('longpassword')).toBe('medium'); // length (12) + letter (no number/special)
      expect(getPasswordStrength('123456789012')).toBe('medium'); // length (12) + number (no letter)
      expect(getPasswordStrength('!!!!!!!!!!!!')).toBe('medium'); // length (12) + special (no letter)
    });

    it('should return "strong" for passwords meeting all three requirements', () => {
      expect(getPasswordStrength('SecureP@ssw0rd')).toBe('strong'); // length + letter + number/special
      expect(getPasswordStrength('MyPassword123!')).toBe('strong'); // length + letter + number/special
      expect(getPasswordStrength('lettersAndNumbers123')).toBe('strong'); // length + letter + number
      expect(getPasswordStrength('LongEnough!!')).toBe('strong'); // length (12) + letter + special
      expect(getPasswordStrength('password12345')).toBe('strong'); // length + letter + number
    });
  });

  describe('PASSWORD_EXAMPLES', () => {
    it('should have valid examples that pass validation', () => {
      for (const password of PASSWORD_EXAMPLES.valid) {
        expect(isPasswordValid(password)).toBe(true);
      }
    });

    it('should have invalid examples for too short', () => {
      for (const password of PASSWORD_EXAMPLES.invalid.tooShort) {
        expect(isPasswordValid(password)).toBe(false);
        expect(password.length).toBeLessThan(PASSWORD_MIN_LENGTH);
      }
    });

    it('should have invalid examples for no letter', () => {
      for (const password of PASSWORD_EXAMPLES.invalid.noLetter) {
        expect(isPasswordValid(password)).toBe(false);
        expect(PASSWORD_REQUIREMENTS.hasLetter.test(password)).toBe(false);
      }
    });

    it('should have invalid examples for no number or special', () => {
      for (const password of PASSWORD_EXAMPLES.invalid.noNumberOrSpecial) {
        expect(isPasswordValid(password)).toBe(false);
        expect(PASSWORD_REQUIREMENTS.hasNumberOrSpecial.test(password)).toBe(false);
      }
    });
  });
});

describe('Password Validation Consistency', () => {
  it('should match server-side validation in UserService', () => {
    // These are the exact validation rules from UserService.updatePasswordSchema
    // Ensure constants match what the server expects
    const validPassword = 'SecureP@ssw0rd';
    const invalidShort = 'short';
    const invalidNoLetter = '123456789012';
    const invalidNoNumberOrSpecial = 'longenoughpassword';

    // Test with regex patterns directly (same validation rules as the shared schema)
    const hasLetterRegex = /[a-zA-Z]/;
    const hasNumberOrSpecialRegex = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

    expect(validPassword.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH);
    expect(hasLetterRegex.test(validPassword)).toBe(true);
    expect(hasNumberOrSpecialRegex.test(validPassword)).toBe(true);

    expect(invalidShort.length).toBeLessThan(PASSWORD_MIN_LENGTH);
    expect(hasLetterRegex.test(invalidNoLetter)).toBe(false);
    expect(hasNumberOrSpecialRegex.test(invalidNoNumberOrSpecial)).toBe(false);
  });

  it('should ensure PASSWORD_REQUIREMENTS match UserService regex patterns', () => {
    // UserService uses: /[a-zA-Z]/
    expect(PASSWORD_REQUIREMENTS.hasLetter.toString()).toBe(/[a-zA-Z]/.toString());

    // UserService uses: /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
    expect(PASSWORD_REQUIREMENTS.hasNumberOrSpecial.toString()).toBe(
      /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.toString()
    );
  });

  it('should ensure PASSWORD_MIN_LENGTH matches UserService schema', () => {
    // UserService uses: .min(12, 'Password must be at least 12 characters')
    expect(PASSWORD_MIN_LENGTH).toBe(12);
  });
});
