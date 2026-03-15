/**
 * AuditLogService Tests
 *
 * Tests for static helpers plus database-backed audit log queries.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { nanoid } from 'nanoid';
import type { IDatabase } from '@/db';
import * as schema from '@/db/schema/sqlite';
import * as auditLogModule from './audit-log.service';

const { AuditLogService } = auditLogModule;

const DB_PATH = join(import.meta.dir, `audit-log-test-${nanoid(8)}.sqlite`);
const WORKSPACE_ID = `ws-${nanoid(8)}`;
const USER_ID = `usr-${nanoid(8)}`;

let rawDb: Database;
let db: ReturnType<typeof drizzle>;
let auditLogService: InstanceType<typeof AuditLogService>;

function removeComments(sql: string): string {
  let result = sql.replace(/--[^\n]*/g, '');
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  return result.trim();
}

function execSetupSql(db: Database, sql: string) {
  const statements = sql
    .split(';')
    .map((statement) => removeComments(statement).trim())
    .filter((statement) => statement.length > 0);

  for (const statement of statements) {
    try {
      db.prepare(statement).run();
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        throw error;
      }
    }
  }
}

function seedWorkspaceAndUser() {
  const now = new Date();

  db.insert(schema.workspaces)
    .values({
      id: WORKSPACE_ID,
      name: 'Audit Log Test Workspace',
      status: 'active',
      created_at: now,
      updated_at: now,
    })
    .run();

  db.insert(schema.users)
    .values({
      id: USER_ID,
      workspace_id: WORKSPACE_ID,
      email: 'audit-log-test@example.com',
      name: 'Audit Log Test User',
      role: 'member',
      password_hash: 'hash',
      created_at: now,
      updated_at: now,
    })
    .run();
}

function insertAuditLog(values: {
  id?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: Date;
  oldValue?: string | null;
  newValue?: string | null;
}) {
  db.insert(schema.auditLogs)
    .values({
      id: values.id ?? `log-${nanoid(8)}`,
      workspace_id: WORKSPACE_ID,
      user_id: USER_ID,
      action: values.action,
      entity_type: values.entityType,
      entity_id: values.entityId ?? null,
      old_value: values.oldValue ?? null,
      new_value: values.newValue ?? null,
      created_at: values.createdAt,
    })
    .run();
}

beforeAll(async () => {
  rawDb = new Database(DB_PATH);
  rawDb.prepare('PRAGMA journal_mode = WAL').run();
  rawDb.prepare('PRAGMA foreign_keys = ON').run();

  const setupSqlPath = join(process.cwd(), 'src', 'db', 'setup.sql');
  const setupSql = await Bun.file(setupSqlPath).text();
  execSetupSql(rawDb, setupSql);

  db = drizzle(rawDb, { schema });
  seedWorkspaceAndUser();

  auditLogService = new AuditLogService(db as unknown as IDatabase);
});

beforeEach(() => {
  rawDb.prepare('DELETE FROM audit_logs').run();
});

