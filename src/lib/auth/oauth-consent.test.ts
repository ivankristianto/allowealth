import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { getRedirectTarget, isTrustedFormOrigin, submitOAuthConsent } from './oauth-consent';

const APP_ORIGIN = 'http://localhost:4321';
const trustedOrigins = () => [APP_ORIGIN, 'https://*.allowealth.com'];

function consentRequest(
  origin: string | null,
  fields: Record<string, string>,
  tickedScopes: string[] = []
): Request {
  const headers = new Headers({ Cookie: 'allowealth.session_token=abc' });
  if (origin) headers.set('Origin', origin);
  const body = new URLSearchParams(fields);
  for (const scope of tickedScopes) body.append('scope', scope);
  return new Request(`${APP_ORIGIN}/oauth/authorize?client_id=mcp-generic`, {
    method: 'POST',
    headers,
    body,
  });
}

const SCOPED_QUERY = new URLSearchParams({
  client_id: 'x',
  scope: 'openid mcp allowealth:accounts:read allowealth:budgets:read',
  sig: 'y',
}).toString();

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
  const revokeClientTokens = mock(async (_userId: string, _clientId: string) => {});
  const submit = (request: Request, deps: { handler: (request: Request) => Promise<Response> }) =>
    submitOAuthConsent(request, 'user-1', { trustedOrigins, revokeClientTokens, ...deps });

  beforeEach(() => revokeClientTokens.mockClear());

  it('refuses a cross-site form post before reaching Better Auth', async () => {
    const handler = mock(async () => Response.json({ url: '/x' }));
    const result = await submit(
      consentRequest('https://evil.example', { accept: 'true', oauth_query: 'client_id=x&sig=y' }),
      { handler }
    );

    expect(result).toEqual({
      error: 'This request did not come from Allowealth. Start again from Security.',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('requires the signed authorize query', async () => {
    const handler = mock(async () => Response.json({ url: '/x' }));
    const result = await submit(consentRequest(APP_ORIGIN, { accept: 'true' }), { handler });

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

    const result = await submit(
      consentRequest(APP_ORIGIN, { accept: 'true', oauth_query: 'client_id=x&sig=y' }),
      { handler }
    );

    expect(result).toEqual({ url: '/oauth/display-token?code=abc' });
    expect(new URL(forwarded!.url).pathname).toBe('/api/auth/oauth2/consent');
    expect(forwarded!.headers.get('cookie')).toBe('allowealth.session_token=abc');
    expect(forwarded!.headers.get('origin')).toBe(APP_ORIGIN);
    expect(await forwarded!.json()).toEqual({ accept: true, oauth_query: 'client_id=x&sig=y' });
  });

  it('sends the required scopes plus the ticked permissions as scope', async () => {
    let body: unknown;
    const handler = mock(async (request: Request) => {
      body = await request.json();
      return Response.json({ redirect: true, url: '/oauth/display-token?code=abc' });
    });

    await submit(
      consentRequest(APP_ORIGIN, { accept: 'true', oauth_query: SCOPED_QUERY }, [
        'allowealth:budgets:read',
      ]),
      { handler }
    );

    expect(body).toEqual({
      accept: true,
      oauth_query: SCOPED_QUERY,
      scope: 'openid mcp allowealth:budgets:read',
    });
  });

  it('sends only the required scopes when every permission is unticked', async () => {
    let body: unknown;
    const handler = mock(async (request: Request) => {
      body = await request.json();
      return Response.json({ redirect: true, url: '/oauth/display-token?code=abc' });
    });

    await submit(consentRequest(APP_ORIGIN, { accept: 'true', oauth_query: SCOPED_QUERY }), {
      handler,
    });

    expect(body).toEqual({ accept: true, oauth_query: SCOPED_QUERY, scope: 'openid mcp' });
  });

  it('sends accept=false for the Deny button', async () => {
    let body: unknown;
    const handler = mock(async (request: Request) => {
      body = await request.json();
      return Response.json({ redirect: true, url: '/oauth/display-token?error=access_denied' });
    });

    await submit(consentRequest(APP_ORIGIN, { accept: 'false', oauth_query: SCOPED_QUERY }), {
      handler,
    });

    expect(body).toEqual({ accept: false, oauth_query: SCOPED_QUERY });
  });

  it('surfaces the Better Auth error instead of redirecting', async () => {
    const handler = mock(async () =>
      Response.json(
        { error: 'invalid_signature', error_description: 'invalid signature' },
        { status: 400 }
      )
    );

    const result = await submit(
      consentRequest(APP_ORIGIN, { accept: 'true', oauth_query: 'client_id=x&sig=forged' }),
      { handler }
    );

    expect(result).toEqual({ error: 'invalid signature' });
  });

  it("revokes the app's earlier tokens once the provider issues a code", async () => {
    const handler = mock(async () =>
      Response.json({ redirect: true, url: '/oauth/display-token?code=abc' })
    );

    await submit(
      consentRequest(APP_ORIGIN, { accept: 'true', oauth_query: SCOPED_QUERY }, [
        'allowealth:accounts:read',
      ]),
      { handler }
    );

    expect(revokeClientTokens).toHaveBeenCalledWith('user-1', 'x');
  });

  it('keeps earlier tokens on deny or when the provider refuses', async () => {
    await submit(consentRequest(APP_ORIGIN, { accept: 'false', oauth_query: SCOPED_QUERY }), {
      handler: async () =>
        Response.json({ redirect: true, url: '/oauth/display-token?error=access_denied' }),
    });
    await submit(consentRequest(APP_ORIGIN, { accept: 'true', oauth_query: SCOPED_QUERY }), {
      handler: async () => Response.json({ error: 'invalid_signature' }, { status: 400 }),
    });

    expect(revokeClientTokens).not.toHaveBeenCalled();
  });

  it('lets the user untick optional scopes such as email', async () => {
    let body: unknown;
    const query = new URLSearchParams({
      client_id: 'x',
      scope: 'openid email mcp allowealth:accounts:read',
      sig: 'y',
    }).toString();
    const handler = mock(async (request: Request) => {
      body = await request.json();
      return Response.json({ redirect: true, url: '/oauth/display-token?code=abc' });
    });

    await submit(consentRequest(APP_ORIGIN, { accept: 'true', oauth_query: query }, []), {
      handler,
    });

    expect(body).toMatchObject({ scope: 'openid mcp' });
  });

  it('explains instead of posting an empty scope when nothing would be granted', async () => {
    const handler = mock(async () => Response.json({ url: '/x' }));
    const query = new URLSearchParams({
      client_id: 'x',
      scope: 'allowealth:accounts:read',
      sig: 'y',
    }).toString();

    const result = await submit(
      consentRequest(APP_ORIGIN, { accept: 'true', oauth_query: query }),
      { handler }
    );

    expect(result).toEqual({
      error:
        'Nothing is ticked, so there is nothing to grant. Tick at least one item, or choose Deny. ' +
        'This app did not ask for MCP access, so it cannot use Allowealth tools.',
    });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('getRedirectTarget', () => {
  it('shows only the host of a web redirect URI', () => {
    expect(getRedirectTarget('https://attacker.example:8443/callback?x=1')).toBe(
      'attacker.example:8443'
    );
  });

  it('falls back to the full URI when it has no host', () => {
    expect(getRedirectTarget('com.example.app:/oauth')).toBe('com.example.app:/oauth');
  });

  it('returns an empty string when the query has no redirect URI', () => {
    expect(getRedirectTarget(null)).toBe('');
  });
});
