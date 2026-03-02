/**
 * User Meta Service
 *
 * Provides key-value storage for user preferences and settings.
 * Replaces the old user_settings system with a more flexible meta approach.
 *
 * Security features:
 * - Meta key allowlist validation
 * - Value size limit (4KB)
 * - Per-key value schema validation
 * - User-scoped access only
 *
 * Error codes:
 * - USER_NOT_FOUND: User doesn't exist
 * - INVALID_META_KEY: Key not in allowlist
 * - INVALID_META_VALUE: Value fails validation for key
 * - VALUE_TOO_LARGE: Value exceeds 4KB limit
 * - META_NOT_FOUND: Meta key doesn't exist for user
 */

import { type IDatabase, getActiveSchema } from '@/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createMetaService } from './base/meta.factory';
import {
  USER_META_KEYS,
  type UserMetaKey,
  type UserSettings,
  META_DEFAULTS,
  META_VALUE_MAX_SIZE,
  isValidMetaKey,
  validateMetaValue,
  metaValueToBoolean,
  booleanToMetaValue,
  DEFAULT_USER_SETTINGS,
} from '@/lib/constants/user-meta-keys';
import { UserMetaServiceError, ServiceErrorCode } from './service-errors';
import { getCacheManager, CacheKeys, CacheTags, invalidateTags } from '@/lib/cache';

/**
 * User Meta Service
 */
export class UserMetaService {
  private get schema() {
    return getActiveSchema();
  }

  private meta: ReturnType<typeof createMetaService<UserMetaKey>>;

  /**
   * Create a new UserMetaService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {
    this.meta = createMetaService<UserMetaKey>(db, {
      getTable: () => getActiveSchema().userMeta,
      getQuery: () => db.query.userMeta,
      getEntityIdCol: () => getActiveSchema().userMeta.user_id,
      getKeyCol: () => getActiveSchema().userMeta.meta_key,
      getValueCol: () => getActiveSchema().userMeta.meta_value,
      validateKey: isValidMetaKey,
    });
  }

  /**
   * Get a single meta value for a user
   *
   * @param userId - User ID
   * @param key - Meta key
   * @returns The meta value or null if not set
   * @throws {UserMetaServiceError} If user not found or invalid key
   */
  async getUserMeta(userId: string, key: UserMetaKey): Promise<string | null> {
    // Validate key
    if (!isValidMetaKey(key)) {
      throw new UserMetaServiceError(
        ServiceErrorCode.INVALID_META_KEY,
        `Invalid meta key: ${key}`,
        400
      );
    }

    // Check if user exists
    await this.ensureUserExists(userId);

    return this.meta.get(userId, key);
  }

  /**
   * Get all meta values for a user as a record
   *
   * @param userId - User ID
   * @returns Record of meta key to value (includes defaults for unset keys)
   * @throws {UserMetaServiceError} If user not found
   */
  async getUserMetaAll(userId: string): Promise<Record<UserMetaKey, string>> {
    // Check if user exists
    await this.ensureUserExists(userId);

    // Get all meta for user, merge with defaults
    const stored = await this.meta.getAll(userId);
    return { ...META_DEFAULTS, ...stored };
  }

