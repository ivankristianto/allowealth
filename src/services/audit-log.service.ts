/**
 * Audit Log Service
 *
 * Provides user-facing audit log operations: fetching recent security events
 * for the current user and exporting their full audit history as CSV.
 */

import { type IDatabase, getActiveSchema } from '@/db';
import { desc, eq, and } from 'drizzle-orm';

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  archive: 'Archived',
  restore: 'Restored',
  login: 'Signed In',
  logout: 'Signed Out',
  session_revoke: 'Session Revoked',
  session_revoke_other: 'Other Sessions Revoked',
  password_change: 'Password Changed',
  member_invite: 'Member Invited',
  member_remove: 'Member Removed',
  admin_view: 'Viewed by Admin',
  admin_archive: 'Archived by Admin',
  admin_delete: 'Deleted by Admin',
  admin_deactivate: 'User Deactivated',
  admin_reactivate: 'User Reactivated',
  admin_role_change: 'Role Changed',
  mfa_setup_init: 'MFA Setup Started',
  mfa_enable: 'MFA Enabled',
  mfa_disable: 'MFA Disabled',
  mfa_backup_regenerate: 'Backup Codes Regenerated',
  'recurring_template.create': 'Recurring Transaction Created',
  'recurring_template.update': 'Recurring Transaction Updated',
  'recurring_template.pause': 'Recurring Transaction Paused',
  'recurring_template.resume': 'Recurring Transaction Resumed',
  'recurring_template.cancel': 'Recurring Transaction Canceled',
  'recurring_template.delete': 'Recurring Transaction Deleted',
  'recurring_occurrence.confirm': 'Recurring Occurrence Confirmed',
  'recurring_occurrence.skip': 'Recurring Occurrence Skipped',
};

const ENTITY_LABELS: Record<string, string> = {
  transaction: 'Transaction',
  category: 'Category',
  account: 'Account',
  budget: 'Budget',
  api_key: 'API Key',
  passkey: 'Passkey',
  recurring_template: 'Recurring Transaction',
  recurring_occurrence: 'Recurring Occurrence',
  user: 'User',
  workspace: 'Workspace',
  session: 'Session',
  user_mfa: 'MFA',
};

/**
 * Actions whose ACTION_LABEL already describes the entity,
 * so we omit the entity label in the UI.
 */
const SELF_DESCRIBING_ACTIONS = new Set([
  'login',
  'logout',
  'session_revoke',
  'session_revoke_other',
  'password_change',
  'member_invite',
  'member_remove',
  'admin_view',
  'admin_archive',
  'admin_delete',
  'admin_deactivate',
  'admin_reactivate',
  'admin_role_change',
  'mfa_setup_init',
  'mfa_enable',
  'mfa_disable',
  'mfa_backup_regenerate',
  'recurring_template.create',
  'recurring_template.update',
  'recurring_template.pause',
  'recurring_template.resume',
  'recurring_template.cancel',
  'recurring_template.delete',
  'recurring_occurrence.confirm',
  'recurring_occurrence.skip',
]);

const ACTION_TONES: Record<string, SecurityEventTone> = {
  login: 'success',
  create: 'success',
  restore: 'success',
  mfa_enable: 'success',
  admin_reactivate: 'success',
  'recurring_occurrence.confirm': 'success',

  update: 'info',
  archive: 'info',
  logout: 'info',
  session_revoke: 'warning',
  session_revoke_other: 'warning',
  member_invite: 'info',
  admin_view: 'info',
  admin_role_change: 'info',
  mfa_setup_init: 'info',
  mfa_backup_regenerate: 'info',
  'recurring_template.create': 'info',
  'recurring_template.update': 'info',
  'recurring_template.pause': 'info',
  'recurring_template.resume': 'info',
  'recurring_occurrence.skip': 'info',

  password_change: 'warning',
  member_remove: 'warning',
  admin_archive: 'warning',
  mfa_disable: 'warning',
  'recurring_template.cancel': 'warning',
  'recurring_template.delete': 'warning',

  delete: 'error',
  admin_delete: 'error',
  admin_deactivate: 'error',
};

export type SecurityEventTone = 'success' | 'info' | 'warning' | 'error';

export interface SecurityEvent {
  id: string;
  label: string;
  timestamp: string;
  tone: SecurityEventTone;
}

export interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  workspaceId: string;
  createdAt: Date;
  oldValue: string | null;
  newValue: string | null;
}

export class AuditLogService {
  private get schema() {
    return getActiveSchema();
  }

  constructor(private db: IDatabase) {}

  /**
   * Fetch the most recent audit log entries for a specific user and workspace,
   * formatted as UI-ready security events.
   */
  async listForUser(userId: string, workspaceId: string, limit = 50): Promise<SecurityEvent[]> {
    const { auditLogs } = this.schema;

    // IDatabase interface does not expose the full Drizzle query builder chain
    // (orderBy, limit, etc.) — using `as any` here is consistent with the
    // pattern used across other services (e.g. transaction.service.ts).
    const rows = await (this.db as any)
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entity_type,
        entityId: auditLogs.entity_id,
        workspaceId: auditLogs.workspace_id,
        createdAt: auditLogs.created_at,
        oldValue: auditLogs.old_value,
        newValue: auditLogs.new_value,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.user_id, userId), eq(auditLogs.workspace_id, workspaceId)))
      .orderBy(desc(auditLogs.created_at))
      .limit(limit);

    return (rows as AuditLogRow[]).map((row) => ({
      id: row.id,
      label: AuditLogService.formatLabel(row.action, row.entityType),
      timestamp: AuditLogService.formatTimestamp(new Date(row.createdAt)),
      tone: AuditLogService.getTone(row.action),
    }));
  }

  /**
   * Fetch all audit log entries for a user/workspace and return them as a
   * CSV string suitable for file download.
   */
  async exportToCsv(userId: string, workspaceId: string): Promise<string> {
    const { auditLogs } = this.schema;

    // IDatabase interface does not expose the full Drizzle query builder chain
    // — using `as any` here is consistent with the pattern used across other
    // services (e.g. transaction.service.ts).
    const rows = await (this.db as any)
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entity_type,
        entityId: auditLogs.entity_id,
        workspaceId: auditLogs.workspace_id,
        createdAt: auditLogs.created_at,
        oldValue: auditLogs.old_value,
        newValue: auditLogs.new_value,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.user_id, userId), eq(auditLogs.workspace_id, workspaceId)))
      .orderBy(desc(auditLogs.created_at));

    const header = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Details'];
    const csvRows = (rows as AuditLogRow[]).map((row) => [
      new Date(row.createdAt).toISOString(),
      AuditLogService.formatLabel(row.action, row.entityType),
      ENTITY_LABELS[row.entityType] ?? row.entityType,
      row.entityId ?? '',
      AuditLogService.summarizeChanges(row.oldValue, row.newValue),
    ]);

    return [header, ...csvRows].map((cols) => cols.map(csvEscape).join(',')).join('\n');
  }

  /**
   * Format a human-readable label for an audit event.
   */
  static formatLabel(action: string, entityType: string): string {
    const actionLabel = ACTION_LABELS[action] ?? action;
    if (SELF_DESCRIBING_ACTIONS.has(action)) {
      return actionLabel;
    }
    const entityLabel = ENTITY_LABELS[entityType] ?? entityType;
    return `${actionLabel} ${entityLabel}`;
  }

  /**
   * Format a Date as "Today, 2:45 PM" (same day) or "Jan 15, 2024" (other days).
   */
  static formatTimestamp(date: Date): string {
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (isToday) {
      const time = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `Today, ${time}`;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Return the UI tone for a given action.
   */
  static getTone(action: string): SecurityEventTone {
    return ACTION_TONES[action] ?? 'info';
  }

  /**
   * Produce a short plain-text summary of what changed between old and new values.
   */
  static summarizeChanges(oldValue: string | null, newValue: string | null): string {
    try {
      const oldObj = oldValue ? (JSON.parse(oldValue) as Record<string, unknown>) : null;
      const newObj = newValue ? (JSON.parse(newValue) as Record<string, unknown>) : null;

      if (!oldObj && !newObj) return '';
      if (!oldObj) return 'Record created';
      if (!newObj) return 'Record removed';

      const changedKeys = Object.keys({ ...oldObj, ...newObj }).filter(
        (key) => JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])
      );

      if (changedKeys.length === 0) return '';
      return `Changed: ${changedKeys.join(', ')}`;
    } catch {
      return '';
    }
  }
}

/**
 * Escape a value for CSV output.
 */
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
