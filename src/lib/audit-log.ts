/**
 * Audit Logging Service
 *
 * Provides audit logging for entity changes within workspaces.
 * Logs are stored in the database for compliance and tracking.
 */

import { db, auditLogs } from '@/db';
import { logError } from '@/lib/utils';
import { nanoid } from 'nanoid';

/**
 * Types of actions that can be audited
 */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'archive'
  | 'login'
  | 'logout'
  | 'session_revoke'
  | 'session_revoke_other'
  | 'password_change'
  | 'member_invite'
  | 'member_remove'
  | 'admin_view'
  | 'admin_archive'
  | 'admin_delete'
  | 'admin_deactivate'
  | 'admin_reactivate'
  | 'admin_role_change'
  | 'mfa_setup_init'
  | 'mfa_enable'
  | 'mfa_disable'
  | 'mfa_backup_regenerate'
  | 'recurring_template.create'
  | 'recurring_template.update'
  | 'recurring_template.pause'
  | 'recurring_template.resume'
  | 'recurring_template.cancel'
  | 'recurring_template.delete'
  | 'recurring_occurrence.confirm'
  | 'recurring_occurrence.skip';

/**
 * Types of entities that can be audited
 */
export type AuditEntityType =
  | 'transaction'
  | 'category'
  | 'account'
  | 'budget'
  | 'api_key'
  | 'passkey'
  | 'recurring_template'
  | 'recurring_occurrence'
  | 'user'
  | 'workspace'
  | 'session'
  | 'user_mfa';

/**
 * Context for audit log entries
 */
export interface AuditLogEntry {
  workspaceId: string;
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

/**
 * Log an audit event
 *
 * @param entry - The audit log entry to record
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: nanoid(),
      workspace_id: entry.workspaceId,
      user_id: entry.userId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      old_value: entry.oldValue ? JSON.stringify(entry.oldValue) : null,
      new_value: entry.newValue ? JSON.stringify(entry.newValue) : null,
    });
  } catch (error) {
    // Don't throw - audit logging should never break the main flow
    // Log to console for monitoring
    logError('Failed to write audit log', error);
  }
}

/**
 * Create a truncated hash for sensitive data
 * Used to correlate events without exposing the actual values
 *
 * @param value - The sensitive value to hash
 * @returns 8-character hex hash, or null if value is undefined
 */
export function hashSensitiveValue(value: string | undefined): string | null {
  if (!value) return null;

  const encoder = new TextEncoder();
  const data = encoder.encode(value.toLowerCase());

  // Simple hash using a fast, non-cryptographic approach for correlation
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i] ?? 0;
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to hex and pad to ensure consistent length
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  return hexHash;
}
