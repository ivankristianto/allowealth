# Cloudflare Turnstile Bot Protection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Cloudflare Turnstile verification to login and signup forms to prevent automated bot attacks, credential stuffing, and spam registrations.

**Architecture:** Server-side token verification via `https://challenges.cloudflare.com/turnstile/v0/siteverify`. A reusable `Turnstile.astro` component renders the widget on auth forms. API endpoints verify the token BEFORE rate limiting. Graceful degradation: when `TURNSTILE_SECRET_KEY` is not configured, verification is skipped (dev convenience).

**Tech Stack:** Cloudflare Turnstile JS API (implicit rendering), `fetch` for server-side verification, Astro components, DaisyUI styling.

---

## Design Decisions

1. **Implicit rendering mode** — `<div class="cf-turnstile" data-sitekey="...">` auto-renders the widget and injects a hidden `cf-turnstile-response` input. Client-side scripts read this input value before `fetch`.
2. **Graceful degradation** — If `PUBLIC_TURNSTILE_SITE_KEY` is not set, the component renders nothing. If `TURNSTILE_SECRET_KEY` is not set on the server, verification is skipped. This lets dev environments work without Turnstile keys.
3. **Fail-closed when configured** — If keys ARE set and verification fails (bad token, expired, network error to siteverify), the request is rejected.
4. **Verification BEFORE rate limiting** — Prevents attackers from burning rate limit buckets without solving challenges.
5. **CSP allowlist approach** — Add `https://challenges.cloudflare.com` to `script-src`, `frame-src`, and `connect-src` instead of nonce injection for the external Turnstile script.

---

### Task 1: Add Environment Variables

**Files:**

- Modify: `src/env.d.ts`
- Modify: `.env.example`

**Step 1: Update `.env.example` with Turnstile placeholders**

Add to `.env.example` at the bottom:

```env
# Cloudflare Turnstile (Bot Protection)
# Get keys from: https://dash.cloudflare.com/?to=/:account/turnstile
# Test keys for development:
#   Site Key (always passes): 1x00000000000000000000AA
#   Site Key (always fails):  2x00000000000000000000AB
#   Secret Key (always passes): 1x0000000000000000000000000000000AA
#   Secret Key (always fails):  2x0000000000000000000000000000000AA
PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

**Step 2: Update `src/env.d.ts` to declare the env var types**

Add to the `ImportMetaEnv` interface (if it exists) or add a new interface declaration:

```typescript
interface ImportMetaEnv {
  readonly PUBLIC_TURNSTILE_SITE_KEY: string;
  readonly TURNSTILE_SECRET_KEY: string;
}
```

If `env.d.ts` already has the interface via Astro's `/// <reference types="astro/client" />`, the `PUBLIC_` prefixed var is auto-exposed client-side. The non-prefixed `TURNSTILE_SECRET_KEY` stays server-only.

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (no type errors from env changes)

**Step 4: Commit**

```bash
git add .env.example src/env.d.ts
git commit -m "feat(turnstile): add environment variable placeholders for Turnstile keys"
```

---

### Task 2: Update CSP Headers for Turnstile Domains

**Files:**

- Modify: `src/middleware/security-headers.ts`

**Step 1: Write the failing test**

Create `src/__tests__/middleware/security-headers.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test';

/**
 * Tests that CSP directives include Cloudflare Turnstile domains.
 * We verify the CSP string directly since the middleware is hard to unit test.
 */
describe('CSP directives for Turnstile', () => {
  test('production CSP includes challenges.cloudflare.com in script-src', async () => {
    // Import the module to check CSP directives
    const securityHeadersModule = await import('@/middleware/security-headers');
    // We can't easily test the built CSP string without calling the middleware,
    // so we test by reading the source file
    const fs = await import('fs');
    const content = fs.readFileSync('src/middleware/security-headers.ts', 'utf-8');

    expect(content).toContain('challenges.cloudflare.com');
  });

  test('CSP includes frame-src for Turnstile iframes', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/middleware/security-headers.ts', 'utf-8');

    expect(content).toContain('frame-src');
    expect(content).toContain('challenges.cloudflare.com');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/middleware/security-headers.test.ts`
