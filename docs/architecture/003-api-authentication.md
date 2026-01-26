# API Authentication Architecture

> **ADR-003** | Created: 2026-01-26

## Overview

This document describes the authentication architecture for API routes, explaining how middleware-based session validation works and how to use the `getAuthenticatedUser` helper function.

## Problem

Previously, API routes used `requireAuth(context)` which made a redundant database call to `auth.validateSession()` even though the middleware had already validated the session and set `context.locals.user`.

This caused:

- **Unnecessary database calls**: Every authenticated API request triggered two session validations
- **Performance overhead**: Extra latency on each request
- **Inconsistent patterns**: Some code used the async `requireAuth`, others accessed `locals` directly

## Solution

### How Middleware Authentication Works

The Astro middleware (`src/middleware.ts`) runs on **every request** and:

1. Extracts the session ID from the `sid` cookie
2. Validates the session using `auth.validateSession(sessionId)`
3. Sets `context.locals.user` and `context.locals.session` if valid
4. Sets them to `null` if invalid or missing

By the time an API route handler runs, authentication has already been validated.

### Using `getAuthenticatedUser`

The `getAuthenticatedUser(context)` helper is a **synchronous** function that:

- Uses `context.locals.user` directly (set by middleware)
- Returns the user ID as a string
- Throws `Error('Unauthorized')` if not authenticated
- **Does NOT make any database calls**

```typescript
// src/lib/api-utils.ts
import type { APIContext } from 'astro';

export function getAuthenticatedUser(context: APIContext): string {
  const user = context.locals.user;

  if (!user?.id) {
    throw new Error('Unauthorized');
  }

  return user.id;
}
```

### Example Usage in API Routes

```typescript
import type { APIRoute } from 'astro';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';

export const GET: APIRoute = async (context) => {
  try {
    // Get user ID - no database call, uses middleware-validated session
    const userId = getAuthenticatedUser(context);

    // Proceed with business logic...
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

## Migration Guide

### Before (Deprecated)

```typescript
import { requireAuth } from '@/lib/api-utils';

export const GET: APIRoute = async (context) => {
  try {
    // ❌ Makes unnecessary database call
    const userId = await requireAuth(context);
    // ...
  } catch (error) {
    // ...
  }
};
```

### After (Recommended)

```typescript
import { getAuthenticatedUser } from '@/lib/api-utils';

export const GET: APIRoute = async (context) => {
  try {
    // ✅ Uses middleware-validated session (no DB call)
    const userId = getAuthenticatedUser(context);
    // ...
  } catch (error) {
    // ...
  }
};
```

### Key Differences

| Aspect         | `requireAuth` (deprecated) | `getAuthenticatedUser` |
| -------------- | -------------------------- | ---------------------- |
| Database calls | Yes (redundant)            | No                     |
| Async          | Yes (`await` required)     | No (synchronous)       |
| Source         | Re-validates session       | Uses `locals.user`     |
| Performance    | Slower                     | Faster                 |

## Access Full User Object

If you need more than just the user ID:

```typescript
export const GET: APIRoute = async (context) => {
  const user = context.locals.user;

  if (!user) {
    return errorResponse('Unauthorized', 401);
  }

  // Access full user object
  console.log(user.id); // string
  console.log(user.email); // string
  console.log(user.name); // string

  return successResponse({ name: user.name });
};
```

## Security Notes

1. **Middleware runs first**: The session is always validated before API routes execute
2. **CSRF protection**: POST/PUT/DELETE/PATCH requests require CSRF tokens (handled by middleware)
3. **Rate limiting**: Auth endpoints have rate limits applied (see `src/lib/rate-limit.ts`)

## Note on `requireAuth` Functions

There are two `requireAuth` functions in this codebase with different purposes:

| Location                    | Status         | Purpose                                           |
| --------------------------- | -------------- | ------------------------------------------------- |
| `@/lib/api-utils.ts`        | **DEPRECATED** | Was used in API routes, makes redundant DB call   |
| `@/lib/auth/requireAuth.ts` | **ACTIVE**     | Used in Astro pages for redirect-based protection |

The new `getAuthenticatedUser` replaces only the first one (API route authentication). The page-level `requireAuth` in `auth/requireAuth.ts` remains active for protecting Astro pages with redirects to login.

## Related Files

- `src/middleware.ts` - Session validation and security headers
- `src/lib/api-utils.ts` - API helper functions including `getAuthenticatedUser`
- `src/lib/auth/lucia.ts` - Lucia auth configuration
- `src/lib/auth/requireAuth.ts` - Page-level authentication helper (redirects to login)
- `src/env.d.ts` - TypeScript types for `Astro.locals`
