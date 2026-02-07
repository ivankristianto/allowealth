# Add Cloudflare Turnstile Captcha Protection

## Summary

Implement Cloudflare Turnstile (captcha) to protect public authentication endpoints from bot abuse and automated attacks.

## Type of Feature

- [x] 🔒 Security enhancement
- [x] ✨ New feature (bot protection)

## Problem Statement

Current bot protection relies solely on rate limiting:
- Login: 10 requests/15 minutes per IP
- Signup: 5 requests/1 hour per IP
- Password Reset: 3 requests/1 hour per IP

**Limitations of rate limiting alone:**
- VPN/proxy rotation bypasses IP-based limits
- Distributed attacks from many IPs go undetected
- Targeted credential stuffing attacks can still succeed
- No adaptive challenge-response for suspicious behavior

**Benefits of Turnstile:**
- Adaptive bot detection (harder for bots, easier for humans)
- Browser fingerprinting + behavioral analysis
- No user friction in "Managed" mode (invisible challenge for most users)
- Privacy-focused (GDPR compliant, no tracking cookies)

## Proposed Solution

### High-Level Architecture

**Client-Side Integration:**
1. Load Turnstile script from Cloudflare CDN
2. Render widget in login, signup, and forgot-password forms
3. Retrieve challenge token before form submission
4. Include token in request payload

**Server-Side Validation:**
1. Extract `turnstileToken` from request body
2. Validate token via Cloudflare API (`/siteverify`)
3. Check validation result BEFORE rate limiting
4. Proceed with authentication if valid

**Validation Order:**
```
Request → Parse JSON → Validate Turnstile → Check Rate Limit → Auth Logic → Response
```

### Integration Points

**Forms Requiring Protection (Priority Order):**
1. `/login` - LoginForm component (highest attack surface)
2. `/signup` - Signup form (account creation abuse)
3. `/forgot-password` - ForgotPasswordForm (email enumeration prevention)
4. `/contact` - Contact form (when implemented - spam prevention)

**API Endpoints:**
- `POST /api/auth/login` - Add Turnstile validation
- `POST /api/auth/signup` - Add Turnstile validation
- `POST /api/auth/forgot-password` - Add Turnstile validation

### Technical Implementation

**Environment Variables:**
```bash
# Public site key (safe to expose to client)
CLOUDFLARE_TURNSTILE_SITE_KEY=0x4AAAAAAA...

# Secret key (server-side only)
CLOUDFLARE_TURNSTILE_SECRET_KEY=0x4AAAAAAA...

# Mode: "managed" (recommended) or "non-interactive"
CLOUDFLARE_TURNSTILE_MODE=managed

# Token cache TTL (prevents replay attacks)
CLOUDFLARE_TURNSTILE_CACHE_TTL=60
```

**New Service Layer:**
```typescript
// lib/turnstile.ts
export async function validateTurnstile(token: string): Promise<{
  success: boolean;
  score?: number;
  errorCodes?: string[];
}> {
  // 1. Validate token format
  // 2. POST to https://challenges.cloudflare.com/turnstile/v0/siteverify
  // 3. Cache valid tokens (60s TTL) to prevent replay
  // 4. Return validation result
}
```

**Client-Side Widget Rendering:**
```typescript
// components/forms/LoginForm.client.ts
import { turnstile } from '@cloudflare/turnstile';

// Initialize widget
turnstile.render('.cf-turnstile', {
  sitekey: element.dataset.sitekey,
  callback: (token) => {
    // Store token for form submission
  },
});

// Before submit
const token = turnstile.getResponse();
if (!token) {
  showError('Please verify you\'re not a robot');
  return;
}
```

**Server-Side Validation Example:**
```typescript
// pages/api/auth/login.ts
export const POST: APIRoute = async ({ request }) => {
  const { email, password, turnstileToken } = await request.json();

  // 1. Validate Turnstile (fail fast)
  if (!turnstileToken) {
    return createErrorResponse('CAPTCHA_MISSING', 'Security verification required', 400);
  }

  const captchaResult = await validateTurnstile(turnstileToken);
  if (!captchaResult.success) {
    return createErrorResponse('CAPTCHA_INVALID', 'Security verification failed', 400);
  }

  // 2. Check rate limit
  // 3. Proceed with authentication...
};
```

### Security Considerations

- [x] Validate token server-side (never trust client-only verification)
- [x] Cache validated tokens to prevent replay attacks (60s TTL)
- [x] Fail closed in production (reject if Cloudflare API unavailable)
- [x] Fail open in development (allow if service down for testing)
- [x] Rate limit still enforced (Turnstile is additional layer)
- [x] CSRF protection remains orthogonal (independent concern)
- [x] Log failed validations for monitoring

### Error Handling

**New Error Codes:**
```typescript
export const API_ERROR_CODES = {
  CAPTCHA_MISSING: 'CAPTCHA_MISSING',       // Token not provided
  CAPTCHA_INVALID: 'CAPTCHA_INVALID',       // Token validation failed
  CAPTCHA_TIMEOUT: 'CAPTCHA_TIMEOUT',       // Token expired
  CAPTCHA_VERIFY_FAILED: 'CAPTCHA_VERIFY_FAILED', // Service error
};
```

**Client-Side Error Handling:**
- Show user-friendly message: "Please verify you're not a robot"
- Reset widget on error to allow retry
- Don't expose validation details (security)

**Server-Side Error Handling:**
- Log error codes for monitoring
- Return generic error to client
- Handle Cloudflare API timeout gracefully (5s timeout)

