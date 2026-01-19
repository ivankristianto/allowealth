# Implementation Plan Tasks

## Summary

This plan focuses on completing three interdependent features in the **User Profile & Settings** domain that will enable the core financial tracking functionality to work properly:

1. **User Profile & Settings Management** - Wire up the settings page for managing user data and preferences
2. **Budget Edit Integration** - Complete the budget editing functionality from the UI
3. **Transaction Form UX Enhancements** - Improve the daily transaction entry experience

**By the end of this implementation:**

- Users can update their profile (name, email) and settings (primary currency)
- Budget allocations can be edited inline from the budget page
- Transaction form will show budget remaining and remember recent selections
- The app will have a fully functional user management foundation

---

## Proposed Changes

### New Files

```
src/layouts/ProtectedLayout.astro               # Protected route layout (auth abstraction) ✅
src/services/user.service.ts                    # User profile management service ✅
src/services/user.service.test.ts               # Tests for user service ✅
src/pages/api/user/profile.ts                   # GET + PUT endpoints for profile ✅
src/pages/api/user/settings.ts                  # GET + PUT endpoints for settings ✅
src/pages/api/user/password.ts                  # PUT endpoint for password changes ✅
src/lib/validation/user.ts                      # Zod schemas for user updates (inline in service)
src/components/molecules/PasswordChangeForm.astro  # Password change form component ✅
src/components/molecules/BudgetEditForm.astro       # Budget edit form (extract from modal)
```

### Modified Files

```
src/layouts/MainLayout.astro                   # Accept user prop properly
src/pages/settings/index.astro                  # Wire form to API, add password change
src/pages/budget/index.astro                    # Wire edit modal to API endpoint
src/pages/transactions/add.astro                # Add budget remaining, remember last used
src/pages/api/budget/category/[id].ts           # Add PATCH endpoint for inline edits
src/services/index.ts                           # Export user service singleton
src/db/schema/index.ts                          # Ensure user-settings is exported
openapi.yml                                      # Document new API endpoints
```

**Refactoring (20+ files):** ✅

Replace authentication boilerplate in all protected pages to use `ProtectedLayout`:

- `src/pages/dashboard.astro` ✅
- `src/pages/settings/*.astro` ✅
- `src/pages/transactions/*.astro` ✅
- `src/pages/budget/*.astro` ✅
- `src/pages/assets/*.astro` ✅
- `src/pages/reports/*.astro` ✅
- `src/pages/forecast/*.astro` ✅
- `src/pages/calculators/*.astro` ✅

---

## Detailed Tasks

### 1. User Profile & Settings Management (Priority: P0)

#### 1.0 Abstract Authentication Checks (Refactoring) ✅

**Goal:** Remove duplicate authentication checks and redirection logic from all pages.

**Checklist:**

- [x] Create `src/layouts/ProtectedLayout.astro` component
- [x] Update `src/layouts/MainLayout.astro` to accept user prop (already implemented)
- [x] Replace boilerplate in `/dashboard.astro`
- [x] Replace boilerplate in `/settings/index.astro`
- [x] Replace boilerplate in `/settings/categories.astro`
- [x] Replace boilerplate in `/settings/payment-methods.astro`
- [x] Replace boilerplate in `/transactions/index.astro`
- [x] Replace boilerplate in `/transactions/add.astro`
- [x] Replace boilerplate in `/transactions/edit/[id].astro`
- [x] Replace boilerplate in `/transactions/import.astro`
- [x] Replace boilerplate in `/transactions/export.astro`
- [x] Replace boilerplate in `/budget/index.astro`
- [x] Replace boilerplate in `/budget/history.astro`
- [x] Replace boilerplate in `/assets/index.astro`
- [x] Replace boilerplate in `/assets/add.astro`
- [x] Replace boilerplate in `/assets/history.astro`
- [x] Replace boilerplate in `/reports/index.astro`
- [x] Replace boilerplate in `/reports/yearly.astro`
- [x] Replace boilerplate in `/reports/custom.astro`
- [x] Replace boilerplate in `/forecast/index.astro`
- [x] Replace boilerplate in `/forecast/comparison.astro`
- [x] Replace boilerplate in `/calculators/index.astro`
- [x] Test all protected pages redirect to login when not authenticated (manual testing)
- [x] Test all protected pages load correctly when authenticated (manual testing)

**Estimated Time:** 2-3 hours

**Status:** ✅ Completed

