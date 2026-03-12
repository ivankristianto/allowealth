import { beforeEach, afterEach, describe, expect, it, mock } from 'bun:test';
import { ApiKeyService } from '@/services/api-key.service';
import { CacheTags, getCacheManager, resetCacheManager } from '@/lib/cache';
import { createMockDatabase, resetMockDatabase } from '@/services/test-helpers/mocks';
import { setTestEnv } from '@/lib/env';

describe('ApiKeyService cache contract', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let apiKeyService: ApiKeyService;

  beforeEach(() => {
    setTestEnv({ CACHE_DRIVER: 'memory' });
    resetCacheManager();
    mockDb = createMockDatabase();
    apiKeyService = new ApiKeyService(mockDb);
    resetMockDatabase(mockDb);
  });

  afterEach(() => {
    setTestEnv(null);
  });

  it('validateCached reuses cached auth context after a successful record lookup', async () => {
    let insertedValues: any;
    const values = mock((payload: any) => {
      insertedValues = payload;
      return {
        returning: mock(() =>
          Promise.resolve([
            {
              id: payload.id,
              name: payload.name,
              key_prefix: payload.key_prefix,
              created_at: payload.created_at,
              expires_at: payload.expires_at,
            },
          ])
        ),
      };
    });
    (mockDb.insert as any).mockReturnValue({ values });

    const { plainKey } = await apiKeyService.generate({
      workspace_id: 'ws-1',
      user_id: 'user-1',
      name: 'cached key',
    });

    (mockDb.query.apiKeys.findMany as any).mockImplementation(async () => [
      {
        id: insertedValues.id,
        workspace_id: insertedValues.workspace_id,
        user_id: insertedValues.user_id,
        key_prefix: insertedValues.key_prefix,
        key_hash: insertedValues.key_hash,
        expires_at: insertedValues.expires_at,
        deleted_at: null,
      },
    ]);

    const first = await apiKeyService.validateCached(plainKey);
    const second = await apiKeyService.validateCached(plainKey);

    expect(first).toEqual(second);
    expect(mockDb.query.apiKeys.findMany).toHaveBeenCalledTimes(1);
  });

  it('validateCached returns the auth context shape used by downstream services', async () => {
    apiKeyService.validate = mock(async () => ({
      workspaceId: 'ws-current',
      userId: 'user-current',
      apiKeyId: 'key-current',
    })) as any;

    const result = await apiKeyService.validateCached('aw_downstream_contract_key_123456');

    expect(result).toEqual({
      workspaceId: 'ws-current',
      userId: 'user-current',
      apiKeyId: 'key-current',
    });
  });

  it('does not cache overridden validate() results when expiry is unknown', async () => {
    const validateSpy = mock(async () => ({
      workspaceId: 'ws-override',
      userId: 'user-override',
      apiKeyId: 'key-override',
    }));
    apiKeyService.validate = validateSpy as any;

    const first = await apiKeyService.validateCached('aw_override_key_12345678901234567890');
    const second = await apiKeyService.validateCached('aw_override_key_12345678901234567890');

    expect(first).toEqual(second);
    expect(validateSpy).toHaveBeenCalledTimes(2);
  });

  it('validateCached does not return a cached context after the API key expires', async () => {
    let insertedValues: any;
    const expiresAt = new Date(Date.now() + 20);
    const values = mock((payload: any) => {
      insertedValues = payload;
      return {
        returning: mock(() =>
          Promise.resolve([
            {
              id: payload.id,
              name: payload.name,
              key_prefix: payload.key_prefix,
              created_at: payload.created_at,
              expires_at: payload.expires_at,
            },
          ])
        ),
      };
    });
    (mockDb.insert as any).mockReturnValue({ values });

    const { plainKey } = await apiKeyService.generate({
      workspace_id: 'ws-expiring',
      user_id: 'user-expiring',
      name: 'expiring key',
      expires_at: expiresAt,
    });

    (mockDb.query.apiKeys.findMany as any).mockImplementation(async () => [
      {
        id: insertedValues.id,
        workspace_id: insertedValues.workspace_id,
        user_id: insertedValues.user_id,
        key_prefix: insertedValues.key_prefix,
        key_hash: insertedValues.key_hash,
        expires_at: expiresAt,
        deleted_at: null,
      },
    ]);

    const first = await apiKeyService.validateCached(plainKey, 300);
    expect(first).toEqual({
      workspaceId: 'ws-expiring',
      userId: 'user-expiring',
      apiKeyId: insertedValues.id,
    });

    await new Promise((resolve) => setTimeout(resolve, 40));

    const second = await apiKeyService.validateCached(plainKey, 300);
    expect(second).toBeNull();
  });

  it('revoke invalidates API key cache tags in service layer', async () => {
    const cache = getCacheManager();
    await cache.set(
      'test:apikey-cache',
      { ok: true },
      {
        ttl: 300,
        tags: [CacheTags.API_KEYS, 'apikey:aw_cache'],
      }
    );

    (mockDb.query.apiKeys.findFirst as any).mockResolvedValueOnce({
      id: 'key-1',
      workspace_id: 'ws-1',
      key_prefix: 'aw_cache',
      deleted_at: null,
    });

    const where = mock(() => Promise.resolve(undefined));
    const set = mock(() => ({ where }));
    (mockDb.update as any).mockReturnValue({ set });

    const revoked = await apiKeyService.revoke('key-1', 'ws-1');

    expect(revoked).toBe(true);
    expect(await cache.get('test:apikey-cache')).toBeNull();
  });
});
