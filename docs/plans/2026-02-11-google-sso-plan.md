# Google SSO Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Google OAuth (SSO) as an alternative login/signup method alongside existing email/password authentication.

**Architecture:** Arctic library handles the OAuth dance (authorization URL, PKCE, token exchange). A new `oauth_accounts` table provides provider-agnostic storage. The service layer (`loginOrRegisterWithOAuth`) handles user lookup/creation/linking, and Lucia handles session creation identically to password auth.

**Tech Stack:** Arctic (OAuth), Lucia v3 (sessions), Drizzle ORM (dual SQLite/PostgreSQL), Astro 5 (pages/API routes), DaisyUI v5 (UI), simple-icons (Google icon)

**Design Doc:** `docs/plans/2026-02-11-google-sso-design.md`

---

## Task 1: Install Arctic dependency

**Files:**

- Modify: `package.json`

**Step 1: Install Arctic**

Run: `bun add arctic`

**Step 2: Verify installation**

Run: `grep arctic package.json`
Expected: `"arctic": "^x.x.x"` in dependencies

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add arctic OAuth library for Google SSO (#153)"
```

---

## Task 2: Database schema — modify users table (both dialects)

**Files:**

- Modify: `src/db/schema/sqlite/users.ts`
- Modify: `src/db/schema/postgresql/users.ts`
- Modify: `src/lib/auth/lucia.ts:188-197` (getUserAttributes)
- Modify: `src/lib/auth/lucia.ts:223-230` (User type)
- Modify: `src/lib/auth/lucia.d.ts` (DatabaseUserAttributes)

**Step 1: Update SQLite users schema**

In `src/db/schema/sqlite/users.ts`, make two changes:

1. Change `password_hash` from `.notNull()` to allow nulls (remove `.notNull()`)
2. Add `avatar_url` column after `password_hash`

```typescript
// Line 11: Change from:
password_hash: text('password_hash').notNull(),
// To:
password_hash: text('password_hash'),
avatar_url: text('avatar_url'),
```

**Step 2: Update PostgreSQL users schema**

In `src/db/schema/postgresql/users.ts`, same changes:

```typescript
// Line 10: Change from:
password_hash: text('password_hash').notNull(),
// To:
password_hash: text('password_hash'),
avatar_url: text('avatar_url'),
```

**Step 3: Update Lucia DatabaseUserAttributes**

In `src/lib/auth/lucia.d.ts`, add `avatar_url` to the interface:

```typescript
DatabaseUserAttributes: {
  id: string;
  email: string;
  name: string;
  workspace_id: string;
  role: 'admin' | 'member';
  avatar_url: string | null;
  deleted_at: Date | null;
}
```

**Step 4: Update Lucia getUserAttributes**

In `src/lib/auth/lucia.ts`, update `getUserAttributes` (around line 188) to include `avatarUrl`:

```typescript
getUserAttributes: (databaseUser: any) => {
  return {
    id: databaseUser.id,
    email: databaseUser.email,
    name: databaseUser.name,
    workspaceId: databaseUser.workspace_id,
    role: databaseUser.role as 'admin' | 'member',
    avatarUrl: databaseUser.avatar_url,
    deletedAt: databaseUser.deleted_at,
  };
},
```

**Step 5: Update User type**

In `src/lib/auth/lucia.ts`, update the `User` type (around line 223):

```typescript
export type User = {
  id: string;
  email: string;
  name: string;
  workspaceId: string;
  role: UserRole;
  avatarUrl: string | null;
  deletedAt: Date | null;
};
```

**Step 6: Verify typecheck passes**

Run: `bun run typecheck`
Expected: May have errors in `auth.service.ts` where `password_hash` was assumed non-null — that's fine, we'll fix in Task 5.

**Step 7: Commit**

```bash
git add src/db/schema/sqlite/users.ts src/db/schema/postgresql/users.ts src/lib/auth/lucia.ts src/lib/auth/lucia.d.ts
git commit -m "feat(schema): make password_hash nullable, add avatar_url to users (#153)"
```

---

## Task 3: Database schema — create oauth_accounts table (both dialects)

**Files:**

- Create: `src/db/schema/sqlite/oauth-accounts.ts`
- Create: `src/db/schema/postgresql/oauth-accounts.ts`
- Modify: `src/db/schema/sqlite/index.ts`
- Modify: `src/db/schema/postgresql/index.ts`
- Modify: `src/db/schema/sqlite/relations.ts`
- Modify: `src/db/schema/postgresql/relations.ts`

**Step 1: Create SQLite oauth_accounts schema**

Create `src/db/schema/sqlite/oauth-accounts.ts`:

```typescript
import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { users } from './users';

export const oauthAccounts = sqliteTable(
  'oauth_accounts',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    provider_account_id: text('provider_account_id').notNull(),
    email: text('email').notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [
    unique('oauth_accounts_provider_account_unique').on(table.provider, table.provider_account_id),
    index('oauth_accounts_user_id_idx').on(table.user_id),
  ]
);
```

**Step 2: Create PostgreSQL oauth_accounts schema**

Create `src/db/schema/postgresql/oauth-accounts.ts`:

```typescript
import { pgTable, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users';

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    provider_account_id: text('provider_account_id').notNull(),
    email: text('email').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('oauth_accounts_provider_account_unique').on(table.provider, table.provider_account_id),
    index('oauth_accounts_user_id_idx').on(table.user_id),
  ]
).enableRLS();
```

**Step 3: Export from schema index files**

In both `src/db/schema/sqlite/index.ts` and `src/db/schema/postgresql/index.ts`, add before the relations export:

```typescript
export * from './oauth-accounts';
```

**Step 4: Add relations in both relation files**

In both `src/db/schema/sqlite/relations.ts` and `src/db/schema/postgresql/relations.ts`:

1. Add import at top with other imports:

```typescript
import { oauthAccounts } from './oauth-accounts';
```

2. Add `oauthAccounts: many(oauthAccounts)` to the `usersRelations` definition (after `apiKeys: many(apiKeys)`)

3. Add new relation block at the end of the file:

```typescript
// OAuth accounts relations
export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.user_id],
    references: [users.id],
  }),
}));
```

**Step 5: Verify typecheck passes**

Run: `bun run typecheck`
Expected: PASS (or pre-existing errors from Task 2 only)

**Step 6: Commit**

```bash
git add src/db/schema/sqlite/oauth-accounts.ts src/db/schema/postgresql/oauth-accounts.ts \
  src/db/schema/sqlite/index.ts src/db/schema/postgresql/index.ts \
  src/db/schema/sqlite/relations.ts src/db/schema/postgresql/relations.ts