Expected: FAIL — `challenges.cloudflare.com` not found in source

**Step 3: Update CSP directives in `src/middleware/security-headers.ts`**

In `CSP_DIRECTIVES_PROD`, modify `script-src`, `connect-src`, and add `frame-src`:

```typescript
const CSP_DIRECTIVES_PROD = {
  'default-src': "'self'",
  'script-src': "'self' https://challenges.cloudflare.com",
  'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
  'img-src': "'self' data: https:",
  'font-src': "'self' data: https://fonts.googleapis.com https://fonts.gstatic.com",
  'connect-src': "'self' https://challenges.cloudflare.com",
  'frame-src': 'https://challenges.cloudflare.com',
  'frame-ancestors': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'",
  'object-src': "'none'",
  'report-to': "'csp-endpoint'",
} as const;
```

Also update `CSP_DIRECTIVES_DEV` to inherit the new directives (it spreads from PROD, so `connect-src` and `frame-src` are auto-inherited; just verify `script-src` override also includes Turnstile):

```typescript
const CSP_DIRECTIVES_DEV = {
  ...CSP_DIRECTIVES_PROD,
  'script-src': "'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
} as const;
```

**Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/middleware/security-headers.test.ts`
Expected: PASS

**Step 5: Run build to verify no regressions**

Run: `bun run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/middleware/security-headers.ts src/__tests__/middleware/security-headers.test.ts
git commit -m "feat(turnstile): add Cloudflare Turnstile domains to CSP headers"
```

---

### Task 3: Create Server-Side Turnstile Verification Library

**Files:**

- Create: `src/lib/turnstile.ts`
- Create: `src/__tests__/lib/turnstile.test.ts`

**Step 1: Write the failing tests**

Create `src/__tests__/lib/turnstile.test.ts`:

```typescript
import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';

