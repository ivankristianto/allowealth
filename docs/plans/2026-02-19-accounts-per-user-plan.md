# Accounts Per User — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to view and manage accounts they own, with a toggle between "All Accounts" and "My Accounts" views on the /accounts page.

**Architecture:** Reuse existing `created_by_user_id` field as account ownership. Add `owner_user_id` filter to `findAll()` and propagate to snapshot/closed queries. URL query param `?view=mine` drives the view toggle. New admin-only `transferOwnership()` method + API endpoint for reassigning accounts.

**Tech Stack:** Astro 5 (SSR pages), Drizzle ORM, DaisyUI v5, bun:test

---

### Task 1: Add `owner_user_id` filter to `AccountService.findAll()`

**Files:**

- Modify: `src/services/account.service.ts:144-191` (findAll method)
- Test: `src/services/__tests__/account-owner-filter.test.ts`

**Step 1: Write the failing test**

Create `src/services/__tests__/account-owner-filter.test.ts`:

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AccountService } from '../account.service';
import { createMockDatabase, createMockAccount, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager, getCacheManager } from '@/lib/cache';

describe('AccountService.findAll owner_user_id filter', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);

    const cache = getCacheManager();
    cache.get = mock(() => Promise.resolve(null));
    cache.set = mock(() => Promise.resolve());
  });

  it('should filter accounts by owner_user_id when provided', async () => {
    const ownedAccount = createMockAccount({
      id: 'account-1',
      workspace_id: 'ws-1',
      created_by_user_id: 'user-1',
    });

    (mockDb.query.accounts.findMany as any).mockResolvedValue([ownedAccount]);

    const result = await accountService.findAll('ws-1', { owner_user_id: 'user-1' });

    expect(result).toEqual([ownedAccount]);
    expect(mockDb.query.accounts.findMany).toHaveBeenCalled();
  });

  it('should return all accounts when owner_user_id is not provided', async () => {
    const accounts = [
      createMockAccount({ id: 'a-1', workspace_id: 'ws-1', created_by_user_id: 'user-1' }),
      createMockAccount({ id: 'a-2', workspace_id: 'ws-1', created_by_user_id: 'user-2' }),
    ];

    (mockDb.query.accounts.findMany as any).mockResolvedValue(accounts);

    const result = await accountService.findAll('ws-1');

    expect(result).toHaveLength(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/services/__tests__/account-owner-filter.test.ts`
Expected: FAIL — `owner_user_id` is not an accepted filter key (TypeScript error or ignored)

**Step 3: Implement the filter**

In `src/services/account.service.ts`, update the `findAll` method's filters type and add the condition:

```typescript
// Line 146: Add owner_user_id to filters interface
async findAll(
  workspaceId: string,
  filters?: {
    type?: AccountType;
    category_id?: string;
    currency?: Currency;
    includeInactive?: boolean;
    owner_user_id?: string;  // NEW
  },
  perf?: PerfCollector
) {
```

After the existing currency filter condition (after line 177), add:

```typescript
if (filters?.owner_user_id) {
  conditions.push(eq(this.schema.accounts.created_by_user_id, filters.owner_user_id));
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/services/__tests__/account-owner-filter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/account.service.ts src/services/__tests__/account-owner-filter.test.ts
git commit -m "feat(accounts): add owner_user_id filter to findAll"
```

---

### Task 2: Propagate owner filter to `getSnapshotForMonth()` and `countClosed()`

**Files:**

- Modify: `src/services/account.service.ts:613-721` (getSnapshotForMonth)
- Modify: `src/services/account.service.ts:919-934` (countClosed)
- Test: `src/services/__tests__/account-owner-filter.test.ts` (extend)

**Step 1: Write the failing tests**

Append to `src/services/__tests__/account-owner-filter.test.ts`:

```typescript
describe('AccountService.getSnapshotForMonth owner filter', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);

    const cache = getCacheManager();
    cache.get = mock(() => Promise.resolve(null));
    cache.set = mock(() => Promise.resolve());
  });

  it('should accept owner_user_id in filters', async () => {
    (mockDb.query.accounts.findMany as any).mockResolvedValue([]);

    const result = await accountService.getSnapshotForMonth('ws-1', 2026, 2, {
      owner_user_id: 'user-1',
    });

    expect(result).toEqual([]);
  });
});

describe('AccountService.countClosed with owner filter', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);
  });

  it('should accept optional ownerUserId parameter', async () => {
    const mockSelect = mock(() => ({
      from: mock(() => ({
        where: mock(() => Promise.resolve([{ count: 3 }])),
      })),
    }));
    (mockDb as any).select = mockSelect;

    const result = await accountService.countClosed('ws-1', 'user-1');

    expect(result).toBe(3);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/services/__tests__/account-owner-filter.test.ts`
Expected: FAIL — `getSnapshotForMonth` doesn't accept `owner_user_id` in filters, `countClosed` doesn't accept second param

**Step 3: Implement**

In `getSnapshotForMonth` (line 617), add `owner_user_id` to the filters type:

```typescript
  async getSnapshotForMonth(
    workspaceId: string,
    year: number,
    month: number,
    filters?: {
      type?: AccountType;
      category_id?: string;
      currency?: Currency;
      owner_user_id?: string;  // NEW
    },
    perf?: PerfCollector
  ) {
```

The `findAll` call on line 627 already spreads filters — `owner_user_id` will propagate automatically:

```typescript
const allAccounts = await this.findAll(workspaceId, { ...filters, includeInactive: true });
```

In `countClosed` (line 919), add optional `ownerUserId` parameter:

```typescript
  async countClosed(workspaceId: string, ownerUserId?: string): Promise<number> {
    const conditions = [
      eq(this.schema.accounts.workspace_id, workspaceId),
      eq(this.schema.accounts.status, 'closed'),
      sql`${this.schema.accounts.deleted_at} IS NULL`,
    ];

    if (ownerUserId) {
      conditions.push(eq(this.schema.accounts.created_by_user_id, ownerUserId));
    }

    const result = await (this.db as any)
      .select({
        count: sql<number>`count(*)`,
      })
      .from(this.schema.accounts)
      .where(and(...conditions));

    return result[0]?.count ?? 0;
  }
```

**Step 4: Run tests to verify they pass**

Run: `bun test src/services/__tests__/account-owner-filter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/account.service.ts src/services/__tests__/account-owner-filter.test.ts
git commit -m "feat(accounts): propagate owner filter to snapshot and countClosed"
```

---

### Task 3: Add `transferOwnership()` service method

**Files:**

- Modify: `src/services/account.service.ts` (add new method)
- Test: `src/services/__tests__/account-transfer-ownership.test.ts`

**Step 1: Write the failing test**

Create `src/services/__tests__/account-transfer-ownership.test.ts`:

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AccountService } from '../account.service';
import { createMockDatabase, createMockAccount, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager, getCacheManager } from '@/lib/cache';
import { ServiceErrorCode } from '../service-errors';

describe('AccountService.transferOwnership()', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let accountService: AccountService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    accountService = new AccountService(mockDb);

    const cache = getCacheManager();
    cache.invalidateByTags = mock(() => Promise.resolve());
  });

  it('should update created_by_user_id to new owner', async () => {
    const account = createMockAccount({
      id: 'account-1',
      workspace_id: 'ws-1',
      created_by_user_id: 'user-1',
    });

    (mockDb.query.accounts.findFirst as any).mockResolvedValue(account);

    const mockWhere = mock(() => Promise.resolve());
    const mockSet = mock(() => ({ where: mockWhere }));
    (mockDb.update as any).mockReturnValue({ set: mockSet });

    await accountService.transferOwnership('account-1', 'user-2', 'ws-1');

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ created_by_user_id: 'user-2' }));
  });

  it('should throw ACCOUNT_NOT_FOUND when account does not exist', async () => {
    (mockDb.query.accounts.findFirst as any).mockResolvedValue(null);

    try {
      await accountService.transferOwnership('nonexistent', 'user-2', 'ws-1');
      expect.unreachable('Should have thrown');
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.ACCOUNT_NOT_FOUND);
    }
  });

  it('should invalidate cache after transfer', async () => {
    const account = createMockAccount({
      id: 'account-1',
      workspace_id: 'ws-1',
    });

    (mockDb.query.accounts.findFirst as any).mockResolvedValue(account);
    (mockDb.update as any).mockReturnValue({
      set: mock(() => ({ where: mock(() => Promise.resolve()) })),
    });

    const cache = getCacheManager();
    await accountService.transferOwnership('account-1', 'user-2', 'ws-1');

    expect(cache.invalidateByTags).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/services/__tests__/account-transfer-ownership.test.ts`
Expected: FAIL — `transferOwnership` is not a function

**Step 3: Implement**

Add to `AccountService` class in `src/services/account.service.ts` (before `countClosed`):

```typescript
  /**
   * Transfer account ownership to a different user.
   * Updates created_by_user_id. Admin-only (enforced at API layer).
   */
  async transferOwnership(accountId: string, newOwnerId: string, workspaceId: string) {
    const account = await this.findByIdIncludingClosed(accountId, workspaceId);
    if (!account) {
      throw new AccountServiceError(ServiceErrorCode.ACCOUNT_NOT_FOUND, 'Account not found', 404);
    }

    await this.db
      .update(this.schema.accounts)
      .set({
        created_by_user_id: newOwnerId,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(this.schema.accounts.id, accountId),
          eq(this.schema.accounts.workspace_id, workspaceId)
        )
      );

    // Invalidate account cache - best-effort
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.ACCOUNTS]);
    } catch {
      // Cache invalidation failed, stale cache is acceptable
    }
  }
```

**Step 4: Run test to verify it passes**

Run: `bun test src/services/__tests__/account-transfer-ownership.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/account.service.ts src/services/__tests__/account-transfer-ownership.test.ts
git commit -m "feat(accounts): add transferOwnership service method"
```

---

### Task 4: Add `owner` query param to `GET /api/accounts`

**Files:**

- Modify: `src/pages/api/accounts/index.ts:44-75` (GET handler)

**Step 1: Read the existing GET handler**

Review `src/pages/api/accounts/index.ts` — already read above.

**Step 2: Add owner filter to GET handler**

After the existing currency filter (line 62), add:

```typescript
const owner = url.searchParams.get('owner');
if (owner) {
  filters.owner_user_id = owner;
}
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/pages/api/accounts/index.ts
git commit -m "feat(api): accept owner query param on GET /api/accounts"
```

---

### Task 5: Create `PATCH /api/accounts/[id]/transfer-owner` endpoint

**Files:**

- Create: `src/pages/api/accounts/[id]/transfer-owner.ts`

**Step 1: Create the endpoint**

Create `src/pages/api/accounts/[id]/transfer-owner.ts`:

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { accountService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { AccountServiceError } from '@/services/service-errors';
import { getCacheManager, CacheTags } from '@/lib/cache';

const transferOwnerSchema = z.object({
  owner_user_id: z.string().min(1, 'Owner user ID is required'),
});

/**
 * PATCH /api/accounts/:id/transfer-owner
 * Transfer account ownership to another workspace member.
 * Admin only.
 */
export const PATCH: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Account ID is required', 400);
    }

    // Admin-only permission check
    if (auth.role !== 'admin') {
      return errorResponse(
        'Only workspace admins can transfer account ownership',
        403,
        'ADMIN_REQUIRED'
      );
    }

    const validation = await validateBody(context.request, transferOwnerSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    await accountService.transferOwnership(id, validation.data.owner_user_id, auth.workspaceId);

    // Invalidate layout cache (best-effort)
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([
        CacheTags.workspace(auth.workspaceId),
        CacheTags.ACCOUNTS,
        CacheTags.LAYOUT,
      ]);
    } catch (cacheError) {
      logError(
        `Failed to invalidate cache after ownership transfer [workspaceId=${auth.workspaceId}, accountId=${id}]`,
        cacheError
      );
    }

    return successResponse({ message: 'Ownership transferred successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof AccountServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error transferring account ownership', error);
    return errorResponse('Failed to transfer ownership', 500);
  }
};
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/pages/api/accounts/\[id\]/transfer-owner.ts
git commit -m "feat(api): add PATCH /api/accounts/:id/transfer-owner endpoint"
```

---

### Task 6: Add view toggle and info banner to accounts page

**Files:**

- Modify: `src/pages/accounts/index.astro`
- Modify: `src/components/organisms/AccountActions.astro`

This is the main UI task. It wires the `?view=mine` query param to the service calls and adds the info banner.

**Step 1: Update AccountActions to include view toggle**

Add two new props to `AccountActions.astro`:

```typescript
export interface Props {
  isHistoricalView?: boolean;
  defaultCategoryId?: string;
  closedCount?: number;
  isPersonalView?: boolean; // NEW
  allAccountsHref?: string; // NEW - link to switch back
  myAccountsHref?: string; // NEW - link to switch to personal
  className?: string;
}
```

Add the view toggle as `<a>` tag segments before the Categories button. Use DaisyUI `join` for a segmented control:

```astro
{/* View Toggle */}
<div class="join" role="group" aria-label="Account view toggle">
  <a
    href={allAccountsHref}
    class:list={[
      'join-item btn btn-sm md:btn-md min-h-[44px] rounded-lg md:rounded-xl text-xs md:text-sm px-3 md:px-4',
      !isPersonalView
        ? 'btn-active bg-base-content/10 font-semibold'
        : 'btn-ghost text-base-content/70 hover:text-base-content hover:bg-base-200',
    ]}
    aria-current={!isPersonalView ? 'true' : undefined}
    data-testid="view-all-accounts-btn"
  >
    All
  </a>
  <a
    href={myAccountsHref}
    class:list={[
      'join-item btn btn-sm md:btn-md min-h-[44px] rounded-lg md:rounded-xl text-xs md:text-sm px-3 md:px-4',
      isPersonalView
        ? 'btn-active bg-base-content/10 font-semibold'
        : 'btn-ghost text-base-content/70 hover:text-base-content hover:bg-base-200',
    ]}
    aria-current={isPersonalView ? 'true' : undefined}
    data-testid="view-my-accounts-btn"
  >
    Mine
  </a>
</div>
```

**Step 2: Update accounts page to read `?view` param and filter**

In `src/pages/accounts/index.astro`, after `const user = Astro.locals.user!;`:

```typescript
// View toggle: ?view=mine shows only the current user's accounts
const isPersonalView = url.searchParams.get('view') === 'mine';
const ownerUserId = isPersonalView ? user.id : undefined;
```

Build the toggle hrefs (preserving other query params):

```typescript
// Build toggle hrefs preserving other query params
const allAccountsUrl = new URL(url);
allAccountsUrl.searchParams.delete('view');
const allAccountsHref = `${allAccountsUrl.pathname}${allAccountsUrl.search}`;

const myAccountsUrl = new URL(url);
myAccountsUrl.searchParams.set('view', 'mine');
const myAccountsHref = `${myAccountsUrl.pathname}${myAccountsUrl.search}`;
```

Pass `owner_user_id` into the service calls. Update the filters object:

```typescript
// In the filters object, add owner_user_id when in personal view
const filters: {
  user_id: string;
  type?: AccountType;
  category_id?: string;
  currency?: 'IDR' | 'USD';
  owner_user_id?: string; // NEW
} = {
  user_id: user.workspaceId,
};

// ... existing filter assignments ...

if (ownerUserId) {
  filters.owner_user_id = ownerUserId;
}
```

Update the `findAll` and `getSnapshotForMonth` calls to pass the filter:

```typescript
// Line 170 — current month view:
const rawAccounts = await accountService.findAll(user.workspaceId, filters, Astro.locals.perf);

// Line 138 — historical view:
const snapshots = await accountService.getSnapshotForMonth(
  user.workspaceId,
  selectedYear,
  selectedMonth,
  filters,
  Astro.locals.perf
);
```

Note: `filters` already contains the `owner_user_id` — the page's filters object is already passed to `findAll()`. We just need to make sure it propagates. Check that the `filters` variable used in the service calls includes `owner_user_id`.

Update `countClosed` call to pass owner:

```typescript
const closedCount = await accountService.countClosed(user.workspaceId, ownerUserId);
```

Pass toggle props to `AccountActions`:

```typescript
<AccountActions
  isHistoricalView={!isViewingCurrentMonth}
  defaultCategoryId={defaultCategoryId}
  closedCount={closedCount}
  isPersonalView={isPersonalView}
  allAccountsHref={allAccountsHref}
  myAccountsHref={myAccountsHref}
/>
```

**Step 3: Add info alert banner**

In the page template, after the historical view indicator and before `AccountActions`, add:

```astro
{/* Personal view indicator */}
{
  isPersonalView && (
    <div class="alert alert-info text-sm" data-testid="personal-view-banner">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        class="stroke-current shrink-0 w-5 h-5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>
        Showing your accounts only. Values reflect your portfolio.
        <a href={allAccountsHref} class="link link-primary font-medium ml-1">
          View all accounts &rarr;
        </a>
      </span>
    </div>
  )
}
```

**Step 4: Run typecheck and build**

Run: `bun run typecheck && bun run build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/accounts/index.astro src/components/organisms/AccountActions.astro
git commit -m "feat(accounts): add view toggle and personal view banner on accounts page"
```

---

### Task 7: Run quality gates and verify

**Files:** None (verification only)

**Step 1: Run full quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

**Step 2: Run all account-related tests**

```bash
bun test src/services/__tests__/account-owner-filter.test.ts
bun test src/services/__tests__/account-transfer-ownership.test.ts
bun test src/services/__tests__/account-service-cache.test.ts
bun test src/services/__tests__/account-close.test.ts
```

Expected: All PASS

**Step 3: Run build**

```bash
bun run build
```

Expected: PASS, no new errors

**Step 4: Manual verification in browser**

1. Navigate to `/accounts` — should show all accounts (default)
2. Click "Mine" toggle — URL changes to `?view=mine`, info banner appears, only owned accounts shown
3. Click "All" toggle or banner link — returns to full view
4. Verify portfolio totals recalculate for personal view
5. Test with `?view=mine&year=2025&month=12` — historical + personal should work together

---

### Task 8: Add ownership transfer to account edit form (admin only)

**Files:**

- Modify: `src/components/organisms/AccountFormModal.astro`
- Modify: `src/pages/accounts/index.astro` (pass members data)

**Note:** This task requires fetching workspace members and showing an owner dropdown in the edit modal. Only visible to admin users.

**Step 1: Fetch workspace members in the page**

In `src/pages/accounts/index.astro`, add import and data fetching:

```typescript
import { workspaceService } from '@/services';

// Fetch workspace members for admin ownership transfer
const isAdmin = user.role === 'admin';
const workspaceMembers = isAdmin ? await workspaceService.getMembers(user.workspaceId) : [];
```

Pass to AccountFormModal:

```astro
<AccountFormModal
  id="account-form-modal"
  mode="add"
  categories={categories}
  members={isAdmin ? workspaceMembers.map((m) => ({ id: m.id, name: m.name })) : []}
  isAdmin={isAdmin}
/>
```

**Step 2: Add owner dropdown to AccountFormModal**

In `src/components/organisms/AccountFormModal.astro`, add props:

```typescript
members?: Array<{ id: string; name: string }>;
isAdmin?: boolean;
```

In the form body, after the existing fields (when in edit mode and isAdmin), add:

```astro
{
  isAdmin && members && members.length > 1 && (
    <div class="form-control w-full">
      <label class="label" for="account-owner">
        <span class="label-text font-medium">Owner</span>
      </label>
      <select
        id="account-owner"
        name="ownerId"
        class="select select-bordered w-full rounded-xl"
        data-account-owner-select
      >
        {members.map((member) => (
          <option value={member.id}>{member.name}</option>
        ))}
      </select>
    </div>
  )
}
```

**Step 3: Wire up client-side owner transfer**

In the AccountFormModal's client script, when saving in edit mode, check if owner changed and call the transfer-owner API:

```typescript
// After successful account update, check if owner changed
const ownerSelect = form.querySelector('[data-account-owner-select]') as HTMLSelectElement | null;
if (ownerSelect && ownerSelect.value !== originalOwnerId) {
  await fetch(`/api/accounts/${accountId}/transfer-owner`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner_user_id: ownerSelect.value }),
  });
}
```

**Step 4: Run typecheck and build**

Run: `bun run typecheck && bun run build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/accounts/index.astro src/components/organisms/AccountFormModal.astro
git commit -m "feat(accounts): add admin-only ownership transfer in edit form"
```
