/**
 * Unit tests for UserMetaService
 */

import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { UserMetaService } from './user-meta.service';
import { ServiceErrorCode, UserMetaServiceError } from './service-errors';
import { USER_META_KEYS, META_VALUE_MAX_SIZE, META_DEFAULTS } from '@/lib/constants/user-meta-keys';
import { resetCacheManager } from '@/lib/cache';

describe('UserMetaService', () => {
  // Reset cache manager before each test to prevent cache pollution
  beforeEach(() => {
    resetCacheManager();
  });

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    password_hash: 'hash',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockMeta = {
    meta_id: 'meta-1',
    user_id: 'user-1',
    meta_key: USER_META_KEYS.PHONE,
    meta_value: '+1234567890',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const createMockDb = (overrides: any = {}) => ({
    query: {
      users: {
        findFirst: mock(() => Promise.resolve(mockUser)),
        ...overrides.users,
      },
      userMeta: {
        findFirst: mock(() => Promise.resolve(null)),
        findMany: mock(() => Promise.resolve([])),
        ...overrides.userMeta,
      },
    },
    insert: mock(() => ({
      values: mock(() => ({
        onConflictDoUpdate: mock(() => Promise.resolve({})),
        onConflictDoNothing: mock(() => Promise.resolve({})),
      })),
    })),
    update: mock(() => ({
      set: mock(() => ({
        where: mock(() => Promise.resolve({})),
      })),
    })),
    delete: mock(() => ({
      where: mock(() => Promise.resolve({})),
    })),
    ...overrides,
  });

  describe('getUserMeta', () => {
    it('should return meta value when it exists', async () => {
      const mockDb = createMockDb({
        userMeta: {
          findFirst: mock(() => Promise.resolve(mockMeta)),
          findMany: mock(() => Promise.resolve([])),
        },
      });

      const service = new UserMetaService(mockDb as any);
      const result = await service.getUserMeta('user-1', USER_META_KEYS.PHONE);

      expect(result).toBe('+1234567890');
    });

    it('should return null when meta does not exist', async () => {
      const mockDb = createMockDb();

      const service = new UserMetaService(mockDb as any);
      const result = await service.getUserMeta('user-1', USER_META_KEYS.PHONE);

      expect(result).toBeNull();
    });

    it('should throw error for invalid meta key', async () => {
      const mockDb = createMockDb();

      const service = new UserMetaService(mockDb as any);

      try {
        await service.getUserMeta('user-1', 'invalid_key' as any);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(UserMetaServiceError);
      }
    });

    it('should throw error when user not found', async () => {
      const mockDb = createMockDb({
        users: {
          findFirst: mock(() => Promise.resolve(null)),
        },
      });

      const service = new UserMetaService(mockDb as any);

      try {
        await service.getUserMeta('user-1', USER_META_KEYS.PHONE);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(UserMetaServiceError);
        expect((error as UserMetaServiceError).code).toBe(ServiceErrorCode.USER_NOT_FOUND);
      }
    });
  });

  describe('getUserMetaAll', () => {
    it('should return all meta values with defaults', async () => {
      const mockDb = createMockDb({
        userMeta: {
          findFirst: mock(() => Promise.resolve(null)),
          findMany: mock(() =>
            Promise.resolve([
              { ...mockMeta, meta_key: USER_META_KEYS.PHONE, meta_value: '+1234567890' },
            ])
          ),
        },
      });

      const service = new UserMetaService(mockDb as any);
      const result = await service.getUserMetaAll('user-1');

      expect(result[USER_META_KEYS.PHONE]).toBe('+1234567890');
      // Defaults should be applied for unset keys
      expect(result[USER_META_KEYS.SHOW_CONVERTED_TOTALS]).toBe(
        META_DEFAULTS[USER_META_KEYS.SHOW_CONVERTED_TOTALS]
      );
    });

    it('should return all defaults when no meta exists', async () => {
      const mockDb = createMockDb();

      const service = new UserMetaService(mockDb as any);
      const result = await service.getUserMetaAll('user-1');

      expect(result).toEqual(META_DEFAULTS);
    });
  });

  describe('setUserMeta', () => {
    it('should create new meta when it does not exist', async () => {
      const onConflictDoUpdateMock = mock(() => Promise.resolve({}));
      const insertMock = mock(() => ({
        values: mock(() => ({
          onConflictDoUpdate: onConflictDoUpdateMock,
        })),
      }));

      const mockDb = createMockDb({
        insert: insertMock,
      });

      const service = new UserMetaService(mockDb as any);
      await service.setUserMeta('user-1', USER_META_KEYS.PHONE, '+1234567890');

      expect(insertMock).toHaveBeenCalled();
      expect(onConflictDoUpdateMock).toHaveBeenCalled();
    });

    it('should update existing meta', async () => {
      // The service now uses upsert (onConflictDoUpdate), not separate update
      const onConflictDoUpdateMock = mock(() => Promise.resolve({}));
      const insertMock = mock(() => ({
        values: mock(() => ({
          onConflictDoUpdate: onConflictDoUpdateMock,
        })),
      }));

      const mockDb = createMockDb({
        userMeta: {
          findFirst: mock(() => Promise.resolve(mockMeta)),
          findMany: mock(() => Promise.resolve([])),
        },
        insert: insertMock,
      });

      const service = new UserMetaService(mockDb as any);
      await service.setUserMeta('user-1', USER_META_KEYS.PHONE, '+0987654321');

      expect(insertMock).toHaveBeenCalled();
      expect(onConflictDoUpdateMock).toHaveBeenCalled();
    });

    it('should reject invalid meta key', async () => {
      const mockDb = createMockDb();

      const service = new UserMetaService(mockDb as any);

      try {
        await service.setUserMeta('user-1', 'invalid_key' as any, 'value');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(UserMetaServiceError);
        expect((error as UserMetaServiceError).code).toBe(ServiceErrorCode.INVALID_META_KEY);
      }
    });

    it('should reject value exceeding 4KB', async () => {
      const mockDb = createMockDb();

      const service = new UserMetaService(mockDb as any);
      const largeValue = 'a'.repeat(META_VALUE_MAX_SIZE + 1);

      try {
        await service.setUserMeta('user-1', USER_META_KEYS.BIO, largeValue);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(UserMetaServiceError);
        expect((error as UserMetaServiceError).code).toBe(ServiceErrorCode.VALUE_TOO_LARGE);
      }
    });

    it('should validate value schema per key', async () => {
      const mockDb = createMockDb();

      const service = new UserMetaService(mockDb as any);

      // Phone must be max 50 characters
      try {
        await service.setUserMeta('user-1', USER_META_KEYS.PHONE, 'x'.repeat(51));
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(UserMetaServiceError);
        expect((error as UserMetaServiceError).code).toBe(ServiceErrorCode.INVALID_META_VALUE);
      }
    });

    it('should validate boolean values as strings', async () => {
      const mockDb = createMockDb();

      const service = new UserMetaService(mockDb as any);

      // Boolean values must be 'true' or 'false'
      try {
        await service.setUserMeta('user-1', USER_META_KEYS.SHOW_CONVERTED_TOTALS, 'yes');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(UserMetaServiceError);
        expect((error as UserMetaServiceError).code).toBe(ServiceErrorCode.INVALID_META_VALUE);
      }
    });
  });

  describe('deleteUserMeta', () => {
    it('should delete existing meta', async () => {
      const deleteMock = mock(() => ({
        where: mock(() => Promise.resolve({})),
      }));

      const mockDb = createMockDb({
        userMeta: {
          findFirst: mock(() => Promise.resolve(mockMeta)),
          findMany: mock(() => Promise.resolve([])),
        },
        delete: deleteMock,
      });

      const service = new UserMetaService(mockDb as any);
      await service.deleteUserMeta('user-1', USER_META_KEYS.PHONE);

      expect(deleteMock).toHaveBeenCalled();
    });

    it('should throw error when meta not found', async () => {
      const mockDb = createMockDb();

      const service = new UserMetaService(mockDb as any);

      try {
        await service.deleteUserMeta('user-1', USER_META_KEYS.PHONE);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(UserMetaServiceError);
        expect((error as UserMetaServiceError).code).toBe(ServiceErrorCode.META_NOT_FOUND);
      }
    });
  });

  describe('Type-safe wrappers', () => {
    describe('getShowConvertedTotals', () => {
      it('should return boolean true when set to "true"', async () => {
        const mockDb = createMockDb({
          userMeta: {
            findFirst: mock(() =>
              Promise.resolve({
                ...mockMeta,
                meta_key: USER_META_KEYS.SHOW_CONVERTED_TOTALS,
                meta_value: 'true',
              })
            ),
            findMany: mock(() => Promise.resolve([])),
          },
        });

        const service = new UserMetaService(mockDb as any);
        const result = await service.getShowConvertedTotals('user-1');

        expect(result).toBe(true);
      });

      it('should return boolean false when set to "false"', async () => {
        const mockDb = createMockDb({
          userMeta: {
            findFirst: mock(() =>
              Promise.resolve({
                ...mockMeta,
                meta_key: USER_META_KEYS.SHOW_CONVERTED_TOTALS,
                meta_value: 'false',
              })
            ),
            findMany: mock(() => Promise.resolve([])),
          },
        });

        const service = new UserMetaService(mockDb as any);
        const result = await service.getShowConvertedTotals('user-1');

        expect(result).toBe(false);
      });

      it('should return default true when not set', async () => {
        const mockDb = createMockDb();

        const service = new UserMetaService(mockDb as any);
        const result = await service.getShowConvertedTotals('user-1');

        expect(result).toBe(true);
      });
    });

    describe('getUserSettings', () => {
      it('should return all settings as typed object', async () => {
        const mockDb = createMockDb({
          userMeta: {
            findFirst: mock(() => Promise.resolve(null)),
            findMany: mock(() =>
              Promise.resolve([
                {
                  ...mockMeta,
                  meta_key: USER_META_KEYS.SHOW_CONVERTED_TOTALS,
                  meta_value: 'false',
                },
                {
                  ...mockMeta,
                  meta_key: USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES,
                  meta_value: 'true',
                },
                {
                  ...mockMeta,
                  meta_key: USER_META_KEYS.PHONE,
                  meta_value: '+1234567890',
                },
              ])
            ),
          },
        });

        const service = new UserMetaService(mockDb as any);
        const result = await service.getUserSettings('user-1');

        expect(result).toEqual({
          showConvertedTotals: false,
          showIndividualCurrencies: true,
          phone: '+1234567890',
          bio: '',
        });
      });

      it('should return defaults when no meta set', async () => {
        const mockDb = createMockDb();

        const service = new UserMetaService(mockDb as any);
        const result = await service.getUserSettings('user-1');

        expect(result).toEqual({
          showConvertedTotals: true,
          showIndividualCurrencies: true,
          phone: '',
          bio: '',
        });
      });
    });
  });
});
