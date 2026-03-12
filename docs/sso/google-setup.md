# Google SSO Setup Guide

## Prerequisites

- A Google Cloud project
- The application running locally or deployed
- Better Auth configured in the target environment

## Step 1: Configure the OAuth Consent Screen

1. Open **Google Cloud Console > APIs & Services > OAuth consent screen**.
2. Choose **External** unless you are using a restricted Google Workspace deployment.
3. Fill in the required app and contact details.
4. Add these scopes:
   - `openid`
   - `email`
   - `profile`
5. While the app is still in testing, add your development accounts as **Test users**.

## Step 2: Create OAuth Credentials

1. Open **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth 2.0 Client ID**.
3. Choose **Web application**.
4. Add authorized redirect URIs:
   - Development: `http://localhost:4321/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
5. Copy the generated **Client ID** and **Client Secret**.

The redirect URI must match exactly, including protocol, host, port, and path.

## Step 3: Set Environment Variables

Add these values to your environment:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
BETTER_AUTH_SECRET=replace-with-a-random-secret
PUBLIC_URL=http://localhost:4321
```

For production:

```bash
PUBLIC_URL=https://yourdomain.com
```

Notes:

- `PUBLIC_URL` is the canonical app origin used for auth redirects and email links.
- `BETTER_AUTH_SECRET` must be a strong secret and should not reuse a placeholder dev value in production.
- Google linking and sign-in share the same Better Auth integration; no separate custom callback route is required.

## Step 4: Verify the Flow

1. Start the app with `bun run dev`.
2. Open `/login`.
3. Click **Continue with Google**.
4. Confirm the expected result:

| Scenario                                     | Expected behavior                                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| New Google user                              | Google consent, account creation, workspace bootstrap, redirect to `/dashboard`                            |
| Existing linked Google account               | Google consent, normal sign-in, redirect to `/dashboard`                                                   |
| Existing local account without Google linked | Sign-in is blocked and the user is told to sign in first, then connect Google from **Settings > Security** |

5. While signed in, open `/security` and confirm the **Connected Accounts** card can start Google linking from the authenticated settings flow.

## Troubleshooting

### `redirect_uri_mismatch`

Verify:

- the redirect path is `/api/auth/callback/google`
- localhost uses the correct dev port
- production uses `https`
- there is no trailing slash mismatch

### Google sign-in says the account is not linked

This is expected for an existing email/password account that has not linked Google yet.

Fix:

1. Sign in with your existing method.
2. Open **Settings > Security**.
3. Use **Connect Account** for Google.
4. Retry Google sign-in after linking completes.

### `GOOGLE_CLIENT_ID is not set`

Check that:

- the variable names match exactly
- your `.env` file is loaded by the current process
- you restarted the dev server after changing env vars

### Better Auth sessions reset after deployment

The Better Auth cutover invalidates legacy sessions. A one-time forced logout after deployment is expected.

## Moving to Production

1. Publish the Google consent screen when you are ready for non-test users.
2. Add the production redirect URI: `https://yourdomain.com/api/auth/callback/google`.
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, and `PUBLIC_URL` in production.
4. Apply database migrations before deploy.
5. Expect users to sign in again after the first Better Auth deployment.

## Architecture Reference

For the product rules behind Google sign-in and explicit linking, see [ADR 011: OAuth SSO Integration](../architecture/011-oauth-sso-architecture.md).
