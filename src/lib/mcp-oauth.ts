import { getAuthBaseURL } from '@/lib/auth/base-url';

export const MCP_OAUTH_CLIENTS = [
  { clientId: 'mcp-claude-desktop', name: 'Claude Desktop' },
  { clientId: 'mcp-openai', name: 'ChatGPT' },
  { clientId: 'mcp-generic', name: 'Generic MCP Client' },
] as const;

/** Scopes the OAuth provider supports. The Security page requests `openid mcp`. */
export const MCP_OAUTH_SCOPES = ['openid', 'profile', 'email', 'offline_access', 'mcp'] as const;

/** MCP access tokens last 24 hours (the display-token page tells users this). */
export const MCP_ACCESS_TOKEN_TTL_SECONDS = 86_400;

export function getMcpOAuthClientName(clientId: string): string {
  return MCP_OAUTH_CLIENTS.find((client) => client.clientId === clientId)?.name ?? clientId;
}

export function getMcpOAuthRedirectUri(baseUrl = getAuthBaseURL()): string {
  return new URL('/oauth/display-token', baseUrl).toString();
}

/**
 * Pre-registered public clients in the `oauthClient` shape. The Better Auth
 * adapter stores `string[]` fields as JSON text on SQLite, so callers writing
 * rows directly must serialize the array fields.
 */
export function getSeededMcpOAuthClients(baseUrl = getAuthBaseURL()) {
  const redirectUri = getMcpOAuthRedirectUri(baseUrl);

  return MCP_OAUTH_CLIENTS.map((client) => ({
    clientId: client.clientId,
    name: client.name,
    redirectUris: [redirectUri],
    tokenEndpointAuthMethod: 'none' as const,
    grantTypes: ['authorization_code'],
    responseTypes: ['code'],
    applicationType: 'web' as const,
    requirePKCE: true,
  }));
}
