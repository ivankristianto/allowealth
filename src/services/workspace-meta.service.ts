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

import { type IDatabase, getActiveSchema, runTransaction } from '@/db';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createMetaService } from './base/meta.factory';
import { isValidCurrency, type Currency } from '@/lib/constants/currency';
import {
  WORKSPACE_META_KEYS,
  type WorkspaceMetaKey,
  type WorkspaceSettings,
  type WeekStart,
  WORKSPACE_META_DEFAULTS,
  WEEK_START_VALUES,
  DEFAULT_WORKSPACE_SETTINGS,
  isValidWorkspaceMetaKey,
} from '@/lib/constants/workspace-meta-keys';
import { WorkspaceMetaServiceError, ServiceErrorCode } from './service-errors';

/**
 * Maximum size for a meta value in bytes (4KB)
 */
const META_VALUE_MAX_SIZE = 4096;
const CURRENCY_LOCKED_MESSAGE =
  'Currency settings cannot be changed after creating accounts, budgets, or transactions';

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
      if (!value || value.length === 0) {
        throw new Error('Currency cannot be empty');
      }
      if (!isValidCurrency(value)) {
        throw new Error(`Invalid currency code: ${value}`);
      }
      break;

    case WORKSPACE_META_KEYS.SECONDARY_CURRENCY:
      if (value.length > 0 && !isValidCurrency(value)) {
        throw new Error(`Invalid currency code: ${value}`);
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

    default:
      // Unknown key - should never happen if isValidWorkspaceMetaKey is checked first
      break;
  }
}

/**
 * Workspace Meta Service
 */
export class WorkspaceMetaService {
  private get schema() {
    return getActiveSchema();
  }

  private meta: ReturnType<typeof createMetaService<WorkspaceMetaKey>>;

  /**
   * Create a new WorkspaceMetaService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {
    this.meta = createMetaService<WorkspaceMetaKey>(db, {
      getTable: () => getActiveSchema().workspaceMeta,
      getQuery: () => db.query.workspaceMeta,
      getEntityIdCol: () => getActiveSchema().workspaceMeta.workspace_id,
      getKeyCol: () => getActiveSchema().workspaceMeta.meta_key,
      getValueCol: () => getActiveSchema().workspaceMeta.meta_value,
      validateKey: isValidWorkspaceMetaKey,
    });
  }

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

    return this.meta.get(workspaceId, key);
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
      .insert(this.schema.workspaceMeta)
      .values({
        id: nanoid(),
        workspace_id: workspaceId,
        meta_key: key,
        meta_value: value,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: [this.schema.workspaceMeta.workspace_id, this.schema.workspaceMeta.meta_key],
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

    return this.meta.getAll(workspaceId);
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

    const stored = await this.meta.getAll(workspaceId);
    return { ...WORKSPACE_META_DEFAULTS, ...stored };
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

    // Check if meta exists (use !== null to allow empty-string values)
    const existing = await this.meta.get(workspaceId, key);

    if (existing === null) {
      throw new WorkspaceMetaServiceError(
        ServiceErrorCode.META_NOT_FOUND,
        `Meta key not found: ${key}`,
        404
      );
    }

    // Delete
    await this.meta.delete(workspaceId, key);
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
  async getCurrency(workspaceId: string): Promise<Currency> {
    const value = await this.get(workspaceId, WORKSPACE_META_KEYS.CURRENCY);
    if (value && isValidCurrency(value)) {
      return value;
    }
    return DEFAULT_WORKSPACE_SETTINGS.currency;
  }

  /**
   * Set workspace's preferred currency
   *
   * @param workspaceId - Workspace ID
   * @param currency - Currency code (e.g., 'IDR', 'USD')
   */
  async setCurrency(workspaceId: string, currency: string): Promise<void> {
    const current = await this.getWorkspaceCurrencies(workspaceId);
    if (currency === current.primary) {
      return;
    }

    this.assertCurrencyPairValid(currency, current.secondary ?? '');
    await this.assertCurrencySettingsCanChange(workspaceId);
    await this.set(workspaceId, WORKSPACE_META_KEYS.CURRENCY, currency);
  }

  /**
   * Get workspace's secondary currency (optional)
   *
   * @param workspaceId - Workspace ID
   * @returns Secondary currency or null when disabled
   */
  async getSecondaryCurrency(workspaceId: string): Promise<Currency | null> {
    const value = await this.get(workspaceId, WORKSPACE_META_KEYS.SECONDARY_CURRENCY);
    if (value && isValidCurrency(value)) {
      return value;
    }
    return null;
  }

  /**
   * Set workspace's secondary currency (optional, use empty string to disable)
   *
   * @param workspaceId - Workspace ID
   * @param currency - Secondary currency code or empty string
   */
  async setSecondaryCurrency(workspaceId: string, currency: string): Promise<void> {
    const current = await this.getWorkspaceCurrencies(workspaceId);
    const currentSecondary = current.secondary ?? '';
    if (currency === currentSecondary) {
      return;
    }

    this.assertCurrencyPairValid(current.primary, currency);
    await this.assertCurrencySettingsCanChange(workspaceId);
    await this.set(workspaceId, WORKSPACE_META_KEYS.SECONDARY_CURRENCY, currency);
  }

  /**
   * Get workspace primary and secondary currencies as a pair
   */
  async getWorkspaceCurrencies(
    workspaceId: string
  ): Promise<{ primary: Currency; secondary: Currency | null }> {
    const [primary, secondary] = await Promise.all([
      this.getCurrency(workspaceId),
      this.getSecondaryCurrency(workspaceId),
    ]);

    return { primary, secondary };
  }

