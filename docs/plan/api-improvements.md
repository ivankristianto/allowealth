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

- [ ] **Option A: Create helper function** that uses `locals.user` directly
  - [ ] Add `getAuthenticatedUser(context)` to `src/lib/api-utils.ts`
  - [ ] Returns user ID from `context.locals.user` or throws
  - [ ] No database call needed (middleware already validated)

- [ ] **Option B: Add API middleware** (alternative approach)
  - [ ] Update `src/middleware.ts` to return 401 JSON for unauthenticated `/api/*` requests
  - [ ] Exclude public endpoints: `/api/auth/login`, `/api/auth/signup`, `/api/auth/forgot-password`

- [ ] **Documentation**
  - [ ] Update `AGENTS.md` or create `docs/architecture/003-api-authentication.md`

---

## 3. Security Improvements

### 3.1 Rate Limiting (High Priority)

**Problem:** No rate limiting on authentication endpoints enables brute force attacks.

- [ ] Research rate limiting options for Astro/Bun
  - [ ] In-memory (development)
  - [ ] Redis-based (production)
- [ ] Implement rate limiter middleware or utility
- [ ] Apply to endpoints:
  - [ ] `POST /api/auth/login`
  - [ ] `POST /api/auth/signup`
  - [ ] `POST /api/auth/forgot-password`
- [ ] Add rate limit headers to responses (`X-RateLimit-*`)
- [ ] Write tests for rate limiting behavior

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
- [ ] Write tests for CSRF protection

**Completed:** 2026-01-26 via commit `133a969`

### 3.3 File Upload Limits (Medium Priority)

**Problem:** CSV import has no file size validation.

- [ ] Add file size limit to `src/pages/api/transactions/import/index.ts`
  - [ ] Maximum file size: 5MB (configurable)
  - [ ] Return 413 Payload Too Large if exceeded
- [ ] Add row count limit for CSV processing
- [ ] Write tests for file size limits

### 3.4 Minor Security Fixes (Low Priority)

- [ ] Fix manual cookie parsing in `src/pages/api/auth/logout.ts`
  - [ ] Use `context.cookies.get('sid')` instead of regex
- [ ] Add audit logging for auth events
  - [ ] Login attempts (success/failure)
  - [ ] Logout events
  - [ ] Password changes
  - [ ] Failed authorization attempts

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

**Current coverage:** 3/26 endpoint files (12%)

### 5.1 Auth Endpoints

- [ ] Create `src/pages/api/auth/auth.api.integration.test.ts`
  - [ ] `POST /api/auth/signup` - success, duplicate email, validation
  - [ ] `POST /api/auth/login` - success, invalid credentials, validation
  - [ ] `POST /api/auth/logout` - success, not authenticated
  - [ ] `POST /api/auth/forgot-password` - success, invalid email

### 5.2 Transaction Endpoints

- [ ] Create `src/pages/api/transactions/transactions.api.integration.test.ts`
  - [ ] `GET /api/transactions` - list, filters, pagination
  - [ ] `POST /api/transactions` - create, validation
  - [ ] `GET /api/transactions/:id` - success, not found, unauthorized
  - [ ] `PUT /api/transactions/:id` - update, validation, not found
  - [ ] `DELETE /api/transactions/:id` - success, not found

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
| 2. Middleware        | 5      | 0         | 0%       |
| 3. Security          | 15     | 4         | 27%      |
| 4. OpenAPI Docs      | 4      | 4         | 100%     |
| 5. Integration Tests | 9      | 0         | 0%       |
| **Total**            | **45** | **20**    | **44%**  |

---

## Notes

- All changes should follow the constitution in `docs/constitution.md`
- Run quality gates before committing: `bun run lint:fix && bun run format:fix && bun run typecheck`
- Integration tests require seeded database: `bun run db:seed`
