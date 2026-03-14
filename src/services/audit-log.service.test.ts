/**
 * AuditLogService Tests
 *
 * Tests for the static helper methods of AuditLogService:
 * - formatLabel
 * - formatTimestamp
 * - getTone
 * - summarizeChanges
 */

import { describe, test, expect } from 'bun:test';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  describe('formatLabel', () => {
    test('uses action label alone for self-describing actions', () => {
      expect(AuditLogService.formatLabel('login', 'session')).toBe('Signed In');
      expect(AuditLogService.formatLabel('logout', 'session')).toBe('Signed Out');
      expect(AuditLogService.formatLabel('mfa_enable', 'user_mfa')).toBe('MFA Enabled');
      expect(AuditLogService.formatLabel('mfa_disable', 'user_mfa')).toBe('MFA Disabled');
      expect(AuditLogService.formatLabel('password_change', 'user')).toBe('Password Changed');
      expect(AuditLogService.formatLabel('mfa_setup_init', 'user_mfa')).toBe('MFA Setup Started');
    });

    test('combines action and entity label for generic actions', () => {
      expect(AuditLogService.formatLabel('create', 'transaction')).toBe('Created Transaction');
      expect(AuditLogService.formatLabel('update', 'account')).toBe('Updated Account');
      expect(AuditLogService.formatLabel('delete', 'budget')).toBe('Deleted Budget');
      expect(AuditLogService.formatLabel('archive', 'category')).toBe('Archived Category');
      expect(AuditLogService.formatLabel('restore', 'transaction')).toBe('Restored Transaction');
    });

    test('handles recurring template actions', () => {
      expect(AuditLogService.formatLabel('recurring_template.create', 'recurring_template')).toBe(
        'Recurring Transaction Created'
      );
      expect(
        AuditLogService.formatLabel('recurring_occurrence.confirm', 'recurring_occurrence')
      ).toBe('Recurring Occurrence Confirmed');
    });

    test('falls back to raw action/entity when unknown', () => {
      expect(AuditLogService.formatLabel('unknown_action', 'unknown_entity')).toBe(
        'unknown_action unknown_entity'
      );
    });
  });

  describe('formatTimestamp', () => {
    test('returns "Today, HH:MM AM/PM" for today', () => {
      const now = new Date();
      const result = AuditLogService.formatTimestamp(now);
      expect(result).toMatch(/^Today, \d+:\d{2} (AM|PM)$/);
    });

    test('returns "Mon DD, YYYY" for past dates', () => {
      const pastDate = new Date('2024-01-15T14:30:00');
      const result = AuditLogService.formatTimestamp(pastDate);
      expect(result).toMatch(/^Jan 15, 2024$/);
    });

    test('returns "Mon DD, YYYY" for another past date', () => {
      const pastDate = new Date('2023-06-01T09:00:00');
      const result = AuditLogService.formatTimestamp(pastDate);
      expect(result).toMatch(/^Jun 1, 2023$/);
    });
  });

  describe('getTone', () => {
    test('login and create actions are success', () => {
      expect(AuditLogService.getTone('login')).toBe('success');
      expect(AuditLogService.getTone('create')).toBe('success');
      expect(AuditLogService.getTone('mfa_enable')).toBe('success');
    });

    test('update and info-level actions are info', () => {
      expect(AuditLogService.getTone('update')).toBe('info');
      expect(AuditLogService.getTone('logout')).toBe('info');
      expect(AuditLogService.getTone('mfa_setup_init')).toBe('info');
    });

    test('password_change and mfa_disable are warning', () => {
      expect(AuditLogService.getTone('password_change')).toBe('warning');
      expect(AuditLogService.getTone('mfa_disable')).toBe('warning');
      expect(AuditLogService.getTone('member_remove')).toBe('warning');
    });

    test('delete and admin_delete are error', () => {
      expect(AuditLogService.getTone('delete')).toBe('error');
      expect(AuditLogService.getTone('admin_delete')).toBe('error');
      expect(AuditLogService.getTone('admin_deactivate')).toBe('error');
    });

    test('unknown action defaults to info', () => {
      expect(AuditLogService.getTone('unknown_action')).toBe('info');
    });
  });

  describe('summarizeChanges', () => {
    test('returns empty string when both values are null', () => {
      expect(AuditLogService.summarizeChanges(null, null)).toBe('');
    });

    test('returns "Record created" when old value is null', () => {
      expect(AuditLogService.summarizeChanges(null, '{"name":"test"}')).toBe('Record created');
    });

    test('returns "Record removed" when new value is null', () => {
      expect(AuditLogService.summarizeChanges('{"name":"test"}', null)).toBe('Record removed');
    });

    test('identifies changed fields', () => {
      const old = JSON.stringify({ name: 'Alice', amount: 100 });
      const nw = JSON.stringify({ name: 'Bob', amount: 100 });
      expect(AuditLogService.summarizeChanges(old, nw)).toBe('Changed: name');
    });

    test('lists multiple changed fields', () => {
      const old = JSON.stringify({ name: 'Alice', amount: 100 });
      const nw = JSON.stringify({ name: 'Bob', amount: 200 });
      const result = AuditLogService.summarizeChanges(old, nw);
      expect(result).toContain('name');
      expect(result).toContain('amount');
    });

    test('returns empty string when nothing changed', () => {
      const value = JSON.stringify({ name: 'Alice' });
      expect(AuditLogService.summarizeChanges(value, value)).toBe('');
    });

    test('returns empty string for invalid JSON', () => {
      expect(AuditLogService.summarizeChanges('not-json', 'also-not-json')).toBe('');
    });
  });
});
