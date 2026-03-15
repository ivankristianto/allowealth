import { db, type IDatabase, getActiveSchema } from '@/db';
import { eq } from 'drizzle-orm';
import {
  logAuditEvent,
  type AuditAction,
  type AuditEntityType,
  type AuditLogEntry,
} from '@/lib/audit-log';
import { createLogger } from '@/lib/logger';

const log = createLogger('security-activity');

const CLIENT_SECURITY_ACTIVITY_TYPES = [
  'mfa_enabled',
  'mfa_disabled',
  'mfa_backup_codes_regenerated',
  'passkey_created',
  'passkey_deleted',
] as const;

export type ClientSecurityActivityType = (typeof CLIENT_SECURITY_ACTIVITY_TYPES)[number];

export const clientSecurityActivityTypes = CLIENT_SECURITY_ACTIVITY_TYPES;

export type SecurityActivityType =
  | 'login'
  | 'logout'
  | 'password_changed'
  | 'profile_updated'
  | 'email_change_requested'
  | 'email_change_cancelled'
  | 'theme_changed'
  | 'account_linked'
  | 'account_unlinked'
  | 'session_revoked'
  | 'other_sessions_revoked'
  | 'api_key_created'
  | 'api_key_deleted'
  | ClientSecurityActivityType;

export interface SecurityActivityInput {
  type: SecurityActivityType;
  userId: string;
  entityId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

const EVENT_DEFINITIONS: Record<
  SecurityActivityType,
  {
    action: AuditAction;
    entityType: AuditEntityType;
  }
> = {
  login: { action: 'login', entityType: 'session' },
  logout: { action: 'logout', entityType: 'session' },
  password_changed: { action: 'password_change', entityType: 'user' },
  profile_updated: { action: 'profile_update', entityType: 'user' },
  email_change_requested: { action: 'email_change_request', entityType: 'user' },
  email_change_cancelled: { action: 'email_change_cancel', entityType: 'user' },
  theme_changed: { action: 'theme_change', entityType: 'user' },
  account_linked: { action: 'account_link', entityType: 'user' },
  account_unlinked: { action: 'account_unlink', entityType: 'user' },
  session_revoked: { action: 'session_revoke', entityType: 'session' },
  other_sessions_revoked: { action: 'session_revoke_other', entityType: 'session' },
  api_key_created: { action: 'create', entityType: 'api_key' },
  api_key_deleted: { action: 'delete', entityType: 'api_key' },
  mfa_enabled: { action: 'mfa_enable', entityType: 'user_mfa' },
  mfa_disabled: { action: 'mfa_disable', entityType: 'user_mfa' },
  mfa_backup_codes_regenerated: { action: 'mfa_backup_regenerate', entityType: 'user_mfa' },
  passkey_created: { action: 'create', entityType: 'passkey' },
  passkey_deleted: { action: 'delete', entityType: 'passkey' },
};

export class SecurityActivityService {
  private get schema() {
    return getActiveSchema();
  }

  constructor(
    private database: IDatabase,
    private writeAuditEvent: (entry: AuditLogEntry) => Promise<void> = logAuditEvent
  ) {}

  async logEvent(input: SecurityActivityInput): Promise<void> {
    const eventDefinition = EVENT_DEFINITIONS[input.type];
    const workspaceId = await this.getWorkspaceId(input.userId);

    if (!workspaceId) {
      log.warn('Skipping security activity for user without workspace', {
        type: input.type,
        userId: input.userId,
      });
      return;
    }

    await this.writeAuditEvent({
      workspaceId,
      userId: input.userId,
      action: eventDefinition.action,
      entityType: eventDefinition.entityType,
      entityId: input.entityId ?? null,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
    });
  }

  private async getWorkspaceId(userId: string): Promise<string | null> {
    const appUser = await this.database.query.users.findFirst({
      where: eq(this.schema.users.id, userId),
      columns: {
        workspace_id: true,
      },
    });

    return appUser?.workspace_id ?? null;
  }
}

export const securityActivityService = new SecurityActivityService(db);
