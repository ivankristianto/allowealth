/**
 * Unit tests for Lucia Auth configuration
 */

import { describe, it, expect } from 'bun:test';
import { auth } from './lucia';

describe('Lucia Auth Configuration', () => {
  it('should export auth instance', () => {
    expect(auth).toBeDefined();
    expect(typeof auth).toBe('object');
  });

  it('should have session cookie configuration', () => {
    // Lucia's auth instance should have createSessionCookie method
    expect(typeof auth.createSessionCookie).toBe('function');
    expect(typeof auth.createBlankSessionCookie).toBe('function');
  });

  it('should have session and user methods', () => {
    // Lucia's auth instance should have these core methods
    expect(typeof auth.createSession).toBe('function');
    expect(typeof auth.validateSession).toBe('function');
    expect(typeof auth.invalidateSession).toBe('function');
  });

  it('should have sameSite lax attribute', () => {
    // Create a test session cookie to check sameSite attribute
    const testSessionId = 'test-session-id';
    const cookie = auth.createSessionCookie(testSessionId);
    const cookieString = cookie.serialize();

    // Cookie should have SameSite=Lax attribute
    expect(cookieString).toContain('SameSite=Lax');
  });

  it('should have httpOnly attribute', () => {
    // Create a test session cookie to check httpOnly attribute
    const testSessionId = 'test-session-id';
    const cookie = auth.createSessionCookie(testSessionId);
    const cookieString = cookie.serialize();

    // Cookie should have HttpOnly attribute
    expect(cookieString).toContain('HttpOnly');
  });

  it('should have maxAge of 30 days', () => {
    // Create a test session cookie to check maxAge
    const testSessionId = 'test-session-id';
    const cookie = auth.createSessionCookie(testSessionId);
    const cookieString = cookie.serialize();

    // Cookie should have Max-Age=2592000 (30 days in seconds)
    expect(cookieString).toContain('Max-Age=2592000');
  });
});