git commit -m "feat(schema): add oauth_accounts table for SSO providers (#153)"
```

---

## Task 4: Generate and apply database migrations

**Files:**

- Create: `drizzle/sqlite/XXXX_*.sql` (auto-generated)
- Create: `drizzle/postgresql/XXXX_*.sql` (auto-generated)

**Step 1: Generate SQLite migration**

Run: `bun run db:generate`
Expected: New migration file in `drizzle/sqlite/` with ALTER TABLE for users + CREATE TABLE for oauth_accounts

**Step 2: Generate PostgreSQL migration**

Run: `bun run db:generate:prod`
Expected: New migration file in `drizzle/postgresql/` with ALTER TABLE for users + CREATE TABLE for oauth_accounts

**Step 3: Apply SQLite migration locally**

Run: `bun run db:migrate`
Expected: Migration applied successfully

**Step 4: Verify both migration files look correct**

Inspect the generated SQL files. They should contain:

- `ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL` (or SQLite equivalent)
- `ALTER TABLE users ADD COLUMN avatar_url TEXT`
- `CREATE TABLE oauth_accounts` with all columns and constraints

**Step 5: Commit**

```bash
git add drizzle/
git commit -m "feat(migrations): add oauth_accounts table and users schema changes (#153)"
```

---

## Task 5: OAuth configuration and environment setup

**Files:**

- Create: `src/lib/auth/oauth.ts`
- Modify: `.env.example`

**Step 1: Create OAuth configuration**

Create `src/lib/auth/oauth.ts`:

```typescript
/**
 * OAuth Provider Configuration
 *
 * Uses Arctic library for OAuth 2.0 with PKCE support.
 * Arctic uses Web Crypto API internally — compatible with Bun, Node.js, and Cloudflare Workers.
 *
 * @see https://arcticjs.dev/
 */

import { Google } from 'arctic';
import { getEnv } from '@/lib/env';

/**
 * Create Google OAuth client
 *
 * Lazily initialized to avoid errors when env vars are not set (e.g., in tests).
 * Uses getEnv() for cross-runtime compatibility (Workers, Bun, Node).
 */
export function createGoogleOAuthClient(): Google {
  const clientId = getEnv('GOOGLE_CLIENT_ID');
  const clientSecret = getEnv('GOOGLE_CLIENT_SECRET');
  const appUrl = getEnv('PUBLIC_APP_URL') || 'http://localhost:4321';

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured');
  }

  return new Google(clientId, clientSecret, `${appUrl}/api/auth/google/callback`);
}
```

**Step 2: Update .env.example**

Add after the Turnstile section:

```
# Google OAuth (SSO)
# Get credentials from: https://console.cloud.google.com/apis/credentials
# Redirect URI: http://localhost:4321/api/auth/google/callback (dev)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
PUBLIC_APP_URL=http://localhost:4321
```

**Step 3: Verify typecheck passes**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/auth/oauth.ts .env.example
git commit -m "feat(auth): add Arctic OAuth configuration for Google SSO (#153)"
```

---

## Task 6: Service layer — loginOrRegisterWithOAuth

**Files:**

- Modify: `src/services/auth.service.ts`

**Step 1: Add OAuthProfile interface and error codes**

At the top of `src/services/auth.service.ts`, add to AUTH_ERRORS:

```typescript
OAUTH_PROVIDER_ERROR: 'OAUTH_PROVIDER_ERROR',
OAUTH_LINK_REQUIRED: 'OAUTH_LINK_REQUIRED',
OAUTH_UNLINK_DENIED: 'OAUTH_UNLINK_DENIED',
```

Add the OAuthProfile interface after the error codes:

```typescript
/**
 * OAuth provider profile data
 */
export interface OAuthProfile {
  provider: string;
  providerAccountId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

/**
 * Result types for OAuth login/register
 */
export type OAuthResult =
  | { needsLinking: false; user: User; session: Session; isNewUser: boolean }
  | { needsLinking: true; pendingUserId: string; email: string; provider: string };
```

**Step 2: Add loginOrRegisterWithOAuth method**

Add after the existing `login()` function:

