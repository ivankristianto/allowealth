# API Improvements Plan

> **Branch:** `improve-rest-api`
> **Created:** 2026-01-26
> **Status:** In Progress

## Overview

This plan addresses issues identified during the REST API audit:

1. Inconsistent `requireAuth` usage patterns
2. Lack of middleware abstraction for API authentication
3. Missing integration tests (88% uncovered)
4. Security vulnerabilities
5. Incomplete OpenAPI documentation

---

## 1. Fix requireAuth Inconsistency

**Problem:** Some API routes pass partial objects with `as any` type cast instead of the full `APIContext`.

**Solution:** Update all affected files to pass the full `context` object.

### Checklist

- [x] `src/pages/api/assets/index.ts` - Fixed GET and POST handlers
- [x] `src/pages/api/assets/[id].ts` - Fixed GET, PUT, DELETE handlers
- [x] `src/pages/api/assets/[id]/balance.ts` - Fixed POST handler
- [x] `src/pages/api/assets/[id]/history.ts` - Fixed GET handler
- [x] `src/pages/api/assets/summary.ts` - Fixed GET handler
- [x] `src/pages/api/budget/overview.ts` - Fixed GET handler
- [x] `src/pages/api/budget/alerts.ts` - Fixed GET handler
- [x] `src/pages/api/budget/history.ts` - Already correct (uses context)
- [x] `src/pages/api/budget/export.ts` - Fixed GET handler
- [x] `src/pages/api/budget/category/[id]/remaining.ts` - Fixed GET handler (found during review)
- [x] `src/pages/api/payment-methods/index.ts` - Fixed GET and POST handlers
- [x] `src/pages/api/payment-methods/[id].ts` - Fixed GET, PUT, DELETE handlers

**Completed:** 2026-01-26 via commit `7ff8b27`

**Change pattern:**

```typescript
// Before (incorrect)
const userId = await requireAuth({ request, url } as any);

// After (correct)
const userId = await requireAuth(context);
```

---

## 2. Middleware Abstraction for API Auth

**Problem:** API routes re-validate sessions via `requireAuth()` even though middleware already validates and sets `Astro.locals.user`.

**Solution:** Leverage `Astro.locals.user` set by middleware, optionally add API-specific middleware.

### Checklist

- [x] **Option A: Create helper function** that uses `locals.user` directly
  - [x] Add `getAuthenticatedUser(context)` to `src/lib/api-utils.ts`
  - [x] Returns user ID from `context.locals.user` or throws
  - [x] No database call needed (middleware already validated)
  - [x] Updated all 20 API route files to use `getAuthenticatedUser`
  - [x] Added unit tests in `src/lib/api-utils.test.ts`

- [ ] ~~**Option B: Add API middleware**~~ (not implemented - Option A chosen)

- [x] **Documentation**
  - [x] Created `docs/architecture/003-api-authentication.md`

**Completed:** 2026-01-26

---

## 3. Security Improvements

### 3.1 Rate Limiting (High Priority)

**Problem:** No rate limiting on authentication endpoints enables brute force attacks.

- [x] Research rate limiting options for Astro/Bun
  - [x] In-memory (development) - sliding window algorithm
  - [ ] Redis-based (production) - future enhancement
- [x] Implement rate limiter middleware or utility
  - [x] Created `src/lib/rate-limit.ts` with sliding window algorithm
  - [x] Memory-bounded store (100k max entries for DoS protection)
  - [x] Uses trusted `clientAddress` from Astro context to prevent IP spoofing
  - [x] Endpoint-specific rate limit buckets
- [x] Apply to endpoints:
  - [x] `POST /api/auth/login` (10 requests / 15 min)
  - [x] `POST /api/auth/signup` (5 requests / hour)
  - [x] `POST /api/auth/forgot-password` (3 requests / hour)
- [x] Add rate limit headers to responses (`X-RateLimit-*`)
- [x] Write tests for rate limiting behavior (22 tests)

**Completed:** 2026-01-26 via commit `90defc1`

### 3.2 CSRF Protection (Medium Priority)

**Problem:** Session-based auth without CSRF tokens for state-changing requests.

- [x] Research CSRF protection approaches
  - [x] Double-submit cookie pattern (selected)
  - [ ] Synchronizer token pattern (not used)
- [x] Implement CSRF token generation/validation
  - [x] Created `src/lib/csrf.ts` with server-side utilities
  - [x] Created `src/lib/csrf-client.ts` with client-side utilities
  - [x] Added CSRF validation to middleware
- [x] Apply to all POST/PUT/DELETE endpoints
  - [x] Exempt auth endpoints (login, signup, forgot-password, logout)
  - [x] Protected methods: POST, PUT, DELETE, PATCH
- [x] Update frontend to include CSRF tokens
  - [x] Updated all client-side fetch calls with `getCsrfHeaders()`
  - [x] CSVImportForm uses inline cookie reading (is:inline script)
- [x] Write tests for CSRF protection (35 tests in `src/lib/csrf.test.ts`)

**Completed:** 2026-01-26 via commit `133a969` (implementation), `ff1a9b7` (tests)

### 3.3 File Upload Limits (Medium Priority)

**Problem:** CSV import has no file size validation.

- [x] Add file size limit to `src/pages/api/transactions/import/index.ts`
  - [x] Maximum file size: 5MB
  - [x] Return 413 Payload Too Large if exceeded
- [x] Add row count limit for CSV processing (500 rows max)
- [x] Write tests for file size limits (`src/pages/api/transactions/import/import.test.ts`)

**Completed:** 2026-01-26

### 3.4 Minor Security Fixes (Low Priority)

- [x] Fix manual cookie parsing in `src/pages/api/auth/logout.ts`
  - [x] Use `context.cookies.get('sid')` instead of regex