## Implementation Plan

### Phase 1: Infrastructure (Week 1)
- [ ] Register Cloudflare Turnstile site (free tier)
- [ ] Add environment variables to `.env` and `.env.example`
- [ ] Create `lib/turnstile.ts` service with validation logic
- [ ] Add new error codes to `types/api.ts`
- [ ] Write unit tests for token validation
- [ ] Document Turnstile setup in README

### Phase 2: Server-Side Integration (Week 1-2)
- [ ] Add Turnstile validation to `/api/auth/signup`
- [ ] Add Turnstile validation to `/api/auth/login`
- [ ] Add Turnstile validation to `/api/auth/forgot-password`
- [ ] Implement token caching (prevent replay attacks)
- [ ] Add error handling for failed validations
- [ ] Test failover behavior (service outage scenarios)
- [ ] Update OpenAPI documentation with new error codes

### Phase 3: Client-Side Integration (Week 2)
- [ ] Load Turnstile script in AuthLayout (CSP-compliant)
- [ ] Create reusable Turnstile widget component
- [ ] Integrate widget into LoginForm
- [ ] Integrate widget into SignupForm
- [ ] Integrate widget into ForgotPasswordForm
- [ ] Update form submit handlers to retrieve token
- [ ] Add error handling + widget reset on failure
- [ ] Test on Chrome, Firefox, Safari (including private/incognito)

### Phase 4: Testing & Monitoring (Week 2-3)
- [ ] E2E tests: Successful validation flow
- [ ] E2E tests: Missing token error handling
- [ ] E2E tests: Invalid token error handling
- [ ] E2E tests: Rate limiting still enforced
- [ ] Monitor error rates (CAPTCHA_FAILED vs AUTH_FAILED)
- [ ] Measure false-positive rate (legitimate users blocked)
- [ ] Performance: Measure latency added by validation (~200-500ms)
- [ ] A/B test: Bot signup reduction metrics

### Phase 5: Rollout (Week 3)
- [ ] Deploy to staging for QA
- [ ] Staged rollout: Enable for signup first (highest abuse vector)
- [ ] Monitor for 48 hours, check error rates
- [ ] Enable for login endpoint
- [ ] Monitor for 48 hours, check false positives
- [ ] Enable for forgot-password endpoint
- [ ] Document in production runbook

## Dependencies

**New Package:**
- `@cloudflare/turnstile` - Official Turnstile client library (optional, can use CDN)

**External Services:**
- Cloudflare Turnstile (free tier: 1M verifications/month)

**Cloudflare Setup:**
1. Create Turnstile site at https://dash.cloudflare.com/
2. Choose "Managed" mode (recommended for UX)
3. Add allowed domains:
   - Development: `localhost`, `127.0.0.1`
   - Production: Your domain (e.g., `allowealth.com`)
4. Copy Site Key and Secret Key to environment variables

## Acceptance Criteria

- [ ] Turnstile widget renders on login, signup, forgot-password forms
- [ ] Token validation succeeds for legitimate users (no friction)
- [ ] Invalid tokens are rejected with user-friendly error message
- [ ] Missing tokens return 400 error with `CAPTCHA_MISSING` code
- [ ] Widget resets on error to allow retry
- [ ] Rate limiting still enforced (Turnstile is additional layer)
- [ ] Token replay attacks prevented (cached tokens rejected)
- [ ] Cloudflare API failures handled gracefully (fail closed in prod)
- [ ] All tests pass (unit + E2E)
- [ ] OpenAPI documentation updated
- [ ] Works on all supported browsers (Chrome, Firefox, Safari)
- [ ] Works in private/incognito mode (no tracking cookies required)

## Out of Scope (Future Enhancements)

- reCAPTCHA as alternative provider (separate issue)
- hCaptcha support (separate issue)
- Adaptive challenge difficulty based on user behavior
- Admin dashboard for captcha analytics

## Testing Checklist

### Manual Testing
- [ ] Login with valid Turnstile token → Success
- [ ] Login without token → 400 error with `CAPTCHA_MISSING`
- [ ] Login with expired token → 400 error with `CAPTCHA_TIMEOUT`
- [ ] Signup with valid token → Account created
- [ ] Forgot password with valid token → Email sent
- [ ] Widget resets after error → Can retry
- [ ] Private/incognito mode → Works correctly

### E2E Tests
- [ ] `test('turnstile-login-success')` - Valid token allows login
- [ ] `test('turnstile-missing-token')` - Returns 400 error
- [ ] `test('turnstile-invalid-token')` - Validation fails gracefully
- [ ] `test('turnstile-rate-limit-still-enforced')` - Both layers active
- [ ] `test('turnstile-widget-reset')` - Widget resets on error

## Performance Impact

**Expected Latency:**
- Client-side widget render: ~100ms
- Token validation API call: ~200-500ms
- Total added latency: ~300-600ms per auth request

**Mitigation:**
- Async validation doesn't block form UI
- 5s timeout on Cloudflare API calls
- Widget loads asynchronously (non-blocking)

## References

- Cloudflare Turnstile Docs: https://developers.cloudflare.com/turnstile/
- Turnstile API Reference: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Privacy Policy: https://www.cloudflare.com/privacypolicy/

## Labels

`security`, `enhancement`, `bot-protection`, `captcha`

## Estimated Effort

**Story Points:** 8 (Medium-Large)
**Duration:** 2-3 weeks
**Complexity:** Medium (straightforward integration, well-documented API)
