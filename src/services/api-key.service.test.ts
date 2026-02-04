import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ApiKeyService } from './api-key.service';
import { createMockDatabase, resetMockDatabase } from './test-helpers/mocks';

describe('ApiKeyService', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let service: ApiKeyService;

  beforeEach(() => {
    mockDb = createMockDatabase();
    service = new ApiKeyService(mockDb);
    resetMockDatabase(mockDb);
  });

  describe('generate', () => {
    it('should return a key starting with aw_ and store the hash', async () => {
      // Capture values passed to insert().values() so we can return realistic data
      let capturedValues: any = null;

      (mockDb.insert as any).mockReturnValueOnce({
        values: mock((vals: any) => {
          capturedValues = vals;
          return {
            returning: mock(() =>
              Promise.resolve([
                {
                  ...vals,
                  created_at: new Date(),
                },
              ])
            ),
          };
        }),
      });

      const result = await service.generate({
        workspace_id: 'ws-1',
        user_id: 'user-1',
        name: 'Test Key',
      });

      expect(result.plainKey).toStartWith('aw_');
      expect(result.plainKey.length).toBe(35); // 'aw_' + 32 chars
      expect(result.apiKey).toBeDefined();
      expect(result.apiKey.key_prefix).toStartWith('aw_');
      expect(result.apiKey.key_hash).toContain('$pbkdf2-sha256$');
      expect(mockDb.insert).toHaveBeenCalled();
      expect(capturedValues).not.toBeNull();
      expect(capturedValues.workspace_id).toBe('ws-1');
    });
  });

  describe('validate', () => {
    it('should return user context for a valid key', async () => {
      // Capture the actual hash computed during generate
      let capturedHash = '';

      (mockDb.insert as any).mockReturnValueOnce({
        values: mock((vals: any) => {
          capturedHash = vals.key_hash;
          return {
            returning: mock(() =>
              Promise.resolve([
                {
                  ...vals,
                  created_at: new Date(),
                },
              ])
            ),
          };
        }),
      });

      const generated = await service.generate({
        workspace_id: 'ws-1',
        user_id: 'user-1',
        name: 'Test',
      });

      // Now mock findMany to return the key with the real hash
      (mockDb.query.apiKeys as any) = {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() =>
          Promise.resolve([
            {
              id: 'key-1',
              workspace_id: 'ws-1',
              user_id: 'user-1',
              name: 'Test',
              key_hash: capturedHash,
              key_prefix: generated.plainKey.slice(0, 8),
              last_used_at: null,
              expires_at: null,
              created_at: new Date(),
              deleted_at: null,
            },
          ])
        ),
      };

      // Mock update for last_used_at
      (mockDb.update as any).mockReturnValueOnce({
        set: mock(() => ({
          where: mock(() => Promise.resolve()),
        })),
      });

      const result = await service.validate(generated.plainKey);

      expect(result).not.toBeNull();
      expect(result!.workspaceId).toBe('ws-1');
      expect(result!.userId).toBe('user-1');
    });

    it('should return null for an invalid key', async () => {
      (mockDb.query.apiKeys as any) = {
        findFirst: mock(() => Promise.resolve(undefined)),
        findMany: mock(() => Promise.resolve([])),
      };

      const result = await service.validate('aw_invalidkey12345678901234567890');
      expect(result).toBeNull();
    });

    it('should return null for a key without aw_ prefix', async () => {
      const result = await service.validate('invalidprefix');
      expect(result).toBeNull();
    });
  });
});
