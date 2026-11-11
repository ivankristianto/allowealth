import { describe, expect, it } from 'bun:test';
import { handleToolCall, type ToolContext } from '@mcp-server/tools/index';
import { AccountServiceError, ServiceErrorCode } from '@/services/service-errors';

function contextWithFindAll(findAll: () => Promise<unknown>): ToolContext {
  return {
    auth: { workspaceId: 'workspace-1', userId: 'user-1', tokenId: 'token-1', scope: 'read' },
    services: { account: { findAll } },
  } as unknown as ToolContext;
}

describe('MCP tool error wrapper', () => {
  it('hides a raw database error and returns an error id', async () => {
    const ctx = contextWithFindAll(async () => {
      throw new Error('Failed query: select * from "accounts"\nparams: workspace-1,secret-token');
    });

    const result = await handleToolCall('list_accounts', {}, ctx);
    const text = result.content[0].text;

    expect(result.isError).toBe(true);
    expect(text).not.toContain('Failed query');
    expect(text).not.toContain('secret-token');
    expect(text).toMatch(/^Error: tool list_accounts failed \(errorId [0-9a-f]{8}\)\.$/);
  });

  it('passes a ServiceError message through', async () => {
    const ctx = contextWithFindAll(async () => {
      throw new AccountServiceError(ServiceErrorCode.NOT_FOUND, 'Account not found', 404);
    });

    const result = await handleToolCall('list_accounts', {}, ctx);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Error: Account not found');
  });

  it('passes a Valibot validation message through so agents can fix their arguments', async () => {
    const result = await handleToolCall(
      'list_categories',
      { type: 'not-a-type' },
      contextWithFindAll(async () => [])
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toStartWith('Error: Invalid ');
  });
});
