/**
 * Workspace Meta Service
 *
 * Provides key-value storage for workspace-level preferences and settings.
 * Settings stored here apply to all members of a workspace.
 *
 * Security features:
 * - Meta key allowlist validation
 * - Value size limit (4KB)
 * - Workspace-scoped access only
 *
 * Error codes:
 * - WORKSPACE_NOT_FOUND: Workspace doesn't exist
 * - INVALID_META_KEY: Key not in allowlist
 * - INVALID_META_VALUE: Value fails validation for key
 * - VALUE_TOO_LARGE: Value exceeds 4KB limit
 * - META_NOT_FOUND: Meta key doesn't exist for workspace
 */

import { workspaceMeta, workspaces, type IDatabase } from '@/db';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  WORKSPACE_META_KEYS,
  type WorkspaceMetaKey,
  type WorkspaceSettings,
  type WeekStart,
  WORKSPACE_META_DEFAULTS,
  WEEK_START_VALUES,
  DEFAULT_WORKSPACE_SETTINGS,
  isValidWorkspaceMetaKey,
  EMAIL_PROVIDERS,
  isValidEmailProvider,
  type EmailSettings,
} from '@/lib/constants/workspace-meta-keys';
import { WorkspaceMetaServiceError, ServiceErrorCode } from './service-errors';

/**
 * Maximum size for a meta value in bytes (4KB)
 */
const META_VALUE_MAX_SIZE = 4096;

/**
 * Convert string to boolean for meta values
 */
function metaValueToBoolean(value: string | null, defaultValue: boolean): boolean {
  if (value === null) return defaultValue;
  return value === 'true';
}

/**
 * Convert boolean to string for meta values
 */
function booleanToMetaValue(value: boolean): string {
  return value ? 'true' : 'false';
}

/**
 * Validate if a string is a valid week start value
 */
function isValidWeekStart(value: string): value is WeekStart {
  return WEEK_START_VALUES.includes(value as WeekStart);
}

/**
 * Validate meta value based on key
 */
function validateMetaValue(key: WorkspaceMetaKey, value: string): void {
  switch (key) {
    case WORKSPACE_META_KEYS.CURRENCY:
      // Currency should be a non-empty string (e.g., 'IDR', 'USD')
      if (!value || value.length === 0) {
        throw new Error('Currency cannot be empty');
      }
      if (value.length > 10) {
        throw new Error('Currency code too long');
      }
      break;

    case WORKSPACE_META_KEYS.WEEK_START:
      if (!isValidWeekStart(value)) {
        throw new Error(
          `Invalid week start value. Must be one of: ${WEEK_START_VALUES.join(', ')}`
        );
      }
      break;

    case WORKSPACE_META_KEYS.COMPACT_NUMBERS:
      if (value !== 'true' && value !== 'false') {
        throw new Error('Compact numbers must be "true" or "false"');
      }
      break;

    case WORKSPACE_META_KEYS.EMAIL_PROVIDER:
      // Empty string is allowed (unconfigured)
      if (value && !isValidEmailProvider(value)) {
        throw new Error(`Invalid email provider. Must be one of: ${EMAIL_PROVIDERS.join(', ')}`);
      }
      break;

    case WORKSPACE_META_KEYS.EMAIL_API_KEY:
      // Empty string or encrypted format
      if (value && !value.startsWith('aes256gcm:')) {
        throw new Error('API key must be encrypted');
      }
      break;

    case WORKSPACE_META_KEYS.EMAIL_SENDER_NAME:
      // Allow empty or any non-empty string up to 100 chars
      if (value && value.length > 100) {
        throw new Error('Sender name too long (max 100 characters)');
      }
      break;

    case WORKSPACE_META_KEYS.EMAIL_SENDER_ADDRESS:
      // Empty string is allowed, but if provided must be valid email
      if (value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw new Error('Invalid sender email address');
        }
      }
      break;

    default:
      // Unknown key - should never happen if isValidWorkspaceMetaKey is checked first
      break;
  }
}

/**
 * Workspace Meta Service
 */
