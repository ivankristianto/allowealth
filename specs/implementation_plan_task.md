# Registration Form Audit & Implementation Plan

## Executive Summary

**Problem:** The codebase has two registration pages (`/signup` and `/register`) with identical functionality, and the password strength meter has validation inconsistencies preventing correct operation.

**Solution:** Remove duplicate `/signup` page and fix password validation to align client-side validation with server-side validation and the PasswordField component.

---

## Issues Identified

### Issue 1: Duplicate Registration Pages

**Current State:**

- `/src/pages/signup.astro` - Inline form implementation
- `/src/pages/register.astro` - Component-based using RegistrationForm molecule

**Analysis:**

- Both pages use identical AuthLayout
- Both call the same API endpoint: `/api/auth/signup`
- Both implement the same validation logic
- Both redirect to `/login` after success

**Navigation Audit:**

- ✅ `LoginForm.astro:81` → links to `/register`
- ✅ `UserContext.astro:103` → links to `/register`
- ✅ `RegistrationForm.astro:142` → links to `/login`
- ❌ **No components link to `/signup`** (orphaned page)

**Decision:** Remove `/signup.astro` and keep `/register.astro` (component-based approach preferred).

---

### Issue 2: Password Validation Mismatch (Root Cause of Broken Strength Meter)

**Server-Side Validation** (Source of Truth)
File: `/src/lib/validation/password.ts`

```
✓ Minimum 12 characters
✓ At least one letter (any case: [a-zA-Z])
✓ At least one number OR special character
Total: 3 requirements
```

**PasswordField Component** (Correct)
File: `/src/components/atoms/PasswordField.astro:192-194`

```
✓ Matches server validation exactly
✓ Uses PASSWORD_MIN_LENGTH and PASSWORD_REQUIREMENTS
Total: 3 requirements
```

**Registration Pages** (INCORRECT)
File: `/src/pages/register.astro:236-244`

```javascript
if (password.length < 12) passwordErrors.push('at least 12 characters');
if (!/[A-Z]/.test(password)) passwordErrors.push('one uppercase letter');      // ❌
if (!/[a-z]/.test(password)) passwordErrors.push('one lowercase letter');      // ❌
if (!/[0-9]/.test(password)) passwordErrors.push('one number');                // ❌
if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))                  // ❌
  passwordErrors.push('one special character');
Total: 5 requirements (TOO STRICT)
```

**Why the Strength Meter Appears Broken:**

1. User types password: `mypassword123`
2. PasswordField shows: **"Strong"** (3/3 server requirements met)
3. User submits form
4. Client validation fails: Missing uppercase, lowercase, special char
5. Form never reaches server
6. **User confusion:** Strength meter says "Strong" but form rejects password

---

### Issue 3: Password Strength Bar Visual Scaling

**Current Implementation:**
File: `/src/components/atoms/PasswordField.astro:266`

```javascript
const barsToFill = passedCount === 1 ? 1 : passedCount === 2 ? 3 : 4;
```

**Problem:** Confusing visual progression

```
0 requirements → 0 bars ✓
1 requirement  → 1 bar  ✓
2 requirements → 3 bars ❌ (skips 2, confusing)
3 requirements → 4 bars ✓
```

**Fix:** Linear scaling for intuitive UX

```javascript
const barsToFill = passedCount === 3 ? 4 : passedCount;
// Result: 0→0, 1→1, 2→2, 3→4
```

---

## Implementation Plan

### Phase 1: Remove Duplicate Registration Page

**File to Modify:** `/src/pages/signup.astro`

**Action:** Replace entire content with redirect:

```astro
---
return Astro.redirect('/register', 301);
---
```

**Rationale:**

- 301 permanent redirect preserves SEO
- Users with bookmarks won't see 404
- Clean migration path

**Alternative:** Delete file entirely (higher risk for bookmarked URLs)

---

### Phase 2: Fix Password Validation Consistency

#### 2.1 Fix Client-Side Validation in Register Page

**File:** `/src/pages/register.astro`
**Lines to Change:** 236-244

**BEFORE:**

```javascript
const passwordErrors = [];
if (password.length < 12) passwordErrors.push('at least 12 characters');
if (!/[A-Z]/.test(password)) passwordErrors.push('one uppercase letter');
if (!/[a-z]/.test(password)) passwordErrors.push('one lowercase letter');
if (!/[0-9]/.test(password)) passwordErrors.push('one number');
if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
  passwordErrors.push('one special character');
```

**AFTER:**

```javascript
const passwordErrors = [];
if (password.length < 12) passwordErrors.push('at least 12 characters');
if (!/[a-zA-Z]/.test(password)) passwordErrors.push('one letter');
if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
  passwordErrors.push('one number or special character');
```

**Impact:** Client validation now matches server validation and PasswordField component.

#### 2.2 Update RegistrationForm Component Validation

**File:** `/src/components/molecules/RegistrationForm.astro`
**Lines to Change:** 236-244

Apply the same fix as above (DRY violation - both files have duplicate validation logic).

---

### Phase 3: Improve Password Strength Bar Scaling

**File:** `/src/components/atoms/PasswordField.astro`
**Line to Change:** 266

**BEFORE:**

```javascript
const barsToFill = passedCount === 1 ? 1 : passedCount === 2 ? 3 : 4;
```