- Created `ProtectedLayout.astro` with automatic authentication check
- Updated 20+ pages to use `ProtectedLayout` instead of `MainLayout`
- All quality gates pass (typecheck, lint, stylelint, format)
- Code review: APPROVED

---

#### 1.1 Create User Service

**Checklist:**

- [x] Create `src/services/user.service.ts`
- [x] Implement `updateProfile(userId, name, email)` method
- [x] Implement `updatePassword(userId, oldPassword, newPassword)` method
- [x] Implement `updateSettings(userId, settings)` method
- [x] Implement `getSettings(userId)` method with defaults
- [x] Add email uniqueness validation
- [x] Add old password verification
- [x] Add password strength validation
- [x] Add error codes (USER_NOT_FOUND, EMAIL_ALREADY_EXISTS, etc.)
- [x] Create `src/services/user.service.test.ts`
- [x] Write unit tests for `updateProfile`
- [x] Write unit tests for `updatePassword`
- [x] Write unit tests for `updateSettings`
- [x] Write unit tests for `getSettings`
- [x] Export user service from `src/services/index.ts`

**Estimated Time:** 2-3 hours

**Status:** ✅ Completed

- Created `UserService` class with all required methods
- Validation schemas defined inline using Zod
- Uses shared `ServiceErrorCode` enum and `UserServiceError` from `service-errors.ts`
- Added constant-time delay to prevent timing attacks in password verification
- All 36 unit tests pass
- All quality gates pass (typecheck, lint, stylelint, format)
- Code review: APPROVED with feedback applied

---

#### 1.2 Create Validation Schemas

**Note:** Validation schemas were implemented inline in `user.service.ts` as Zod schemas. Task 1.2 is complete as part of task 1.1.

**Status:** ✅ Completed

- Validation schemas created inline in `user.service.ts`
- `updateProfileSchema` (name, email validation)
- `updatePasswordSchema` (oldPassword, newPassword validation)
- `updateSettingsSchema` (primaryCurrency, preferences)
- Password complexity regex (12+ chars, letters + numbers/special)

---

#### 1.3 Create API Endpoints

**Checklist:**

- [x] Create `src/pages/api/user/profile.ts` (PUT endpoint)
- [x] Add authentication check to profile endpoint
- [x] Implement profile update logic with validation
- [x] Add error handling for duplicate email
- [x] Create `src/pages/api/user/password.ts` (PUT endpoint)
- [x] Add authentication check to password endpoint
- [x] Implement password change with old password verification
- [x] Add error handling for invalid old password
- [x] Create `src/pages/api/user/settings.ts` (PUT endpoint)
- [x] Add authentication check to settings endpoint
- [x] Implement settings update logic
- [x] Add upsert logic for user_settings (create if not exists)
- [x] Write integration tests for all three endpoints
- [x] Update openapi.yml with new endpoint documentation
- [x] Test all endpoints with valid requests
- [x] Test all endpoints with invalid requests
- [x] Test all endpoints without authentication (should fail)

**Estimated Time:** 1-2 hours

**Status:** ✅ Completed

- Created `src/pages/api/user/profile.ts` - PUT endpoint for profile updates (name, email)
- Created `src/pages/api/user/password.ts` - PUT endpoint for password changes
- Created `src/pages/api/user/settings.ts` - PUT endpoint for user settings (currency, preferences)
- Added proper authentication using `requireAuth()` for all endpoints
- Comprehensive error handling for duplicate emails, invalid passwords, weak passwords
- Integration tests for all three endpoints covering:
  - Valid requests with expected responses
  - Duplicate email rejection
  - Invalid old password rejection
  - Password strength validation
  - Currency validation
  - Malformed JSON handling
  - Authentication requirement
- Updated `openapi.yml` with User tag and all three endpoint definitions
- All quality gates pass (typecheck, lint, stylelint, format)
- Code review: APPROVED with type safety fix applied

**Response format:**

```json
{
  "success": true,
  "user": {
    "id": "abc123",
    "name": "Updated Name",
    "email": "updated@example.com"
  }
}
```

---

#### 1.4 Wire Settings Page ✅

**Checklist:**

- [x] Update `src/pages/settings/index.astro` to pre-fill user data
- [x] Add form action for profile updates
- [x] Add success/error message display
- [x] Add password change form section to settings page
- [x] Add currency preference selector
- [x] Add form validation client-side
- [x] Test profile update and redirect
- [x] Test password change flow
- [x] Test settings persistence across page reloads

