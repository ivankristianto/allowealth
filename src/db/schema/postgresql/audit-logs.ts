import { pgTable, text, serial, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

/**
 * Audit event types for authentication events
 */
export type AuditEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'SIGNUP'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_CHANGE'
  | 'AUTH_FAILURE';

/**
 * Audit logs table
 *
 * Stores security-relevant events for authentication and authorization.
 * Used for security monitoring, compliance, and incident investigation.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    // User ID is nullable for failed login attempts where user doesn't exist
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    eventType: text('event_type').notNull(),
    // JSON data with event-specific details (e.g., error message, email for failed login)
    eventData: text('event_data'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_user_id_idx').on(table.userId),
    index('audit_logs_event_type_idx').on(table.eventType),
    index('audit_logs_created_at_idx').on(table.createdAt),
    // P2: Consider adding IP address index if querying by IP for brute force detection
    // index('audit_logs_ip_address_idx').on(table.ipAddress),
  ]
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));
