const PARAM = 'activity_token';
// Token ids are short generated strings, so a much longer value is not one.
const MAX_TOKEN_ID_LENGTH = 128;

/** The security page's Recent Activity, showing only what one app password or OAuth token did. */
export function tokenActivityHref(tokenId: string): string {
  return `/security?${PARAM}=${encodeURIComponent(tokenId)}#recent-activity`;
}

export function parseTokenActivityFilter(url: URL): string | null {
  const tokenId = url.searchParams.get(PARAM);
  return tokenId && tokenId.length <= MAX_TOKEN_ID_LENGTH ? tokenId : null;
}