export class WorkspaceMetaService {
  /**
   * Create a new WorkspaceMetaService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {}

  /**
   * Get a single meta value for a workspace
   *
   * @param workspaceId - Workspace ID
   * @param key - Meta key
   * @returns The meta value or null if not set
   * @throws {WorkspaceMetaServiceError} If workspace not found or invalid key
   */
  async get(workspaceId: string, key: WorkspaceMetaKey): Promise<string | null> {
    // Validate key
    if (!isValidWorkspaceMetaKey(key)) {
      throw new WorkspaceMetaServiceError(
        ServiceErrorCode.INVALID_META_KEY,
        `Invalid meta key: ${key}`,
        400
      );
    }

    // Check if workspace exists
    await this.ensureWorkspaceExists(workspaceId);

    // Get meta value
    const meta = await this.db.query.workspaceMeta.findFirst({
      where: and(eq(workspaceMeta.workspace_id, workspaceId), eq(workspaceMeta.meta_key, key)),
    });

    return meta?.meta_value ?? null;
  }

  /**
   * Set a meta value for a workspace (upsert)
   *
   * @param workspaceId - Workspace ID
   * @param key - Meta key
   * @param value - Meta value
   * @throws {WorkspaceMetaServiceError} If workspace not found, invalid key, invalid value, or value too large
   */
  async set(workspaceId: string, key: WorkspaceMetaKey, value: string): Promise<void> {
    // Validate key
    if (!isValidWorkspaceMetaKey(key)) {
      throw new WorkspaceMetaServiceError(
        ServiceErrorCode.INVALID_META_KEY,
        `Invalid meta key: ${key}`,
        400
      );
    }

    // Validate value size using actual byte length (not character count)
    const byteLength = new TextEncoder().encode(value).length;
    if (byteLength > META_VALUE_MAX_SIZE) {
      throw new WorkspaceMetaServiceError(
        ServiceErrorCode.VALUE_TOO_LARGE,
        `Value exceeds maximum size of ${META_VALUE_MAX_SIZE} bytes`,
        400
      );
    }

    // Validate value against key's schema
    try {
      validateMetaValue(key, value);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid value';
      throw new WorkspaceMetaServiceError(ServiceErrorCode.INVALID_META_VALUE, message, 400);
    }

    // Check if workspace exists
    await this.ensureWorkspaceExists(workspaceId);

    // Use upsert to avoid race condition
    // ON CONFLICT (workspace_id, meta_key) DO UPDATE
    await this.db
      .insert(workspaceMeta)
      .values({
        id: nanoid(),
        workspace_id: workspaceId,
        meta_key: key,
        meta_value: value,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: [workspaceMeta.workspace_id, workspaceMeta.meta_key],
        set: {
          meta_value: value,
          updated_at: new Date(),
        },
      });
  }

  /**
   * Get all meta values for a workspace as a partial record
   * Only returns keys that have been explicitly set (no defaults)
   *
   * @param workspaceId - Workspace ID
   * @returns Partial record of meta key to value
   * @throws {WorkspaceMetaServiceError} If workspace not found
   */
  async getAll(workspaceId: string): Promise<Partial<Record<WorkspaceMetaKey, string>>> {
    // Check if workspace exists
    await this.ensureWorkspaceExists(workspaceId);

    // Get all meta for workspace
    const metas = await this.db.query.workspaceMeta.findMany({
      where: eq(workspaceMeta.workspace_id, workspaceId),
    });

    // Build result with only set values
    const result: Partial<Record<WorkspaceMetaKey, string>> = {};

    for (const meta of metas) {
      if (isValidWorkspaceMetaKey(meta.meta_key)) {
        result[meta.meta_key] = meta.meta_value;
      }
    }

    return result;
  }

  /**
   * Get all meta values for a workspace with defaults for unset keys
   *
   * @param workspaceId - Workspace ID
   * @returns Record of meta key to value (includes defaults for unset keys)
   * @throws {WorkspaceMetaServiceError} If workspace not found
   */
  async getWithDefaults(workspaceId: string): Promise<Record<WorkspaceMetaKey, string>> {
    // Check if workspace exists
    await this.ensureWorkspaceExists(workspaceId);

    // Get all meta for workspace
    const metas = await this.db.query.workspaceMeta.findMany({
      where: eq(workspaceMeta.workspace_id, workspaceId),
    });

    // Start with defaults
    const result = { ...WORKSPACE_META_DEFAULTS };

    // Override with actual values
    for (const meta of metas) {
      if (isValidWorkspaceMetaKey(meta.meta_key)) {
        result[meta.meta_key] = meta.meta_value;
      }
    }

    return result;
  }