**Estimated Time:** 2-3 hours

**Status:** ✅ Completed

- Added GET endpoint for user profile (`/api/user/profile`) to fetch current user data
- Added GET endpoint for user settings (`/api/user/settings`) to fetch current settings with defaults
- Updated settings page with three separate forms:
  - Profile Information (name, email) - pre-filled from server-side user data
  - Currency Preferences (primary currency) - fetched from API on page load
  - Password Change - using new PasswordChangeForm component
- Added client-side form validation for all forms
- Added success/error message display with loading states
- All forms use fetch API to communicate with endpoints
- Settings page pre-fills user data and persists changes
- Integration tests added for GET endpoints
- All quality gates pass (typecheck, lint, stylelint, format)
- Code review: Completed with minor non-blocking suggestions

---

#### 1.5 Create Password Change Form Component ✅

**Checklist:**

- [x] Create `src/components/molecules/PasswordChangeForm.astro`
- [x] Add old password input field
- [x] Add new password input field with strength indicator
- [x] Add confirm password input field
- [x] Add password visibility toggle (show/hide)
- [x] Add submit button
- [x] Add validation error display
- [x] Add success message display
- [x] Test password mismatch validation
- [x] Test weak password rejection
- [x] Test wrong old password rejection

**Estimated Time:** 1-2 hours

**Status:** ✅ Completed

- Created `PasswordChangeForm.astro` component with full password change functionality
- Uses PasswordField atom components for password inputs with built-in:
  - Password visibility toggle
  - Strength meter (4-bar indicator)
  - Requirements checklist (length, letter, number/special)
- Client-side validation matching server-side requirements (12+ chars, letter + number/special)
- Form validates: old password required, new password strength, passwords match
- Success message indicates session remains active after password change
- Error messages for: invalid old password, weak password, passwords don't match
- Loading state with spinner during submission
- Integrated into settings page alongside profile and currency forms

---

### 2. Budget Edit Integration (Priority: P1)

#### 2.1 Create Budget Edit API Endpoint

**Checklist:**

- [ ] Create `src/pages/api/budget/category/[id].ts` (PATCH endpoint)
- [ ] Add authentication check
- [ ] Add category ownership verification (must belong to user)
- [ ] Implement budget update logic
- [ ] Add percentage validation (0-100)
- [ ] Add budget_amount validation (>= 0)
- [ ] Add currency validation (must match category currency)
- [ ] Update both percentage and budget_amount if both provided
- [ ] Return updated category data
- [ ] Test with valid updates
- [ ] Test with invalid percentage (> 100)
- [ ] Test with negative amounts
- [ ] Test with another user's category (should fail)

**Request body:**

```json
{
  "percentage": "5.00",
  "budget_amount": "5000000",
  "currency": "IDR"
}
```

**Response:**

```json
{
  "success": true,
  "category": {
    "id": "abc123",
    "name": "Food & Groceries",
    "percentage": "5.00",
    "budget_amount": "5000000",
    "currency": "IDR"
  }
}
```

**Validation:**

- Category must belong to user
- Percentage: 0-100, optional if budget_amount provided
- Budget amount: >= 0, optional if percentage provided
- Currency: must match category currency

#### 2.2 Wire Budget Edit Modal

**Checklist:**

- [ ] Update `src/pages/budget/index.astro` client script
- [ ] Add form submit event listener to `quick-edit-budget-form`
- [ ] Implement PATCH fetch to `/api/budget/category/{id}`
- [ ] Parse JSON response and update UI
- [ ] Refresh budget data without full page reload
- [ ] Show success message on save
- [ ] Show error message on failure
- [ ] Close modal on successful save
- [ ] Keep modal open on error
- [ ] Test edit and verify table updates
- [ ] Test edit and verify total budget recalculates
- [ ] Test page refresh shows updated values

**Script logic:**

