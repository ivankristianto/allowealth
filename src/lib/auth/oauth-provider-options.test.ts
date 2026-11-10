import { describe, expect, it } from 'bun:test';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { oauthProvider } from '@better-auth/oauth-provider';
import { getOAuthProviderOptions } from './oauth-provider-options';

type ProviderOptions = ReturnType<typeof getOAuthProviderOptions>;

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

function createMemoryDb(): Record<string, Record<string, unknown>[]> {
  return Object.fromEntries(MODELS.map((model) => [model, []]));
}

function createTestAuth(options: ProviderOptions) {
  return betterAuth({
    baseURL: 'http://localhost:4321',
    basePath: '/api/auth',
    secret: 'test-secret-for-oauth-provider-options-0123456789',
    database: memoryAdapter(createMemoryDb()),
    emailAndPassword: { enabled: true },
    plugins: [oauthProvider(options)],
  });
}

async function signedInHeaders(auth: ReturnType<typeof createTestAuth>): Promise<Headers> {
  const { headers } = await auth.api.signUpEmail({
    body: { email: 'member@example.test', password: 'correct-horse-battery', name: 'Member' },
    returnHeaders: true,
  });
  const cookie = headers.get('set-cookie')?.split(';')[0];
  if (!cookie) throw new Error('sign-up did not set a session cookie');
  return new Headers({ cookie });
}

const clientBody = {
  client_name: 'Claude Desktop',
  redirect_uris: ['https://attacker.example/callback'],
  token_endpoint_auth_method: 'none' as const,
};

describe('OAuth provider client registration', () => {
  it('lets a signed-in user register a client when clientPrivileges is unset', async () => {
    const { clientPrivileges: _unused, ...unguarded } = getOAuthProviderOptions();
    const auth = createTestAuth(unguarded);
    const headers = await signedInHeaders(auth);

    const client = await auth.api.createOAuthClient({ headers, body: clientBody });

    expect(client.client_id).toBeString();
  });

  it('rejects create-client from a normal signed-in session', async () => {
    const auth = createTestAuth(getOAuthProviderOptions());
    const headers = await signedInHeaders(auth);

    await expect(auth.api.createOAuthClient({ headers, body: clientBody })).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('denies every client management action', async () => {
    const { clientPrivileges } = getOAuthProviderOptions();
    const actions = ['create', 'read', 'update', 'delete', 'list', 'rotate'] as const;

    for (const action of actions) {
      expect(await clientPrivileges?.({ headers: new Headers(), action })).toBe(false);
    }
  });
});