  /**
   * Delete a meta value for a workspace
   *
   * @param workspaceId - Workspace ID
   * @param key - Meta key
   * @throws {WorkspaceMetaServiceError} If workspace not found, invalid key, or meta not found
   */
  async delete(workspaceId: string, key: WorkspaceMetaKey): Promise<void> {
    // Validate key
    if (!isValidWorkspaceMetaKey(key)) {
      throw new WorkspaceMetaServiceError(
        ServiceErrorCode.INVALID_META_KEY,
        `Invalid meta key: ${key}`,
        400
      );
    }

    // Check if workspace exists
    await this.ensureWorkspaceExists(workspaceId);

    // Check if meta exists
    const existing = await this.db.query.workspaceMeta.findFirst({
      where: and(eq(workspaceMeta.workspace_id, workspaceId), eq(workspaceMeta.meta_key, key)),
    });

    if (!existing) {
      throw new WorkspaceMetaServiceError(
        ServiceErrorCode.META_NOT_FOUND,
        `Meta key not found: ${key}`,
        404
      );
    }

    // Delete
    await this.db
      .delete(workspaceMeta)
      .where(and(eq(workspaceMeta.workspace_id, workspaceId), eq(workspaceMeta.meta_key, key)));
  }

  // ============================================================================
  // Type-safe wrappers for common settings
  // ============================================================================

  /**
   * Get workspace's preferred currency
   *
   * @param workspaceId - Workspace ID
   * @returns The currency or default 'IDR'
   */
  async getCurrency(workspaceId: string): Promise<string> {
    const value = await this.get(workspaceId, WORKSPACE_META_KEYS.CURRENCY);
    return value ?? DEFAULT_WORKSPACE_SETTINGS.currency;
  }

  /**
   * Set workspace's preferred currency
   *
   * @param workspaceId - Workspace ID
   * @param currency - Currency code (e.g., 'IDR', 'USD')
   */
  async setCurrency(workspaceId: string, currency: string): Promise<void> {
    await this.set(workspaceId, WORKSPACE_META_KEYS.CURRENCY, currency);
  }

  /**
   * Get workspace's week start preference
   *
   * @param workspaceId - Workspace ID
   * @returns WeekStart value ('monday' or 'sunday')
   */
  async getWeekStart(workspaceId: string): Promise<WeekStart> {
    const value = await this.get(workspaceId, WORKSPACE_META_KEYS.WEEK_START);
    if (value && isValidWeekStart(value)) {
      return value;
    }
    return DEFAULT_WORKSPACE_SETTINGS.weekStart;
  }

  /**
   * Set workspace's week start preference
   *
   * @param workspaceId - Workspace ID
   * @param weekStart - 'monday' or 'sunday'
   */
  async setWeekStart(workspaceId: string, weekStart: WeekStart): Promise<void> {
    await this.set(workspaceId, WORKSPACE_META_KEYS.WEEK_START, weekStart);
  }

  /**
   * Get whether to display compact numbers
   *
   * @param workspaceId - Workspace ID
   * @returns Boolean (default true)
   */
  async getCompactNumbers(workspaceId: string): Promise<boolean> {
    const value = await this.get(workspaceId, WORKSPACE_META_KEYS.COMPACT_NUMBERS);
    return metaValueToBoolean(value, DEFAULT_WORKSPACE_SETTINGS.compactNumbers);
  }

  /**
   * Set whether to display compact numbers
   *
   * @param workspaceId - Workspace ID
   * @param value - Boolean
   */
  async setCompactNumbers(workspaceId: string, value: boolean): Promise<void> {
    await this.set(workspaceId, WORKSPACE_META_KEYS.COMPACT_NUMBERS, booleanToMetaValue(value));
  }

  /**
   * Get all workspace settings as a typed object
   *
   * @param workspaceId - Workspace ID
   * @returns WorkspaceSettings object with all preferences
   */
  async getSettings(workspaceId: string): Promise<WorkspaceSettings> {
    const metaAll = await this.getWithDefaults(workspaceId);

    // Validate week_start at runtime
    const rawWeekStart = metaAll[WORKSPACE_META_KEYS.WEEK_START];
    const weekStart = isValidWeekStart(rawWeekStart)
      ? rawWeekStart
      : DEFAULT_WORKSPACE_SETTINGS.weekStart;

    return {
      currency: metaAll[WORKSPACE_META_KEYS.CURRENCY],
      weekStart,
      compactNumbers: metaValueToBoolean(
        metaAll[WORKSPACE_META_KEYS.COMPACT_NUMBERS],
        DEFAULT_WORKSPACE_SETTINGS.compactNumbers
      ),
    };
  }

