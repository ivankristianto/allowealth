import { beforeEach, describe, expect, it } from 'bun:test';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { oauthProvider } from '@better-auth/oauth-provider';
import { getOAuthProviderOptions } from '@/lib/auth/oauth-provider-options';
import { submitOAuthConsent } from '@/lib/auth/oauth-consent';
import { getSeededMcpOAuthClients } from '@/lib/mcp-oauth';
import { PERMISSION_OAUTH_SCOPES, oauthPermissionsFromScopes } from '@/lib/mcp-oauth-scopes';

const BASE_URL = 'http://localhost:4321';
const CLIENT_ID = 'mcp-claude-desktop';
const ALL_PERMISSION_SCOPES = ['allowealth:transactions:read', 'allowealth:transactions:create'];

const MODELS = [
  'user',
  'session',
  'account',
  'verification',
  'oauthClient',
  'oauthAccessToken',
  'oauthRefreshToken',
  'oauthConsent',
  'oauthResource',
  'oauthClientResource',
  'oauthClientAssertion',
];

type MemoryDb = Record<string, Record<string, unknown>[]>;

let memory: MemoryDb;
let auth: ReturnType<typeof createTestAuth>;
let cookie: string;

function createTestAuth(store: MemoryDb) {
  return betterAuth({
    baseURL: BASE_URL,
    basePath: '/api/auth',
    secret: 'test-secret-for-oauth-consent-scopes-0123456789',
    database: memoryAdapter(store),
    emailAndPassword: { enabled: true },
    plugins: [oauthProvider(getOAuthProviderOptions())],
  });
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

async function pkcePair() {
  const verifier = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: toBase64Url(new Uint8Array(digest)) };
}

const redirectUri = getSeededMcpOAuthClients(BASE_URL)[0].redirectUris[0];

/** Starts an authorize request and returns where the provider sends the browser. */
async function authorize(scope: string, challenge: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope,
    state: 'flow-1',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    ...extra,
  });
  const response = await auth.handler(
    new Request(`${BASE_URL}/api/auth/oauth2/authorize?${params}`, { headers: { cookie } })
  );
  const location = response.headers.get('location');
  if (!location) throw new Error(`authorize did not redirect (${response.status})`);
  return new URL(location, BASE_URL);
}

function consentForm(oauthQuery: string, ticked: string[], accept = 'true') {
  const body = new URLSearchParams({ accept, oauth_query: oauthQuery });
  for (const scope of ticked) body.append('scope', scope);
  return new Request(`${BASE_URL}/oauth/authorize?${oauthQuery}`, {
    method: 'POST',
    headers: { cookie, origin: BASE_URL },
    body,
  });
}

async function submitConsent(oauthQuery: string, ticked: string[]) {
  return submitOAuthConsent(consentForm(oauthQuery, ticked), {
    handler: (request) => auth.handler(request),
    trustedOrigins: () => [BASE_URL],
  });
}

async function exchangeCode(code: string, verifier: string) {
  const response = await auth.handler(
    new Request(`${BASE_URL}/api/auth/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: CLIENT_ID,
        code_verifier: verifier,
      }),
    })
  );
  expect(response.status).toBe(200);
  return (await response.json()) as TokenResponse;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  scope: string;
}

async function refresh(refreshToken: string, scope: string) {
  return auth.handler(
    new Request(`${BASE_URL}/api/auth/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        scope,
      }),
    })
  );
}

/** What `validateMcpToken` would grant for the token's scopes. */
const permissionsOf = (token: { scope: string }) =>
  oauthPermissionsFromScopes(token.scope.split(' '));

/** Runs authorize, consent with the ticked scopes, and the code exchange. */
async function connect(scope: string, ticked: string[]) {
  const { verifier, challenge } = await pkcePair();
  const consentPage = await authorize(scope, challenge);
  expect(consentPage.pathname).toBe('/oauth/authorize');
  const result = await submitConsent(consentPage.search.slice(1), ticked);
  if (!('url' in result)) throw new Error(result.error);
  const code = new URL(result.url, BASE_URL).searchParams.get('code');
  if (!code) throw new Error(`consent did not return a code: ${result.url}`);
  return exchangeCode(code, verifier);
}

const storedScopes = () => memory.oauthAccessToken.map((row) => row.scopes);

