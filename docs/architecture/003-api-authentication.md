# API Authentication Architecture

> **ADR-003** | Updated: 2026-03-10

## Overview

This document describes how authenticated API requests work after the Better Auth rewrite.

## Problem

The old auth stack mixed Lucia session validation, custom session-cache behavior, and route-level auth helpers. That led to duplicate session checks, extra moving parts, and API handlers that did not share one clear pattern.

## Decision

Allowealth now uses Better Auth as the single auth system.

- `src/pages/api/auth/[...all].ts` is the main auth entrypoint.
- `src/middleware/auth.ts` resolves the current session through `auth.api.getSession(...)`.
- Middleware hydrates `Astro.locals.user` and `Astro.locals.session` before page and API code runs.
- API handlers should read authenticated state from `context.locals`, not revalidate auth themselves.

The only remaining app-owned auth-adjacent API route is `src/pages/api/auth/verify-email.ts`, which is still used for profile email-change verification.

## Request Flow

### Middleware Authentication

For non-prerendered app requests, the authentication middleware:

1. Reads the Better Auth session cookie: `better-auth.session_token`
2. Calls the shared Better Auth server instance
3. Loads the domain user record from `users`
4. Stores hydrated auth state on `context.locals`
5. Clears auth state when the session is missing, stale, or belongs to a deleted user

This keeps auth resolution in one place and gives API routes a stable user/session shape.

### API Handler Pattern

Use `getAuthenticatedUser(context)` when a route only needs the current user ID:

```ts
import type { APIRoute } from 'astro';
import { errorResponse, getAuthenticatedUser, successResponse } from '@/lib/api-utils';

export const GET: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);
    const data = await someService.getData(userId);

    return successResponse(data);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    return errorResponse('Internal server error', 500);
  }
};
```

If the route needs more than the user ID, read `context.locals.user` or `context.locals.session` directly.

## Migration Guidance

### Deprecated Pattern

Older route code sometimes revalidated auth inside the handler.

```ts
const userId = await requireAuth(context);
```

That page-level helper still exists for redirect-based page protection, but API routes should not use it.

### Current Pattern

API routes should rely on the middleware-owned locals shape:

| Need             | Recommended source              |
| ---------------- | ------------------------------- |
| Current user ID  | `getAuthenticatedUser(context)` |
| Full user object | `context.locals.user`           |
| Session metadata | `context.locals.session`        |

## Security Notes

1. Middleware is the single place where request auth is resolved.
2. Better Auth owns credential login, Google OAuth, password reset, email verification, linked accounts, and 2FA auth state.
3. CSRF exemptions now target the Better Auth catch-all route plus the remaining app-owned endpoints.
4. The Better Auth cutover invalidates old sessions, so users are forced to sign in again after deployment.

## Related Files

- `src/lib/auth/server.ts`
- `src/pages/api/auth/[...all].ts`
- `src/middleware/auth.ts`
- `src/lib/api-utils.ts`
- `src/lib/auth/requireAuth.ts`
- `src/pages/api/auth/verify-email.ts`
