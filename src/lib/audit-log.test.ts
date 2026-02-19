/**
 * Audit Logging Tests
 *
 * Tests for the audit logging module including:
 * - Hash functionality
 * - Type definitions
 */

import { describe, test, expect } from 'bun:test';
import { hashSensitiveValue, type AuditAction, type AuditEntityType } from './audit-log';

describe('audit-log', () => {
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

  describe('AuditAction types', () => {
    test('create action is valid', () => {
      const action: AuditAction = 'create';
      expect(action).toBe('create');
    });

    test('update action is valid', () => {
      const action: AuditAction = 'update';
      expect(action).toBe('update');
    });

    test('delete action is valid', () => {
      const action: AuditAction = 'delete';
      expect(action).toBe('delete');
    });

    test('login action is valid', () => {
      const action: AuditAction = 'login';
      expect(action).toBe('login');
    });

    test('logout action is valid', () => {
      const action: AuditAction = 'logout';
      expect(action).toBe('logout');
    });
  });

  describe('AuditEntityType types', () => {
    test('transaction entity type is valid', () => {
      const entityType: AuditEntityType = 'transaction';
      expect(entityType).toBe('transaction');
    });

    test('category entity type is valid', () => {
      const entityType: AuditEntityType = 'category';
      expect(entityType).toBe('category');
    });

    test('account entity type is valid', () => {
      const entityType: AuditEntityType = 'account';
      expect(entityType).toBe('account');
    });

    test('budget entity type is valid', () => {
      const entityType: AuditEntityType = 'budget';
      expect(entityType).toBe('budget');
    });

    test('user entity type is valid', () => {
      const entityType: AuditEntityType = 'user';
      expect(entityType).toBe('user');
    });

    test('workspace entity type is valid', () => {
      const entityType: AuditEntityType = 'workspace';
      expect(entityType).toBe('workspace');
    });
  });
});