```typescript
/**
 * Login or register a user via OAuth provider
 *
 * Flow:
 * 1. Check if oauth_account exists for this provider+id → return existing user
 * 2. Check if a user exists with matching email → request account linking
 * 3. No match → create new user + workspace + oauth_account
 *
 * @param profile - OAuth provider profile data
 * @returns OAuthResult with user/session or linking prompt
 */
export async function loginOrRegisterWithOAuth(profile: OAuthProfile): Promise<OAuthResult> {
  try {
    // 1. Check if oauth_account already linked
    const existingOAuth = await db.query.oauthAccounts.findFirst({
      where: and(
        eq(schema.oauthAccounts.provider, profile.provider),
        eq(schema.oauthAccounts.provider_account_id, profile.providerAccountId)
      ),
    });

    if (existingOAuth) {
      // Existing linked user — find and create session
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, existingOAuth.user_id),
      });

      if (!user || user.deleted_at) {
        throw new AuthError(AUTH_ERRORS.INVALID_CREDENTIALS, 'Account not found or deleted');
      }

      const session = await auth.createSession(user.id, {});
      const luciaUser: User = {
        id: user.id,
        email: user.email,
        name: user.name,
        workspaceId: user.workspace_id,
        role: user.role as 'admin' | 'member',
        avatarUrl: user.avatar_url,
        deletedAt: user.deleted_at,
      };

      log.info('OAuth login (existing link)', { userId: user.id, provider: profile.provider });
      return { needsLinking: false, user: luciaUser, session, isNewUser: false };
    }

    // 2. Check if user exists with matching email
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, profile.email.toLowerCase()),
    });

    if (existingUser) {
      if (existingUser.deleted_at) {
        throw new AuthError(AUTH_ERRORS.INVALID_CREDENTIALS, 'Account not found or deleted');
      }

      log.info('OAuth login requires linking', {
        userId: existingUser.id,
        provider: profile.provider,
      });
      return {
        needsLinking: true,
        pendingUserId: existingUser.id,
        email: existingUser.email,
        provider: profile.provider,
      };
    }

    // 3. New user — create user + workspace + oauth_account
    const workspaceId = nanoid();
    const userId = nanoid();
    const oauthAccountId = nanoid();

    const newUser = await runTransaction(db, async (tx) => {
      await Promise.resolve(
        tx.insert(schema.workspaces).values({
          id: workspaceId,
          name: `${profile.name.trim()}'s Workspace`,
          status: 'active' as const,
          created_at: new Date(),
          updated_at: new Date(),
        })
      );

      const [user] = await tx
        .insert(schema.users)
        .values({
          id: userId,
          workspace_id: workspaceId,
          email: profile.email.toLowerCase(),
          password_hash: null,
          name: profile.name.trim(),
          role: 'admin' as const,
          avatar_url: profile.avatarUrl || null,
          email_verified_at: new Date(),
        })
        .returning();

      await tx.insert(schema.oauthAccounts).values({
        id: oauthAccountId,
        user_id: userId,
        provider: profile.provider,
        provider_account_id: profile.providerAccountId,
        email: profile.email.toLowerCase(),
      });

      return user;
    });

    if (!newUser) {
      throw new AuthError(AUTH_ERRORS.DATABASE_ERROR, 'Failed to create user');
    }

    const session = await auth.createSession(newUser.id, {});
    const luciaUser: User = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      workspaceId: newUser.workspace_id,
      role: newUser.role as 'admin' | 'member',
      avatarUrl: newUser.avatar_url,
      deletedAt: newUser.deleted_at,
    };

    log.info('OAuth registration (new user)', {
      userId: newUser.id,
      provider: profile.provider,
      workspaceId,
    });
    return { needsLinking: false, user: luciaUser, session, isNewUser: true };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    log.error('OAuth login/register error', error);
    throw new AuthError(AUTH_ERRORS.DATABASE_ERROR, 'OAuth authentication failed');
  }
}
```

**Step 3: Add `and` import from drizzle-orm**

At the top of the file, update the drizzle import:

```typescript
import { eq, and } from 'drizzle-orm';
```

**Step 4: Add confirmAccountLink method**

```typescript
/**
 * Confirm account linking after user consent
 *
 * Links an OAuth provider to an existing user account.
 * Sets email_verified_at and avatar_url if not already set.
 *
 * @param userId - Existing user ID to link
 * @param profile - OAuth provider profile data
 * @returns { user, session }
 */
export async function confirmAccountLink(
  userId: string,
  profile: OAuthProfile
): Promise<{ user: User; session: Session }> {
  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!existingUser || existingUser.deleted_at) {
      throw new AuthError(AUTH_ERRORS.INVALID_CREDENTIALS, 'Account not found or deleted');
    }

    const oauthAccountId = nanoid();

    await runTransaction(db, async (tx) => {
      // Insert oauth_account link
      await tx.insert(schema.oauthAccounts).values({
        id: oauthAccountId,
        user_id: userId,
        provider: profile.provider,
        provider_account_id: profile.providerAccountId,
        email: profile.email.toLowerCase(),
      });

      // Update user: set avatar_url if null, set email_verified_at if null
      const updates: Record<string, unknown> = {};
      if (!existingUser.avatar_url && profile.avatarUrl) {
        updates.avatar_url = profile.avatarUrl;
      }
      if (!existingUser.email_verified_at) {
        updates.email_verified_at = new Date();
      }

      if (Object.keys(updates).length > 0) {
        await tx.update(schema.users).set(updates).where(eq(schema.users.id, userId));
      }
    });

    // Re-fetch user to get updated fields
    const updatedUser = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!updatedUser) {
      throw new AuthError(AUTH_ERRORS.DATABASE_ERROR, 'Failed to fetch updated user');
    }

    const session = await auth.createSession(userId, {});
    const luciaUser: User = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      workspaceId: updatedUser.workspace_id,
      role: updatedUser.role as 'admin' | 'member',
      avatarUrl: updatedUser.avatar_url,
      deletedAt: updatedUser.deleted_at,
    };

    log.info('OAuth account linked', { userId, provider: profile.provider });
    return { user: luciaUser, session };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    log.error('Account linking error', error);
    throw new AuthError(AUTH_ERRORS.DATABASE_ERROR, 'Account linking failed');
  }
}
```

**Step 5: Add unlinkOAuthProvider method**

```typescript
/**
 * Unlink an OAuth provider from a user account
 *
 * Prevents unlinking if it would leave the user with no authentication method.
 *
 * @param userId - User ID to unlink from
 * @param provider - Provider name (e.g., "google")
 */
export async function unlinkOAuthProvider(userId: string, provider: string): Promise<void> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      throw new AuthError(AUTH_ERRORS.INVALID_CREDENTIALS, 'User not found');
    }

    // Check if user has a password (alternative auth method)
    if (!user.password_hash) {
      throw new AuthError(
        AUTH_ERRORS.OAUTH_UNLINK_DENIED,
        'Cannot unlink: no password set. Add a password first.'
      );
    }

    // Delete the oauth_account record
    await db
      .delete(schema.oauthAccounts)
      .where(
        and(eq(schema.oauthAccounts.user_id, userId), eq(schema.oauthAccounts.provider, provider))
      );

    log.info('OAuth provider unlinked', { userId, provider });
  } catch (error) {
    if (error instanceof AuthError) throw error;
    log.error('OAuth unlink error', error);
    throw new AuthError(AUTH_ERRORS.DATABASE_ERROR, 'Failed to unlink provider');
  }
}
```

**Step 6: Add getLinkedOAuthAccounts method (for security page)**

```typescript
/**
 * Get all linked OAuth accounts for a user
 *
 * @param userId - User ID
 * @returns Array of linked OAuth accounts
 */
