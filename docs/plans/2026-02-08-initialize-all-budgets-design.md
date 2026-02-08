# Initialize All Budgets Feature Design

**Date:** 2026-02-08
**Status:** Approved
**Estimated Effort:** 2-3 hours

## Overview

Allow users to create budget entries (with 0 amounts) for all expense categories that don't have budgets in the selected month with a single button click. This eliminates the need to manually add each category one by one.

## User Story

> As a user, I want to initialize all expense categories with budget entries in one click, so I can quickly set up my monthly budget structure and fill in amounts later.

## Feature Requirements

### Functional Requirements

1. **Button Visibility**
   - Show "Initialize All Budgets" button when at least one active expense category has no budget for the selected month
   - Disable button when all active expense categories already have budgets
   - Display tooltip on disabled state: "All categories already have budgets"

2. **Confirmation Modal**
   - Display list of category names that will be initialized
   - Show count of categories (e.g., "5 categories")
   - Provide Cancel and Initialize actions
   - Include helper text explaining budgets will be set to 0

3. **Budget Creation**
   - Create budget entries with `budget_amount = '0'` for each uninitialized category
   - Use current month, year, and currency from page context
   - Skip categories that already have budgets (idempotent)
   - Invalidate cache after creation

4. **User Feedback**
   - Show success toast: "Initialized X budgets successfully"
   - Refresh page to display newly created budget entries
   - Show error toast if operation fails

### Non-Functional Requirements

- **Performance:** Bulk insert for multiple budgets (single transaction)
- **Safety:** Confirmation step prevents accidental creation
- **Accessibility:** Modal has focus trap, ARIA labels, keyboard navigation
- **Cache:** Invalidate workspace + budget tags after creation

## User Flow

```
1. User navigates to Budget page (/budget?month=2&year=2026)
2. Page shows "Initialize All Budgets" button (if uninitialized categories exist)
3. User clicks "Initialize All Budgets"
4. Confirmation modal opens showing:
   - "Initialize Budgets?"
   - List of category names (e.g., "Food, Transport, Entertainment")
   - "5 categories"
   - Cancel / Initialize buttons
5. User clicks "Initialize"
6. API creates budget entries with amount=0
7. Page refreshes, toast shows "Initialized 5 budgets successfully"
8. User sees all categories in budget card grid with 0 amounts
9. User edits amounts using inline editing or Set New Budget modal
```

## Technical Design

### Architecture

Follows Interactive Pages Architecture (002-interactive-pages.md):

- Server-rendered HTML updates after budget creation
- Client-side orchestration via event listeners
- API returns both JSON and HTML responses

### Components

#### 1. UI Components

**BudgetActions.astro** (Modified)

- Add "Initialize All Budgets" button
- Pass `uninitializedCategories` prop from parent page
- Button states:
  - Active: `btn btn-sm` with Zap icon
  - Disabled: Grayed out with tooltip

**InitializeBudgetsModal.astro** (New)

Props:

- `id: string`
- `categories: Array<{ id: string, name: string, icon: string, color: string }>`
- `month: number`
- `year: number`
- `currency: 'IDR' | 'USD'`

Structure:

- Header: "Initialize Budgets?"
- Body: Category list (scrollable), count badge, helper text
- Footer: Cancel (secondary), Initialize (primary)

**Budget Page** (Modified)

- Calculate uninitialized categories by comparing all active expense categories against existing budgets
- Pass to BudgetActions component
- Listen for `budgets-initialized` event to refresh page

#### 2. API Endpoint

**File:** `src/pages/api/budget/initialize.ts`

```typescript
POST /api/budget/initialize

Request Body:
{
  workspace_id: string
  month: number (1-12)
  year: number (2000-2100)
  currency: 'IDR' | 'USD'
  created_by_user_id: string
}

Response (Success - 200):
{
  success: true
  initialized_count: number
  categories: Array<{ id: string, name: string }>
}

Response (Error - 400):
{
  success: false
  error: string
}

Response (Unauthorized - 401):
{
  success: false
  error: "Unauthorized"
}
```

#### 3. Service Method

**File:** `src/services/budget.service.ts`

```typescript
async initializeAllBudgets(input: {
  workspace_id: string
  created_by_user_id: string
  month: number
  year: number
  currency: 'IDR' | 'USD'
}): Promise<{
  initialized_count: number
  categories: Array<{ id: string, name: string }>
}>
```

**Logic:**

1. Validate month (1-12) and year (2000-2100)
2. Get all active expense categories for workspace
3. Get existing budgets for month/year/currency
4. Filter to categories without budgets (Set for O(1) lookup)
5. Bulk insert budget records:
   - `id: nanoid()`
   - `workspace_id`, `created_by_user_id`, `category_id`
   - `month`, `year`, `currency`
   - `budget_amount: '0'`
   - `is_closed: false`
6. Invalidate cache (`CacheTags.workspace()`, `CacheTags.BUDGET`)
7. Return initialized count and category list

### Data Flow

