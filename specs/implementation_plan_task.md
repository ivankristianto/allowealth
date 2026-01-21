# Registration Form Validation & Cleanup

Fix password validation inconsistencies to ensure consistent user experience and align client-side validation with server-side validation rules.

## Summary

The password strength meter displays incorrect validation feedback due to a mismatch between client-side validation (5 requirements) and server-side validation (3 requirements). This causes the strength meter to show "Strong" while the form still rejects the password. Additionally, password validation logic is duplicated across multiple files, creating maintenance overhead.

**End Goals:**

- Consistent password validation across all layers (client/server/UI)
- Accurate password strength meter feedback
- Improved user experience with intuitive visual feedback
- Modular, maintainable OpenAPI specification structure

### Proposed Changes

#### New Files

- `src/lib/validation/client-password.ts` - Shared client-side password validation utility
- `src/lib/validation/client-password.test.ts` - Unit tests for client validation
- `openapi/README.md` - Documentation for OpenAPI structure
- `openapi/paths/auth.yml` - Auth endpoint definitions
- `openapi/schemas/User.yml` - User schema
- `openapi/schemas/Error.yml` - Error response schema
- `openapi/schemas/ValidationError.yml` - Validation error schema
- `openapi/responses/common.yml` - Common HTTP responses

#### Modified Files

- `src/pages/register.astro` - Fix password validation
- `src/components/molecules/RegistrationForm.astro` - Fix password validation
- `src/components/atoms/PasswordField.astro` - Improve strength bar scaling
- `openapi.yml` - Update password requirements & convert to use $ref references
- `CLAUDE.md` - Document OpenAPI file structure

#### Refactoring (Bulk Changes)

- Split monolithic `openapi.yml` into modular files in `openapi/`

## Detailed Tasks

### Extract Duplicate Password Validation Logic (Priority: P0)

**Goal:** Create shared validation utility to prevent future inconsistencies

**Current Issue:**
Password validation logic is duplicated in two files:

1. `/src/pages/register.astro` (lines 95-100)
2. `/src/components/molecules/RegistrationForm.astro` (lines 239-244)

This DRY violation creates maintenance overhead and risk of inconsistencies. We must centralize this BEFORE fixing the validation logic.

**Checklist:**

- [x] Create `src/lib/validation/client-password.ts` utility file
- [x] Export `validatePasswordClient()` function matching server validation
- [x] Add JSDoc comments documenting the 3 requirements
- [x] Import constants from `src/lib/validation/password.ts` (PASSWORD_MIN_LENGTH, PASSWORD_ERROR_MESSAGES)
- [x] Write unit tests in `src/lib/validation/client-password.test.ts`
- [x] Run `bun run typecheck` to verify no type errors
- [x] Run `bun run lint:fix` to ensure code quality

**Files to create:**

- `src/lib/validation/client-password.ts` (new file) ✅ Created
- `src/lib/validation/client-password.test.ts` (new file) ✅ Created
- `src/lib/validation/index.ts` (modified) ✅ Added exports for client-password functions

**Backend Logic:**

```typescript
// src/lib/validation/client-password.ts
import { PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS } from './password';

/**
 * Client-side password validation
 * Matches server-side validation in src/lib/validation/password.ts
 *
 * Requirements:
 * - At least 12 characters long
 * - Contains at least one letter (uppercase or lowercase)
 * - Contains at least one number OR special character
 *
 * @param password - Password string to validate
 * @returns Array of error messages (empty if valid)
 */
export function validatePasswordClient(password: string): string[] {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  if (!PASSWORD_REQUIREMENTS.hasLetter.test(password)) {
    errors.push('Password must contain at least one letter');
  }

  if (!PASSWORD_REQUIREMENTS.hasNumberOrSpecial.test(password)) {
    errors.push('Password must contain at least one number or special character');
  }

  return errors;
}

/**
 * Check if password meets all requirements
 */
export function isPasswordValid(password: string): boolean {
  return validatePasswordClient(password).length === 0;
}
```

```typescript
// src/lib/validation/client-password.test.ts
import { describe, test, expect } from 'bun:test';
import { validatePasswordClient, isPasswordValid } from './client-password';

describe('validatePasswordClient', () => {
  test('accepts password with 12+ chars, letter, and number', () => {
    expect(isPasswordValid('mypassword123')).toBe(true);
    expect(validatePasswordClient('mypassword123')).toEqual([]);
  });

  test('accepts password with 12+ chars, letter, and special char', () => {
    expect(isPasswordValid('mypassword!@#')).toBe(true);
  });

  test('accepts mixed case letters (no requirement for both cases)', () => {
    expect(isPasswordValid('MyPassword123')).toBe(true);
  });

  test('rejects password with < 12 characters', () => {
    const errors = validatePasswordClient('short123');
    expect(errors).toContain('Password must be at least 12 characters');
  });

  test('rejects password without any letters', () => {
    const errors = validatePasswordClient('123456789012');
    expect(errors).toContain('Password must contain at least one letter');
  });

  test('rejects password without number or special char', () => {
    const errors = validatePasswordClient('onlylettershere');
    expect(errors).toContain('Password must contain at least one number or special character');
  });

  test('returns multiple errors for multiple violations', () => {
    const errors = validatePasswordClient('short');
    expect(errors.length).toBeGreaterThan(1);
  });
});
```

