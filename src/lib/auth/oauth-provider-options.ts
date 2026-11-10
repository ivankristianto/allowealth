import type { oauthProvider } from '@better-auth/oauth-provider';
import { MCP_ACCESS_TOKEN_TTL_SECONDS, MCP_OAUTH_SCOPES } from '@/lib/mcp-oauth';
import { hashOAuthToken } from './oauth-token-hash';

type OAuthProviderOptions = Parameters<typeof oauthProvider>[0];

// MCP clients are seeded by `aw db seed-oauth-clients` and `/api/mcp` checks
// tokens itself, so this issues opaque tokens without the JWT plugin.
export function getOAuthProviderOptions(): OAuthProviderOptions {
  return {
    loginPage: '/login',
    consentPage: '/oauth/authorize',
    disableJwtPlugin: true,
    scopes: [...MCP_OAUTH_SCOPES],
    accessTokenExpiresIn: MCP_ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenExpiresIn: 7_776_000,
    storeTokens: { hash: hashOAuthToken },
    // Without this hook any signed-in user could register, edit or delete clients.
    clientPrivileges: () => false,
  };
}