afterAll(() => {
  rawDb?.close();

  if (existsSync(DB_PATH)) {
    unlinkSync(DB_PATH);
  }

  for (const suffix of ['-wal', '-shm']) {
    const path = DB_PATH + suffix;
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
});

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

    test('handles Date object from timestamp number', () => {
      // Ensure formatTimestamp works correctly when passed a Date
      // created from a millisecond timestamp (as stored in SQLite)
      const msTimestamp = new Date('2025-01-24T12:00:00Z').getTime(); // ~1740000000000ms
      const date = new Date(msTimestamp);
      const result = AuditLogService.formatTimestamp(date);
      expect(result).toMatch(/Jan 24, 2025/);
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

  describe('shared UI exports', () => {
    test('exports toneDotClasses for UI reuse', () => {
      expect(auditLogModule.toneDotClasses).toEqual({
        success: 'bg-success',
        info: 'bg-info',
        warning: 'bg-warning',
        error: 'bg-error',
      });
    });
  });

  describe('integration', () => {
    test('listForUser returns newest events first with formatted labels and tones', async () => {
      insertAuditLog({
        action: 'password_change',
        entityType: 'user',
        createdAt: new Date('2024-01-14T08:00:00Z'),
      });
      insertAuditLog({
        action: 'login',
        entityType: 'session',
        createdAt: new Date('2024-01-15T09:30:00Z'),
      });

      const events = await auditLogService.listForUser(USER_ID, WORKSPACE_ID, 10);

      expect(events).toHaveLength(2);
      expect(events[0]?.label).toBe('Signed In');
      expect(events[0]?.tone).toBe('success');
      expect(events[1]?.label).toBe('Password Changed');
      expect(events[1]?.tone).toBe('warning');
    });

    test('listForUser respects the limit parameter', async () => {
      insertAuditLog({
        action: 'login',
        entityType: 'session',
        createdAt: new Date('2024-01-15T09:30:00Z'),
      });
      insertAuditLog({
        action: 'logout',
        entityType: 'session',
        createdAt: new Date('2024-01-15T08:30:00Z'),
      });
      insertAuditLog({
        action: 'password_change',
        entityType: 'user',
        createdAt: new Date('2024-01-15T07:30:00Z'),
      });

      const events = await auditLogService.listForUser(USER_ID, WORKSPACE_ID, 2);

      expect(events).toHaveLength(2);
      expect(events.map((event) => event.label)).toEqual(['Signed In', 'Signed Out']);
    });

    test('exportToCsv defaults to 1000 records', async () => {
      for (let index = 0; index < 1001; index += 1) {
        insertAuditLog({
          id: `limit-log-${index}`,
          action: 'login',
          entityType: 'session',
          createdAt: new Date(`2024-01-${String((index % 28) + 1).padStart(2, '0')}T10:00:00Z`),
        });
      }

      const csv = await auditLogService.exportToCsv(USER_ID, WORKSPACE_ID);

      expect(csv.split('\n')).toHaveLength(1001);
    });

    test('exportToCsv respects the provided limit', async () => {
      insertAuditLog({
        action: 'login',
        entityType: 'session',
        createdAt: new Date('2024-01-15T10:30:00Z'),
      });
      insertAuditLog({
        action: 'logout',
        entityType: 'session',
        createdAt: new Date('2024-01-15T09:30:00Z'),
      });
      insertAuditLog({
        action: 'password_change',
        entityType: 'user',
        createdAt: new Date('2024-01-15T08:30:00Z'),
      });

      const csv = await auditLogService.exportToCsv(USER_ID, WORKSPACE_ID, { limit: 2 });

      expect(csv.split('\n')).toHaveLength(3);
      expect(csv).toContain('Signed In');
      expect(csv).toContain('Signed Out');
      expect(csv).not.toContain('Password Changed');
    });

    test('listForUser returns correctly formatted timestamps', async () => {
      const testDate = new Date('2025-01-24T12:00:00Z');
      insertAuditLog({
        action: 'login',
        entityType: 'session',
        createdAt: testDate,
      });

      const events = await auditLogService.listForUser(USER_ID, WORKSPACE_ID, 10);

      expect(events).toHaveLength(1);
      expect(events[0]?.timestamp).toMatch(/Jan 24, 2025/);
      // Ensure the timestamp is NOT an absurdly large year like 58170
      expect(events[0]?.timestamp).not.toMatch(/58170/);
    });

    test('listForUser handles various timestamp formats correctly', async () => {
      // Test with a timestamp that could be misinterpreted
      const testDate = new Date('2025-03-14T10:30:00Z');
      insertAuditLog({
        action: 'login',
        entityType: 'session',
        createdAt: testDate,
      });

      const events = await auditLogService.listForUser(USER_ID, WORKSPACE_ID, 10);

      expect(events).toHaveLength(1);
      // Should show Mar 14, 2025 (or Today if running on that date)
      expect(events[0]?.timestamp).toMatch(/Mar 14, 2025|Today,/);
      expect(events[0]?.timestamp).not.toMatch(/58170/);
    });

    test('createdAt value from database is properly handled', async () => {
      // Insert an audit log and check the raw value returned from Drizzle
      const testDate = new Date('2025-01-24T12:00:00Z');
      insertAuditLog({
        action: 'login',
        entityType: 'session',
        createdAt: testDate,
      });

      // Query directly to check the createdAt type
      const { auditLogs } = schema;
      const rows = await (db as any)
        .select({
          id: auditLogs.id,
          createdAt: auditLogs.created_at,
        })
        .from(auditLogs)
        .where(eq(auditLogs.user_id, USER_ID))
        .limit(1);

      expect(rows).toHaveLength(1);
      const row = rows[0];

      // Log the actual type and value for debugging
      console.log('createdAt type:', typeof row.createdAt);
      console.log('createdAt value:', row.createdAt);
      console.log('createdAt instanceof Date:', row.createdAt instanceof Date);

      // The value should be a Date object (from Drizzle mode: 'timestamp_ms')
      expect(row.createdAt).toBeDefined();

      // Verify the year is correct (not 58170)
      const dateObj = new Date(row.createdAt);
      expect(dateObj.getFullYear()).toBe(2025);
      expect(dateObj.getMonth()).toBe(0); // January
      expect(dateObj.getDate()).toBe(24);
    });

    test('exportToCsv filters rows within an inclusive date range', async () => {
      insertAuditLog({
        action: 'login',
        entityType: 'session',
        createdAt: new Date('2024-01-05T10:30:00Z'),
      });
      insertAuditLog({
        action: 'password_change',
        entityType: 'user',
        createdAt: new Date('2024-01-15T10:30:00Z'),
      });
      insertAuditLog({
        action: 'logout',
        entityType: 'session',
        createdAt: new Date('2024-02-05T10:30:00Z'),
      });

      const csv = await auditLogService.exportToCsv(USER_ID, WORKSPACE_ID, {
        startDate: new Date('2024-01-10T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
      });

      expect(csv).toContain('Password Changed');
      expect(csv).not.toContain('Signed In');
      expect(csv).not.toContain('Signed Out');
    });
  });
});