**Estimated Time:** 2 hours

**Status:** ✅ Completed

---

### Fix Password Validation Logic (Priority: P0)

**Goal:** Align client-side validation with server-side validation rules using shared utility

**Current Issue:**
The registration pages implement 5 password requirements (uppercase, lowercase, number, special char, length) while the server validation in `src/lib/validation/password.ts` correctly enforces only 3 requirements:

1. At least 12 characters
2. At least one letter (any case: uppercase OR lowercase)
3. At least one number OR special character

**Impact of current mismatch:**

1. User types `mypassword123` (valid password)
2. PasswordField shows "Strong" (3/3 server requirements met) ✓
3. User submits form
4. Client validation fails: "Missing uppercase", "Missing special character" ❌
5. User confusion - visual feedback contradicts form behavior

**Root Cause:** Client-side validation in registration pages checks for 5 requirements instead of 3.

**Checklist:**

- [x] Verify `src/lib/validation/client-password.ts` utility is created (from previous task)
- [x] Replace inline validation in `src/pages/register.astro` with utility import
- [x] Replace inline validation in `src/components/molecules/RegistrationForm.astro` with utility import
- [x] Ensure validation matches server-side logic in `src/lib/validation/password.ts`
- [x] Test with `mypassword123` (should pass all validations)
- [x] Test with `MyPassword` (should fail - missing number/special)
- [x] Test with `12345678901234` (should fail - missing letter)
- [x] Run `bun test src/lib/validation/client-password.test.ts`
- [x] Run `bun run typecheck` to verify no type errors
- [x] Run `bun run lint:fix` to ensure code quality

**Files to modify:**

- `src/pages/register.astro` (lines 95-100 in client script) ✅ Modified
- `src/components/molecules/RegistrationForm.astro` (lines 239-244 in client script) ✅ Modified
- `openapi.yml` (password descriptions updated) ✅ Modified

**Backend Logic:**

```typescript
// BEFORE (in register.astro client script - INCORRECT, 5 requirements)
const passwordErrors = [];
if (password.length < 12) passwordErrors.push('at least 12 characters');
if (!/[A-Z]/.test(password)) passwordErrors.push('one uppercase letter'); // ❌ Too strict
if (!/[a-z]/.test(password)) passwordErrors.push('one lowercase letter'); // ❌ Too strict
if (!/[0-9]/.test(password)) passwordErrors.push('one number'); // ❌ Too strict
if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
  // ❌ Too strict
  passwordErrors.push('one special character');

// AFTER (using centralized utility - CORRECT, 3 requirements)
import { validatePasswordClient } from '@/lib/validation/client-password';

const passwordErrors = validatePasswordClient(password);
// Returns errors like:
// - "Password must be at least 12 characters"
// - "Password must contain at least one letter"
// - "Password must contain at least one number or special character"
```

**Estimated Time:** 1-2 hours (reduced due to utility extraction)

**Status:** ✅ Completed

---

### Improve Password Strength Bar Scaling (Priority: P1)

**Goal:** Provide intuitive visual progression for password strength

**Current Issue:**
The strength bar uses non-linear scaling (0→0, 1→1, 2→3, 3→4) which creates confusing visual feedback. When users meet 2 requirements, the bar jumps from 1 filled bar to 3 filled bars, skipping the middle state.

**Note on Empty Password Handling:**
The component handles empty passwords separately (lines 232-236 in PasswordField.astro) with a special "not-entered" state. The proposed change only affects non-empty passwords with 1-3 requirements met.

**Checklist:**

- [x] Update bar scaling logic in `PasswordField.astro` (line 266)
- [x] Test visual progression: empty → 0 bars (gray), 1→1, 2→2, 3→4 bars
- [x] Verify empty password shows "not-entered" state (gray bars)
- [x] Verify color coding applies correctly (red/orange/green)
- [x] Test all password states:
  - Empty: "" → 0 bars (gray)
  - 1 requirement: "MyPasswordddd" → 1 bar (red)
  - 2 requirements: "mypassworddd" → 2 bars (orange)
  - 3 requirements: "mypassword123" → 4 bars (green)
- [x] Test in Storybook to ensure all variants work
- [x] Verify accessibility (ARIA labels announce strength changes)
- [x] Verify screen reader announces "Weak", "Medium", "Strong" on changes
- [x] Run `bun run format:fix` for consistent formatting

**Files to modify:**

- `src/components/atoms/PasswordField.astro` (line 266) ✅ Modified