  /**
   * Check whether workspace currency settings are still editable
   *
   * IMPORTANT: includes soft-deleted rows to prevent create->delete->change bypass.
   */
  async canChangeCurrencySettings(workspaceId: string): Promise<boolean> {
    await this.ensureWorkspaceExists(workspaceId);

    const schema = this.schema;

    const [accountCount] = await (this.db as any)
      .select({ count: sql<number>`count(*)` })
      .from(schema.accounts)
      .where(eq(schema.accounts.workspace_id, workspaceId));

    if ((accountCount?.count ?? 0) > 0) {
      return false;
    }

    const [budgetCount] = await (this.db as any)
      .select({ count: sql<number>`count(*)` })
      .from(schema.budgets)
      .where(eq(schema.budgets.workspace_id, workspaceId));

    if ((budgetCount?.count ?? 0) > 0) {
      return false;
    }

    const [transactionCount] = await (this.db as any)
      .select({ count: sql<number>`count(*)` })
      .from(schema.transactions)
      .where(eq(schema.transactions.workspace_id, workspaceId));

    return (transactionCount?.count ?? 0) === 0;
  }

  /**
   * Atomically update workspace primary and secondary currencies.
   */
  async setCurrencySettings(
    workspaceId: string,
    primary: string,
    secondary: string
  ): Promise<void> {
    const current = await this.getWorkspaceCurrencies(workspaceId);
    const currentSecondary = current.secondary ?? '';
    const primaryChanging = primary !== current.primary;
    const secondaryChanging = secondary !== currentSecondary;

    if (!primaryChanging && !secondaryChanging) {
      return;
    }

    this.assertCurrencyPairValid(primary, secondary);
    await this.assertCurrencySettingsCanChange(workspaceId);

    const schema = this.schema;
    const now = new Date();

    await runTransaction(this.db, async (tx) => {
      await tx
        .insert(schema.workspaceMeta)
        .values({
          id: nanoid(),
          workspace_id: workspaceId,
          meta_key: WORKSPACE_META_KEYS.CURRENCY,
          meta_value: primary,
          created_at: now,
          updated_at: now,
        })
        .onConflictDoUpdate({
          target: [schema.workspaceMeta.workspace_id, schema.workspaceMeta.meta_key],
          set: {
            meta_value: primary,
            updated_at: now,
          },
        });

      await tx
        .insert(schema.workspaceMeta)
        .values({
          id: nanoid(),
          workspace_id: workspaceId,
          meta_key: WORKSPACE_META_KEYS.SECONDARY_CURRENCY,
          meta_value: secondary,
          created_at: now,
          updated_at: now,
        })
        .onConflictDoUpdate({
          target: [schema.workspaceMeta.workspace_id, schema.workspaceMeta.meta_key],
          set: {
            meta_value: secondary,
            updated_at: now,
          },
        });
    });
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

    const rawCurrency = metaAll[WORKSPACE_META_KEYS.CURRENCY];
    const currency = isValidCurrency(rawCurrency)
      ? rawCurrency
      : DEFAULT_WORKSPACE_SETTINGS.currency;

    const rawSecondaryCurrency = metaAll[WORKSPACE_META_KEYS.SECONDARY_CURRENCY];
    const secondaryCurrency =
      rawSecondaryCurrency.length > 0 && isValidCurrency(rawSecondaryCurrency)
        ? rawSecondaryCurrency
        : DEFAULT_WORKSPACE_SETTINGS.secondaryCurrency;

    // Validate week_start at runtime
    const rawWeekStart = metaAll[WORKSPACE_META_KEYS.WEEK_START];
    const weekStart = isValidWeekStart(rawWeekStart)
      ? rawWeekStart
      : DEFAULT_WORKSPACE_SETTINGS.weekStart;

    return {
      currency,
      secondaryCurrency,
      weekStart,
      compactNumbers: metaValueToBoolean(
        metaAll[WORKSPACE_META_KEYS.COMPACT_NUMBERS],
        DEFAULT_WORKSPACE_SETTINGS.compactNumbers
      ),
    };
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  /**
   * Validate currency pair values and constraints
   */
  private assertCurrencyPairValid(primary: string, secondary: string): void {
    try {
      validateMetaValue(WORKSPACE_META_KEYS.CURRENCY, primary);
      validateMetaValue(WORKSPACE_META_KEYS.SECONDARY_CURRENCY, secondary);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid value';
      throw new WorkspaceMetaServiceError(ServiceErrorCode.INVALID_META_VALUE, message, 400);
    }

    if (secondary.length > 0 && primary === secondary) {
      throw new WorkspaceMetaServiceError(
        ServiceErrorCode.INVALID_META_VALUE,
        'Secondary currency must differ from primary currency',
        400
      );
    }
  }

  /**
   * Enforce workspace-level currency lock when financial records already exist.
   */
  private async assertCurrencySettingsCanChange(workspaceId: string): Promise<void> {
    const canChange = await this.canChangeCurrencySettings(workspaceId);
    if (!canChange) {
      throw new WorkspaceMetaServiceError(
        ServiceErrorCode.CURRENCY_LOCKED,
        CURRENCY_LOCKED_MESSAGE,
        400
      );
    }
  }

  /**
   * Check if workspace exists, throw if not
   */
  private async ensureWorkspaceExists(workspaceId: string): Promise<void> {
    const workspace = await this.db.query.workspaces.findFirst({
      where: eq(this.schema.workspaces.id, workspaceId),
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