```
User clicks "Initialize All Budgets"
  ↓
Modal opens (client-side)
  ↓
User confirms in modal
  ↓
POST /api/budget/initialize
  ↓
BudgetService.initializeAllBudgets()
  ↓
  1. Get all active expense categories
  2. Get existing budgets for month/year/currency
  3. Filter uninitialized categories
  4. Bulk insert budget records (amount='0')
  5. Invalidate cache
  ↓
Return { initialized_count, categories }
  ↓
Client refreshes page
  ↓
Toast: "Initialized X budgets successfully"
  ↓
Budget cards display with 0 amounts
```

### Error Handling

| Scenario                   | HTTP Code | Response                                          | User Feedback                               |
| -------------------------- | --------- | ------------------------------------------------- | ------------------------------------------- |
| Invalid month/year         | 400       | `{ success: false, error: "Invalid parameters" }` | Toast: "Invalid month or year"              |
| No active categories       | 200       | `{ initialized_count: 0, categories: [] }`        | Toast: "No categories to initialize"        |
| All categories initialized | 200       | `{ initialized_count: 0, categories: [] }`        | Toast: "All categories already initialized" |
| Database error             | 500       | `{ success: false, error: "Internal error" }`     | Toast: "Failed to initialize budgets"       |
| Unauthorized               | 401       | `{ success: false, error: "Unauthorized" }`       | Redirect to /login                          |

### Cache Invalidation

Same pattern as existing budget operations:

```typescript
await cache.invalidateByTags([CacheTags.workspace(workspace_id), CacheTags.BUDGET]);
```

## Implementation Order

Following constitution (UI → Service → API → CLI → Seeder):

1. **UI Components** (~45 min)
   - Add button to BudgetActions.astro
   - Create InitializeBudgetsModal.astro
   - Update Budget page to calculate uninitialized categories
   - Add client-side event handlers

2. **Service Method** (~30 min)
   - Add `initializeAllBudgets()` to BudgetService
   - Add validation schema to `lib/validation/budgets.ts`
   - Write unit tests

3. **API Endpoint** (~30 min)
   - Create `pages/api/budget/initialize.ts`
   - Add authentication middleware
   - Write API tests

4. **Documentation** (~15 min)
   - Update OpenAPI spec (`openapi/paths/budget.yml`)
   - Add endpoint to API documentation

5. **E2E Tests** (~30 min)
   - Test button visibility states
   - Test modal interaction flow
   - Test successful initialization
   - Test error handling

## Testing Strategy

### Unit Tests

**File:** `src/services/budget.service.test.ts`

```typescript
describe('BudgetService.initializeAllBudgets', () => {
  it('creates budgets for categories without existing budgets');
  it('skips categories that already have budgets');
  it('returns correct count of initialized budgets');
  it('sets budget_amount to "0" for all created budgets');
  it('handles empty category list gracefully');
  it('validates month parameter (1-12)');
  it('validates year parameter (2000-2100)');
  it('invalidates cache after creation');
  it('uses bulk insert for performance');
});
```

### API Tests

**File:** `src/pages/api/budget/initialize.test.ts`

```typescript
describe('POST /api/budget/initialize', () => {
  it('returns 200 with initialized count');
  it('returns 400 for invalid month');
  it('returns 400 for invalid year');
  it('returns 401 for unauthenticated requests');
  it('returns 403 for wrong workspace');
  it('handles duplicate initialization gracefully');
  it('includes category list in response');
});
```

### E2E Tests

**File:** `e2e/tests/budget/budget-initialization.spec.ts`

```typescript
test.describe('Budget Initialization', () => {
  test('shows initialize button when categories lack budgets');
  test('disables button when all categories have budgets');
  test('modal shows correct list of categories');
  test('successful initialization creates budgets and shows toast');
  test('cancel button closes modal without creating budgets');
  test('page refresh shows newly created budgets');
  test('initialized budgets have 0 amount');
  test('can edit initialized budgets via inline editing');
});
```

## Accessibility

- Modal uses `<dialog>` element with proper focus management
- Button has descriptive `aria-label="Initialize all budgets"`
- Disabled state uses `aria-disabled="true"` with tooltip
- Category list in modal uses semantic `<ul>` structure
- Keyboard navigation: Tab, Enter, Escape

## Security Considerations

- Workspace ID validation (user can only initialize budgets for their workspace)
- Month/year validation prevents invalid dates
- Bulk insert uses parameterized queries (Drizzle ORM)
- No risk of SQL injection or XSS
- CSRF protection via existing middleware

## Open Questions

None - design is complete and approved.

## Success Metrics

- Users can initialize 5+ budgets in under 10 seconds (vs. 2+ minutes manually)
- Reduces friction in monthly budget setup workflow
- Zero reported errors or confusion in user feedback

## Future Enhancements (Out of Scope)

- Pre-fill amounts based on historical spending averages
- Smart suggestions for budget amounts (AI-powered)
- Bulk edit amounts in confirmation modal before creation
- Initialize budgets for multiple months at once
