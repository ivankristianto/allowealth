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

  it('returns seeded public PKCE clients with the shared redirect URI', () => {
    const redirectUri = 'https://app.allowealth.com/oauth/display-token';
    const shared = {
      redirectUris: [redirectUri],
      tokenEndpointAuthMethod: 'none',
      grantTypes: ['authorization_code'],
      responseTypes: ['code'],
      applicationType: 'web',
      requirePKCE: true,
    };

    expect(getSeededMcpOAuthClients('https://app.allowealth.com')).toEqual([
      { clientId: 'mcp-claude-desktop', name: 'Claude Desktop', ...shared },
      { clientId: 'mcp-openai', name: 'ChatGPT', ...shared },
      { clientId: 'mcp-generic', name: 'Generic MCP Client', ...shared },
    ]);
    expect(MCP_OAUTH_CLIENTS).toHaveLength(3);
  });

  it('returns the configured client label when present', () => {
    expect(getMcpOAuthClientName('mcp-openai')).toBe('ChatGPT');
    expect(getMcpOAuthClientName('unknown-client')).toBe('unknown-client');
  });
});
