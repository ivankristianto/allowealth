import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { CacheTags } from '@/lib/cache';
import { createMockDatabase } from './test-helpers/mocks';

const mockInvalidateByTags = mock(async () => {});

import {
  revokeMcpTokensForUser,
  softDeleteUserAndRevokeMcpTokens,
} from './mcp-token-revocation.service';

describe('mcp-token-revocation.service', () => {
  beforeEach(() => {
    mockInvalidateByTags.mockReset();
  });

  it('deletes user MCP tokens and invalidates token cache tags', async () => {
    const db = createMockDatabase() as any;

    db.query.oauthAccessToken = {
      findMany: mock(async () => [{ id: 'tok-1' }, { id: 'tok-2' }]),
    };

    await revokeMcpTokensForUser(db, 'user-1', {
      invalidateByTags: mockInvalidateByTags,
    });

    expect(db.delete).toHaveBeenCalled();
    expect(mockInvalidateByTags).toHaveBeenCalledWith([
      'mcp-token:tok-1',
      'mcp-token:tok-2',
      CacheTags.MCP_TOKENS,
    ]);
  });

  it('soft deletes the user and revokes MCP tokens in one transaction flow', async () => {
    const db = createMockDatabase() as any;

    db.query.oauthAccessToken = {
      findMany: mock(async () => [{ id: 'tok-1' }]),
    };

    await softDeleteUserAndRevokeMcpTokens(db, 'user-1', {
      invalidateByTags: mockInvalidateByTags,
    });

    expect(db.transaction).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalled();
    expect(db.delete).toHaveBeenCalled();
    expect(mockInvalidateByTags).toHaveBeenCalledWith(['mcp-token:tok-1', CacheTags.MCP_TOKENS]);
  });

  it('propagates deletion failures so the transaction can roll back', async () => {
    const db = createMockDatabase() as any;

    db.query.oauthAccessToken = {
      findMany: mock(async () => [{ id: 'tok-1' }]),
    };
    db.delete = mock(() => ({
      where: mock(async () => {
        throw new Error('delete failed');
      }),
    }));

    await expect(softDeleteUserAndRevokeMcpTokens(db, 'user-1')).rejects.toThrow('delete failed');
  });

  it('does not fail the operation when cache invalidation fails after commit', async () => {
    const db = createMockDatabase() as any;

    db.query.oauthAccessToken = {
      findMany: mock(async () => [{ id: 'tok-1' }]),
    };

    await expect(
      softDeleteUserAndRevokeMcpTokens(db, 'user-1', {
        invalidateByTags: async () => {
          throw new Error('cache failed');
        },
      })
    ).resolves.toBeUndefined();
  });
});
