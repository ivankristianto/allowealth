import { describe, expect, it } from 'bun:test';
import {
  MCP_OAUTH_CLIENTS,
  getMcpOAuthClientName,
  getMcpOAuthRedirectUri,
  getSeededMcpOAuthClients,
} from './mcp-oauth';

describe('mcp-oauth helpers', () => {
  it('builds the display-token redirect URI from the canonical base URL', () => {
    expect(getMcpOAuthRedirectUri('https://app.allowealth.com')).toBe(
      'https://app.allowealth.com/oauth/display-token'
    );
  });

  it('returns seeded clients with the shared redirect URI', () => {
    expect(getSeededMcpOAuthClients('https://app.allowealth.com')).toEqual([
      {
        clientId: 'mcp-claude-desktop',
        name: 'Claude Desktop',
        type: 'public',
        redirectUrls: 'https://app.allowealth.com/oauth/display-token',
      },
      {
        clientId: 'mcp-openai',
        name: 'ChatGPT',
        type: 'public',
        redirectUrls: 'https://app.allowealth.com/oauth/display-token',
      },
      {
        clientId: 'mcp-generic',
        name: 'Generic MCP Client',
        type: 'public',
        redirectUrls: 'https://app.allowealth.com/oauth/display-token',
      },
    ]);
    expect(MCP_OAUTH_CLIENTS).toHaveLength(3);
  });

  it('returns the configured client label when present', () => {
    expect(getMcpOAuthClientName('mcp-openai')).toBe('ChatGPT');
    expect(getMcpOAuthClientName('unknown-client')).toBe('unknown-client');
  });
});