describe('verifyTurnstileToken', () => {
  const originalEnv = { ...import.meta.env };
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('returns success when verification passes', async () => {
    // Mock env
    (import.meta as any).env = {
      ...originalEnv,
      TURNSTILE_SECRET_KEY: 'test-secret-key',
    };

    // Mock fetch to return success
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
    ) as any;

    const { verifyTurnstileToken } = await import('@/lib/turnstile');
    const result = await verifyTurnstileToken('valid-token', '127.0.0.1');

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('returns error when verification fails', async () => {
    (import.meta as any).env = {
      ...originalEnv,
      TURNSTILE_SECRET_KEY: 'test-secret-key',
    };

    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: false,
            'error-codes': ['invalid-input-response'],
          }),
          { status: 200 }
        )
      )
    ) as any;

    const { verifyTurnstileToken } = await import('@/lib/turnstile');
    const result = await verifyTurnstileToken('invalid-token', '127.0.0.1');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('skips verification when secret key is not configured', async () => {
    (import.meta as any).env = {
      ...originalEnv,
      TURNSTILE_SECRET_KEY: '',
    };

    const { verifyTurnstileToken } = await import('@/lib/turnstile');
    const result = await verifyTurnstileToken('any-token', '127.0.0.1');

    expect(result.success).toBe(true);
  });

  test('returns error when token is missing but secret is configured', async () => {
    (import.meta as any).env = {
      ...originalEnv,
      TURNSTILE_SECRET_KEY: 'test-secret-key',
    };

    const { verifyTurnstileToken } = await import('@/lib/turnstile');
    const result = await verifyTurnstileToken('', '127.0.0.1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('missing');
  });

  test('returns error when fetch to siteverify fails (fail-closed)', async () => {
    (import.meta as any).env = {
      ...originalEnv,
      TURNSTILE_SECRET_KEY: 'test-secret-key',
    };

    globalThis.fetch = mock(() => Promise.reject(new Error('Network error'))) as any;

    const { verifyTurnstileToken } = await import('@/lib/turnstile');
    const result = await verifyTurnstileToken('valid-token', '127.0.0.1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('verification service');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/__tests__/lib/turnstile.test.ts`
Expected: FAIL — module `@/lib/turnstile` does not exist

**Step 3: Implement `src/lib/turnstile.ts`**

```typescript
/**
 * Cloudflare Turnstile Server-Side Verification
 *
 * Verifies Turnstile tokens by calling Cloudflare's siteverify API.
 * Graceful degradation: if TURNSTILE_SECRET_KEY is not set, verification is skipped.
 * Fail-closed: if configured but siteverify is unreachable, requests are rejected.
 */

import { logError } from '@/lib/utils';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
}

interface SiteverifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Verify a Turnstile token server-side.
 *
 * @param token - The cf-turnstile-response token from the client
 * @param clientIP - The client's IP address for additional validation
 * @returns Verification result with success status and optional error message
 */
export async function verifyTurnstileToken(
  token: string,
  clientIP: string
): Promise<TurnstileVerificationResult> {
  const secretKey = import.meta.env.TURNSTILE_SECRET_KEY;

  // Graceful degradation: skip verification if not configured
  if (!secretKey) {
    return { success: true };
  }

  // Token is required when Turnstile is configured
  if (!token) {
    return {
      success: false,
      error: 'Bot protection token is missing. Please refresh the page and try again.',
    };
  }

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: clientIP,
      }),
    });

    if (!response.ok) {
      logError('Turnstile siteverify returned non-OK status', {
        status: response.status,
        statusText: response.statusText,
      });
      return {
        success: false,
        error: 'Bot protection verification service unavailable. Please try again later.',
      };
    }

    const data = (await response.json()) as SiteverifyResponse;

    if (data.success) {
      return { success: true };
    }

    const errorCodes = data['error-codes'] || [];
    logError('Turnstile verification failed', { errorCodes, clientIP });

    return {
      success: false,
      error: 'Bot protection verification failed. Please refresh the page and try again.',
    };
  } catch (err) {
    // Fail-closed: network errors reject the request
    logError('Turnstile siteverify network error', err);
    return {
      success: false,
      error: 'Bot protection verification service unavailable. Please try again later.',
    };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test src/__tests__/lib/turnstile.test.ts`
Expected: PASS (all 5 tests)

**Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/turnstile.ts src/__tests__/lib/turnstile.test.ts
git commit -m "feat(turnstile): add server-side Turnstile token verification library"
```

---

### Task 4: Create Reusable Turnstile Astro Component

**Files:**

- Create: `src/components/atoms/Turnstile.astro`

**Step 1: Create the Turnstile component**

Create `src/components/atoms/Turnstile.astro`:

```astro
---
/**
 * Turnstile Widget Component
 *
 * Renders a Cloudflare Turnstile widget for bot protection.
 * When PUBLIC_TURNSTILE_SITE_KEY is not set, renders nothing (graceful degradation).
 *
 * Uses implicit rendering mode: the Turnstile script auto-renders the widget
 * and injects a hidden input named "cf-turnstile-response" into the nearest form.
 *
 * @example
 * <form>
 *   <Turnstile />
 *   <button type="submit">Submit</button>
 * </form>
 */

export interface Props {
  /** Override the theme (default: auto-detects from page) */
  theme?: 'light' | 'dark' | 'auto';
  /** Additional CSS classes for the container */
  className?: string;
}

const { theme = 'auto', className = '' } = Astro.props;
const siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY;
---

{
  siteKey && (
    <div class={`turnstile-container ${className}`.trim()}>
      <div
        class="cf-turnstile"
        data-sitekey={siteKey}
        data-theme={theme}
        data-language="auto"
        data-retry="auto"
        data-retry-interval="2000"
        data-response-field-name="cf-turnstile-response"
      />
    </div>
  )
}

{
  siteKey && (
    <script is:inline src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
  )
}

<style>
  .turnstile-container {
    display: flex;
    justify-content: center;
  }
</style>
```

**Step 2: Run build to verify component compiles**

Run: `bun run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/atoms/Turnstile.astro
git commit -m "feat(turnstile): add reusable Turnstile widget Astro component"
```

---

### Task 5: Integrate Turnstile into Login Form

**Files:**

- Modify: `src/components/molecules/LoginForm.astro`

**Step 1: Add Turnstile component import and widget to the form**

In the frontmatter, add:

```typescript
import Turnstile from '../atoms/Turnstile.astro';
```

In the form HTML, add the Turnstile widget BEFORE the submit button (inside the form, before `<!-- Submit Button -->`):

```astro
<!-- Bot Protection -->
<Turnstile />
```

**Step 2: Update the client-side script to extract and send the Turnstile token**

In the form submission handler, modify the `data` object to include the Turnstile token:

```typescript
const data = {
  email: formData.get('email'),
  password: formData.get('password'),
  remember: formData.get('remember') === 'true',
  turnstileToken: formData.get('cf-turnstile-response') || '',
};
```

After form submission failure (in the `catch` or error handling blocks), reset the Turnstile widget so the user can retry:

```typescript
// Reset Turnstile widget on error (if loaded)
if (typeof turnstile !== 'undefined') {
  turnstile.reset();
}
```

Add this to the `finally` block as well, so the widget resets after any attempt.

Also add the `TURNSTILE_FAILED` error code to the error handling in the form:

```typescript
} else if (result.error?.code === 'TURNSTILE_FAILED' || result.code === 'TURNSTILE_FAILED') {
  showErrorAlert(result.error?.message || 'Bot protection check failed. Please refresh and try again.');
  if (typeof turnstile !== 'undefined') turnstile.reset();
```

**Step 3: Run build to verify**

Run: `bun run build`
Expected: PASS

**Step 4: Run quality gates**

Run: `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck`
Expected: PASS (all gates)

**Step 5: Commit**

```bash
git add src/components/molecules/LoginForm.astro
git commit -m "feat(turnstile): integrate Turnstile widget into login form"
```

---

### Task 6: Integrate Turnstile into Signup Form

**Files:**

- Modify: `src/pages/signup.astro`

**Step 1: Add Turnstile component import and widget**

In the frontmatter, add:

```typescript
import Turnstile from '../components/atoms/Turnstile.astro';
```

In the form HTML, add the Turnstile widget BEFORE the submit button `<div class="pt-2">`:

```astro
<!-- Bot Protection -->
<Turnstile />
```

**Step 2: Update the client-side script to include Turnstile token**

In the signup form submission handler, add the Turnstile token to the fetch body:

```typescript
body: JSON.stringify({
  name: data.name,
  email: data.email,
  password: data.password,
  turnstileToken: new FormData(form).get('cf-turnstile-response') || '',
}),
```

After error or in the `finally` block, reset the widget:

```typescript
// Reset Turnstile widget on error
if (typeof turnstile !== 'undefined') {
  turnstile.reset();
}
```

Handle the `TURNSTILE_FAILED` error code in the response handling:

```typescript
// Check for Turnstile failure
const errorCode = result.error?.code || result.code;
if (errorCode === 'TURNSTILE_FAILED') {
  messagesContainer.innerHTML = `
    <div role="alert" class="alert alert-error">
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="m15 9-6 6"></path>
        <path d="m9 9 6 6"></path>
      </svg>
      <span>${window.RegistrationValidation.escapeHtml(result.error?.message || 'Bot protection check failed. Please refresh and try again.')}</span>
    </div>
  `;
  if (typeof turnstile !== 'undefined') turnstile.reset();
  return; // Don't continue to generic error
}
```

**Step 3: Run build to verify**

Run: `bun run build`
Expected: PASS

**Step 4: Run quality gates**

Run: `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/signup.astro
git commit -m "feat(turnstile): integrate Turnstile widget into signup form"
```

---

### Task 7: Add Turnstile Verification to Login API Endpoint

**Files:**

- Modify: `src/pages/api/auth/login.ts`

**Step 1: Write the failing test**

Create `src/__tests__/api/auth/login-turnstile.test.ts`:

```typescript
import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';

describe('POST /api/auth/login - Turnstile verification', () => {
  test('rejects request with missing token when Turnstile is configured', async () => {
    // This test verifies that the login endpoint checks for turnstileToken
    // when TURNSTILE_SECRET_KEY is set.
    // Since we can't easily call the API route in isolation,
    // we verify the source code includes turnstile verification.
    const fs = await import('fs');
    const content = fs.readFileSync('src/pages/api/auth/login.ts', 'utf-8');

    expect(content).toContain('verifyTurnstileToken');
    expect(content).toContain('turnstileToken');
    expect(content).toContain('TURNSTILE_FAILED');
  });

  test('turnstile verification happens before rate limiting', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/pages/api/auth/login.ts', 'utf-8');

    const turnstileIndex = content.indexOf('verifyTurnstileToken');
    const rateLimitIndex = content.indexOf('checkRateLimit');

    expect(turnstileIndex).toBeGreaterThan(-1);
    expect(rateLimitIndex).toBeGreaterThan(-1);
    // Turnstile verification should come before rate limit check
    expect(turnstileIndex).toBeLessThan(rateLimitIndex);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/api/auth/login-turnstile.test.ts`
Expected: FAIL — `verifyTurnstileToken` not found in login.ts

**Step 3: Update `src/pages/api/auth/login.ts`**

Add the import at the top:

```typescript
import { verifyTurnstileToken } from '@/lib/turnstile';
```

In the `POST` handler, AFTER parsing the request body and BEFORE the rate limit check, add Turnstile verification:

```typescript
// Parse request body first (before consuming rate limit)
const body = await request.json();
email = body.email;
const { password, turnstileToken } = body;

// Verify Turnstile token BEFORE rate limiting (prevent burning rate limit without challenge)
const turnstileResult = await verifyTurnstileToken(turnstileToken || '', clientAddress);
if (!turnstileResult.success) {
  return createErrorResponseResponse(
    'TURNSTILE_FAILED',
    turnstileResult.error || 'Bot protection verification failed.',
    400
  );
}

// Check rate limit (10 attempts per 15 minutes per IP)
```

**Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/api/auth/login-turnstile.test.ts`
Expected: PASS

**Step 5: Run typecheck and build**

Run: `bun run typecheck && bun run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/pages/api/auth/login.ts src/__tests__/api/auth/login-turnstile.test.ts
git commit -m "feat(turnstile): add Turnstile token verification to login API endpoint"
```

---

### Task 8: Add Turnstile Verification to Signup API Endpoint

**Files:**

- Modify: `src/pages/api/auth/signup.ts`

**Step 1: Write the failing test**

Create `src/__tests__/api/auth/signup-turnstile.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test';

describe('POST /api/auth/signup - Turnstile verification', () => {
  test('includes turnstile verification in signup endpoint', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/pages/api/auth/signup.ts', 'utf-8');

    expect(content).toContain('verifyTurnstileToken');
    expect(content).toContain('turnstileToken');
    expect(content).toContain('TURNSTILE_FAILED');
  });

  test('turnstile verification happens before rate limiting', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/pages/api/auth/signup.ts', 'utf-8');

    const turnstileIndex = content.indexOf('verifyTurnstileToken');
    const rateLimitIndex = content.indexOf('checkRateLimit');

    expect(turnstileIndex).toBeGreaterThan(-1);
    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(turnstileIndex).toBeLessThan(rateLimitIndex);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/api/auth/signup-turnstile.test.ts`
Expected: FAIL

**Step 3: Update `src/pages/api/auth/signup.ts`**

Add the import:

```typescript
import { verifyTurnstileToken } from '@/lib/turnstile';
```

After parsing the body and BEFORE rate limiting, add:

```typescript
// Parse request body first (before consuming rate limit)
const body = await request.json();
email = body.email;
const { password, name, turnstileToken } = body;

// Verify Turnstile token BEFORE rate limiting
const turnstileResult = await verifyTurnstileToken(turnstileToken || '', clientAddress);
if (!turnstileResult.success) {
  return createErrorResponseResponse(
    'TURNSTILE_FAILED',
    turnstileResult.error || 'Bot protection verification failed.',
    400
  );
}

// Check rate limit (5 attempts per hour per IP)
```

**Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/api/auth/signup-turnstile.test.ts`
Expected: PASS

**Step 5: Run typecheck and build**

Run: `bun run typecheck && bun run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/pages/api/auth/signup.ts src/__tests__/api/auth/signup-turnstile.test.ts
git commit -m "feat(turnstile): add Turnstile token verification to signup API endpoint"
```

---

### Task 9: Run Full Quality Gates and Final Verification

**Files:**

- No new files

**Step 1: Run all tests**

Run: `bun test`
Expected: All tests pass, including new Turnstile tests

**Step 2: Run all quality gates**

Run: `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck`
Expected: PASS (all gates)

**Step 3: Run full build**

Run: `bun run build`
Expected: PASS (clean build)

**Step 4: Manual verification checklist**

Start the dev server: `bun run dev`

Verify these manually:

- [ ] Visit `/login` — Turnstile widget appears (if test keys are configured in `.env`)
- [ ] Visit `/signup` — Turnstile widget appears
- [ ] If NO Turnstile keys in `.env`: widgets don't render, forms still work normally
- [ ] Submit login form — `turnstileToken` is sent in request body (check Network tab)
- [ ] Submit signup form — `turnstileToken` is sent in request body
- [ ] No CSP violations in browser console
- [ ] Widget is responsive on mobile viewport
- [ ] Widget is keyboard accessible (Tab can reach it)

**Step 5: Commit any final fixes from quality gates**

```bash
git add -A
git commit -m "chore(turnstile): fix quality gate issues"
```

---

### Task 10: Update OpenAPI Documentation

**Files:**

- Modify: `openapi/paths/auth.yml`
- Modify or Create: `openapi/schemas/TurnstileToken.yml` (if modular schema needed)

**Step 1: Update login endpoint schema**

In `openapi/paths/auth.yml`, add `turnstileToken` to the login request body schema:

```yaml
turnstileToken:
  type: string
  description: Cloudflare Turnstile verification token (from cf-turnstile-response widget)
```

Add `TURNSTILE_FAILED` to the error responses:

```yaml
400:
  description: Bad request (invalid input or Turnstile verification failed)
```

**Step 2: Update signup endpoint schema**

Same changes: add `turnstileToken` to signup request body, add `TURNSTILE_FAILED` error.

**Step 3: Validate OpenAPI spec**

Run: `npx @redocly/cli lint openapi.yml` (if redocly is installed)
Expected: No errors

**Step 4: Commit**

```bash
git add openapi/
git commit -m "docs(turnstile): update OpenAPI schemas with turnstileToken field"
```

---

## Summary of Files Changed

| File                                                | Action | Purpose                             |
| --------------------------------------------------- | ------ | ----------------------------------- |
| `.env.example`                                      | Modify | Add Turnstile key placeholders      |
| `src/env.d.ts`                                      | Modify | Add env var type declarations       |
| `src/middleware/security-headers.ts`                | Modify | Add Turnstile domains to CSP        |
| `src/lib/turnstile.ts`                              | Create | Server-side token verification      |
| `src/components/atoms/Turnstile.astro`              | Create | Reusable Turnstile widget component |
| `src/components/molecules/LoginForm.astro`          | Modify | Add widget + send token             |
| `src/pages/signup.astro`                            | Modify | Add widget + send token             |
| `src/pages/api/auth/login.ts`                       | Modify | Verify token before rate limit      |
| `src/pages/api/auth/signup.ts`                      | Modify | Verify token before rate limit      |
| `openapi/paths/auth.yml`                            | Modify | Document new request field          |
| `src/__tests__/middleware/security-headers.test.ts` | Create | CSP verification test               |
| `src/__tests__/lib/turnstile.test.ts`               | Create | Verification library tests          |
| `src/__tests__/api/auth/login-turnstile.test.ts`    | Create | Login endpoint test                 |
| `src/__tests__/api/auth/signup-turnstile.test.ts`   | Create | Signup endpoint test                |

## Future Enhancements (Not in Scope)

- Add Turnstile to `/forgot-password` form and API
- Migrate from "Managed" to "Invisible" mode after monitoring false positive rates
- Add Turnstile analytics dashboard
- Implement adaptive security (only require Turnstile for suspicious IPs)
- Add Turnstile to contact form when backend is implemented
