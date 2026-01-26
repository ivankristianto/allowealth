/**
 * Audit Logging Service
 *
 * Provides security audit logging for authentication and authorization events.
 * Logs are stored in the database for compliance, security monitoring,
 * and incident investigation.
 *
 * Security note: Sensitive data (session IDs, emails) are hashed before storage
 * to prevent exposure in case of audit log access.
 */

import { db, auditLogs, type AuditEventType } from '@/db';
import { logError } from '@/lib/utils';

/**
 * Create a truncated hash for sensitive data
 * Used to correlate events without exposing the actual values
 *
 * P2: Consider upgrading to SHA-256 via Web Crypto API for stronger hashing.
 * Current 32-bit hash has collision risk (~1% with 10k users).
 * Acceptable for audit correlation but not cryptographically secure.
 *
 * @param value - The sensitive value to hash
 * @returns 8-character hex hash, or null if value is undefined
 */
export function hashSensitiveValue(value: string | undefined): string | null {
  if (!value) return null;

  const encoder = new TextEncoder();
  const data = encoder.encode(value.toLowerCase());

  // Simple hash using a fast, non-cryptographic approach for correlation
  // This is sufficient for audit log correlation (not for security)
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

/**
 * Event data structure for different event types
 * Note: Sensitive fields like email and sessionId are automatically hashed
 */
export interface AuditEventData {
  // For LOGIN_FAILURE - hashed email for correlation (not the actual email)
  emailHash?: string | null;
  // For errors - the error message
  error?: string;
  // For LOGIN_SUCCESS/LOGOUT - hashed session ID for correlation
  sessionHash?: string | null;
  // Any additional context
  [key: string]: unknown;
}

/**
 * Context for audit log entries
 */
export interface AuditContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Log an authentication event
 *
 * @param eventType - Type of event (LOGIN_SUCCESS, LOGIN_FAILURE, etc.)
 * @param userId - User ID (null for failed login attempts where user doesn't exist)
 * @param context - Request context (IP address, user agent)
 * @param eventData - Additional event-specific data
 */
export async function logAuthEvent(
  eventType: AuditEventType,
  userId: string | null,
  context: AuditContext,
  eventData?: AuditEventData
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId,
      eventType,
      eventData: eventData ? JSON.stringify(eventData) : null,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    });
  } catch (error) {
    // Don't throw - audit logging should never break the main flow
    // Log to console for monitoring
    logError('Failed to write audit log', error);
  }
}

/**
 * Extract audit context from Astro APIContext
 *
 * @param context - Astro API context
 * @returns Audit context with IP and user agent
 */
export function getAuditContext(context: {
  clientAddress: string;
  request: Request;
}): AuditContext {
  return {
    ipAddress: context.clientAddress,
    userAgent: context.request.headers.get('user-agent'),
  };
}