- [x] Add audit logging for auth events
  - [x] Created `src/db/schema/audit-logs.ts` schema
  - [x] Created `src/lib/audit-log.ts` service
  - [x] Login attempts (success/failure)
  - [x] Logout events
  - [x] Signup events
  - [x] Password reset requests
  - [x] Write tests (`src/lib/audit-log.test.ts`)

**Completed:** 2026-01-26

---

## 4. OpenAPI Documentation

### 4.1 Missing Endpoint

- [x] Document `POST /api/auth/forgot-password` in `openapi/paths/auth.yml`
  - [x] Request body schema (`ForgotPasswordRequest.yml`)
  - [x] Response schemas (200, 400) (`ForgotPasswordResponse.yml`)
  - [x] Security note about email enumeration prevention

### 4.2 Missing Query Parameters

- [x] Update `GET /api/transactions` in `openapi/paths/transactions.yml`
  - [x] Add `search` parameter
  - [x] Add `category_ids` parameter (comma-separated)

### 4.3 Validation

- [x] Run `npx @redocly/cli lint openapi.yml` after changes
- [x] Ensure all endpoints match implementation

**Completed:** 2026-01-26 via commit `65e9fee`

---

## 5. Integration Tests

**Current coverage:** 4/26 endpoint files (15%)

### 5.1 Auth Endpoints

- [x] Create `src/pages/api/auth/auth.api.integration.test.ts` (30 tests)
  - [x] `POST /api/auth/signup` - success, duplicate email, validation
  - [x] `POST /api/auth/login` - success, invalid credentials, validation
  - [x] `POST /api/auth/logout` - success, not authenticated
  - [x] `POST /api/auth/forgot-password` - success, invalid email
  - [x] Rate limiting tests for all auth endpoints

**Completed:** 2026-01-26 via commit `ff1a9b7`

### 5.2 Transaction Endpoints

- [x] Create `src/pages/api/transactions/transactions.api.integration.test.ts` (45 tests)
  - [x] `GET /api/transactions` - list, filters, pagination, SQL injection protection
  - [x] `POST /api/transactions` - create, validation
  - [x] `GET /api/transactions/:id` - success, not found, unauthorized
  - [x] `PUT /api/transactions/:id` - update, validation, not found
  - [x] `DELETE /api/transactions/:id` - success, not found

- [ ] Create `src/pages/api/transactions/transactions-export.api.integration.test.ts`
  - [ ] `GET /api/transactions/export` - CSV generation, filters

- [ ] Create `src/pages/api/transactions/transactions-import.api.integration.test.ts`
  - [ ] `POST /api/transactions/import` - success, invalid CSV, mapping

### 5.3 Category Endpoints

- [ ] Create `src/pages/api/categories/categories.api.integration.test.ts`
  - [ ] `GET /api/categories` - list, filters
  - [ ] `POST /api/categories` - create, duplicate name, validation
  - [ ] `GET /api/categories/:id` - success, not found
  - [ ] `PUT /api/categories/:id` - update, validation
  - [ ] `DELETE /api/categories/:id` - success, not found

### 5.4 Payment Method Endpoints

- [ ] Create `src/pages/api/payment-methods/payment-methods.api.integration.test.ts`
  - [ ] `GET /api/payment-methods` - list, filters
  - [ ] `POST /api/payment-methods` - create, validation
  - [ ] `GET /api/payment-methods/:id` - success, not found
  - [ ] `PUT /api/payment-methods/:id` - update, validation
  - [ ] `DELETE /api/payment-methods/:id` - success, not found

### 5.5 Asset Endpoints

- [ ] Create `src/pages/api/assets/assets.api.integration.test.ts`
  - [ ] `GET /api/assets` - list, filters
  - [ ] `POST /api/assets` - create, validation
  - [ ] `GET /api/assets/:id` - success, not found
  - [ ] `PUT /api/assets/:id` - update, validation
  - [ ] `DELETE /api/assets/:id` - success, not found
  - [ ] `PUT /api/assets/:id/balance` - update balance
  - [ ] `GET /api/assets/:id/history` - balance history
  - [ ] `GET /api/assets/summary` - summary by type/currency

### 5.6 Budget Endpoints

- [ ] Create `src/pages/api/budget/budget.api.integration.test.ts`
  - [ ] `GET /api/budget/overview` - success, params validation
  - [ ] `GET /api/budget/alerts` - success
  - [ ] `GET /api/budget/history` - success, months param
  - [ ] `GET /api/budget/export` - CSV generation

---

## Priority Order

1. **P0 - Critical:** Rate limiting for auth endpoints
2. **P1 - High:** Fix requireAuth inconsistency
3. **P1 - High:** Document forgot-password endpoint
4. **P2 - Medium:** CSRF protection
5. **P2 - Medium:** File upload limits
6. **P2 - Medium:** Integration tests for auth endpoints
7. **P3 - Low:** Middleware abstraction
8. **P3 - Low:** Remaining integration tests
9. **P3 - Low:** Audit logging

---

## Progress Tracking

| Section              | Items  | Completed | Progress |
| -------------------- | ------ | --------- | -------- |
| 1. requireAuth Fix   | 12     | 12        | 100%     |
| 2. Middleware        | 5      | 5         | 100%     |
| 3. Security          | 15     | 15        | 100%     |
| 4. OpenAPI Docs      | 4      | 4         | 100%     |
| 5. Integration Tests | 9      | 2         | 22%      |
| **Total**            | **45** | **38**    | **84%**  |

---

## Notes

- All changes should follow the constitution in `docs/constitution.md`
- Run quality gates before committing: `bun run lint:fix && bun run format:fix && bun run typecheck`
- Integration tests require seeded database: `bun run db:seed`