**AFTER:**

```javascript
const barsToFill = passedCount === 3 ? 4 : passedCount;
```

**Visual Impact:**

- More intuitive progression: 0→0, 1→1, 2→2, 3→4
- Users see gradual strength increase
- Final bar (4) still emphasizes "Strong" state

---

### Phase 4: Verify OpenAPI Documentation

**File:** `/openapi.yml`

**Action:** Read and verify password validation documentation

**Check:**

- Lines 56-87: `/api/auth/signup` endpoint schema
- Password requirements should document 3 requirements (not 5)
- Example passwords should be valid per actual validation rules

**Update if needed:** Ensure docs match implementation.

---

## Critical Files Summary

| File                                               | Action                | Lines   | Priority |
| -------------------------------------------------- | --------------------- | ------- | -------- |
| `/src/pages/signup.astro`                          | Replace with redirect | All     | High     |
| `/src/pages/register.astro`                        | Fix validation logic  | 236-244 | Critical |
| `/src/components/molecules/RegistrationForm.astro` | Fix validation logic  | 236-244 | Critical |
| `/src/components/atoms/PasswordField.astro`        | Fix bar scaling       | 266     | Medium   |
| `/openapi.yml`                                     | Verify/update docs    | 56-87   | Low      |

---

## Validation & Testing

### Pre-Commit Checks

```bash
# 1. Verify no bun: imports
grep -r "bun:" src/ --exclude-dir=node_modules || echo "✓ No bun: imports"

# 2. Linting
bun run lint:fix

# 3. Formatting
bun run format:fix

# 4. Type checking
bun run typecheck

# 5. Password validation tests
bun test src/lib/validation/password.test.ts
```

### Manual Testing Checklist

#### Navigation Flow

- [ ] Visit `/login` → click "Sign up" → lands on `/register`
- [ ] Visit `/` (logged out) → click "Sign Up" → lands on `/register`
- [ ] Visit `/signup` → redirects to `/register` (301)
- [ ] Verify no broken links in app

#### Password Strength Meter

- [ ] Type `mypassword123` → Shows "Medium" (2/3 requirements: length + letter + number)
- [ ] Type `MyPassword` → Shows "Weak" (1/3: only length + letter)
- [ ] Type `MyPassword123` → Shows "Strong" (3/3: all requirements)
- [ ] Verify real-time updates as user types
- [ ] Check color coding: gray (not entered), red (weak), orange (medium), green (strong)
- [ ] Verify requirements checklist checkmarks update correctly

#### Form Validation

- [ ] Submit `mypassword123` (valid per server) → Should succeed without client errors
- [ ] Submit `short123` → Error: "at least 12 characters"
- [ ] Submit `12345678901234` → Error: "one letter"
- [ ] Submit `mypasswordonly` → Error: "one number or special character"
- [ ] Submit mismatched passwords → Error: "Passwords do not match"
- [ ] Test name validation (< 2 chars)
- [ ] Test email validation (invalid format)

#### Visual Regression

- [ ] Bar progression: 0 → 1 → 2 → 4 bars (linear scaling)
- [ ] Verify bar 1 fills at 25% width
- [ ] Verify bar 2 fills at 50% width
- [ ] Verify bar 4 fills at 100% width
- [ ] Check colors apply correctly to filled bars

#### End-to-End Flow

- [ ] Complete registration with valid data
- [ ] Verify success message displays
- [ ] Verify redirect to `/login` after 2 seconds
- [ ] Confirm account created (check database or API response)

### Storybook Verification

```bash
bun run storybook
```

- [ ] Navigate to RegistrationForm stories
- [ ] Verify all variants render correctly
- [ ] Test password field with strength meter
- [ ] Verify no console errors

---

## Risk Assessment

### Low Risk Changes

✅ Password validation fix (aligns with existing server logic)
✅ Bar scaling improvement (cosmetic UX enhancement)
✅ Using redirect instead of deletion (preserves backward compatibility)

### Medium Risk Changes

⚠️ Removing/redirecting `/signup` page

- **Mitigation:** 301 redirect instead of deletion
- **Fallback:** Keep monitoring for 404 errors after deployment

### Zero Risk

✅ OpenAPI documentation update (documentation only)

---

## Expected Outcomes

✅ Single source of truth: `/register` is the only registration page
✅ Password strength meter accurately reflects validation requirements
✅ Consistent validation across all layers (client/server/UI)
✅ Improved UX with intuitive visual feedback
✅ No user-facing errors or broken links
✅ Documentation matches implementation

---

## Implementation Order

1. **First:** Fix password validation in both register.astro and RegistrationForm.astro (critical bug fix)
2. **Second:** Improve password strength bar scaling (UX improvement)
3. **Third:** Replace /signup.astro with redirect (cleanup)
4. **Fourth:** Verify/update OpenAPI docs (documentation)
5. **Finally:** Run all validation checks and manual testing

---

## Notes

- **Why not delete `/signup.astro` entirely?** Redirect is safer for users with bookmarks and better for SEO.
- **Why fix both register.astro AND RegistrationForm.astro?** Both files contain duplicate validation logic (DRY violation exists in codebase).
- **Future improvement:** Extract validation logic to shared utility to eliminate duplication.
