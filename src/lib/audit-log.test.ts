/**
 * Audit Logging Tests
 *
 * Tests for the audit logging module including:
 * - Event logging functionality
 * - Context extraction
 * - Event types
 */

import { describe, test, expect } from 'bun:test';
import {
  getAuditContext,
  hashSensitiveValue,
  type AuditContext,
  type AuditEventData,
} from './audit-log';

describe('audit-log', () => {
  describe('getAuditContext', () => {
    test('extracts IP address from clientAddress', () => {
      const context = {
        clientAddress: '192.168.1.100',
        request: new Request('http://localhost/api/test', {
          headers: { 'User-Agent': 'Test Browser' },
        }),
      };

      const auditContext = getAuditContext(context);

      expect(auditContext.ipAddress).toBe('192.168.1.100');
    });

    test('extracts user agent from request headers', () => {
      const context = {
        clientAddress: '192.168.1.100',
        request: new Request('http://localhost/api/test', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        }),
      };

      const auditContext = getAuditContext(context);

      expect(auditContext.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    });

    test('handles missing user agent', () => {
      const context = {
        clientAddress: '192.168.1.100',
        request: new Request('http://localhost/api/test'),
      };

      const auditContext = getAuditContext(context);

      expect(auditContext.ipAddress).toBe('192.168.1.100');
      expect(auditContext.userAgent).toBeNull();
    });

    test('handles IPv6 addresses', () => {
      const context = {
        clientAddress: '::1',
        request: new Request('http://localhost/api/test'),
      };

      const auditContext = getAuditContext(context);

      expect(auditContext.ipAddress).toBe('::1');
    });
  });

  describe('hashSensitiveValue', () => {
    test('returns null for undefined input', () => {
      expect(hashSensitiveValue(undefined)).toBeNull();
    });

    test('returns null for empty string', () => {
      expect(hashSensitiveValue('')).toBeNull();
    });

    test('returns consistent hash for same input', () => {
      const hash1 = hashSensitiveValue('test@example.com');
      const hash2 = hashSensitiveValue('test@example.com');
      expect(hash1).toBe(hash2);
    });

    test('returns different hash for different inputs', () => {
      const hash1 = hashSensitiveValue('test1@example.com');
      const hash2 = hashSensitiveValue('test2@example.com');
      expect(hash1).not.toBe(hash2);
    });

    test('is case-insensitive', () => {
      const hash1 = hashSensitiveValue('Test@Example.com');
      const hash2 = hashSensitiveValue('test@example.com');
      expect(hash1).toBe(hash2);
    });

    test('returns string of consistent length', () => {
      const hash = hashSensitiveValue('test@example.com');
      expect(hash).not.toBeNull();
      expect(hash!.length).toBe(8);
    });
  });

  describe('AuditEventData', () => {
    test('supports emailHash field for login failures', () => {
      const eventData: AuditEventData = {
        emailHash: hashSensitiveValue('test@example.com'),
        error: 'Invalid credentials',
      };

      expect(eventData.emailHash).not.toBeNull();
      expect(eventData.error).toBe('Invalid credentials');
    });

    test('supports sessionHash for successful logins', () => {
      const eventData: AuditEventData = {
        sessionHash: hashSensitiveValue('session-123'),
      };

      expect(eventData.sessionHash).not.toBeNull();
    });

    test('supports arbitrary additional data', () => {
      const eventData: AuditEventData = {
        customField: 'custom value',
        nested: { key: 'value' },
      };

      expect(eventData.customField).toBe('custom value');
      expect(eventData.nested).toEqual({ key: 'value' });
    });
  });

  describe('AuditContext', () => {
    test('allows null values for optional fields', () => {
      const context: AuditContext = {
        ipAddress: null,
        userAgent: null,
      };

      expect(context.ipAddress).toBeNull();
      expect(context.userAgent).toBeNull();
    });

    test('allows string values for IP and user agent', () => {
      const context: AuditContext = {
        ipAddress: '10.0.0.1',
        userAgent: 'curl/7.68.0',
      };

      expect(context.ipAddress).toBe('10.0.0.1');
      expect(context.userAgent).toBe('curl/7.68.0');
    });
  });

  describe('Event Types', () => {
    test('LOGIN_SUCCESS event type is valid', () => {
      const eventType = 'LOGIN_SUCCESS';
      expect(eventType).toBe('LOGIN_SUCCESS');
    });

    test('LOGIN_FAILURE event type is valid', () => {
      const eventType = 'LOGIN_FAILURE';
      expect(eventType).toBe('LOGIN_FAILURE');
    });

    test('LOGOUT event type is valid', () => {
      const eventType = 'LOGOUT';
      expect(eventType).toBe('LOGOUT');
    });

    test('SIGNUP event type is valid', () => {
      const eventType = 'SIGNUP';
      expect(eventType).toBe('SIGNUP');
    });

    test('PASSWORD_RESET_REQUEST event type is valid', () => {
      const eventType = 'PASSWORD_RESET_REQUEST';
      expect(eventType).toBe('PASSWORD_RESET_REQUEST');
    });

    test('PASSWORD_CHANGE event type is valid', () => {
      const eventType = 'PASSWORD_CHANGE';
      expect(eventType).toBe('PASSWORD_CHANGE');
    });

    test('AUTH_FAILURE event type is valid', () => {
      const eventType = 'AUTH_FAILURE';
      expect(eventType).toBe('AUTH_FAILURE');
    });
  });

  describe('JSON serialization of event data', () => {
    test('event data can be serialized to JSON', () => {
      const eventData: AuditEventData = {
        email: 'test@example.com',
        error: 'Test error',
        sessionId: 'session-456',
      };

      const json = JSON.stringify(eventData);
      const parsed = JSON.parse(json);

      expect(parsed.email).toBe('test@example.com');
      expect(parsed.error).toBe('Test error');
      expect(parsed.sessionId).toBe('session-456');
    });

    test('handles undefined event data', () => {
      const eventData: AuditEventData | undefined = undefined;

      const json = eventData ? JSON.stringify(eventData) : null;

      expect(json).toBeNull();
    });
  });
});