export async function getLinkedOAuthAccounts(userId: string) {
  return db.query.oauthAccounts.findMany({
    where: eq(schema.oauthAccounts.user_id, userId),
  });
}
```

**Step 7: Fix the login() function for nullable password_hash**

In the existing `login()` function (around line 341), `user.password_hash` is now nullable. Add a null check:

```typescript
// After finding user, before verifyPassword:
if (!user.password_hash) {
  throw new AuthError(
    AUTH_ERRORS.INVALID_CREDENTIALS,
    'This account uses social login. Please sign in with your linked provider.'
  );
}
```

**Step 8: Verify typecheck passes**

Run: `bun run typecheck`
Expected: PASS

**Step 9: Commit**

```bash
git add src/services/auth.service.ts
git commit -m "feat(auth): add OAuth login/register/link/unlink service methods (#153)"
```

---

## Task 7: API route — OAuth initiation (GET /api/auth/google)

**Files:**

- Create: `src/pages/api/auth/google/index.ts`

**Step 1: Create the OAuth initiation endpoint**

Create `src/pages/api/auth/google/index.ts`:

```typescript
/**
 * GET /api/auth/google
 *
 * Initiates Google OAuth flow.
 * Generates state + PKCE code verifier, stores in cookies, redirects to Google.
 */

import type { APIRoute } from 'astro';
import { generateState, generateCodeVerifier } from 'arctic';
import { createGoogleOAuthClient } from '@/lib/auth/oauth';
import { getEnv } from '@/lib/env';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, redirect }) => {
  try {
    const google = createGoogleOAuthClient();
    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'email', 'profile']);

    const isProduction = getEnv('NODE_ENV') === 'production';

    // Store state and code verifier in HTTP-only cookies (10-minute expiry)
    cookies.set('google_oauth_state', state, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    });

    cookies.set('google_oauth_code_verifier', codeVerifier, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    });

    return redirect(url.toString(), 302);
  } catch (error) {
    return redirect('/login?error=oauth_error', 302);
  }
};
```

**Step 2: Verify typecheck passes**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/pages/api/auth/google/index.ts
git commit -m "feat(api): add Google OAuth initiation endpoint (#153)"
```

---

## Task 8: API route — OAuth callback (GET /api/auth/google/callback)

**Files:**

- Create: `src/pages/api/auth/google/callback.ts`

**Step 1: Create the OAuth callback endpoint**

Create `src/pages/api/auth/google/callback.ts`:

```typescript
/**
 * GET /api/auth/google/callback
 *
 * Handles Google OAuth callback.
 * Validates state, exchanges code for tokens, fetches profile, creates/links account.
 */

import type { APIRoute } from 'astro';
import { createGoogleOAuthClient } from '@/lib/auth/oauth';
import { auth } from '@/lib/auth/lucia';
import { loginOrRegisterWithOAuth } from '@/services/auth.service';
import { createLogger } from '@/lib/logger';
import { getEnv } from '@/lib/env';
import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit';

const log = createLogger('oauth:google:callback');

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, redirect, clientAddress, request }) => {
  try {
    // Rate limit check (same as login: 10 attempts / 15 min per IP)
    const rateLimitResult = checkRateLimit(request, RATE_LIMIT_PRESETS.login, clientAddress);
    if (!rateLimitResult.allowed) {
      return redirect('/login?error=rate_limited', 302);
    }

    // Read state and code from URL
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    // Read stored values from cookies
    const storedState = cookies.get('google_oauth_state')?.value;
    const storedCodeVerifier = cookies.get('google_oauth_code_verifier')?.value;

    // Clear OAuth cookies immediately
    cookies.delete('google_oauth_state', { path: '/' });
    cookies.delete('google_oauth_code_verifier', { path: '/' });

    // Validate state parameter (CSRF protection)
    if (!code || !state || !storedState || !storedCodeVerifier || state !== storedState) {
      log.warn('OAuth state validation failed');
      return redirect('/login?error=oauth_error', 302);
    }

    // Exchange code for tokens
    const google = createGoogleOAuthClient();
    const tokens = await google.validateAuthorizationCode(code, storedCodeVerifier);
    const accessToken = tokens.accessToken();

    // Fetch Google user profile
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileResponse.ok) {
      log.error('Failed to fetch Google profile', { status: profileResponse.status });
      return redirect('/login?error=oauth_error', 302);
    }

    const googleUser = (await profileResponse.json()) as {
      sub: string;
      email: string;
      name: string;
      picture?: string;
      email_verified?: boolean;
    };

    if (!googleUser.email) {
      log.error('Google profile missing email');
      return redirect('/login?error=oauth_error', 302);
    }

    // Call service layer
    const result = await loginOrRegisterWithOAuth({
      provider: 'google',
      providerAccountId: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name || googleUser.email.split('@')[0],
      avatarUrl: googleUser.picture,
    });

    if (result.needsLinking) {
      // Store pending link info in a short-lived cookie
      const isProduction = getEnv('NODE_ENV') === 'production';
      const pendingLink = JSON.stringify({
        userId: result.pendingUserId,
        provider: 'google',
        providerAccountId: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name || googleUser.email.split('@')[0],
        avatarUrl: googleUser.picture || null,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      });

      cookies.set('pending_oauth_link', pendingLink, {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 60 * 10,
      });

      return redirect('/auth/link-account', 302);
    }

    // Create session cookie
    const sessionCookie = auth.createSessionCookie(result.session.id);
    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: sessionCookie.attributes.path || '/',
      httpOnly: true,
      secure: sessionCookie.attributes.secure,
      sameSite: sessionCookie.attributes.sameSite as 'lax' | 'strict' | 'none',
      maxAge: sessionCookie.attributes.maxAge,
    });

    return redirect('/dashboard', 302);
  } catch (error) {
    log.error('OAuth callback error', error);
    return redirect('/login?error=oauth_error', 302);
  }
};
```

