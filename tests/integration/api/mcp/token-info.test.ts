import { describe, expect, it } from 'bun:test';
import type { AppPasswordSummary } from '@/services/mcp-app-password.service';
import { handleGetTokenInfo } from '@mcp-server/tools/token-info';
import type { ToolContext } from '@mcp-server/tools/types';

const createdAt = new Date('2026-11-01T00:00:00.000Z');

function context(
  auth: Partial<ToolContext['auth']>,
  findForUser: (userId: string, id: string) => Promise<AppPasswordSummary | null> = async () =>
    null,
  rateLimit: ToolContext['rateLimit'] = null
): ToolContext {
  return {
    auth: {
      kind: 'app_password',
      workspaceId: 'workspace-1',
      userId: 'user-1',
      tokenId: 'pat_1',
      tokenName: 'Cron agent',
      permissions: [],
      ...auth,
    },
    rateLimit,
    services: { appPassword: { findForUser } },
  } as unknown as ToolContext;
}

const summary: AppPasswordSummary = {
  id: 'pat_1',
  name: 'Cron agent',
  tokenHint: 'aw_pat_abcd',
  permissions: ['accounts:read'],
  preset: 'custom',
  createdAt,
  lastUsedAt: null,
  expiresAt: null,
  isExpired: false,
};

function parse(result: Awaited<ReturnType<typeof handleGetTokenInfo>>): unknown {
  return JSON.parse(result.content[0].text);
}

describe('get_token_info', () => {
  it('describes an OAuth token by kind and the permissions it holds', async () => {
    const result = await handleGetTokenInfo(
      {},
      context({ kind: 'oauth', tokenId: 'tok-1', permissions: ['accounts:read', 'budgets:read'] })
    );

    expect(parse(result)).toEqual({
      kind: 'oauth',
      permissions: ['accounts:read', 'budgets:read'],
    });
  });

  it('describes an app password, with no rate limit over stdio', async () => {
    const lookups: string[] = [];
    const result = await handleGetTokenInfo(
      {},
      context({ permissions: ['accounts:read'] }, async (userId, id) => {
        lookups.push(`${userId} ${id}`);
        return summary;
      })
    );

    expect(lookups).toEqual(['user-1 pat_1']);
    expect(parse(result)).toEqual({
      kind: 'app_password',
      id: 'pat_1',
      name: 'Cron agent',
      preset: 'custom',
      permissions: ['accounts:read'],
      expires_at: null,
      created_at: '2026-11-01T00:00:00.000Z',
      rate_limit: null,
    });
  });

  it('reports the rate limit the transport passes in', async () => {
    const rateLimit = { limit: 60, window_seconds: 60 };
    const result = await handleGetTokenInfo(
      {},
      context({}, async () => summary, rateLimit)
    );

    expect(parse(result)).toMatchObject({ rate_limit: rateLimit });
  });

  it('is an error when the app password is gone', async () => {
    const result = await handleGetTokenInfo({}, context({}));

    expect(result).toEqual({
      isError: true,
      content: [{ type: 'text', text: 'This app password is no longer valid.' }],
    });
  });
});