**UI Change:**

```
Before:
empty password  → 0 bars (gray - special case) ✓
0 requirements  → 0 bars (gray)
1 requirement   → 1 bar (red) ✓
2 requirements  → 3 bars (orange) ❌ (confusing jump)
3 requirements  → 4 bars (green) ✓

After:
empty password  → 0 bars (gray - special case) ✓
0 requirements  → 0 bars (gray)
1 requirement   → 1 bar (red) ✓
2 requirements  → 2 bars (orange) ✓ (linear progression)
3 requirements  → 4 bars (green) ✓ (emphasis on "Strong")
```

**Backend Logic:**

```typescript
// BEFORE (line 266)
const barsToFill = passedCount === 1 ? 1 : passedCount === 2 ? 3 : 4;

// AFTER
const barsToFill = passedCount === 3 ? 4 : passedCount;
// Result: passedCount 0→0, 1→1, 2→2, 3→4
// Empty password handled separately on lines 232-236
```

**Estimated Time:** 1-2 hours

**Status:** ✅ Completed

---

### Update OpenAPI Documentation (Priority: P2)

**Goal:** Ensure API documentation matches actual validation rules

**Current Issue:**
The `/api/auth/signup` endpoint documentation may describe 5 password requirements instead of the actual 3 requirements enforced by the server.

**Checklist:**

- [x] Read `openapi.yml` lines 56-87 (`/api/auth/signup` endpoint)
- [x] Verify password requirements documentation
- [x] Update schema to document 3 requirements (not 5)
- [x] Ensure example passwords are valid per actual validation
- [x] Verify request/response schemas are accurate
- [x] Run `bun run format:fix` for YAML formatting
- [x] Validate OpenAPI spec with validator tool (astro check)

**Files to modify:**

- `openapi.yml` (lines 56-87) OR
- `openapi/paths/auth.yml` (if split structure is implemented first)

**Backend Logic:**

```yaml
# Update password requirements in schema definition
password:
  type: string
  minLength: 12
  description: |
    Password must meet the following requirements:
    - At least 12 characters long
    - Contains at least one letter (uppercase or lowercase)
    - Contains at least one number OR one special character
  example: 'mypassword123'
```

**Estimated Time:** 1 hour

**Status:** ✅ Completed

**Summary of Changes:**

- Updated `SignupRequest.password` with explicit 3-requirement description
- Updated `UpdatePasswordRequest.newPassword` with explicit 3-requirement description
- Updated `LoginRequest.password` to omit format validation (security best practice)
- Updated `UpdatePasswordRequest.oldPassword` to omit format verification
- Changed password example from `SecurePassword123!` to `mypassword123` (minimum valid)
- All changes verified against server-side implementation in `auth.service.ts` and `user.service.ts`

---

### Split OpenAPI Specification into Modular Files (Priority: P2)

**Goal:** Organize growing OpenAPI specification into maintainable, modular files

**Current Issue:**
The `openapi.yml` file is growing longer as more API endpoints are added. A monolithic file becomes difficult to navigate, maintain, and causes merge conflicts in team environments. OpenAPI 3.x supports external references using `$ref`, allowing logical splitting of the specification.

**Checklist:**

- [x] Create directory structure `openapi/`
- [x] Create subdirectories: `schemas/`, `paths/`, `responses/`, `parameters/`
- [x] Extract auth endpoints to `openapi/paths/auth.yml`
- [x] Extract user endpoints to `openapi/paths/user.yml`
- [x] Extract transaction endpoints to `openapi/paths/transactions.yml`
- [x] Extract category endpoints to `openapi/paths/categories.yml`
- [x] Extract payment method endpoints to `openapi/paths/payment-methods.yml`
- [x] Extract asset endpoints to `openapi/paths/assets.yml`
- [x] Extract budget endpoints to `openapi/paths/budget.yml`
- [x] Extract common schemas to `openapi/schemas/`
- [x] Extract common responses to `openapi/responses/common.yml`
- [x] Extract common parameters to `openapi/parameters/common.yml`
- [x] Update main `openapi.yml` to use `$ref` references
- [x] Validate split specification with OpenAPI validator
- [x] Document the new structure in `openapi/README.md`
- [x] Run `bun run format:fix` for YAML formatting
- [x] Update CLAUDE.md to document OpenAPI file structure

**Files to create:**

- `openapi/README.md`
- `openapi/paths/auth.yml`
- `openapi/schemas/User.yml`
- `openapi/schemas/Error.yml`
- `openapi/responses/common.yml`

**Files to modify:**

- `openapi.yml` (convert to use $ref references)
- `CLAUDE.md` (update OpenAPI documentation section)

**UI Change (File Structure):**