**Step 2: Verify typecheck passes**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/pages/api/auth/google/callback.ts
git commit -m "feat(api): add Google OAuth callback endpoint (#153)"
```

---

## Task 9: API route — account linking (POST /api/auth/google/link)

**Files:**

- Create: `src/pages/api/auth/google/link.ts`

**Step 1: Create the account linking endpoint**

Create `src/pages/api/auth/google/link.ts`:

```typescript
/**
 * POST /api/auth/google/link
 *
 * Confirms account linking after user consent.
 * Reads pending link data from cookie, creates oauth_account, creates session.
 */

import type { APIRoute } from 'astro';
import { auth } from '@/lib/auth/lucia';
import { confirmAccountLink } from '@/services/auth.service';
import { createLogger } from '@/lib/logger';
import { getEnv } from '@/lib/env';

const log = createLogger('oauth:google:link');

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  try {
    // Read pending link cookie
    const pendingLinkCookie = cookies.get('pending_oauth_link')?.value;
    if (!pendingLinkCookie) {
      return redirect('/login?error=link_expired', 302);
    }

    // Parse and validate
    const pendingLink = JSON.parse(pendingLinkCookie) as {
      userId: string;
      provider: string;
      providerAccountId: string;
      email: string;
      name: string;
      avatarUrl: string | null;
      expiresAt: number;
    };

    // Clear the cookie
    cookies.delete('pending_oauth_link', { path: '/' });

    // Check expiration
    if (Date.now() > pendingLink.expiresAt) {
      return redirect('/login?error=link_expired', 302);
    }

    // Confirm the link
    const { session } = await confirmAccountLink(pendingLink.userId, {
      provider: pendingLink.provider,
      providerAccountId: pendingLink.providerAccountId,
      email: pendingLink.email,
      name: pendingLink.name,
      avatarUrl: pendingLink.avatarUrl || undefined,
    });

    // Create session cookie
    const sessionCookie = auth.createSessionCookie(session.id);
    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: sessionCookie.attributes.path || '/',
      httpOnly: true,
      secure: sessionCookie.attributes.secure,
      sameSite: sessionCookie.attributes.sameSite as 'lax' | 'strict' | 'none',
      maxAge: sessionCookie.attributes.maxAge,
    });

    return redirect('/dashboard', 302);
  } catch (error) {
    log.error('Account linking error', error);
    cookies.delete('pending_oauth_link', { path: '/' });
    return redirect('/login?error=link_failed', 302);
  }
};
```

**Step 2: Verify typecheck passes**

Run: `bun run typecheck`

**Step 3: Commit**

```bash
git add src/pages/api/auth/google/link.ts
git commit -m "feat(api): add OAuth account linking endpoint (#153)"
```

---

## Task 10: API route — unlink (POST /api/auth/google/unlink)

**Files:**

- Create: `src/pages/api/auth/google/unlink.ts`

**Step 1: Create the unlink endpoint**

Create `src/pages/api/auth/google/unlink.ts`:

```typescript
/**
 * POST /api/auth/google/unlink
 *
 * Unlink Google OAuth from the authenticated user's account.
 * Requires the user to have a password set (alternative auth method).
 */

import type { APIRoute } from 'astro';
import { unlinkOAuthProvider, AUTH_ERRORS } from '@/services/auth.service';
import {
  createErrorResponseResponse,
  createSuccessResponse,
  STANDARD_RESPONSE_HEADERS,
} from '@/types/api';
import { createLogger } from '@/lib/logger';

const log = createLogger('oauth:google:unlink');

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return createErrorResponseResponse('NOT_AUTHENTICATED', 'Not authenticated', 401);
    }

    await unlinkOAuthProvider(user.id, 'google');

    return new Response(
      JSON.stringify(createSuccessResponse({ message: 'Google account unlinked' })),
      {
        status: 200,
        headers: STANDARD_RESPONSE_HEADERS,
      }
    );
  } catch (error: any) {
    if (error?.code === AUTH_ERRORS.OAUTH_UNLINK_DENIED) {
      return createErrorResponseResponse(AUTH_ERRORS.OAUTH_UNLINK_DENIED, error.message, 400);
    }

    log.error('Unlink error', error);
    return createErrorResponseResponse('INTERNAL_SERVER_ERROR', 'Failed to unlink account', 500);
  }
};
```

**Step 2: Verify typecheck passes**

Run: `bun run typecheck`

**Step 3: Commit**

```bash
git add src/pages/api/auth/google/unlink.ts
git commit -m "feat(api): add OAuth unlink endpoint (#153)"
```

---

## Task 11: CSRF middleware — whitelist OAuth GET routes

**Files:**

- Modify: `src/lib/csrf.ts:135-140`

**Step 1: Add OAuth routes to CSRF exempt list**

In `src/lib/csrf.ts`, the CSRF middleware only checks POST/PUT/DELETE/PATCH methods (line 118: `CSRF_PROTECTED_METHODS`). Since `/api/auth/google` and `/api/auth/google/callback` are GET routes, they are **already exempt** — no CSRF check runs on GET requests.

However, the POST routes (`/api/auth/google/link`) need CSRF exemption since the linking page posts from a non-authenticated state (no CSRF cookie set yet). Add to `CSRF_EXEMPT_ENDPOINTS`:

```typescript
export const CSRF_EXEMPT_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/forgot-password',
  '/api/auth/logout',
  '/api/auth/google/link',
] as const;
```

Note: `/api/auth/google/unlink` should NOT be exempt — it requires an authenticated session and should have CSRF protection.

**Step 2: Verify typecheck passes**

Run: `bun run typecheck`

**Step 3: Commit**

```bash
git add src/lib/csrf.ts
git commit -m "feat(csrf): exempt OAuth account linking from CSRF check (#153)"
```

---

## Task 12: UI — GoogleButton atom component

**Files:**

- Create: `src/components/atoms/GoogleButton.astro`

**Step 1: Create the Google button component**

Create `src/components/atoms/GoogleButton.astro`:

```astro
---
/**
 * GoogleButton Component
 *
 * Branded Google SSO button following Google's brand guidelines.
 * Uses simple-icons for the Google "G" logo.
 *
 * @param {"Sign in" | "Sign up"} action - Button action text
 * @param {string} class - Additional CSS classes
 */

