import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/db';
import { oauthClient, user as authUsers, users, workspaces } from '@/db/schema';
import * as realAuthServer from '@/lib/auth/server';
import { submitOAuthConsent } from '@/lib/auth/oauth-consent';
import { resetCacheManager } from '@/lib/cache';
import { setTestEnv } from '@/lib/env';
import { validateMcpToken } from '@/lib/mcp-auth';
import { getSeededMcpOAuthClients } from '@/lib/mcp-oauth';
import { PERMISSION_OAUTH_SCOPES } from '@/lib/mcp-oauth-scopes';
import { clearRateLimitStore } from '@/lib/rate-limit';
import { mockModuleForFile } from '@/lib/test-helpers/mock-module';

const BASE_URL = 'http://localhost:4321';
const CLIENT_ID = 'mcp-claude-desktop';
const TEST_ENV = {
  NODE_ENV: 'test',
  BETTER_AUTH_SECRET: 'test-secret-for-consent-to-mcp-0123456789abcdef',
  SIGNUP_MODE: 'public',
  PUBLIC_URL: BASE_URL,
};
const FULL_REQUEST = `openid mcp ${PERMISSION_OAUTH_SCOPES.join(' ')}`;

// Other test files replace '@/lib/auth/server' process-wide; the query string loads the real one.
const realAuthModule = await import(`@/lib/auth/server?consent-to-mcp=${Date.now()}`);
mockModuleForFile('@/lib/auth/server', realAuthServer, () => realAuthModule);
const auth: typeof realAuthServer.auth = realAuthModule.auth;

let cookie = '';
let userId = '';
const createdUsers: Array<{ userId: string; workspaceId: string | null }> = [];

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

async function pkcePair() {
  const verifier = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: toBase64Url(new Uint8Array(digest)) };
}

const redirectUri = () => getSeededMcpOAuthClients(BASE_URL)[0].redirectUris[0];

/** Authorize, consent with the ticked scopes, then exchange the code, all on the test DB. */
async function connect(scope: string, ticked: string[]): Promise<string> {
  const { verifier, challenge } = await pkcePair();
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope,
    state: 'e2e',
    prompt: 'consent',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  const authorize = await auth.handler(
    new Request(`${BASE_URL}/api/auth/oauth2/authorize?${params}`, { headers: { cookie } })
  );
  const consentPage = new URL(authorize.headers.get('location') ?? '', BASE_URL);
  expect(consentPage.pathname).toBe('/oauth/authorize');

  const form = new URLSearchParams({ accept: 'true', oauth_query: consentPage.search.slice(1) });
  for (const value of ticked) form.append('scope', value);
  const result = await submitOAuthConsent(
    new Request(`${BASE_URL}/oauth/authorize${consentPage.search}`, {
      method: 'POST',
      headers: { cookie, origin: BASE_URL },
      body: form,
    }),
    userId,
    { handler: (request) => auth.handler(request), trustedOrigins: () => [BASE_URL] }
  );
  if (!('url' in result)) throw new Error(result.error);
  const code = new URL(result.url, BASE_URL).searchParams.get('code');
  if (!code) throw new Error(`consent did not return a code: ${result.url}`);

  const exchange = await auth.handler(
    new Request(`${BASE_URL}/api/auth/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri(),
        client_id: CLIENT_ID,
        code_verifier: verifier,
      }),
    })
  );
  expect(exchange.status).toBe(200);
  return ((await exchange.json()) as { access_token: string }).access_token;
}

// The workspace goes first: its cascade removes the categories bootstrap created for the user.
async function removeCreatedUsers(): Promise<void> {
  for (const created of createdUsers.splice(0)) {
    if (created.workspaceId) {
      await db.delete(workspaces).where(eq(workspaces.id, created.workspaceId));
    }
    await db.delete(users).where(eq(users.id, created.userId));
    await db.delete(authUsers).where(eq(authUsers.id, created.userId));
  }
}

describe('OAuth consent through to MCP on the SQLite test DB', () => {
  beforeAll(async () => {
    setTestEnv(TEST_ENV);
    realAuthModule.resetAuthInstance();
    const seeded = getSeededMcpOAuthClients(BASE_URL).find((c) => c.clientId === CLIENT_ID)!;
    await db
      .insert(oauthClient)
      .values({
        id: `client-${CLIENT_ID}`,
        clientId: seeded.clientId,
        name: seeded.name,
        redirectUris: JSON.stringify(seeded.redirectUris),
        tokenEndpointAuthMethod: seeded.tokenEndpointAuthMethod,
        grantTypes: JSON.stringify(seeded.grantTypes),
        responseTypes: JSON.stringify(seeded.responseTypes),
        requirePKCE: seeded.requirePKCE,
      })
      .onConflictDoNothing();
  });

  beforeEach(async () => {
    setTestEnv(TEST_ENV);
    clearRateLimitStore();
    resetCacheManager();
    const { headers, response } = await auth.api.signUpEmail({
      body: {
        email: `consent-${nanoid(8).toLowerCase()}@example.com`,
        password: 'correct-horse-battery-staple',
        name: 'Consent Test',
      },
      returnHeaders: true,
    });
    cookie = headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
    userId = response.user.id;
    const domainUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
    createdUsers.push({ userId, workspaceId: domainUser?.workspace_id ?? null });
  });

  afterAll(async () => {
    await removeCreatedUsers();
    realAuthModule.resetAuthInstance();
    setTestEnv(null);
  });

  it('gives the token exactly the permissions ticked on the consent page', async () => {
    const token = await connect(FULL_REQUEST, [
      'allowealth:transactions:create',
      'allowealth:accounts:read',
    ]);

    expect(await validateMcpToken(token)).toMatchObject({
      kind: 'oauth',
      userId,
      tokenName: 'Claude Desktop',
      permissions: ['transactions:create', 'accounts:read'],
    });
  });

  it('revokes the wider token when the app is connected again with fewer permissions', async () => {
    const wide = await connect(FULL_REQUEST, [...PERMISSION_OAUTH_SCOPES]);
    expect((await validateMcpToken(wide))?.permissions).toHaveLength(
      PERMISSION_OAUTH_SCOPES.length
    );

    const narrow = await connect(FULL_REQUEST, ['allowealth:accounts:read']);

    expect(await validateMcpToken(wide)).toBeNull();
    expect((await validateMcpToken(narrow))?.permissions).toEqual(['accounts:read']);
  });
});
