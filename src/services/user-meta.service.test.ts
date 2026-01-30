/**
 * Unit tests for UserMetaService
 */

import { describe, it, expect, mock } from 'bun:test';
import { UserMetaService } from './user-meta.service';
import { ServiceErrorCode, UserMetaServiceError } from './service-errors';
import { USER_META_KEYS, META_VALUE_MAX_SIZE, META_DEFAULTS } from '@/lib/constants/user-meta-keys';

describe('UserMetaService', () => {
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
    meta_key: USER_META_KEYS.CURRENCY,
    meta_value: 'USD',
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
      values: mock(() => Promise.resolve({})),
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
      const result = await service.getUserMeta('user-1', USER_META_KEYS.CURRENCY);

      expect(result).toBe('USD');
    });

    it('should return null when meta does not exist', async () => {
      const mockDb = createMockDb();

      const service = new UserMetaService(mockDb as any);
      const result = await service.getUserMeta('user-1', USER_META_KEYS.CURRENCY);

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
        await service.getUserMeta('user-1', USER_META_KEYS.CURRENCY);
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
            Promise.resolve([{ ...mockMeta, meta_key: USER_META_KEYS.CURRENCY, meta_value: 'USD' }])
          ),
        },
      });

      const service = new UserMetaService(mockDb as any);
      const result = await service.getUserMetaAll('user-1');

      expect(result[USER_META_KEYS.CURRENCY]).toBe('USD');
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
      const insertMock = mock(() => ({
        values: mock(() => Promise.resolve({})),
      }));

      const mockDb = createMockDb({
        insert: insertMock,
      });

      const service = new UserMetaService(mockDb as any);
      await service.setUserMeta('user-1', USER_META_KEYS.CURRENCY, 'USD');

      expect(insertMock).toHaveBeenCalled();
    });

    it('should update existing meta', async () => {
      const updateMock = mock(() => ({
        set: mock(() => ({
          where: mock(() => Promise.resolve({})),
        })),
      }));

      const mockDb = createMockDb({
        userMeta: {
          findFirst: mock(() => Promise.resolve(mockMeta)),
          findMany: mock(() => Promise.resolve([])),
        },
        update: updateMock,
      });

      const service = new UserMetaService(mockDb as any);
      await service.setUserMeta('user-1', USER_META_KEYS.CURRENCY, 'IDR');

      expect(updateMock).toHaveBeenCalled();
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
        await service.setUserMeta('user-1', USER_META_KEYS.CURRENCY, largeValue);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(UserMetaServiceError);
        expect((error as UserMetaServiceError).code).toBe(ServiceErrorCode.VALUE_TOO_LARGE);
      }
    });

    it('should validate value schema per key', async () => {
      const mockDb = createMockDb();

      const service = new UserMetaService(mockDb as any);

      // Currency must be 'IDR' or 'USD'
      try {
        await service.setUserMeta('user-1', USER_META_KEYS.CURRENCY, 'INVALID');
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
      await service.deleteUserMeta('user-1', USER_META_KEYS.CURRENCY);

      expect(deleteMock).toHaveBeenCalled();
    });

    it('should throw error when meta not found', async () => {
      const mockDb = createMockDb();

      const service = new UserMetaService(mockDb as any);

      try {
        await service.deleteUserMeta('user-1', USER_META_KEYS.CURRENCY);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(UserMetaServiceError);
        expect((error as UserMetaServiceError).code).toBe(ServiceErrorCode.META_NOT_FOUND);
      }
    });
  });

  describe('Type-safe wrappers', () => {
    describe('getUserCurrency', () => {
      it('should return currency value', async () => {
        const mockDb = createMockDb({
          userMeta: {
            findFirst: mock(() => Promise.resolve({ ...mockMeta, meta_value: 'USD' })),
            findMany: mock(() => Promise.resolve([])),
          },
        });

        const service = new UserMetaService(mockDb as any);
        const result = await service.getUserCurrency('user-1');

        expect(result).toBe('USD');
      });

      it('should return default IDR when not set', async () => {
        const mockDb = createMockDb();

        const service = new UserMetaService(mockDb as any);
        const result = await service.getUserCurrency('user-1');

        expect(result).toBe('IDR');
      });
    });

    describe('setUserCurrency', () => {
      it('should set currency value', async () => {
        const insertMock = mock(() => ({
          values: mock(() => Promise.resolve({})),
        }));

        const mockDb = createMockDb({ insert: insertMock });

        const service = new UserMetaService(mockDb as any);
        await service.setUserCurrency('user-1', 'USD');

        expect(insertMock).toHaveBeenCalled();
      });
    });

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
                  meta_key: USER_META_KEYS.CURRENCY,
                  meta_value: 'USD',
                },
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
              ])
            ),
          },
        });

        const service = new UserMetaService(mockDb as any);
        const result = await service.getUserSettings('user-1');

        expect(result).toEqual({
          currency: 'USD',
          showConvertedTotals: false,
          showIndividualCurrencies: true,
        });
      });

      it('should return defaults when no meta set', async () => {
        const mockDb = createMockDb();

        const service = new UserMetaService(mockDb as any);
        const result = await service.getUserSettings('user-1');

        expect(result).toEqual({
          currency: 'IDR',
          showConvertedTotals: true,
          showIndividualCurrencies: true,
        });
      });
    });
  });
});