interface Props {
  action?: 'Sign in' | 'Sign up';
  class?: string;
}

const { action = 'Sign in', class: className = '' } = Astro.props;
const label = `${action} with Google`;
---

<a
  href="/api/auth/google"
  class:list={[
    'btn btn-outline border-base-300 bg-base-100 hover:bg-base-200 gap-3 h-14 rounded-2xl text-base font-semibold w-full',
    className,
  ]}
  role="button"
  aria-label={label}
>
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" class="shrink-0">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
    ></path>
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    ></path>
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    ></path>
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    ></path>
  </svg>
  <span>{label}</span>
</a>
```

**Step 2: Verify typecheck passes**

Run: `bun run typecheck`

**Step 3: Commit**

```bash
git add src/components/atoms/GoogleButton.astro
git commit -m "feat(ui): add GoogleButton atom component (#153)"
```

---

## Task 13: UI — Update LoginForm with Google button

**Files:**

- Modify: `src/components/molecules/LoginForm.astro`

**Step 1: Add GoogleButton import**

At the top of the frontmatter (after other imports, around line 18):

```typescript
import GoogleButton from '../atoms/GoogleButton.astro';
```

**Step 2: Add Google button and divider after the form**

In the template, after the closing `</form>` tag (line 140) and before the closing `</div>` tags, add:

```astro
<div class="divider text-base-content/40 text-xs uppercase tracking-widest my-6">or</div>
<GoogleButton action="Sign in" />
```

**Step 3: Verify typecheck passes**

Run: `bun run typecheck`

**Step 4: Commit**

```bash
git add src/components/molecules/LoginForm.astro
git commit -m "feat(ui): add Google SSO button to login form (#153)"
```

---

## Task 14: UI — Update signup page with Google button

**Files:**

- Modify: `src/pages/signup.astro`

**Step 1: Add GoogleButton import**

In the frontmatter (around line 18), add:

```typescript
import GoogleButton from '../components/atoms/GoogleButton.astro';
```

**Step 2: Add Google button above the form (non-invitation only)**

Inside the card body, after the `<h2>` heading (around line 130) and before the `<form>` tag, add (only for non-invitation signups):

```astro
{
  !isInvitation && (
    <>
      <GoogleButton action="Sign up" />
      <div class="divider text-base-content/40 text-xs uppercase tracking-widest my-2">or</div>
    </>
  )
}
```

**Step 3: Verify typecheck passes**

Run: `bun run typecheck`

**Step 4: Commit**

```bash
git add src/pages/signup.astro
git commit -m "feat(ui): add Google SSO button to signup page (#153)"
```

---

## Task 15: UI — Account linking page

**Files:**

- Create: `src/pages/auth/link-account.astro`

**Step 1: Create the account linking page**

Create `src/pages/auth/link-account.astro`:

```astro
---
/**
 * Account Linking Page
 *
 * Shown when an existing email/password user signs in with Google.
 * Asks for explicit consent before linking the Google account.
 */

import AuthLayout from '../../layouts/AuthLayout.astro';
import Button from '../../components/atoms/Button.astro';
import { Link2, ShieldCheck, ArrowLeft } from '@lucide/astro';

// Read pending link info from cookie
const pendingLinkCookie = Astro.cookies.get('pending_oauth_link')?.value;

let pendingLink: {
  email: string;
  provider: string;
  expiresAt: number;
} | null = null;

if (pendingLinkCookie) {
  try {
    const parsed = JSON.parse(pendingLinkCookie);
    if (Date.now() < parsed.expiresAt) {
      pendingLink = parsed;
    }
  } catch {
    // Invalid cookie, ignore
  }
}

// If no valid pending link, redirect to login
if (!pendingLink) {
  return Astro.redirect('/login?error=link_expired');
}

const providerName = pendingLink.provider.charAt(0).toUpperCase() + pendingLink.provider.slice(1);
---

<AuthLayout title="allowealth - Link Account">
  <div class="card bg-base-100 shadow-2xl border border-base-300">
    <div class="card-body p-8">
      <div class="flex flex-col items-center gap-4 text-center">
        <div class="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
          <Link2 size={32} class="text-accent stroke-current" aria-hidden="true" />
        </div>

        <h2 class="text-2xl font-bold">Link Your Account</h2>

        <p class="text-base-content/70">
          An account with <strong class="text-base-content">{pendingLink.email}</strong> already exists.
        </p>

        <div class="bg-base-200/60 border border-base-300 rounded-2xl p-4 w-full text-left">
          <div class="flex items-start gap-3">
            <ShieldCheck
              size={20}
              class="text-accent stroke-current shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div class="text-sm text-base-content/70">
              <p class="font-semibold text-base-content mb-1">What linking does:</p>
              <ul class="list-disc list-inside space-y-1">
                <li>Connects your {providerName} account for quick sign-in</li>
                <li>You can still use your email and password</li>
                <li>You can unlink anytime from Security settings</li>
              </ul>
            </div>
          </div>
        </div>

        <form method="POST" action="/api/auth/google/link" class="w-full">
          <Button type="submit" variant="accent" className="w-full h-14 rounded-2xl">
            Link my {providerName} account
          </Button>
        </form>

        <a href="/login" class="btn btn-ghost gap-2 text-sm">
          <ArrowLeft size={16} class="stroke-current" aria-hidden="true" />
          Cancel and return to login
        </a>
      </div>
    </div>
  </div>