```typescript
// budget-client.ts
document.getElementById('quick-edit-budget-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const categoryId = formData.get('category_id');

  const response = await fetch(`/api/budget/category/${categoryId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      percentage: formData.get('percentage'),
      budget_amount: formData.get('budget_amount'),
    }),
  });

  if (response.ok) {
    // Refresh budget data, close modal, show success message
  }
});
```

---

### 3. Transaction Form UX Enhancements (Priority: P2)

#### 3.1 Add Budget Remaining Display

**File:** `src/pages/transactions/add.astro`

**Checklist:**

- [ ] Fetch budget remaining for selected category
- [ ] Display budget remaining indicator on form
- [ ] Show warning if budget is low (>80% used)
- [ ] Show error if budget is exceeded
- [ ] Test budget remaining displays correctly
- [ ] Test warning appears at 80% threshold
- [ ] Test error appears when budget exceeded

**UI:**

```
Category: [Food & Groceries ▼]
Budget Remaining: 2,500,000 IDR (50%)
⚠️ Warning: Only 50% of budget remaining
```

#### 3.2 Remember Last Used Selections

**File:** `src/components/molecules/TransactionForm.astro`

**Checklist:**

- [ ] Store last used category per transaction type in localStorage
- [ ] Store last used payment method in localStorage
- [ ] Pre-select these values on form load
- [ ] Update stored values after successful save
- [ ] Test last category persists for expense transactions
- [ ] Test last category persists for income transactions (separate from expense)
- [ ] Test last payment method persists across sessions
- [ ] Test localStorage is updated after each successful save

**Script:**

```typescript
// On load
const lastCategory = localStorage.getItem('lastExpenseCategory');
const lastPaymentMethod = localStorage.getItem('lastPaymentMethod');

