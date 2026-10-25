/**
 * Rate Limiting Tests
 *
 * Tests for the rate limiting module including:
 * - Basic rate limit checking
 * - Sliding window behavior
 * - Response generation
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'bun:test';
import {
  checkRateLimitByKey,
  clearRateLimitStore,
  createRateLimitResponse,
  applyRateLimitHeaders,
  startCleanup,
  stopCleanup,
  type RateLimitConfig,
} from './rate-limit';

describe('rate-limit', () => {
  beforeEach(() => {
    // Clear rate limit store before each test
    clearRateLimitStore();
    // Stop any running cleanup
    stopCleanup();
    // Enable fake timers for deterministic timing tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopCleanup();
    // Restore real timers
    vi.useRealTimers();
  });

  describe('checkRateLimitByKey', () => {
    const config: RateLimitConfig = {
      maxRequests: 3,
      windowMs: 60000, // 1 minute
    };

    test('allows requests under the limit', () => {
      const result1 = checkRateLimitByKey('resend:a@example.com', config);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);
      expect(result1.limit).toBe(3);

      const result2 = checkRateLimitByKey('resend:a@example.com', config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = checkRateLimitByKey('resend:a@example.com', config);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    test('blocks requests over the limit', () => {
      for (let i = 0; i < 3; i++) {
        checkRateLimitByKey('resend:b@example.com', config);
      }

      const result = checkRateLimitByKey('resend:b@example.com', config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('tracks different keys separately', () => {
      for (let i = 0; i < 3; i++) {
        checkRateLimitByKey('resend:c@example.com', config);
      }

      expect(checkRateLimitByKey('resend:c@example.com', config).allowed).toBe(false);
      expect(checkRateLimitByKey('resend:d@example.com', config).allowed).toBe(true);
    });

    test('provides correct reset time', () => {
      const beforeTime = Math.floor(Date.now() / 1000);
      const result = checkRateLimitByKey('resend:e@example.com', config);
      const afterTime = Math.floor(Date.now() / 1000);

      expect(result.resetTime).toBeGreaterThanOrEqual(beforeTime);
      expect(result.resetTime).toBeLessThanOrEqual(afterTime + 60);
    });

    test('allows requests after window expires (sliding window)', () => {
      const shortConfig: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 100, // 100ms window for testing
      };

      checkRateLimitByKey('resend:f@example.com', shortConfig);
      checkRateLimitByKey('resend:f@example.com', shortConfig);
      expect(checkRateLimitByKey('resend:f@example.com', shortConfig).allowed).toBe(false);

      vi.advanceTimersByTime(150);

      expect(checkRateLimitByKey('resend:f@example.com', shortConfig).allowed).toBe(true);
    });
  });

  describe('createRateLimitResponse', () => {
    test('creates 429 response with correct body', async () => {
      const result = {
        allowed: false,
        remaining: 0,
        limit: 5,
        resetTime: Math.floor(Date.now() / 1000) + 60,
        retryAfter: 60,
      };

      const response = createRateLimitResponse(result);

      expect(response.status).toBe(429);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.error.retryAfter).toBe(60);
    });

    test('includes rate limit headers', () => {
      const result = {
        allowed: false,
        remaining: 0,
        limit: 5,
        resetTime: 1234567890,
        retryAfter: 60,
      };

      const response = createRateLimitResponse(result);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('X-RateLimit-Reset')).toBe('1234567890');
      expect(response.headers.get('Retry-After')).toBe('60');
    });

    test('uses custom message', async () => {
      const result = {
        allowed: false,
        remaining: 0,
        limit: 5,
        resetTime: 1234567890,
        retryAfter: 60,
      };

      const response = createRateLimitResponse(result, 'Custom rate limit message');
      const body = await response.json();

      expect(body.error.message).toBe('Custom rate limit message');
    });
  });

  describe('applyRateLimitHeaders', () => {
    test('adds rate limit headers to response', () => {
      const originalResponse = new Response('OK', { status: 200 });
      const result = {
        allowed: true,
        remaining: 4,
        limit: 5,
        resetTime: 1234567890,
        retryAfter: 0,
      };

      const response = applyRateLimitHeaders(originalResponse, result);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('4');
      expect(response.headers.get('X-RateLimit-Reset')).toBe('1234567890');
      expect(response.headers.get('Retry-After')).toBeNull(); // Not set when allowed
    });

    test('preserves original response properties', async () => {
      const originalResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 201,
        statusText: 'Created',
        headers: { 'Content-Type': 'application/json', 'X-Custom': 'value' },
      });

      const result = {
        allowed: true,
        remaining: 4,
        limit: 5,
        resetTime: 1234567890,
        retryAfter: 0,
      };

      const response = applyRateLimitHeaders(originalResponse, result);

      expect(response.status).toBe(201);
      expect(response.statusText).toBe('Created');
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('X-Custom')).toBe('value');

      const body = await response.json();
      expect(body.data).toBe('test');
    });

    test('adds Retry-After when not allowed', () => {
      const originalResponse = new Response('OK', { status: 200 });
      const result = {
        allowed: false,
        remaining: 0,
        limit: 5,
        resetTime: 1234567890,
        retryAfter: 120,
      };

      const response = applyRateLimitHeaders(originalResponse, result);

      expect(response.headers.get('Retry-After')).toBe('120');
    });
  });

  describe('cleanup', () => {
    test('startCleanup and stopCleanup work correctly', () => {
      // Should not throw
      expect(() => startCleanup(1000)).not.toThrow();
      expect(() => stopCleanup()).not.toThrow();
      // Calling again should be safe
      expect(() => stopCleanup()).not.toThrow();
    });
  });
});
