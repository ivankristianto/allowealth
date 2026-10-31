import { describe, expect, it, mock } from 'bun:test';
import { isTrustedFormOrigin, submitOAuthConsent } from './oauth-consent';

const APP_ORIGIN = 'http://localhost:4321';
const trustedOrigins = () => [APP_ORIGIN, 'https://*.allowealth.com'];

function consentRequest(origin: string | null, fields: Record<string, string>): Request {
  const headers = new Headers({ Cookie: 'allowealth.session_token=abc' });
  if (origin) headers.set('Origin', origin);
  return new Request(`${APP_ORIGIN}/oauth/authorize?client_id=mcp-generic`, {
    method: 'POST',
    headers,
    body: new URLSearchParams(fields),
  });
}

describe('isTrustedFormOrigin', () => {
  it('accepts an exact app origin', () => {
    expect(isTrustedFormOrigin(consentRequest(APP_ORIGIN, {}), trustedOrigins())).toBe(true);
  });

  it('rejects a missing Origin header', () => {
    expect(isTrustedFormOrigin(consentRequest(null, {}), trustedOrigins())).toBe(false);
  });

  it('rejects other origins and does not expand wildcard entries', () => {
    const origins = trustedOrigins();
    expect(isTrustedFormOrigin(consentRequest('https://evil.example', {}), origins)).toBe(false);
    expect(isTrustedFormOrigin(consentRequest('https://mcp.allowealth.com', {}), origins)).toBe(
      false
    );
  });
});

describe('submitOAuthConsent', () => {
  it('refuses a cross-site form post before reaching Better Auth', async () => {
    const handler = mock(async () => Response.json({ url: '/x' }));
    const result = await submitOAuthConsent(
      consentRequest('https://evil.example', { accept: 'true', oauth_query: 'client_id=x&sig=y' }),
      { handler, trustedOrigins }
    );

    expect(result).toEqual({
      error: 'This request did not come from Allowealth. Start again from Security.',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('requires the signed authorize query', async () => {
    const handler = mock(async () => Response.json({ url: '/x' }));
    const result = await submitOAuthConsent(consentRequest(APP_ORIGIN, { accept: 'true' }), {
      handler,
      trustedOrigins,
    });

    expect(result).toEqual({
      error: 'This authorization request is invalid. Start again from Security.',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('posts JSON consent with the signed query and session cookie', async () => {
    let forwarded: Request | undefined;
    const handler = mock(async (request: Request) => {
      forwarded = request;
      return Response.json({ redirect: true, url: '/oauth/display-token?code=abc' });
    });

    const result = await submitOAuthConsent(
      consentRequest(APP_ORIGIN, { accept: 'true', oauth_query: 'client_id=x&sig=y' }),
      { handler, trustedOrigins }
    );

    expect(result).toEqual({ url: '/oauth/display-token?code=abc' });
    expect(new URL(forwarded!.url).pathname).toBe('/api/auth/oauth2/consent');
    expect(forwarded!.headers.get('cookie')).toBe('allowealth.session_token=abc');
    expect(forwarded!.headers.get('origin')).toBe(APP_ORIGIN);
    expect(await forwarded!.json()).toEqual({ accept: true, oauth_query: 'client_id=x&sig=y' });
  });

  it('sends accept=false for the Deny button', async () => {
    let body: unknown;
    const handler = mock(async (request: Request) => {
      body = await request.json();
      return Response.json({ redirect: true, url: '/oauth/display-token?error=access_denied' });
    });

    await submitOAuthConsent(
      consentRequest(APP_ORIGIN, { accept: 'false', oauth_query: 'client_id=x&sig=y' }),
      { handler, trustedOrigins }
    );

    expect(body).toEqual({ accept: false, oauth_query: 'client_id=x&sig=y' });
  });

  it('surfaces the Better Auth error instead of redirecting', async () => {
    const handler = mock(async () =>
      Response.json(
        { error: 'invalid_signature', error_description: 'invalid signature' },
        { status: 400 }
      )
    );

    const result = await submitOAuthConsent(
      consentRequest(APP_ORIGIN, { accept: 'true', oauth_query: 'client_id=x&sig=forged' }),
      { handler, trustedOrigins }
    );

    expect(result).toEqual({ error: 'invalid signature' });
  });
});
