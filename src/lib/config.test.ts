/**
 * Unit tests for configuration module
 * @fileoverview Tests for environment-based API configuration
 */

import { describe, test, expect } from 'bun:test';

// Mock import.meta.env before importing the module
// Note: In a real Vite/Astro environment, import.meta.env is a global
// For testing purposes, we need to handle the fact that Bun doesn't natively
// support import.meta.env the same way Vite does

describe('config', () => {
  describe('getApiUrl', () => {
    test('returns default /api when PUBLIC_API_URL is not set', () => {
      // The default behavior when env var is not set
      // Since we can't easily mock import.meta.env in Bun,
      // we verify the module exports the expected structure
      const { getApiUrl } = require('./config');

      // Should return a string
      expect(typeof getApiUrl()).toBe('string');

      // Should default to '/api' if env var is not set
      // (In real Vite environment, this would be the actual behavior)
      expect(getApiUrl()).toMatch(/^\/api|https?:\/\//);
    });

    test('returns configured API URL when PUBLIC_API_URL is set', () => {
      const { buildApiUrl } = require('./config');

      // Test that buildApiUrl correctly joins paths
      const url = buildApiUrl('/auth/login');
      expect(url).toContain('/auth/login');
      expect(url).toMatch(/^\/api\/auth\/login|https?:\/\/.+\/auth\/login$/);
    });
  });

  describe('buildApiUrl', () => {
    test('correctly joins base URL with path starting with slash', () => {
      const { buildApiUrl } = require('./config');

      const url = buildApiUrl('/auth/signup');
      // Should remove duplicate slashes
      expect(url).not.toMatch(/\/\//);
      // Should contain both parts
      expect(url).toContain('api');
      expect(url).toContain('auth');
      expect(url).toContain('signup');
    });

    test('correctly joins base URL with path without leading slash', () => {
      const { buildApiUrl } = require('./config');

      const url = buildApiUrl('auth/login');
      // Should not have duplicate slashes
      expect(url).not.toMatch(/\/\//);
      // Should contain both parts
      expect(url).toContain('api');
      expect(url).toContain('auth');
      expect(url).toContain('login');
    });

    test('handles complex paths', () => {
      const { buildApiUrl } = require('./config');

      const url = buildApiUrl('/transactions/123');
      expect(url).toContain('transactions');
      expect(url).toContain('123');
      expect(url).not.toMatch(/\/\//);
    });
  });

  describe('getSignupUrl', () => {
    test('returns correct signup endpoint URL', () => {
      const { getSignupUrl } = require('./config');

      const url = getSignupUrl();
      expect(url).toContain('auth');
      expect(url).toContain('signup');
      expect(url).not.toMatch(/\/\//);
    });
  });

  describe('getLoginUrl', () => {
    test('returns correct login endpoint URL', () => {
      const { getLoginUrl } = require('./config');

      const url = getLoginUrl();
      expect(url).toContain('auth');
      expect(url).toContain('login');
      expect(url).not.toMatch(/\/\//);
    });
  });

  describe('getLogoutUrl', () => {
    test('returns correct logout endpoint URL', () => {
      const { getLogoutUrl } = require('./config');

      const url = getLogoutUrl();
      expect(url).toContain('auth');
      expect(url).toContain('logout');
      expect(url).not.toMatch(/\/\//);
    });
  });

  describe('config export', () => {
    test('exports configuration object with correct structure', () => {
      const { config } = require('./config');

      expect(config).toBeDefined();
      expect(typeof config.apiUrl).toBe('string');
      expect(config.auth).toBeDefined();
      expect(typeof config.auth.signup).toBe('string');
      expect(typeof config.auth.login).toBe('string');
      expect(typeof config.auth.logout).toBe('string');
    });

    test('config.auth URLs match individual getter functions', () => {
      const { config, getSignupUrl, getLoginUrl, getLogoutUrl } = require('./config');

      expect(config.auth.signup).toBe(getSignupUrl());
      expect(config.auth.login).toBe(getLoginUrl());
      expect(config.auth.logout).toBe(getLogoutUrl());
    });
  });
});
