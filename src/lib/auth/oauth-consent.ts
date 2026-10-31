import { AUTH_PATH_PREFIX, auth, getTrustedOrigins } from '@/lib/auth/server';

export type OAuthConsentResult = { url: string } | { error: string };

interface OAuthConsentDeps {
  handler: (request: Request) => Promise<Response>;
  trustedOrigins: () => string[];
}

const defaultDeps: OAuthConsentDeps = {
  handler: (request) => auth.handler(request),
  trustedOrigins: getTrustedOrigins,
};

/**
 * The consent form posts to the page itself, outside the `/api/*` CSRF
 * middleware, so it must come from one of the app's own origins. Astro's
 * `checkOrigin` already rejects cross-site form posts; this keeps the guard
 * explicit if that setting changes. Wildcard subdomain entries (used for MCP
 * subdomain routing) are not accepted here.
 */
export function isTrustedFormOrigin(
  request: Request,
  trustedOrigins: string[] = getTrustedOrigins()
): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  return trustedOrigins.some((trusted) => !trusted.includes('*') && trusted === origin);
}

/**
 * Submit the consent form server-side. Better Auth's `/oauth2/consent` takes
 * JSON with the signed authorize query (`oauth_query`) and answers with the
 * URL to continue to, so the page needs no client-side script.
 */
export async function submitOAuthConsent(
  request: Request,
  overrides: Partial<OAuthConsentDeps> = {}
): Promise<OAuthConsentResult> {
  const deps = { ...defaultDeps, ...overrides };
  if (!isTrustedFormOrigin(request, deps.trustedOrigins())) {
    return { error: 'This request did not come from Allowealth. Start again from Security.' };
  }

  const form = await request.formData();
  const oauthQuery = form.get('oauth_query')?.toString() ?? '';
  if (!oauthQuery) {
    return { error: 'This authorization request is invalid. Start again from Security.' };
  }

  // Through the auth handler (not `auth.api`, whose type omits plugin
  // endpoints), so Better Auth applies its usual cookie and origin checks.
  const consentUrl = new URL(`${AUTH_PATH_PREFIX}/oauth2/consent`, request.url);
  const response = await deps.handler(
    new Request(consentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Cookie: request.headers.get('cookie') ?? '',
        Origin: request.headers.get('origin') ?? '',
      },
      body: JSON.stringify({ accept: form.get('accept') === 'true', oauth_query: oauthQuery }),
    })
  );
  const data = (await response.json().catch(() => ({}))) as {
    url?: string;
    error_description?: string;
    message?: string;
  };

  if (!response.ok || !data.url) {
    return { error: data.error_description || data.message || 'Authorization failed.' };
  }

  return { url: data.url };
}