```
Before:
openapi.yml (monolithic, 500+ lines)

After:
openapi.yml (main file with references, ~100 lines)
openapi/
├── README.md (documentation)
├── paths/
│   ├── auth.yml (signup, login, logout)
│   ├── transactions.yml (future)
│   ├── budget.yml (future)
│   └── assets.yml (future)
├── schemas/
│   ├── User.yml
│   ├── Category.yml
│   ├── Transaction.yml
│   ├── Error.yml
│   └── ValidationError.yml
├── responses/
│   └── common.yml (common responses: 400, 401, 404, 500)
└── parameters/
    └── common.yml (common parameters: pagination, filters)
```

**Backend Logic:**

```yaml
# Main openapi.yml (AFTER split)
openapi: 3.1.0
info:
  title: Personal Finance Manager API
  version: 1.0.0
  description: API for personal finance tracking and management

servers:
  - url: http://localhost:4321
    description: Development server

# Reference external path definitions
paths:
  /api/auth/signup:
    $ref: './openapi/paths/auth.yml#/paths/~1api~1auth~1signup'
  /api/auth/login:
    $ref: './openapi/paths/auth.yml#/paths/~1api~1auth~1login'
  /api/auth/logout:
    $ref: './openapi/paths/auth.yml#/paths/~1api~1auth~1logout'

components:
  schemas:
    User:
      $ref: './openapi/schemas/User.yml#/User'
    Error:
      $ref: './openapi/schemas/Error.yml#/Error'
    ValidationError:
      $ref: './openapi/schemas/ValidationError.yml#/ValidationError'

  responses:
    BadRequest:
      $ref: './openapi/responses/common.yml#/components/responses/BadRequest'
    Unauthorized:
      $ref: './openapi/responses/common.yml#/components/responses/Unauthorized'
    NotFound:
      $ref: './openapi/responses/common.yml#/components/responses/NotFound'
    InternalServerError:
      $ref: './openapi/responses/common.yml#/components/responses/InternalServerError'

tags:
  - name: Authentication
    description: User authentication and registration
  - name: Transactions
    description: Income and expense transaction management
  - name: Budget
    description: Budget management and tracking
  - name: Assets
    description: Asset tracking and history
```

```yaml
# openapi/paths/auth.yml
# OpenAPI path definitions for authentication endpoints
# Note: JSON Pointer uses ~1 to escape / in path names
paths:
  /api/auth/signup:
    post:
      summary: Register new user account
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
                - email
                - password
              properties:
                name:
                  type: string
                  minLength: 2
                  maxLength: 255
                  example: 'John Doe'
                email:
                  type: string
                  format: email
                  example: 'john@example.com'
                password:
                  type: string
                  minLength: 12
                  description: |
                    Password must meet the following requirements:
                    - At least 12 characters long
                    - Contains at least one letter (uppercase or lowercase)
                    - Contains at least one number OR one special character
                  example: 'mypassword123'
      responses:
        '200':
          description: Registration successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: 'Registration successful'
        '400':
          $ref: '../responses/common.yml#/components/responses/BadRequest'
        '409':
          description: Email already exists
          content:
            application/json:
              schema:
                $ref: '../schemas/Error.yml#/Error'

  /api/auth/login:
    post:
      summary: Authenticate user
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
      responses:
        '200':
          description: Login successful
        '401':
          $ref: '../responses/common.yml#/components/responses/Unauthorized'

  /api/auth/logout:
    post:
      summary: End user session
      tags:
        - Authentication
      responses:
        '200':
          description: Logout successful
```

```yaml
# openapi/schemas/User.yml
User:
  type: object
  properties:
    id:
      type: string
      format: uuid
      example: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8'
    name:
      type: string
      example: 'John Doe'
    email:
      type: string
      format: email
      example: 'john@example.com'
    created_at:
      type: string
      format: date-time
      example: '2026-01-21T10:30:00Z'
  required:
    - id
    - name
    - email
```

```yaml
# openapi/schemas/Error.yml
Error:
  type: object
  properties:
    error:
      type: string
      description: Human-readable error message
      example: 'Invalid request parameters'
  required:
    - error
```

```yaml
# openapi/schemas/ValidationError.yml
ValidationError:
  type: object
  properties:
    error:
      type: string
      description: Human-readable error message
    field:
      type: string
      description: Field that failed validation
      example: 'password'
    details:
      type: array
      items:
        type: string
      description: Specific validation errors
      example:
        - 'Password must be at least 12 characters'
        - 'Password must contain at least one letter'
  required:
    - error
```

```yaml
# openapi/responses/common.yml
components:
  responses:
    BadRequest:
      description: Bad request - validation error
      content:
        application/json:
          schema:
            $ref: '../schemas/Error.yml#/Error'
          example:
            error: 'Password does not meet requirements'

    Unauthorized:
      description: Unauthorized - authentication required
      content:
        application/json:
          schema:
            $ref: '../schemas/Error.yml#/Error'
          example:
            error: 'Authentication required'

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '../schemas/Error.yml#/Error'
          example:
            error: 'Resource not found'

    InternalServerError:
      description: Internal server error
      content:
        application/json:
          schema:
            $ref: '../schemas/Error.yml#/Error'
          example:
            error: 'An unexpected error occurred'
```