  /**
   * Set a meta value for a user (upsert)
   *
   * @param userId - User ID
   * @param key - Meta key
   * @param value - Meta value
   * @throws {UserMetaServiceError} If user not found, invalid key, invalid value, or value too large
   */
  async setUserMeta(userId: string, key: UserMetaKey, value: string): Promise<void> {
    // Validate key
    if (!isValidMetaKey(key)) {
      throw new UserMetaServiceError(
        ServiceErrorCode.INVALID_META_KEY,
        `Invalid meta key: ${key}`,
        400
      );
    }

    // Validate value size using actual byte length (not character count)
    const byteLength = new TextEncoder().encode(value).length;
    if (byteLength > META_VALUE_MAX_SIZE) {
      throw new UserMetaServiceError(
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
      throw new UserMetaServiceError(ServiceErrorCode.INVALID_META_VALUE, message, 400);
    }

    // Check if user exists
    await this.ensureUserExists(userId);

    // Use upsert to avoid race condition
    // ON CONFLICT (user_id, meta_key) DO UPDATE
    await this.db
      .insert(this.schema.userMeta)
      .values({
        meta_id: nanoid(),
        user_id: userId,
        meta_key: key,
        meta_value: value,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: [this.schema.userMeta.user_id, this.schema.userMeta.meta_key],
        set: {
          meta_value: value,
          updated_at: new Date(),
        },
      });

    // Invalidate settings cache
    await invalidateTags([CacheTags.user(userId), CacheTags.SETTINGS], 'strict');
  }

  /**
   * Delete a meta value for a user
   *
   * @param userId - User ID
   * @param key - Meta key
   * @throws {UserMetaServiceError} If user not found, invalid key, or meta not found
   */
  async deleteUserMeta(userId: string, key: UserMetaKey): Promise<void> {
    // Validate key
    if (!isValidMetaKey(key)) {
      throw new UserMetaServiceError(
        ServiceErrorCode.INVALID_META_KEY,
        `Invalid meta key: ${key}`,
        400
      );
    }

    // Check if user exists
    await this.ensureUserExists(userId);

    // Check if meta exists (use !== null to allow empty-string values)
    const existing = await this.meta.get(userId, key);

    if (existing === null) {
      throw new UserMetaServiceError(
        ServiceErrorCode.META_NOT_FOUND,
        `Meta key not found: ${key}`,
        404
      );
    }

    // Delete
    await this.meta.delete(userId, key);

    // Invalidate settings cache
    await invalidateTags([CacheTags.user(userId), CacheTags.SETTINGS], 'strict');
  }

  // ============================================================================
  // Type-safe wrappers for common settings
  // ============================================================================

  /**
   * Get whether to show converted totals
   *
   * @param userId - User ID
   * @returns Boolean (default true)
   */
  async getShowConvertedTotals(userId: string): Promise<boolean> {
    const value = await this.getUserMeta(userId, USER_META_KEYS.SHOW_CONVERTED_TOTALS);
    return metaValueToBoolean(value, true);
  }

  /**
   * Set whether to show converted totals
   *
   * @param userId - User ID
   * @param value - Boolean
   */
  async setShowConvertedTotals(userId: string, value: boolean): Promise<void> {
    await this.setUserMeta(userId, USER_META_KEYS.SHOW_CONVERTED_TOTALS, booleanToMetaValue(value));
  }

  /**
   * Get whether to show individual currencies
   *
   * @param userId - User ID
   * @returns Boolean (default true)
   */
  async getShowIndividualCurrencies(userId: string): Promise<boolean> {
    const value = await this.getUserMeta(userId, USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES);
    return metaValueToBoolean(value, true);
  }

  /**
   * Set whether to show individual currencies
   *
   * @param userId - User ID
   * @param value - Boolean
   */
  async setShowIndividualCurrencies(userId: string, value: boolean): Promise<void> {
    await this.setUserMeta(
      userId,
      USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES,
      booleanToMetaValue(value)
    );
  }

  /**
   * Get all user settings as a typed object
   *
   * @param userId - User ID
   * @returns UserSettings object with all preferences
   */
  async getUserSettings(userId: string): Promise<UserSettings> {
    const cache = getCacheManager();
    const cacheKey = CacheKeys.settings(userId);

    // Try cache first
    const cached = await cache.get<UserSettings>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from database
    const metaAll = await this.getUserMetaAll(userId);

    const result: UserSettings = {
      showConvertedTotals: metaValueToBoolean(
        metaAll[USER_META_KEYS.SHOW_CONVERTED_TOTALS],
        DEFAULT_USER_SETTINGS.showConvertedTotals
      ),
      showIndividualCurrencies: metaValueToBoolean(
        metaAll[USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES],
        DEFAULT_USER_SETTINGS.showIndividualCurrencies
      ),
      phone: metaAll[USER_META_KEYS.PHONE] || DEFAULT_USER_SETTINGS.phone,
    };

    // Cache the result
    await cache.set(cacheKey, result, {
      ttl: 3600,
      tags: [CacheTags.user(userId), CacheTags.SETTINGS],
    });

    return result;
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  /**
   * Check if user exists, throw if not
   */
  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.db.query.users.findFirst({
      where: eq(this.schema.users.id, userId),
    });

    if (!user) {
      throw new UserMetaServiceError(ServiceErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }
  }
}