</AuthLayout>
```

**Step 2: Verify typecheck passes**

Run: `bun run typecheck`

**Step 3: Commit**

```bash
git add src/pages/auth/link-account.astro
git commit -m "feat(ui): add OAuth account linking confirmation page (#153)"
```

---

## Task 16: UI — Update security page with OAuth connected accounts

**Files:**

- Modify: `src/pages/security.astro:34-42`
- Modify: `src/components/molecules/SecurityConnectedAccountsCard.astro`

**Step 1: Wire real OAuth data into security page**

In `src/pages/security.astro`, replace the hardcoded `connectedAccounts` (lines 34-42) with real data:

Add import at top:

```typescript
import { getLinkedOAuthAccounts } from '@/services/auth.service';
```

Replace the connectedAccounts block:

```typescript
// Fetch linked OAuth accounts for the current user
let connectedAccounts: Array<{
  id: string;
  provider: string;
  email?: string;
  connected: boolean;
}> = [];

if (user?.id) {
  const linkedAccounts = await getLinkedOAuthAccounts(user.id);
  const googleAccount = linkedAccounts.find((a) => a.provider === 'google');

  connectedAccounts = [
    {
      id: 'google',
      provider: 'Google',
      email: googleAccount?.email,
      connected: !!googleAccount,
    },
  ];
}
```

**Step 2: Update SecurityConnectedAccountsCard to enable buttons**

In `src/components/molecules/SecurityConnectedAccountsCard.astro`, update the Button to remove `disabled` and add a form for unlink/link:

Replace the `<Button>` block (lines 63-69) with:

```astro
{
  account.connected ? (
    <form method="POST" data-unlink-form data-provider={account.id}>
      <Button type="submit" variant="outline" size="sm" data-unlink-btn>
        Disconnect
      </Button>
    </form>
  ) : (
    <a href="/api/auth/google" class="btn btn-accent btn-sm">
      Connect Account
    </a>
  )
}
```

Also remove the `disabled` attribute and the "Under Development" badge (lines 37-39).

Add a client-side script at the bottom for the unlink form:

```html
<script>
  document.querySelectorAll('[data-unlink-form]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const provider = (form as HTMLFormElement).dataset.provider;
      const btn = form.querySelector('[data-unlink-btn]') as HTMLButtonElement;
      if (btn) btn.disabled = true;

      try {
        const csrfToken = document.cookie
          .split('; ')
          .find((c) => c.startsWith('csrf_token='))
          ?.split('=')
          .slice(1)
          .join('=');

        const res = await fetch(`/api/auth/${provider}/unlink`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken || '',
          },
          credentials: 'include',
        });

        if (res.ok) {
          window.location.reload();
        } else {
          const data = await res.json();
          const { addToast } = await import('@/lib/stores/toastStore');
          addToast(data.error?.message || 'Failed to disconnect', 'error');
          if (btn) btn.disabled = false;
        }
      } catch {
        const { addToast } = await import('@/lib/stores/toastStore');
        addToast('Failed to disconnect. Please try again.', 'error');
        if (btn) btn.disabled = false;
      }
    });
  });
</script>
```

**Step 3: Verify typecheck passes**

Run: `bun run typecheck`

**Step 4: Commit**

```bash
git add src/pages/security.astro src/components/molecules/SecurityConnectedAccountsCard.astro
git commit -m "feat(ui): wire OAuth connected accounts into security page (#153)"
```

---

## Task 17: Add OAuth error handling to login page

**Files:**

- Modify: `src/components/molecules/LoginForm.astro`

**Step 1: Handle OAuth error query params**

The OAuth callback redirects to `/login?error=oauth_error` on failure. Update `LoginForm.astro` to handle these.

In the frontmatter, update the Props interface and add handling:

```typescript
export interface Props {
  errorMessage?: string;
  email?: string;
  redirectTo?: string;
  bannerMessage?: string;
  bannerType?: 'info' | 'success' | 'error';
  resendEmail?: string;
  oauthError?: string;
}
```

Add to destructuring:

```typescript
const { ..., oauthError = '' } = Astro.props;
```

Map OAuth errors:

```typescript
const oauthErrorMessages: Record<string, string> = {
  oauth_error: 'Google sign-in failed. Please try again.',
  link_expired: 'Account linking session expired. Please try again.',
  link_failed: 'Failed to link account. Please try again.',
  rate_limited: 'Too many attempts. Please try again later.',
};
const oauthMessage = oauthError ? oauthErrorMessages[oauthError] || 'An error occurred.' : '';
```

Display it in the template (before the form):

```astro
{
  oauthMessage && (
    <div role="alert" class="alert alert-error mb-4">
      <CircleX size={20} class="stroke-current shrink-0" />
      <span>{oauthMessage}</span>
    </div>
  )
}
```

**Step 2: Pass oauthError from login page**

In `src/pages/login.astro`, read the error query param and pass it to LoginForm:

```typescript
const oauthError = Astro.url.searchParams.get('error') || '';
```

```astro
<LoginForm oauthError={oauthError} ... />
```

**Step 3: Verify typecheck passes**

Run: `bun run typecheck`

**Step 4: Commit**

```bash
git add src/components/molecules/LoginForm.astro src/pages/login.astro
git commit -m "feat(ui): handle OAuth error messages on login page (#153)"
```

---

## Task 18: OpenAPI documentation

**Files:**

- Modify: `openapi/paths/auth.yml`
- Create: `openapi/schemas/OAuthAccount.yml`

**Step 1: Add OAuthAccount schema**

Create `openapi/schemas/OAuthAccount.yml`:

```yaml
OAuthAccount:
  type: object
  required: [id, user_id, provider, provider_account_id, email, created_at]
  properties:
    id:
      type: string
      description: Unique identifier (nanoid)
      example: V1StGXR8_Z5jdHi6B-myT
    user_id:
      type: string
      description: ID of the linked user
    provider:
      type: string
      description: OAuth provider name
      example: google
    provider_account_id:
      type: string
      description: Provider's unique user identifier
      example: '104123456789012345678'
    email:
      type: string
      format: email
      description: Email from the OAuth provider
      example: user@gmail.com
    created_at:
      type: string
      format: date-time
      description: When the account was linked