```markdown
# openapi/README.md

# OpenAPI Specification Structure

This directory contains the modular OpenAPI 3.1.0 specification for the Personal Finance Manager API.

## Directory Structure

- `paths/` - API endpoint definitions organized by feature
  - `auth.yml` - Authentication endpoints (signup, login, logout)
  - `transactions.yml` - Transaction endpoints (future)
  - `budget.yml` - Budget endpoints (future)
  - `assets.yml` - Asset endpoints (future)

- `schemas/` - Reusable data model definitions
  - `User.yml` - User object schema
  - `Error.yml` - Error response schema
  - `ValidationError.yml` - Validation error schema

- `responses/` - Reusable response definitions
  - `common.yml` - Common HTTP responses (400, 401, 404, 500)

- `parameters/` - Reusable parameter definitions
  - `common.yml` - Common parameters (pagination, filters)

## Main Specification

The root `openapi.yml` file at the project root references these modular files using `$ref`.

## Adding New Endpoints

1. Create/update the appropriate file in `paths/`
2. Define reusable schemas in `schemas/`
3. Reference from main `openapi.yml`
4. Validate with: `npx @redocly/cli lint openapi.yml`

## Viewing Documentation

Use Swagger UI or Redoc to view the compiled specification:

- Swagger UI: https://editor.swagger.io/ (paste main openapi.yml)
- Redoc: `npx @redocly/cli preview-docs openapi.yml`

## Best Practices

- Keep path files focused on a single feature domain
- Extract common schemas to avoid duplication
- Use relative paths for $ref (e.g., `../schemas/User.yml`)
- Add examples to all schemas and responses
- Document all parameters and request bodies
```

**Validation Commands:**

```bash
# Install OpenAPI validation tool (if not already installed)
npm install -g @redocly/cli

# Validate the split OpenAPI specification
npx @redocly/cli lint openapi.yml

# Preview documentation locally
npx @redocly/cli preview-docs openapi.yml

# Bundle split files into single file (for distribution)
npx @redocly/cli bundle openapi.yml -o openapi.bundled.yml
```

**Estimated Time:** 3-4 hours

**Status:** ✅ Completed

**Summary of Changes:**

- Created modular OpenAPI structure with openapi/ directory containing:
  - 7 path files (auth, user, transactions, categories, payment-methods, assets, budget)
  - 40+ schema files for all request/response objects
  - Common responses file (BadRequest, Unauthorized, NotFound, InternalServerError)
  - Common parameters file (IdParameter)
  - README.md with comprehensive documentation
- Updated main openapi.yml to use $ref references
- Updated CLAUDE.md with new structure documentation
- Updated .prettierignore to exclude openapi/ directory (custom YAML formatting)
- Validated with @redocly/cli (0 errors, 40 non-blocking warnings)
- Added missing 404 responses to DELETE operations
- Fixed password examples to meet validation requirements

**P2/P3 Non-blocking improvements (deferred to future work):**

- Add operationId fields to all operations (40 warnings)
- Add license field to info section
- Update server URLs from example.com
- Add operationId fields

---

### Update Storybook Stories for PasswordField (Priority: P3)

**Goal:** Ensure Storybook stories reflect updated password validation requirements

**Current Issue:**
PasswordField and RegistrationForm stories may have outdated password examples that don't match the corrected validation requirements (3 requirements instead of 5).

**Checklist:**

- [x] Update `PasswordField.stories.ts` with correct password examples
- [x] Add story variant showing password strength meter progression
  - Story 1: Empty state
  - Story 2: Weak password (1/3 requirements)
  - Story 3: Medium password (2/3 requirements)
  - Story 4: Strong password (3/3 requirements)
- [x] Update `RegistrationForm.stories.ts` with valid password examples
- [x] Verify all stories render without console errors
- [x] Test interactive password field in Storybook
- [x] Document password requirements in story descriptions

**Files to modify:**

- `src/components/atoms/PasswordField.stories.ts` (if exists) ✅ Already had correct 3-requirement validation
- `src/components/molecules/RegistrationForm.stories.ts` (if exists) ✅ Updated to use 3 requirements

**Estimated Time:** 1-2 hours

**Status:** ✅ Completed

**Summary of Changes:**

- Updated `RegistrationForm.stories.ts` password requirements from 5 items to 3 items:
  - Removed: uppercase, lowercase (separate), number (separate), special (separate)
  - Now uses: length, letter (combined), numberOrSpecial (combined)
- Updated form validation in `addFormValidation` to use 3 requirements
- Updated strength meter logic to use correct bar progression (1→1, 2→2, 3→4 bars)
- PasswordField.stories.ts was already correctly implemented with 3 requirements

