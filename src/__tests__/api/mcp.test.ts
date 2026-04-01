import { beforeEach, describe, expect, it, mock } from 'bun:test';

import { clearRateLimitStore } from '@/lib/rate-limit';

const validateMcpTokenMock = mock(async () => ({
  workspaceId: 'ws-1',
  userId: 'user-1',
  tokenId: 'tok-1',
}));
const createServicesMock = mock(() => ({ service: 'ok' }));
const registerToolsMock = mock(() => []);
const handleToolCallMock = mock(async () => ({ ok: true }));

(mock as any).module?.('@/lib/mcp-auth', () => ({
  validateMcpToken: validateMcpTokenMock,
}));

(mock as any).module?.('@mcp-server/context', () => ({
  createServices: createServicesMock,
}));

(mock as any).module?.('@mcp-server/tools/index', () => ({
  registerTools: registerToolsMock,
  handleToolCall: handleToolCallMock,
}));

function createApiContext(request: Request) {
  return {
    request,
  } as any;
}

describe('POST /api/mcp', () => {
  beforeEach(() => {
    clearRateLimitStore();
    validateMcpTokenMock.mockClear();
    createServicesMock.mockClear();
    registerToolsMock.mockClear();
    handleToolCallMock.mockClear();
    validateMcpTokenMock.mockResolvedValue({
      workspaceId: 'ws-1',
      userId: 'user-1',
      tokenId: 'tok-1',
    });
  });

  it('returns 413 when content-length exceeds 64 KB', async () => {
    const { POST } = await import('@/pages/api/mcp');
    const response = await POST(
      createApiContext(
        new Request('http://localhost/api/mcp', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer token-1',
            'Content-Type': 'application/json',
            'Content-Length': '65537',
          },
          body: JSON.stringify({ method: 'ping' }),
        })
      )
    );

    expect(response.status).toBe(413);
    expect(validateMcpTokenMock).not.toHaveBeenCalled();
  });

  it('returns 413 when body exceeds 64 KB without content-length', async () => {
    const { POST } = await import('@/pages/api/mcp');
    const oversized = 'x'.repeat(70_000);

    const response = await POST(
      createApiContext(
        new Request('http://localhost/api/mcp', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer token-1',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ method: oversized }),
        })
      )
    );

    expect(response.status).toBe(413);
    expect(validateMcpTokenMock).not.toHaveBeenCalled();
  });

  it('returns 429 after 60 requests for the same token', async () => {
    const { POST } = await import('@/pages/api/mcp');

    for (let i = 0; i < 60; i++) {
      const response = await POST(
        createApiContext(
          new Request('http://localhost/api/mcp', {
            method: 'POST',
            headers: {
              Authorization: 'Bearer token-1',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ jsonrpc: '2.0', id: i, method: 'ping' }),
          })
        )
      );

      expect(response.status).toBe(200);
    }

    const limitedResponse = await POST(
      createApiContext(
        new Request('http://localhost/api/mcp', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer token-1',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jsonrpc: '2.0', id: 61, method: 'ping' }),
        })
      )
    );

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.headers.get('X-RateLimit-Limit')).toBe('60');
    expect(limitedResponse.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(limitedResponse.headers.get('X-RateLimit-Reset')).toBeTruthy();
    expect(limitedResponse.headers.get('Retry-After')).toBeTruthy();
  });
});