  // ============================================================================
  // Email settings methods
  // ============================================================================

  /**
   * Get email configuration for workspace
   *
   * @param workspaceId - Workspace ID
   * @returns EmailSettings object (null values indicate unconfigured)
   */
  async getEmailSettings(workspaceId: string): Promise<EmailSettings> {
    const metaAll = await this.getAll(workspaceId);

    const provider = metaAll[WORKSPACE_META_KEYS.EMAIL_PROVIDER];
    const apiKey = metaAll[WORKSPACE_META_KEYS.EMAIL_API_KEY];
    const senderName = metaAll[WORKSPACE_META_KEYS.EMAIL_SENDER_NAME];
    const senderAddress = metaAll[WORKSPACE_META_KEYS.EMAIL_SENDER_ADDRESS];

    return {
      provider: provider && isValidEmailProvider(provider) ? provider : null,
      apiKey: apiKey || null,
      senderName: senderName || null,
      senderAddress: senderAddress || null,
    };
  }

  /**
   * Check if email is fully configured
   *
   * @param workspaceId - Workspace ID
   * @returns true if all email settings are present
   */
  async isEmailConfigured(workspaceId: string): Promise<boolean> {
    const settings = await this.getEmailSettings(workspaceId);
    return !!(
      settings.provider &&
      settings.apiKey &&
      settings.senderName &&
      settings.senderAddress
    );
  }

  /**
   * Set email provider
   *
   * @param workspaceId - Workspace ID
   * @param provider - Email provider ('sendgrid' or 'resend')
   */
  async setEmailProvider(workspaceId: string, provider: string): Promise<void> {
    await this.set(workspaceId, WORKSPACE_META_KEYS.EMAIL_PROVIDER, provider);
  }

  /**
   * Set encrypted email API key
   *
   * @param workspaceId - Workspace ID
   * @param encryptedApiKey - Already encrypted API key (aes256gcm:...)
   */
  async setEmailApiKey(workspaceId: string, encryptedApiKey: string): Promise<void> {
    await this.set(workspaceId, WORKSPACE_META_KEYS.EMAIL_API_KEY, encryptedApiKey);
  }

  /**
   * Set email sender name
   *
   * @param workspaceId - Workspace ID
   * @param name - Display name for sender
   */
  async setEmailSenderName(workspaceId: string, name: string): Promise<void> {
    await this.set(workspaceId, WORKSPACE_META_KEYS.EMAIL_SENDER_NAME, name);
  }

  /**
   * Set email sender address
   *
   * @param workspaceId - Workspace ID
   * @param address - Email address for sender
   */
  async setEmailSenderAddress(workspaceId: string, address: string): Promise<void> {
    await this.set(workspaceId, WORKSPACE_META_KEYS.EMAIL_SENDER_ADDRESS, address);
  }

  /**
   * Clear all email settings (reset to unconfigured)
   *
   * @param workspaceId - Workspace ID
   */
  async clearEmailSettings(workspaceId: string): Promise<void> {
    // Set empty strings (not delete, to ensure consistent state)
    await this.set(workspaceId, WORKSPACE_META_KEYS.EMAIL_PROVIDER, '');
    await this.set(workspaceId, WORKSPACE_META_KEYS.EMAIL_API_KEY, '');
    await this.set(workspaceId, WORKSPACE_META_KEYS.EMAIL_SENDER_NAME, '');
    await this.set(workspaceId, WORKSPACE_META_KEYS.EMAIL_SENDER_ADDRESS, '');
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  /**
   * Check if workspace exists, throw if not
   */
  private async ensureWorkspaceExists(workspaceId: string): Promise<void> {
    const workspace = await this.db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace) {
      throw new WorkspaceMetaServiceError(
        ServiceErrorCode.WORKSPACE_NOT_FOUND,
        'Workspace not found',
        404
      );
    }
  }
}
