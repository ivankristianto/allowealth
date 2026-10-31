/**
 * Hash for OAuth token values stored by `@better-auth/oauth-provider`.
 *
 * The provider is configured with `storeTokens: { hash: hashOAuthToken }` and
 * `/api/mcp` hashes incoming bearer tokens with the same function, so the
 * lookup never depends on the provider's internal default hasher.
 *
 * SHA-256, base64url without padding (same output as the provider default).
 */
export async function hashOAuthToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Buffer.from(digest).toString('base64url');
}