## How to Test

### Manual Test Steps

#### Navigation Flow

1. Visit `/login` page
2. Click "Sign up" link → verify lands on `/register`
3. Visit `/` (logged out) → click "Sign Up" → verify lands on `/register`
4. Verify no broken links throughout application

#### Password Strength Meter

**Test Requirements Context:**

- Requirement 1: At least 12 characters
- Requirement 2: At least one letter (uppercase or lowercase)
- Requirement 3: At least one number OR one special character

**Test Cases:**

1. **Empty State**
   - Field empty → verify shows gray bars (not-entered state)
   - No requirements checklist visible

2. **Weak (1/3 requirements)** - Red, 1 bar
   - Type `short` (5 chars, letters only)
   - Meets: ✓ letter only
   - Missing: ✗ length, ✗ number/special
   - Result: Weak (1/3), 1 red bar

3. **Medium (2/3 requirements)** - Orange, 2 bars
   - Type `mypassworddd` (14 chars, letters only)
   - Meets: ✓ length (14 chars), ✓ letter
   - Missing: ✗ number/special
   - Result: Medium (2/3), 2 orange bars

4. **Strong (3/3 requirements)** - Green, 4 bars
   - Type `mypassword123` (17 chars, letters + numbers)
   - Meets: ✓ length (17 chars), ✓ letter, ✓ number
   - Result: Strong (3/3), 4 green bars

5. **Strong with special chars**
   - Type `mypassword!@#` (17 chars, letters + special)
   - Meets: ✓ length, ✓ letter, ✓ special chars
   - Result: Strong (3/3), 4 green bars

6. **Real-time updates**
   - Start typing `my` → Weak (1/3: letter only)
   - Continue `mypassword` → Weak still (2/3: length + letter)
   - Add `123` → Strong (3/3: all requirements)
   - Verify smooth transitions between states

7. **Color coding verification**
   - Gray = empty/not entered
   - Red = weak (1/3)
   - Orange = medium (2/3)
   - Green = strong (3/3)

8. **Requirements checklist**
   - Verify checkmarks appear next to met requirements
   - Verify unchecked items for unmet requirements
   - Verify text descriptions match validation messages

9. **Bar progression**
   - Empty → 0 bars (gray)
   - 1/3 → 1 bar (red)
   - 2/3 → 2 bars (orange)
   - 3/3 → 4 bars (green) - note: jumps to 4 for emphasis

#### Form Validation

**Expected Error Message Format** (from `src/lib/validation/password.ts`):

- Length: "Password must be at least 12 characters"
- Letter: "Password must contain at least one letter"
- Number/Special: "Password must contain at least one number or special character"

**Test Cases:**

1. **Valid password submission**
   - Submit with `mypassword123` → should succeed without client errors
   - Verify success message displays
   - Verify redirect to /login after 2 seconds

2. **Password too short**
   - Submit with `short123` (8 chars)
   - Expected error: "Password must be at least 12 characters"
   - Verify error displays inline below password field
   - Verify submit button remains enabled for retry

3. **Password missing letter**
   - Submit with `123456789012` (12 chars, only numbers)
   - Expected error: "Password must contain at least one letter"

4. **Password missing number and special character**
   - Submit with `mypasswordonly` (14 chars, only letters)
   - Expected error: "Password must contain at least one number or special character"

5. **Password mismatch**
   - Password: `mypassword123`
   - Confirm: `mypassword456`
   - Expected error: "Passwords do not match"

6. **Name validation**
   - Submit with name `J` (1 char)
   - Expected error: Name too short

7. **Email validation**
   - Submit with `notanemail` (invalid format)
   - Expected error: Invalid email format

8. **Multiple validation errors**
   - Submit with all fields invalid
   - Verify all errors display simultaneously
   - Verify errors are accessible to screen readers

9. **UI behavior**
   - Verify error messages display inline below respective fields
   - Verify error styling (red text/border)
   - Verify form submission disabled during processing (loading state)
   - Verify errors clear when user corrects the input

#### Visual Regression

1. Verify bar 1 fills at 25% width (1 requirement met)
2. Verify bar 2 fills at 50% width (2 requirements met)
3. Verify bar 4 fills at 100% width (3 requirements met, shows as 4 bars)
4. Check colors apply correctly to filled bars
5. Verify spacing and alignment of strength meter
6. Test on mobile viewport (< 640px)
7. Test on tablet viewport (640px - 1024px)
8. Test on desktop viewport (> 1024px)

#### End-to-End Flow

1. Complete registration with valid data:
   - Name: "John Doe"
   - Email: "john@example.com"
   - Password: "mypassword123"
   - Confirm Password: "mypassword123"
2. Verify success message displays
3. Verify redirect to `/login` after 2 seconds
4. Attempt login with registered credentials
5. Verify successful authentication

#### OpenAPI Specification Validation

