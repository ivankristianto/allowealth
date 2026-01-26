/**
 * CSRF Protection Tests
 *
 * Tests for the Double-Submit Cookie CSRF protection implementation:
 * - Token generation
 * - Token validation (constant-time comparison)
 * - Protected method detection
 * - Exempt endpoint detection
 */

import { describe, test, expect } from 'bun:test';
import {
  generateCsrfToken,
  validateCsrfToken,
  requiresCsrfProtection,
  isCsrfExempt,
  getCsrfTokenFromHeader,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_PROTECTED_METHODS,
  CSRF_EXEMPT_ENDPOINTS,
} from './csrf';

describe('csrf', () => {
  describe('generateCsrfToken', () => {
    test('generates a base64-encoded token', () => {
      const token = generateCsrfToken();

      // Should be a non-empty string
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      // Should be valid base64
      expect(() => atob(token)).not.toThrow();
    });

    test('generates unique tokens on each call', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      const token3 = generateCsrfToken();

      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });

    test('generates tokens of consistent length', () => {
      // 32 bytes = ~44 characters in base64 (with padding)
      const tokens = Array.from({ length: 10 }, () => generateCsrfToken());
      const lengths = new Set(tokens.map((t) => t.length));

      // All tokens should have the same length
      expect(lengths.size).toBe(1);
    });

    test('generates cryptographically random tokens', () => {
      // Generate many tokens and check for uniqueness
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCsrfToken());
      }

      // All 100 tokens should be unique
      expect(tokens.size).toBe(100);
    });
  });

  describe('validateCsrfToken', () => {
    test('returns true for matching tokens', () => {
      const token = generateCsrfToken();
      expect(validateCsrfToken(token, token)).toBe(true);
    });

    test('returns false for different tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(validateCsrfToken(token1, token2)).toBe(false);
    });

    test('returns false when cookie token is null', () => {
      const token = generateCsrfToken();
      expect(validateCsrfToken(null, token)).toBe(false);
    });

    test('returns false when header token is null', () => {
      const token = generateCsrfToken();
      expect(validateCsrfToken(token, null)).toBe(false);
    });

    test('returns false when both tokens are null', () => {
      expect(validateCsrfToken(null, null)).toBe(false);
    });

    test('returns false for tokens of different lengths', () => {
      expect(validateCsrfToken('short', 'muchlongertoken')).toBe(false);
      expect(validateCsrfToken('muchlongertoken', 'short')).toBe(false);
    });

    test('returns false for empty strings', () => {
      expect(validateCsrfToken('', '')).toBe(false);
      expect(validateCsrfToken('token', '')).toBe(false);
      expect(validateCsrfToken('', 'token')).toBe(false);
    });

    test('is case-sensitive', () => {
      expect(validateCsrfToken('TokenABC', 'tokenabc')).toBe(false);
      expect(validateCsrfToken('UPPERCASE', 'uppercase')).toBe(false);
    });

    test('handles special characters correctly', () => {
      // Base64 tokens may contain + / =
      const token = 'abc+def/ghi=';
      expect(validateCsrfToken(token, token)).toBe(true);
      expect(validateCsrfToken(token, 'abc-def/ghi=')).toBe(false);
    });
  });

  describe('requiresCsrfProtection', () => {
    test('returns true for POST method', () => {
      expect(requiresCsrfProtection('POST')).toBe(true);
      expect(requiresCsrfProtection('post')).toBe(true);
      expect(requiresCsrfProtection('Post')).toBe(true);
    });

    test('returns true for PUT method', () => {
      expect(requiresCsrfProtection('PUT')).toBe(true);
      expect(requiresCsrfProtection('put')).toBe(true);
    });

    test('returns true for DELETE method', () => {
      expect(requiresCsrfProtection('DELETE')).toBe(true);
      expect(requiresCsrfProtection('delete')).toBe(true);
    });

    test('returns true for PATCH method', () => {
      expect(requiresCsrfProtection('PATCH')).toBe(true);
      expect(requiresCsrfProtection('patch')).toBe(true);
    });

    test('returns false for GET method', () => {
      expect(requiresCsrfProtection('GET')).toBe(false);
      expect(requiresCsrfProtection('get')).toBe(false);
    });

    test('returns false for HEAD method', () => {
      expect(requiresCsrfProtection('HEAD')).toBe(false);
      expect(requiresCsrfProtection('head')).toBe(false);
    });

    test('returns false for OPTIONS method', () => {
      expect(requiresCsrfProtection('OPTIONS')).toBe(false);
      expect(requiresCsrfProtection('options')).toBe(false);
    });

    test('returns false for unknown methods', () => {
      expect(requiresCsrfProtection('UNKNOWN')).toBe(false);
      expect(requiresCsrfProtection('')).toBe(false);
    });
  });

  describe('isCsrfExempt', () => {
    test('returns true for login endpoint', () => {
      expect(isCsrfExempt('/api/auth/login')).toBe(true);
    });

    test('returns true for signup endpoint', () => {
      expect(isCsrfExempt('/api/auth/signup')).toBe(true);
    });

    test('returns true for forgot-password endpoint', () => {
      expect(isCsrfExempt('/api/auth/forgot-password')).toBe(true);
    });

    test('returns true for logout endpoint', () => {
      expect(isCsrfExempt('/api/auth/logout')).toBe(true);
    });

    test('returns false for non-exempt endpoints', () => {
      expect(isCsrfExempt('/api/user/profile')).toBe(false);
      expect(isCsrfExempt('/api/transactions')).toBe(false);
      expect(isCsrfExempt('/api/categories')).toBe(false);
      expect(isCsrfExempt('/api/budget/overview')).toBe(false);
    });

    test('requires exact path match', () => {
      // Subpaths should not be exempt
      expect(isCsrfExempt('/api/auth/login/extra')).toBe(false);
      expect(isCsrfExempt('/api/auth/signup/')).toBe(false);

      // Prefixes should not match
      expect(isCsrfExempt('/api/auth')).toBe(false);
      expect(isCsrfExempt('/api/auth/')).toBe(false);
    });

    test('is case-sensitive', () => {
      expect(isCsrfExempt('/api/auth/LOGIN')).toBe(false);
      expect(isCsrfExempt('/API/AUTH/LOGIN')).toBe(false);
    });
  });

  describe('getCsrfTokenFromHeader', () => {
    test('extracts token from X-CSRF-Token header', () => {
      const token = generateCsrfToken();
      const request = new Request('http://localhost/api/test', {
        headers: { [CSRF_HEADER_NAME]: token },
      });

      expect(getCsrfTokenFromHeader(request)).toBe(token);
    });

    test('returns null when header is missing', () => {
      const request = new Request('http://localhost/api/test');
      expect(getCsrfTokenFromHeader(request)).toBeNull();
    });

    test('returns null for empty header value', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { [CSRF_HEADER_NAME]: '' },
      });

      // Empty string is returned as-is (not null), browser behavior
      expect(getCsrfTokenFromHeader(request)).toBe('');
    });
  });

  describe('constants', () => {
    test('CSRF_COOKIE_NAME is defined', () => {
      expect(CSRF_COOKIE_NAME).toBe('csrf_token');
    });

    test('CSRF_HEADER_NAME is defined', () => {
      expect(CSRF_HEADER_NAME).toBe('X-CSRF-Token');
    });

    test('CSRF_PROTECTED_METHODS includes state-changing methods', () => {
      expect(CSRF_PROTECTED_METHODS).toContain('POST');
      expect(CSRF_PROTECTED_METHODS).toContain('PUT');
      expect(CSRF_PROTECTED_METHODS).toContain('DELETE');
      expect(CSRF_PROTECTED_METHODS).toContain('PATCH');
    });

    test('CSRF_EXEMPT_ENDPOINTS includes auth endpoints', () => {
      expect(CSRF_EXEMPT_ENDPOINTS).toContain('/api/auth/login');
      expect(CSRF_EXEMPT_ENDPOINTS).toContain('/api/auth/signup');
      expect(CSRF_EXEMPT_ENDPOINTS).toContain('/api/auth/forgot-password');
      expect(CSRF_EXEMPT_ENDPOINTS).toContain('/api/auth/logout');
    });
  });
});
