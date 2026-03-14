import { getAuthBaseURL } from '@/lib/auth/base-url';

export const MCP_OAUTH_CLIENTS = [
  { clientId: 'mcp-claude-desktop', name: 'Claude Desktop' },
  { clientId: 'mcp-openai', name: 'ChatGPT' },
  { clientId: 'mcp-generic', name: 'Generic MCP Client' },
] as const;

export function getMcpOAuthClientName(clientId: string): string {
  return MCP_OAUTH_CLIENTS.find((client) => client.clientId === clientId)?.name ?? clientId;
}

export function getMcpOAuthRedirectUri(baseUrl = getAuthBaseURL()): string {
  return new URL('/oauth/display-token', baseUrl).toString();
}

export function getSeededMcpOAuthClients(baseUrl = getAuthBaseURL()) {
  const redirectUrls = getMcpOAuthRedirectUri(baseUrl);

  return MCP_OAUTH_CLIENTS.map((client) => ({
    clientId: client.clientId,
    name: client.name,
    type: 'public' as const,
    redirectUrls,
  }));
}