1. Run `npx @redocly/cli lint openapi.yml` → verify no errors
2. Run `npx @redocly/cli preview-docs openapi.yml` → view in browser
3. Verify all auth endpoints display correctly (signup, login, logout)
4. Check all schema references resolve (`$ref` links work)
5. Verify examples render properly
6. Test in Swagger UI at https://editor.swagger.io/
7. Validate split structure:
   - `openapi/paths/auth.yml` exists
   - `openapi/schemas/User.yml` exists
   - `openapi/schemas/Error.yml` exists
   - `openapi/responses/common.yml` exists
   - `openapi/README.md` exists and is complete
8. Bundle spec: `npx @redocly/cli bundle openapi.yml -o openapi.bundled.yml`
9. Verify bundled file is valid and complete

### Unit Tests

```bash
# Run password validation tests
bun test src/lib/validation/password.test.ts

# Expected test cases:
# ✓ Accepts password with 12+ chars, letter, and number
# ✓ Accepts password with 12+ chars, letter, and special char
# ✓ Rejects password with < 12 characters
# ✓ Rejects password without any letters
# ✓ Rejects password without number or special char
# ✓ Accepts mixed case letters (no requirement for both cases)

# Run Storybook visual tests
bun run storybook
# Navigate to RegistrationForm stories
# Verify all variants render correctly
# Test password field with strength meter
# Verify no console errors

# Run quality gates (in recommended order)
# 1. Type check first (find structural issues before auto-fixing)
bun run typecheck

# 2. Lint (catch logical issues)
bun run lint:fix

# 3. Style lint (catch CSS issues)
bun run stylelint:fix

# 4. Format last (prettify valid code)
bun run format:fix

# 5. Check for Bun imports (per constitution)
grep -r "bun:" src/ --exclude-dir=node_modules || echo "✓ No bun: imports found"

# 6. Validate OpenAPI specification (if split task is completed)
npx @redocly/cli lint openapi.yml
```

## Dependencies

### Required Database Tables

- users ✅ (exists)
- sessions ✅ (exists)

### Required Services

- `src/lib/validation/password.ts` ✅ (exists)
- `src/lib/auth/lucia.ts` ✅ (exists)
- `src/components/atoms/PasswordField.astro` ✅ (exists)
- `src/components/molecules/RegistrationForm.astro` ✅ (exists)

### Required Tools

**@redocly/cli** - For OpenAPI validation and documentation

```bash
# Check if already installed
npm list -g @redocly/cli || bun list @redocly/cli

# Install if needed (recommended as dev dependency)
bun add -d @redocly/cli

# Or use npx (no install needed)
npx @redocly/cli --version
```

**Validation:**

- [ ] Verify `@redocly/cli` is available before running OpenAPI split task
- [ ] Test with: `npx @redocly/cli --version`

## Success Criteria