// On save
localStorage.setItem('lastExpenseCategory', formData.get('category_id'));
localStorage.setItem('lastPaymentMethod', formData.get('payment_method_id'));
```

#### 3.3 Improve Form Validation

**File:** `src/components/molecules/TransactionForm.astro`

**Checklist:**

- [ ] Add real-time validation as user types
- [ ] Show specific error messages (not generic)
- [ ] Disable submit button until form is valid
- [ ] Show loading state during submission
- [ ] Show success message and redirect after save
- [ ] Validate amount > 0 with max 2 decimal places
- [ ] Validate date cannot be in future
- [ ] Validate category is required for transaction type
- [ ] Validate payment method is required
- [ ] Test all validation rules with invalid inputs
- [ ] Test form submission with valid data
- [ ] Test loading state displays correctly during submission

---

## How to Test

### 1. User Profile & Settings Testing

**Manual Test Steps:**

1. **Profile Update**

   ```
   1. Navigate to /settings
   2. Change name to "Test User"
   3. Change email to "test@example.com"
   4. Click "Save Changes"
   5. Verify success message appears
   6. Refresh page and verify values persisted
   7. Try saving duplicate email (should show error)
   ```

2. **Password Change**

   ```
   1. Navigate to /settings
   2. Enter current password
   3. Enter new password (12+ chars, letters + numbers)
   4. Confirm new password
   5. Click "Change Password"
   6. Verify success message
   7. Logout and login with new password
   ```

3. **Settings Update**
   ```
   1. Navigate to /settings
   2. Change primary currency to USD
   3. Save changes
   4. Navigate to /dashboard
   5. Verify totals display in USD
   ```

**Unit Tests:**

```bash
bun test src/services/user.service.test.ts
```

### 2. Budget Edit Testing

**Manual Test Steps:**

1. **Inline Budget Edit**

   ```
   1. Navigate to /budget
   2. Click "Edit" button on a category row
   3. Change percentage from 5% to 10%
   4. Click "Save Changes"
   5. Verify row updates with new values
   6. Verify total budget updates
   7. Refresh page and verify changes persisted
   ```

2. **Budget Validation**
   ```
   1. Try to set percentage > 100 (should show error)
   2. Try to set negative amount (should show error)
   3. Try to edit another user's category (should return 403)
   ```

### 3. Transaction Form UX Testing

**Manual Test Steps:**

1. **Budget Remaining Display**

   ```
   1. Add a category with budget (e.g., "Test" with 100,000 IDR)
   2. Navigate to /transactions/add?type=expense
   3. Select "Test" category
   4. Verify budget remaining shows correctly
   5. Add transaction for 60,000 IDR
   6. Add another transaction for 50,000 IDR
   7. Verify warning shows for exceeded budget
   ```

2. **Remember Last Used**

   ```
   1. Add transaction with category "Food" and payment "Cash"
   2. Navigate to /transactions/add again
   3. Verify "Food" and "Cash" are pre-selected
   4. Add transaction with different values
   5. Navigate to /transactions/add?type=income
   6. Verify income category is pre-selected (separate from expense)
   ```

3. **Form Validation**
   ```
   1. Try to submit form with empty amount (should show error)
   2. Try to enter negative amount (should show error)
   3. Try to enter future date (should show error)
   4. Fill form correctly and submit
   5. Verify loading state during submission
   6. Verify redirect to /transactions after save
   ```

### 4. Integration Testing

**End-to-End Flow:**

```
1. Login as user
2. Update profile name and currency
3. Set budget allocations for categories
4. Add transactions within budget
5. Verify budget alerts when exceeded
6. Export budget report
7. Change password
8. Logout and login with new password
9. Verify all data persisted correctly
```

---

## Dependencies

### Required Database Tables

- `users` ✅ (exists)
- `user_settings` ✅ (exists, not used)
- `categories` ✅ (exists)
- `transactions` ✅ (exists)

### Required Services

- `auth.service` ✅ (exists)
- `category.service` ✅ (exists)
- `budget.service` ✅ (exists)
- `user.service` ✅ (created - task 1.1)

### Required Components

- `TransactionForm.astro` ✅ (exists)
- `MainLayout.astro` ✅ (exists)

---

## Success Criteria

### User Profile & Settings

- [x] User service layer created with all methods (updateProfile, updatePassword, updateSettings, getSettings)
- [x] Email uniqueness is enforced at service level
- [x] Password validation implemented (12+ chars, letters + numbers/special)
- [x] Settings defaults applied correctly
- [x] Error codes defined and integrated with shared service error handling
- [x] API endpoints created for profile, password, and settings updates (task 1.3)
- [x] User can update name and email from settings page (tasks 1.4, 1.5 completed)
- [x] User can change password with validation (tasks 1.4, 1.5 completed)
- [x] Primary currency setting affects display across app (task 1.4 completed)
- [x] All settings persist across sessions (task 1.4 completed)
- [x] Form validation prevents invalid inputs (tasks 1.4, 1.5 completed)
- [x] Success/error messages display correctly (tasks 1.4, 1.5 completed)
- [x] User avatar properly shown as initial name (existing functionality)

### Budget Edit

- [ ] Budget edit modal opens from budget page
- [ ] Changes save to database correctly
- [ ] UI updates without page refresh
- [ ] Total budget recalculates correctly
- [ ] Validation prevents invalid values
- [ ] Other users' budgets cannot be edited

### Transaction Form UX

- [ ] Budget remaining displays for expense categories
- [ ] Warning shows when budget is low
- [ ] Error shows when budget is exceeded
- [ ] Last used category is pre-selected
- [ ] Last used payment method is pre-selected
- [ ] Expense/income categories remembered separately
- [ ] Form validation provides specific error messages
- [ ] Loading state shows during submission

---

## Estimated Effort

| Task                            | Estimated Time | Priority |
| ------------------------------- | -------------- | -------- |
| AuthLayout Abstraction          | 2-3 hours      | P0       |
| User Service + Validation       | 2-3 hours      | P0       |
| User API Endpoints              | 1-2 hours      | P0       |
| Wire Settings Page              | 2-3 hours      | P0       |
| Password Change Form            | 1-2 hours      | P0       |
| Budget Edit API                 | 1-2 hours      | P1       |
| Wire Budget Edit Modal          | 2-3 hours      | P1       |
| Transaction Form Budget Display | 2-3 hours      | P2       |
| Remember Last Used              | 1-2 hours      | P2       |
| Form Validation Improvements    | 1-2 hours      | P2       |
| Testing & Bug Fixes             | 2-3 hours      | P0       |

**Total: 17-27 hours** (includes refactoring)

---

## OpenAPI Documentation Updates

Add to `openapi.yml`:

```yaml
paths:
  /api/user/profile:
    put:
      summary: Update user profile
      tags: [User]
      security:
        - session: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                email:
                  type: string
                  format: email
      responses:
        200:
          description: Profile updated successfully

  /api/user/password:
    put:
      summary: Change user password
      tags: [User]
      security:
        - session: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [oldPassword, newPassword]
              properties:
                oldPassword:
                  type: string
                newPassword:
                  type: string
                  minLength: 12

  /api/user/settings:
    put:
      summary: Update user settings
      tags: [User]
      security:
        - session: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                primaryCurrency:
                  type: string
                  enum: [IDR, USD]

  /api/budget/category/{id}:
    patch:
      summary: Update category budget allocation
      tags: [Budget]
      security:
        - session: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                percentage:
                  type: string
                  pattern: '^[0-9]{1,3}(\.[0-9]{1,2})?$'
                budget_amount:
                  type: string
                  pattern: '^[0-9]+(\.[0-9]{1,2})?$'
```

---

**End of Implementation Plan Tasks**
