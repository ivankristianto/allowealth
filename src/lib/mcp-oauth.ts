import { getAuthBaseURL } from '@/lib/auth/base-url';
import { PERMISSION_OAUTH_SCOPES } from '@/lib/mcp-oauth-scopes';

export const MCP_OAUTH_CLIENTS = [
  { clientId: 'mcp-claude-desktop', name: 'Claude Desktop' },
  { clientId: 'mcp-openai', name: 'ChatGPT' },
  { clientId: 'mcp-generic', name: 'Generic MCP Client' },
] as const;

/** Scopes the OAuth provider supports and advertises in its discovery metadata. */
export const MCP_OAUTH_SCOPES: readonly string[] = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'mcp',
  ...PERMISSION_OAUTH_SCOPES,
];

/** What the Security page's connect buttons request, so the user picks on the consent page. */
export const MCP_CONNECT_SCOPES: readonly string[] = ['openid', 'mcp', ...PERMISSION_OAUTH_SCOPES];

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