```

**Step 2: Add OAuth endpoints to auth.yml**

Append to `openapi/paths/auth.yml`:

```yaml
/api/auth/google:
  get:
    tags: [Authentication]
    summary: Initiate Google OAuth flow
    description: |
      Redirects to Google's authorization page for OAuth sign-in/sign-up.
      Generates PKCE code verifier and state parameter stored in HTTP-only cookies.
    security: []
    responses:
      '302':
        description: Redirect to Google authorization URL
        headers:
          Location:
            description: Google OAuth authorization URL
            schema:
              type: string
          Set-Cookie:
            description: OAuth state and code verifier cookies (HTTP-only, 10-minute expiry)
            schema:
              type: string

/api/auth/google/callback:
  get:
    tags: [Authentication]
    summary: Google OAuth callback
    description: |
      Handles the OAuth callback from Google. Validates state parameter,
      exchanges authorization code for tokens, and creates or links user account.
    security: []
    parameters:
      - name: code
        in: query
        required: true
        schema:
          type: string
      - name: state
        in: query
        required: true
        schema:
          type: string
    responses:
      '302':
        description: |
          Redirects based on result:
          - /dashboard: Login/signup successful
          - /auth/link-account: Existing email found, needs linking consent
          - /login?error=oauth_error: Authentication failed

/api/auth/google/link:
  post:
    tags: [Authentication]
    summary: Confirm OAuth account linking
    description: |
      Confirms linking a Google account to an existing user after explicit consent.
      Reads pending link data from HTTP-only cookie set during callback.
    security: []
    responses:
      '302':
        description: |
          Redirects based on result:
          - /dashboard: Linking successful
          - /login?error=link_expired: Pending link expired
          - /login?error=link_failed: Linking failed

/api/auth/google/unlink:
  post:
    tags: [Authentication]
    summary: Unlink Google account
    description: |
      Removes the Google OAuth link from the authenticated user's account.
      Fails if the user has no password set (would leave them with no auth method).
    security:
      - sessionAuth: []
    responses:
      '200':
        description: Google account unlinked successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                  example: true
                data:
                  type: object
                  properties:
                    message:
                      type: string
                      example: Google account unlinked
      '400':
        description: Cannot unlink (no password set)
        content:
          application/json:
            schema:
              $ref: '../schemas/ErrorResponse.yml#/ErrorResponse'
      '401':
        $ref: '../responses/common.yml#/Unauthorized'
```

**Step 3: Commit**

```bash
git add openapi/paths/auth.yml openapi/schemas/OAuthAccount.yml
git commit -m "docs(openapi): add Google OAuth endpoints and OAuthAccount schema (#153)"
```

---

## Task 19: Update .env.example and environment documentation

**Files:**

- Modify: `.env.example` (already done in Task 5)

This was handled in Task 5. Verify the env vars are documented.

---

## Task 20: Quality gates and final verification

**Files:** All modified files

**Step 1: Run lint fix**

Run: `bun run lint:fix`
Expected: PASS (auto-fix any formatting issues)

**Step 2: Run stylelint fix**

Run: `bun run stylelint:fix`
Expected: PASS

**Step 3: Run format fix**

Run: `bun run format:fix`
Expected: PASS

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS — zero errors

**Step 5: Run build**

Run: `bun run build`
Expected: Build succeeds

**Step 6: Check for bun: imports in shared code**

Run: `grep -r "bun:" src/ --exclude-dir=node_modules || echo "No bun: imports found"`
Expected: No bun: imports in middleware-imported files

**Step 7: Commit any remaining formatting changes**

```bash
git add -A
git commit -m "chore: quality gates pass for Google SSO integration (#153)"
```

---

## Task 21: Manual testing checklist

This is a manual verification step. No automated tests — verify in browser:

1. Navigate to `/login` — Google button visible below form with "OR" divider
2. Navigate to `/signup` — Google button visible above form
3. Click "Sign in with Google" — redirects to Google consent screen
4. Complete Google auth — redirects to `/dashboard` (new user)
5. Log out, click "Sign in with Google" again — redirects to `/dashboard` (existing user)
6. Create email/password account, then try Google SSO with same email — see linking page
7. Confirm linking — redirects to `/dashboard`
8. Navigate to `/security` — see connected Google account
9. Click "Disconnect" — Google account unlinked
10. Verify mobile responsive layout for all pages
11. Verify keyboard navigation (Tab through Google button)

---

## Summary

| Task | Description          | Files           | Estimated |
| ---- | -------------------- | --------------- | --------- |
| 1    | Install Arctic       | package.json    | 2 min     |
| 2    | Users schema changes | 5 files         | 10 min    |
| 3    | oauth_accounts table | 6 files         | 10 min    |
| 4    | Generate migrations  | drizzle/        | 5 min     |
| 5    | OAuth config + env   | 2 files         | 5 min     |
| 6    | Service layer        | auth.service.ts | 30 min    |
| 7    | OAuth initiation API | 1 file          | 10 min    |
| 8    | OAuth callback API   | 1 file          | 15 min    |
| 9    | Account linking API  | 1 file          | 10 min    |
| 10   | Unlink API           | 1 file          | 10 min    |
| 11   | CSRF whitelist       | csrf.ts         | 2 min     |
| 12   | GoogleButton atom    | 1 file          | 10 min    |
| 13   | Login form update    | 1 file          | 5 min     |
| 14   | Signup page update   | 1 file          | 5 min     |
| 15   | Account linking page | 1 file          | 15 min    |
| 16   | Security page update | 2 files         | 15 min    |
| 17   | OAuth error handling | 2 files         | 10 min    |
| 18   | OpenAPI docs         | 2 files         | 10 min    |
| 19   | Env documentation    | verified        | 2 min     |
| 20   | Quality gates        | all             | 10 min    |
| 21   | Manual testing       | browser         | 20 min    |