describe('OAuth consent with permission scopes', () => {
  beforeEach(async () => {
    memory = Object.fromEntries(MODELS.map((model) => [model, []]));
    auth = createTestAuth(memory);
    const seeded = getSeededMcpOAuthClients(BASE_URL).find((c) => c.clientId === CLIENT_ID)!;
    memory.oauthClient.push({ id: 'client-1', ...seeded, disabled: false });

    const { headers } = await auth.api.signUpEmail({
      body: { email: 'member@example.test', password: 'correct-horse-battery', name: 'Member' },
      returnHeaders: true,
    });
    cookie = headers.get('set-cookie')!.split(';')[0];
  });

  it('issues a token holding exactly the ticked permissions plus the required scopes', async () => {
    const token = await connect(`openid mcp ${ALL_PERMISSION_SCOPES.join(' ')}`, [
      'allowealth:transactions:read',
    ]);

    expect(token.scope).toBe('openid mcp allowealth:transactions:read');
    expect(storedScopes()).toEqual([['openid', 'mcp', 'allowealth:transactions:read']]);
  });

  it('issues a token with no permissions when every permission is unticked', async () => {
    const token = await connect(`openid mcp ${ALL_PERMISSION_SCOPES.join(' ')}`, []);

    expect(token.scope).toBe('openid mcp');
    expect(permissionsOf(token)).toEqual([]);
  });

  it('gives no permissions to an mcp-only request that skips a narrowed consent', async () => {
    await connect(`openid mcp ${ALL_PERMISSION_SCOPES.join(' ')}`, [
      'allowealth:transactions:read',
    ]);

    const { verifier, challenge } = await pkcePair();
    const next = await authorize('openid mcp', challenge);
    const code = next.searchParams.get('code');
    expect(code).toBeString();

    const token = await exchangeCode(code!, verifier);
    expect(token.scope).toBe('openid mcp');
    expect(permissionsOf(token)).toEqual([]);
  });

  it('lets a refresh narrow the permissions but never widen them', async () => {
    memory.oauthClient[0].grantTypes = ['authorization_code', 'refresh_token'];
    const token = await connect(`openid mcp offline_access ${ALL_PERMISSION_SCOPES.join(' ')}`, [
      'allowealth:transactions:read',
    ]);
    expect(token.refresh_token).toBeString();

    const widened = await refresh(
      token.refresh_token!,
      'openid mcp offline_access allowealth:transactions:read allowealth:transactions:create'
    );
    expect(widened.status).toBe(400);

    const narrowed = await refresh(token.refresh_token!, 'openid mcp');
    expect(narrowed.status).toBe(200);
    expect(permissionsOf((await narrowed.json()) as TokenResponse)).toEqual([]);
  });

  it('drops a ticked scope that was not in the signed request', async () => {
    const token = await connect('openid mcp allowealth:transactions:read', [
      'allowealth:transactions:read',
      'allowealth:reports:read',
    ]);

    expect(token.scope).toBe('openid mcp allowealth:transactions:read');
  });

  it('refuses a consent whose signed query was edited to add a scope', async () => {
    const { challenge } = await pkcePair();
    const consentPage = await authorize('openid mcp allowealth:transactions:read', challenge);
    const forged = new URLSearchParams(consentPage.search);
    forged.set('scope', 'openid mcp allowealth:transactions:read allowealth:reports:read');

    const result = await submitConsent(forged.toString(), [
      'allowealth:transactions:read',
      'allowealth:reports:read',
    ]);

    expect(result).toEqual({ error: 'Authorization failed.' });
    expect(memory.oauthConsent).toEqual([]);
    expect(memory.oauthAccessToken).toEqual([]);
  });

  it('shows the consent page again when a client asks for a scope it was not granted', async () => {
    await connect(`openid mcp ${ALL_PERMISSION_SCOPES.join(' ')}`, [
      'allowealth:transactions:read',
    ]);

    const { challenge } = await pkcePair();
    const next = await authorize(`openid mcp ${ALL_PERMISSION_SCOPES.join(' ')}`, challenge);

    expect(next.pathname).toBe('/oauth/authorize');
  });

  it('skips consent when the client asks only for scopes already granted', async () => {
    await connect(`openid mcp ${ALL_PERMISSION_SCOPES.join(' ')}`, ALL_PERMISSION_SCOPES);

    const { challenge } = await pkcePair();
    const next = await authorize('openid mcp allowealth:transactions:read', challenge);

    expect(next.pathname).toBe(new URL(redirectUri).pathname);
    expect(next.searchParams.get('code')).toBeString();
  });

  it('shows the consent page for prompt=consent even when every scope was granted', async () => {
    await connect(`openid mcp ${ALL_PERMISSION_SCOPES.join(' ')}`, ALL_PERMISSION_SCOPES);

    const { challenge } = await pkcePair();
    const next = await authorize(`openid mcp ${ALL_PERMISSION_SCOPES.join(' ')}`, challenge, {
      prompt: 'consent',
    });

    expect(next.pathname).toBe('/oauth/authorize');
  });

  it('lists every permission scope in the discovery metadata', async () => {
    const response = await auth.handler(
      new Request(`${BASE_URL}/api/auth/.well-known/oauth-authorization-server`)
    );
    const metadata = (await response.json()) as { scopes_supported: string[] };

    expect(metadata.scopes_supported).toEqual(
      expect.arrayContaining(['openid', 'mcp', ...PERMISSION_OAUTH_SCOPES])
    );
  });
});
