/**
 * Rate Limiting Tests
 *
 * Tests for the rate limiting module including:
 * - Basic rate limit checking
 * - Sliding window behavior
 * - IP extraction from headers
 * - Response generation
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  checkRateLimit,
  clearRateLimitStore,
  getClientIp,
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
  });

  afterEach(() => {
    stopCleanup();
  });

  describe('getClientIp', () => {
    test('extracts IP from X-Forwarded-For header', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'X-Forwarded-For': '192.168.1.1, 10.0.0.1' },
      });
      expect(getClientIp(request)).toBe('192.168.1.1');
    });

    test('extracts IP from X-Real-IP header', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'X-Real-IP': '192.168.1.2' },
      });
      expect(getClientIp(request)).toBe('192.168.1.2');
    });

    test('extracts IP from CF-Connecting-IP header', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'CF-Connecting-IP': '192.168.1.3' },
      });
      expect(getClientIp(request)).toBe('192.168.1.3');
    });

    test('prefers X-Forwarded-For over other headers', () => {
      const request = new Request('http://localhost/api/test', {
        headers: {
          'X-Forwarded-For': '192.168.1.1',
          'X-Real-IP': '192.168.1.2',
          'CF-Connecting-IP': '192.168.1.3',
        },
      });
      expect(getClientIp(request)).toBe('192.168.1.1');
    });

    test('returns unique identifier when only host header present (security)', () => {
      // Host header is attacker-controlled and shared across users
      // So we return unique identifiers to prevent shared rate limit buckets
      const request = new Request('http://localhost/api/test', {
        headers: { host: 'localhost:3000' },
      });
      const ip = getClientIp(request);
      expect(ip.startsWith('unknown-')).toBe(true);
    });

    test('returns unique identifier when no IP info available', () => {
      const request = new Request('http://localhost/api/test');
      const ip1 = getClientIp(request);
      const ip2 = getClientIp(request);
      // Should return unique identifiers to prevent shared buckets
      expect(ip1.startsWith('unknown-')).toBe(true);
      expect(ip2.startsWith('unknown-')).toBe(true);
      expect(ip1).not.toBe(ip2); // Each call returns unique ID
    });
  });

  describe('checkRateLimit', () => {
    const config: RateLimitConfig = {
      maxRequests: 3,
      windowMs: 60000, // 1 minute
    };

    test('allows requests under the limit', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'X-Forwarded-For': '192.168.1.100' },
      });

      const result1 = checkRateLimit(request, config);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);
      expect(result1.limit).toBe(3);

      const result2 = checkRateLimit(request, config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = checkRateLimit(request, config);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    test('blocks requests over the limit', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'X-Forwarded-For': '192.168.1.101' },
      });

      // Use up all requests
      for (let i = 0; i < 3; i++) {
        checkRateLimit(request, config);
      }

      // Fourth request should be blocked
      const result = checkRateLimit(request, config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('tracks different IPs separately', () => {
      const request1 = new Request('http://localhost/api/test', {
        headers: { 'X-Forwarded-For': '192.168.1.102' },
      });
      const request2 = new Request('http://localhost/api/test', {
        headers: { 'X-Forwarded-For': '192.168.1.103' },
      });

      // Use up all requests for IP 1
      for (let i = 0; i < 3; i++) {
        checkRateLimit(request1, config);
      }

      // IP 1 should be blocked
      expect(checkRateLimit(request1, config).allowed).toBe(false);

      // IP 2 should still be allowed
      expect(checkRateLimit(request2, config).allowed).toBe(true);
    });

    test('respects skip function', () => {
      const configWithSkip: RateLimitConfig = {
        ...config,
        skip: (req) => req.headers.get('X-Skip-RateLimit') === 'true',
      };

      const request = new Request('http://localhost/api/test', {
        headers: {
          'X-Forwarded-For': '192.168.1.104',
          'X-Skip-RateLimit': 'true',
        },
      });

      // Should always be allowed when skip returns true
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(request, configWithSkip);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(3); // Always full limit
      }
    });

    test('uses custom key generator', () => {
      const configWithKey: RateLimitConfig = {
        ...config,
        keyGenerator: (req) => req.headers.get('X-User-Id') || 'anonymous',
      };

      const request1 = new Request('http://localhost/api/test', {
        headers: {
          'X-Forwarded-For': '192.168.1.105',
          'X-User-Id': 'user-123',
        },
      });

      const request2 = new Request('http://localhost/api/test', {
        headers: {
          'X-Forwarded-For': '192.168.1.106', // Different IP
          'X-User-Id': 'user-123', // Same user
        },
      });

      // Both requests count toward the same user
      checkRateLimit(request1, configWithKey);
      checkRateLimit(request2, configWithKey);
      checkRateLimit(request1, configWithKey);

      // User should be at limit now
      expect(checkRateLimit(request2, configWithKey).allowed).toBe(false);
    });

    test('provides correct reset time', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'X-Forwarded-For': '192.168.1.107' },
      });

      const beforeTime = Math.floor(Date.now() / 1000);
      const result = checkRateLimit(request, config);
      const afterTime = Math.floor(Date.now() / 1000);

      // Reset time should be within window
      expect(result.resetTime).toBeGreaterThanOrEqual(beforeTime);
      expect(result.resetTime).toBeLessThanOrEqual(afterTime + 60);
    });

    test('uses clientAddress when provided (trusted IP)', () => {
      // Even if X-Forwarded-For is set, trusted clientAddress should be used
      const request = new Request('http://localhost/api/test', {
        headers: { 'X-Forwarded-For': '1.2.3.4' },
      });

      // With trusted clientAddress, this IP is used
      checkRateLimit(request, config, '192.168.1.200');
      checkRateLimit(request, config, '192.168.1.200');
      checkRateLimit(request, config, '192.168.1.200');

      // Same clientAddress should be rate limited
      expect(checkRateLimit(request, config, '192.168.1.200').allowed).toBe(false);

      // Different clientAddress should be allowed
      expect(checkRateLimit(request, config, '192.168.1.201').allowed).toBe(true);
    });

    test('includes endpoint in default key', () => {
      const request1 = new Request('http://localhost/api/login', {
        headers: { 'X-Forwarded-For': '192.168.1.210' },
      });
      const request2 = new Request('http://localhost/api/signup', {
        headers: { 'X-Forwarded-For': '192.168.1.210' },
      });

      // Use up limit on login endpoint
      for (let i = 0; i < 3; i++) {
        checkRateLimit(request1, config);
      }

      // Login should be blocked
      expect(checkRateLimit(request1, config).allowed).toBe(false);

      // Signup should still be allowed (different endpoint)
      expect(checkRateLimit(request2, config).allowed).toBe(true);
    });

    test('allows requests after window expires (sliding window)', async () => {
      const shortConfig: RateLimitConfig = {
        maxRequests: 2,
        windowMs: 100, // 100ms window for testing
      };

      const request = new Request('http://localhost/api/test', {
        headers: { 'X-Forwarded-For': '192.168.1.220' },
      });

      // Exhaust limit
      checkRateLimit(request, shortConfig);
      checkRateLimit(request, shortConfig);
      expect(checkRateLimit(request, shortConfig).allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be allowed again
      expect(checkRateLimit(request, shortConfig).allowed).toBe(true);
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