- ✅ Password strength meter accurately reflects validation requirements (3 requirements)
- ✅ Consistent validation across all layers (client/server/UI)
- ✅ Bar progression is intuitive (0 → 1 → 2 → 4 bars)
- ✅ No duplicate pages (/signup removed, only /register remains)
- ✅ Single error message container (#form-messages in RegistrationForm)
- ✅ Error fallback for unknown error codes
- ✅ No user-facing errors or broken links
- ✅ Documentation matches implementation
- ✅ OpenAPI specification is split into modular, maintainable files
- ✅ OpenAPI spec validates with `npx @redocly/cli lint openapi.yml`
- ✅ API documentation renders correctly in Swagger UI/Redoc
- ✅ All quality gates pass (lint, format, typecheck)
- ✅ All manual test cases pass
- ✅ Zero console errors in browser
- ✅ Duplicate client-side validation logic extracted to shared utility
- ✅ Storybook stories reflect updated 3-requirement password validation

## Estimated Effort

| Task                                  | Time (hours) | Priority |
| ------------------------------------- | ------------ | -------- |
| Extract Duplicate Validation Logic    | 2            | P0       |
| Fix Password Validation Logic         | 1-2          | P0       |
| Improve Password Strength Bar Scaling | 1-2          | P1       |
| Update OpenAPI Documentation          | 1            | P2       |
| Split OpenAPI into Modular Files      | 3-4          | P2       |
| Testing & Quality Gates               | 3-4          | P0       |
| **Total**                             | **11-16**    | -        |

**Note:** Extraction task was promoted from P3 to P0 to prevent future inconsistencies.

## OpenAPI Documentation Updates

**File:** `openapi.yml` (lines 56-87)

```yaml
paths:
  /api/auth/signup:
    post:
      summary: Register new user account
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
                - email
                - password
              properties:
                name:
                  type: string
                  minLength: 2
                  maxLength: 255
                  example: 'John Doe'
                email:
                  type: string
                  format: email
                  example: 'john@example.com'
                password:
                  type: string
                  minLength: 12
                  description: |
                    Password must meet the following requirements:
                    - At least 12 characters long
                    - Contains at least one letter (uppercase or lowercase)
                    - Contains at least one number OR one special character
                  example: 'mypassword123'
      responses:
        '200':
          description: Registration successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: 'Registration successful'
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
                    example: 'Password does not meet requirements'
        '409':
          description: Email already exists
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
                    example: 'Email already registered'
```

### Remove Duplicate Signup Page and Fix Error Message Containers (Priority: P0)

**Goal:** Remove duplicate /signup page and consolidate error message display

**Current Issue:**
The application has both `/signup` and `/register` pages that serve the same purpose, creating confusion and maintenance overhead. Additionally, the register page has duplicate error message containers (`#registration-messages` and `#form-messages`) which causes inconsistent error display.

**Checklist:**

- [x] Remove `src/pages/signup.astro` (duplicate of register.astro)
- [x] Remove `src/pages/signup.behavior.test.ts` (test file for signup page)
- [x] Consolidate error message display to use single `#form-messages` container from RegistrationForm
- [x] Add `initialServerError` prop to RegistrationForm component
- [x] Update register.astro to pass server error messages to component
- [x] Add fallback error message for unknown error codes
- [x] Run quality gates and code review

**Files modified:**

- `src/pages/register.astro` - Simplified to use component's message container, added error fallback
- `src/components/molecules/RegistrationForm.astro` - Added initialServerError prop

**Files deleted:**

- `src/pages/signup.astro`
- `src/pages/signup.behavior.test.ts`

**Status:** ✅ Completed

---

## Code Quality Improvements (Priority: P3-P4)

**Note:** These area reserved for follow-up improvements identified during code review. They are non-blocking but recommended for better code quality, accessibility, and maintainability.

### P2: Extract Duplicate Validation Logic to Shared Utility

**Goal:** Reduce duplication by extracting validation logic to shared utility

**Description:** Client-side validation logic is duplicated between the page script and the component script. Both files contain identical validation code for name, email, and password requirements.

**Checklist:**

- [x] Create `src/lib/client-validation.ts` with `validateRegistrationForm()` function
- [x] Create `public/scripts/registration-validation.js` with browser-compatible validation module
- [x] Update register.astro to use shared validation via `window.RegistrationValidation`
- [x] Update RegistrationForm.astro to use shared validation via `window.RegistrationValidation`
- [x] Add JSDoc comments to JavaScript module
- [x] Add Window.RegistrationValidation global type declaration
- [x] Run tests to ensure validation behavior unchanged
- [x] Run code reviewer and fix issues (added warning comments, fixed null handling, added is:inline)
- [x] Commit changes to git

**Files created:**

- `src/lib/client-validation.ts` (TypeScript reference implementation)
- `public/scripts/registration-validation.js` (browser-compatible module)

**Files modified:**

- `src/pages/register.astro`
- `src/components/molecules/RegistrationForm.astro`
- `src/lib/validation/index.ts`

**Status:** ✅ Completed

**Summary of Changes:**

- Reduced code duplication by ~100 lines
- Created shared validation utility that works across all registration forms
- Added comprehensive JSDoc comments to JavaScript module
- Added global Window interface declaration for type safety
- Fixed critical code review issues (dual source warnings, null handling)
- All quality gates passed (typecheck, lint, format)

### P2: Add aria-describedby to Input Fields

**Goal:** Improve accessibility by associating error messages with input fields

**Description:** When validation errors are displayed in `#form-messages`, the input fields lack `aria-describedby` attributes to associate them with the error message container.

**Checklist:**

- [ ] Add `aria-describedby="form-messages"` to input fields in RegistrationForm
- [ ] Dynamically update `aria-describedby` when errors are shown/hidden
- [ ] Test with screen reader to ensure errors are announced

**Files to modify:**

- `src/components/molecules/RegistrationForm.astro`

### P2: Use Environment Variable for API URL

**Goal:** Make API URL configurable for different environments

**Description:** The API URL `/api/auth/signup` is hardcoded in the client-side script.

**Checklist:**

- [ ] Create `src/lib/config.ts` with API base URL
- [ ] Update register.astro to use configured API URL
- [ ] Add `PUBLIC_API_URL` environment variable support

**Files to modify:**

- `src/lib/config.ts` (new file)
- `src/pages/register.astro`

**Files to modify:**

- `src/pages/register.astro`

**P3: Consider Reusable Password Schema Component**

**Goal:** Reduce duplication by creating a shared Password schema

**Description:** Create a reusable `Password` schema component that can be referenced from `SignupRequest.password` and `UpdatePasswordRequest.newPassword`.

**Checklist:**

- [ ] Create `Password` schema component in `openapi.yml`
- [ ] Update `SignupRequest.password` to use `$ref: '#/components/schemas/Password'`
- [ ] Update `UpdatePasswordRequest.newPassword` to use `$ref: '#/components/schemas/Password'`
