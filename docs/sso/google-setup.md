# Google SSO Setup Guide

## Prerequisites

- A Google Cloud project (create one at [console.cloud.google.com](https://console.cloud.google.com/))
- The application running locally (`bun dev`) or deployed

## Step 1: Configure OAuth Consent Screen

1. Go to **Google Cloud Console > APIs & Services > OAuth consent screen**.
2. Select **External** user type (or Internal for Google Workspace orgs).
3. Fill in the required fields:
   - **App name**: Your application name
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Add scopes: `openid`, `email`, `profile`.
5. Save. For development, add your Google account under **Test users**.

## Step 2: Create OAuth Credentials

1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth 2.0 Client ID**.
3. Select **Web application**.
4. Add **Authorized redirect URIs**:
   - Development: `http://localhost:4321/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
5. Click **Create** and copy the **Client ID** and **Client Secret**.

The redirect URI must match exactly — including the protocol, port, and path.

## Step 3: Set Environment Variables

Add to your `.env` (development) or `.env.production` (production):

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
PUBLIC_URL=http://localhost:4321
```

For production, set `PUBLIC_URL` to your deployed URL (no trailing slash):

```bash
PUBLIC_URL=https://yourdomain.com
```

`PUBLIC_URL` is the shared canonical app origin used for OAuth redirect URIs, email links, and invitation URLs. It's referenced in `src/lib/auth/oauth.ts` to build the Google callback URI.

## Step 4: Verify Setup

1. Start the dev server: `bun dev`
2. Navigate to `/login`.
3. Click **Sign in with Google**.
4. Expected flows:

| Scenario                       | Expected behavior                                                     |
| ------------------------------ | --------------------------------------------------------------------- |
| New user                       | Google consent screen → auto-register → redirect to `/dashboard`      |
| Existing OAuth link            | Google consent screen → direct login → redirect to `/dashboard`       |
| Email already exists (no link) | Google consent screen → account linking page → confirm → `/dashboard` |

5. Check the Security page (`/security`) to verify the Google account appears under linked providers.

## Troubleshooting

### `redirect_uri_mismatch`

The redirect URI in Google Cloud Console doesn't match. Verify:

- Protocol: `http` for localhost, `https` for production
- Port: `4321` for local dev (or your custom port)
- Path: `/api/auth/google/callback` (exact match)
- No trailing slash

### `access_denied` or blank error

- Ensure your Google account is listed as a **Test user** in the consent screen (required while app is in "Testing" status).
- Verify the consent screen has `openid`, `email`, and `profile` scopes.

### `GOOGLE_CLIENT_ID is not set`

The env vars aren't loaded. Check:

- `.env` file exists in the project root
- Variable names match exactly (no extra spaces)
- Restart the dev server after changing `.env`

### Rate limited on callback

The callback endpoint allows 10 requests per 15 minutes per IP. Wait and retry, or check for redirect loops causing repeated callback hits.

### Account linking page shows expired

The linking cookie expires after 10 minutes. Restart the OAuth flow by clicking **Sign in with Google** again.

## Moving to Production

1. **Publish the consent screen**: In Google Cloud Console, go to the OAuth consent screen and click **Publish App**. This removes the test-user restriction.
2. **Update redirect URIs**: Add your production URL (`https://yourdomain.com/api/auth/google/callback`) to the OAuth client's authorized redirect URIs.
3. **Verify domain ownership**: Google may require domain verification for published apps. Follow the instructions in the console.
4. **Set production env vars**: Ensure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `PUBLIC_URL` are set in your production environment.
5. **Run migrations**: The `oauth_accounts` table must exist in production. Run `bun run db:migrate:prod` if not already applied.

## Architecture Reference

For design decisions behind the OAuth implementation (provider-agnostic schema, PKCE flow, signed cookies, account linking pattern), see [ADR 011: OAuth SSO Integration](../architecture/011-oauth-sso-architecture.md).
