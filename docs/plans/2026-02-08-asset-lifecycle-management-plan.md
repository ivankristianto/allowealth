# Asset Lifecycle Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace soft-delete with banking-strict account closure model — zero-balance requirement, currency immutability, audit trail, and admin-only reopen.

**Architecture:** Add `status`/`closed_at`/`closed_by_user_id` columns to assets table. Migrate all `deleted_at IS NULL` checks to `status = 'active'`. New service methods `close()` and `reopen()` enforce business rules. New API routes `/api/assets/:id/close` and `/api/assets/:id/reopen`. UI replaces "Delete" with "Close Account" and adds `/assets/closed` page.

**Tech Stack:** Astro 5, Drizzle ORM (SQLite + PostgreSQL), bun:test, DaisyUI v5, TypeScript strict mode

**Design doc:** `docs/plans/2026-02-08-asset-lifecycle-management-design.md`

---

## Task 1: Add Error Codes to ServiceErrorCode Enum

**Files:**

- Modify: `src/services/service-errors.ts:33-38`

**Step 1: Add new error codes**

After the existing asset error codes (line 38), add:

```typescript
  BALANCE_NOT_ZERO = 'BALANCE_NOT_ZERO',
  ACCOUNT_CLOSED = 'ACCOUNT_CLOSED',
  ALREADY_CLOSED = 'ALREADY_CLOSED',
  NOT_CLOSED = 'NOT_CLOSED',
  CURRENCY_LOCKED = 'CURRENCY_LOCKED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (additive change only)

**Step 3: Commit**

```bash
git add src/services/service-errors.ts
git commit -m "feat(assets): add lifecycle error codes to ServiceErrorCode enum"
```

---

## Task 2: Update Asset Type Definitions

**Files:**

- Modify: `src/lib/types/asset.ts:30-46`

**Step 1: Add AssetStatus type and update Asset interface**

Add before the `Asset` interface (around line 27):

```typescript
/** Asset lifecycle status */
export const ASSET_STATUSES = ['active', 'closed'] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];
```

Add to the `Asset` interface (after `is_cash_account`, before `last_updated`):

```typescript
status: AssetStatus;
closed_at: Date | null;
closed_by_user_id: string | null;
```

**Step 2: Update AssetOutput interface**

Add the same three fields to `AssetOutput` (after `is_cash_account`):

```typescript
  status?: AssetStatus;
  closed_at?: Date | null;
  closed_by_user_id?: string | null;
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: Type errors in test mocks and anywhere `Asset` is constructed without the new fields. Note these — they'll be fixed in Task 3.

**Step 4: Commit**

```bash
git add src/lib/types/asset.ts
git commit -m "feat(assets): add status, closed_at, closed_by_user_id to Asset types"
```

---

## Task 3: Update Database Schemas (Both Dialects)

**Files:**

- Modify: `src/db/schema/sqlite/assets.ts:7-44`
- Modify: `src/db/schema/postgresql/assets.ts:6-46`

**Step 1: Update SQLite schema**

Add three columns after `is_cash_account` (line 37), before `last_updated` (line 38):

```typescript
  status: text('status', { enum: ['active', 'closed'] }).notNull().default('active'),
  closed_at: integer('closed_at', { mode: 'timestamp' }),
  closed_by_user_id: text('closed_by_user_id').references(() => users.id),
```

**Step 2: Update PostgreSQL schema**

Add three columns after `is_cash_account` (line 39), before `last_updated` (line 40):

```typescript
  status: text('status', { enum: ['active', 'closed'] }).notNull().default('active'),
  closed_at: timestamp('closed_at'),
  closed_by_user_id: text('closed_by_user_id').references(() => users.id),
```

**Step 3: Generate migrations for both dialects**

Run: `bun run db:generate`
Expected: New migration file in `drizzle/sqlite/`

Run: `bun run db:generate:prod`
Expected: New migration file in `drizzle/postgresql/`

**Step 4: Apply SQLite migration locally**

Run: `bun run db:migrate`
Expected: Migration applied

**Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: May still have errors from mock factories — that's Task 4.

**Step 6: Commit**

```bash
git add src/db/schema/sqlite/assets.ts src/db/schema/postgresql/assets.ts drizzle/
git commit -m "feat(assets): add status, closed_at, closed_by_user_id schema columns (dual dialect)"
```

---

## Task 4: Update Test Mocks and Helpers

**Files:**

- Modify: `src/services/test-helpers/mocks.ts:166-184`

**Step 1: Update createMockAsset**

Add the three new fields to the default mock asset (after `is_cash_account`, before `last_updated`):

```typescript
  status: 'active' as const,
  closed_at: null,
  closed_by_user_id: null,
```

**Step 2: Run tests**

Run: `bun test`
Expected: All existing tests still pass.

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/services/test-helpers/mocks.ts
git commit -m "fix(tests): add lifecycle fields to createMockAsset helper"
```

---

## Task 5: Write Tests for AssetService.close()

**Files:**

- Create: `src/services/__tests__/asset-close.test.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AssetService } from '../asset.service';
import { createMockDatabase, createMockAsset, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';
import { ServiceErrorCode } from '../service-errors';

describe('AssetService.close()', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let assetService: AssetService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    assetService = new AssetService(mockDb);
  });

  it('should close account with zero balance', async () => {
    const asset = createMockAsset({
      id: 'asset-1',
      balance: '0',
      status: 'active',
      workspace_id: 'workspace-1',
    });

    // findById lookup
    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(asset).mockResolvedValueOnce({
      ...asset,
      status: 'closed',
      closed_at: new Date(),
      closed_by_user_id: 'user-1',
    });

    // update mock
    (mockDb.update as any).mockReturnValue({
      set: mock(() => ({
        where: mock(() => Promise.resolve()),
      })),
    });

    const result = await assetService.close('asset-1', 'workspace-1', 'user-1');

    expect(result?.status).toBe('closed');
    expect(result?.closed_by_user_id).toBe('user-1');
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('should throw BALANCE_NOT_ZERO when balance is not zero', async () => {
    const asset = createMockAsset({
      id: 'asset-1',
      balance: '1000',
      status: 'active',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(asset);

    try {
      await assetService.close('asset-1', 'workspace-1', 'user-1');
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.BALANCE_NOT_ZERO);
      expect(error.statusCode).toBe(400);
    }
  });

  it('should throw ALREADY_CLOSED when account is already closed', async () => {
    const asset = createMockAsset({
      id: 'asset-1',
      balance: '0',
      status: 'closed',
      closed_at: new Date(),
      closed_by_user_id: 'user-1',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(asset);

    try {
      await assetService.close('asset-1', 'workspace-1', 'user-1');
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.ALREADY_CLOSED);
    }
  });

  it('should throw ASSET_NOT_FOUND when asset does not exist', async () => {
    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(undefined);

    try {
      await assetService.close('nonexistent', 'workspace-1', 'user-1');
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.ASSET_NOT_FOUND);
    }
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/services/__tests__/asset-close.test.ts`
Expected: FAIL — `close` method does not exist on AssetService

**Step 3: Commit**

```bash
git add src/services/__tests__/asset-close.test.ts
git commit -m "test(assets): add failing tests for AssetService.close()"
```

---

## Task 6: Implement AssetService.close()

**Files:**

- Modify: `src/services/asset.service.ts`

**Step 1: Implement close() method**

Add after the `delete()` method (after line 343):

```typescript
  /**
   * Close an asset account (requires zero balance)
   */
  async close(id: string, workspaceId: string, closedByUserId: string) {
    const asset = await this.findById(id, workspaceId);

    if (!asset) {
      throw new AssetServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
    }

    if (asset.status === 'closed') {
      throw new AssetServiceError(ServiceErrorCode.ALREADY_CLOSED, 'Account already closed', 400);
    }

    if (decimalCompare(asset.balance, '0') !== 0) {
      throw new AssetServiceError(
        ServiceErrorCode.BALANCE_NOT_ZERO,
        `Cannot close account with balance ${asset.balance} ${asset.currency}. Transfer funds out first.`,
        400
      );
    }

    const now = new Date();
    await this.db
      .update(this.schema.assets)
      .set({
        status: 'closed',
        closed_at: now,
        closed_by_user_id: closedByUserId,
        updated_at: now,
      })
      .where(and(eq(this.schema.assets.id, id), eq(this.schema.assets.workspace_id, workspaceId)));

    return this.findById(id, workspaceId);
  }
```

**Important:** `findById` currently filters by `deleted_at IS NULL`. It needs to also find closed accounts. Since `close()` calls `findById()` before closure and after closure to return the updated asset, `findById()` must be able to find assets with `status = 'closed'`. We'll update the query filter logic in Task 9 (query migration). For now, `findById` still uses `deleted_at IS NULL` which will work because we're not setting `deleted_at` during closure.

**Step 2: Run the tests**

Run: `bun test src/services/__tests__/asset-close.test.ts`
Expected: PASS

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/services/asset.service.ts
git commit -m "feat(assets): implement AssetService.close() with zero-balance enforcement"
```

---

## Task 7: Write Tests for AssetService.reopen()

**Files:**

- Create: `src/services/__tests__/asset-reopen.test.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AssetService } from '../asset.service';
import { createMockDatabase, createMockAsset, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';
import { ServiceErrorCode } from '../service-errors';

describe('AssetService.reopen()', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let assetService: AssetService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    assetService = new AssetService(mockDb);
  });

  it('should reopen a closed account', async () => {
    const closedAsset = createMockAsset({
      id: 'asset-1',
      balance: '0',
      status: 'closed',
      closed_at: new Date('2026-01-15'),
      closed_by_user_id: 'user-1',
      workspace_id: 'workspace-1',
    });

    const reopenedAsset = {
      ...closedAsset,
      status: 'active' as const,
      closed_at: null,
      closed_by_user_id: null,
    };

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(closedAsset)
      .mockResolvedValueOnce(reopenedAsset);

    (mockDb.update as any).mockReturnValue({
      set: mock(() => ({
        where: mock(() => Promise.resolve()),
      })),
    });

    const result = await assetService.reopen('asset-1', 'workspace-1');

    expect(result?.status).toBe('active');
    expect(result?.closed_at).toBeNull();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('should throw NOT_CLOSED when reopening active account', async () => {
    const activeAsset = createMockAsset({
      id: 'asset-1',
      status: 'active',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(activeAsset);

    try {
      await assetService.reopen('asset-1', 'workspace-1');
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.NOT_CLOSED);
    }
  });

  it('should throw ASSET_NOT_FOUND when asset does not exist', async () => {
    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(undefined);

    try {
      await assetService.reopen('nonexistent', 'workspace-1');
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.ASSET_NOT_FOUND);
    }
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/services/__tests__/asset-reopen.test.ts`
Expected: FAIL — `reopen` method does not exist

**Step 3: Commit**

```bash
git add src/services/__tests__/asset-reopen.test.ts
git commit -m "test(assets): add failing tests for AssetService.reopen()"
```

---

## Task 8: Implement AssetService.reopen()

**Files:**

- Modify: `src/services/asset.service.ts`

**Step 1: Implement reopen() method**

Add after `close()`:

```typescript
  /**
   * Reopen a closed asset account
   *
   * Note: Permission check (admin-only) is handled at the API route level
   * using getAuthenticatedUser().role, not in the service layer.
   */
  async reopen(id: string, workspaceId: string) {
    const asset = await this.findByIdIncludingClosed(id, workspaceId);

    if (!asset) {
      throw new AssetServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
    }

    if (asset.status !== 'closed') {
      throw new AssetServiceError(ServiceErrorCode.NOT_CLOSED, 'Account is not closed', 400);
    }

    const now = new Date();
    await this.db
      .update(this.schema.assets)
      .set({
        status: 'active',
        closed_at: null,
        closed_by_user_id: null,
        updated_at: now,
      })
      .where(and(eq(this.schema.assets.id, id), eq(this.schema.assets.workspace_id, workspaceId)));

    return this.findById(id, workspaceId);
  }
```

**Step 2: Add findByIdIncludingClosed() helper**

Add a private method that finds an asset regardless of status (but still excludes hard-deleted):

```typescript
  /**
   * Find asset by ID including closed assets (but not hard-deleted)
   */
  private async findByIdIncludingClosed(id: string, workspaceId: string) {
    return this.db.query.assets.findFirst({
      where: and(
        eq(this.schema.assets.id, id),
        eq(this.schema.assets.workspace_id, workspaceId),
        sql`${this.schema.assets.deleted_at} IS NULL`
      ),
    });
  }
```

**Note:** `findById` currently filters on `deleted_at IS NULL`. Since closed assets don't have `deleted_at` set, this helper works the same as `findById` for now. When we migrate queries in Task 9, `findById` will filter on `status = 'active'`, and `findByIdIncludingClosed` will not filter on status.

**Step 3: Run the tests**

Run: `bun test src/services/__tests__/asset-reopen.test.ts`
Expected: PASS

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/asset.service.ts
git commit -m "feat(assets): implement AssetService.reopen() with findByIdIncludingClosed helper"
```

---

## Task 9: Write Tests for Currency Lock Validation

**Files:**

- Create: `src/services/__tests__/asset-currency-lock.test.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AssetService } from '../asset.service';
import { createMockDatabase, createMockAsset, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';
import { ServiceErrorCode } from '../service-errors';

describe('AssetService.update() - currency lock', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let assetService: AssetService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    assetService = new AssetService(mockDb);
  });

  it('should throw CURRENCY_LOCKED when changing currency with history', async () => {
    const asset = createMockAsset({
      id: 'asset-1',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    // findById returns asset
    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(asset);

    // select().from().where() returns history count > 0
    (mockDb.select as any).mockReturnValue({
      from: mock(() => ({
        where: mock(() => Promise.resolve([{ count: 5 }])),
      })),
    });

    try {
      await assetService.update('asset-1', 'workspace-1', { currency: 'USD' });
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.CURRENCY_LOCKED);
      expect(error.statusCode).toBe(400);
    }
  });

  it('should allow currency change when no history exists', async () => {
    const asset = createMockAsset({
      id: 'asset-1',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    const updatedAsset = { ...asset, currency: 'USD' as const };

    // findById returns asset (for currency check), then updated asset
    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(asset)
      .mockResolvedValueOnce(updatedAsset);

    // select().from().where() returns history count = 0
    (mockDb.select as any).mockReturnValue({
      from: mock(() => ({
        where: mock(() => Promise.resolve([{ count: 0 }])),
      })),
    });

    // update mock
    (mockDb.update as any).mockReturnValue({
      set: mock(() => ({
        where: mock(() => Promise.resolve()),
      })),
    });

    const result = await assetService.update('asset-1', 'workspace-1', { currency: 'USD' });

    expect(result?.currency).toBe('USD');
  });

  it('should allow update when currency is not changed', async () => {
    const asset = createMockAsset({
      id: 'asset-1',
      name: 'Old Name',
      currency: 'IDR',
      workspace_id: 'workspace-1',
    });

    const updatedAsset = { ...asset, name: 'New Name' };

    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(updatedAsset);

    (mockDb.update as any).mockReturnValue({
      set: mock(() => ({
        where: mock(() => Promise.resolve()),
      })),
    });

    const result = await assetService.update('asset-1', 'workspace-1', { name: 'New Name' });

    expect(result?.name).toBe('New Name');
    // select should NOT be called — no currency change, no history check needed
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/services/__tests__/asset-currency-lock.test.ts`
Expected: FAIL — currency lock validation not implemented

**Step 3: Commit**

```bash
git add src/services/__tests__/asset-currency-lock.test.ts
git commit -m "test(assets): add failing tests for currency lock validation"
```

---

## Task 10: Implement Currency Lock in AssetService.update()

**Files:**

- Modify: `src/services/asset.service.ts:157-179` (update method)

**Step 1: Add currency lock validation**

At the start of the `update()` method, before building `updateData`, add currency lock check:

```typescript
  async update(id: string, workspaceId: string, input: UpdateAssetInput) {
    // Currency lock: prevent changing currency if history exists
    if (input.currency !== undefined) {
      const currentAsset = await this.findById(id, workspaceId);
      if (currentAsset && input.currency !== currentAsset.currency) {
        const historyCount = await (this.db as any)
          .select({ count: sql<number>`count(*)` })
          .from(this.schema.assetHistory)
          .where(eq(this.schema.assetHistory.asset_id, id));

        if (historyCount[0]?.count > 0) {
          throw new AssetServiceError(
            ServiceErrorCode.CURRENCY_LOCKED,
            'Cannot change currency — account has transaction history',
            400
          );
        }
      }
    }

    // ... rest of existing update logic unchanged
```

**Step 2: Run the tests**

Run: `bun test src/services/__tests__/asset-currency-lock.test.ts`
Expected: PASS

Run: `bun test src/services/__tests__/asset-transfer.test.ts`
Expected: PASS (no regression)

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/services/asset.service.ts
git commit -m "feat(assets): enforce currency immutability when history exists"
```

---

## Task 11: Write Tests for Closed Account Protection

**Files:**

- Create: `src/services/__tests__/asset-closed-protection.test.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AssetService } from '../asset.service';
import { createMockDatabase, createMockAsset, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';
import { ServiceErrorCode } from '../service-errors';

describe('AssetService - closed account protection', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let assetService: AssetService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    assetService = new AssetService(mockDb);
  });

  it('should throw ACCOUNT_CLOSED when updating balance of closed account', async () => {
    const closedAsset = createMockAsset({
      id: 'asset-1',
      status: 'closed',
      closed_at: new Date(),
      closed_by_user_id: 'user-1',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(closedAsset);

    try {
      await assetService.updateBalance('asset-1', 'workspace-1', { balance: '500' });
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.ACCOUNT_CLOSED);
    }
  });

  it('should throw ACCOUNT_CLOSED when transferring from closed account', async () => {
    const closedAsset = createMockAsset({
      id: 'asset-1',
      balance: '0',
      status: 'closed',
      closed_at: new Date(),
      closed_by_user_id: 'user-1',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    const activeAsset = createMockAsset({
      id: 'asset-2',
      balance: '1000',
      status: 'active',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(closedAsset)
      .mockResolvedValueOnce(activeAsset);

    try {
      await assetService.transfer('asset-1', 'asset-2', '100', undefined, 'workspace-1');
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.ACCOUNT_CLOSED);
    }
  });

  it('should throw ACCOUNT_CLOSED when transferring to closed account', async () => {
    const activeAsset = createMockAsset({
      id: 'asset-1',
      balance: '1000',
      status: 'active',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    const closedAsset = createMockAsset({
      id: 'asset-2',
      balance: '0',
      status: 'closed',
      closed_at: new Date(),
      closed_by_user_id: 'user-1',
      currency: 'USD',
      workspace_id: 'workspace-1',
    });

    (mockDb.query.assets.findFirst as any)
      .mockResolvedValueOnce(activeAsset)
      .mockResolvedValueOnce(closedAsset);

    try {
      await assetService.transfer('asset-1', 'asset-2', '100', undefined, 'workspace-1');
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(ServiceErrorCode.ACCOUNT_CLOSED);
    }
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/services/__tests__/asset-closed-protection.test.ts`
Expected: FAIL — no ACCOUNT_CLOSED guard in updateBalance or transfer

**Step 3: Commit**

```bash
git add src/services/__tests__/asset-closed-protection.test.ts
git commit -m "test(assets): add failing tests for closed account protection"
```

---

## Task 12: Implement Closed Account Guards

**Files:**

- Modify: `src/services/asset.service.ts`

**Step 1: Guard updateBalance()**

In `updateBalance()`, right after the `ASSET_NOT_FOUND` check (after line 195), add:

```typescript
if (currentAsset.status === 'closed') {
  throw new AssetServiceError(
    ServiceErrorCode.ACCOUNT_CLOSED,
    'Cannot update balance — account is closed',
    400
  );
}
```

**Step 2: Guard transfer()**

In `transfer()`, after both assets are fetched and validated to exist (after line 267), add:

```typescript
if (fromAsset.status === 'closed' || toAsset.status === 'closed') {
  throw new AssetServiceError(
    ServiceErrorCode.ACCOUNT_CLOSED,
    'Cannot transfer — one or both accounts are closed',
    400
  );
}
```

**Step 3: Run the tests**

Run: `bun test src/services/__tests__/asset-closed-protection.test.ts`
Expected: PASS

Run: `bun test src/services/__tests__/asset-transfer.test.ts`
Expected: PASS (existing tests use `status: 'active'` from mock defaults)

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/asset.service.ts
git commit -m "feat(assets): block balance updates and transfers on closed accounts"
```

---

## Task 13: Migrate Query Filters from deleted_at to status

**Files:**

- Modify: `src/services/asset.service.ts`

**Step 1: Update findById to use status filter**

Replace `sql\`${this.schema.assets.deleted_at} IS NULL\``with`eq(this.schema.assets.status, 'active')` in:

- `findById()` (line 108)
- `findAll()` (line 129)
- `getTotalByCurrency()` (line 430)
- `getTotalByType()` (line 455)
- `countByCategory()` (line 503)

**Step 2: Update findByIdIncludingClosed**

Keep `findByIdIncludingClosed` using `deleted_at IS NULL` (it intentionally finds both active and closed).

**Step 3: Add includeInactive parameter to findAll**

Update `findAll()` signature:

```typescript
  async findAll(
    workspaceId: string,
    filters?: {
      type?: AssetType;
      category_id?: string;
      currency?: Currency;
      includeInactive?: boolean;
    },
    perf?: PerfCollector
  ) {
    const conditions = [
      eq(this.schema.assets.workspace_id, workspaceId),
    ];

    // By default, only show active assets
    if (!filters?.includeInactive) {
      conditions.push(eq(this.schema.assets.status, 'active'));
    } else {
      // Even with includeInactive, exclude hard-deleted
      conditions.push(sql`${this.schema.assets.deleted_at} IS NULL`);
    }
    // ... rest of filter logic unchanged
```

**Step 4: Add findAllClosed() method**

```typescript
  /**
   * Find all closed assets for a workspace
   */
  async findAllClosed(
    workspaceId: string,
    filters?: {
      type?: AssetType;
      currency?: Currency;
    },
    perf?: PerfCollector
  ) {
    const conditions = [
      eq(this.schema.assets.workspace_id, workspaceId),
      eq(this.schema.assets.status, 'closed'),
      sql`${this.schema.assets.deleted_at} IS NULL`,
    ];

    if (filters?.type) {
      conditions.push(eq(this.schema.assets.type, filters.type));
    }
    if (filters?.currency) {
      conditions.push(eq(this.schema.assets.currency, filters.currency));
    }

    return trackQuery('AssetService.findAllClosed', perf, async () => {
      return this.db.query.assets.findMany({
        where: and(...conditions),
        orderBy: (_assets: any, { desc }: any) => [desc(this.schema.assets.closed_at)],
      });
    });
  }
```

**Step 5: Update getSnapshotForMonth for historical accuracy**

In `getSnapshotForMonth()`, use `includeInactive: true` so closed accounts appear in historical reports:

```typescript
const allAssets = await this.findAll(workspaceId, { ...filters, includeInactive: true });
```

**Step 6: Update delete() to also set status**

In the `delete()` method, also set `status: 'closed'` for backwards compatibility:

```typescript
  async delete(id: string, workspaceId: string) {
    const asset = await this.findById(id, workspaceId);
    if (!asset) {
      throw new AssetServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
    }

    // Balance check for backwards compatibility with close semantics
    if (decimalCompare(asset.balance, '0') !== 0) {
      throw new AssetServiceError(
        ServiceErrorCode.BALANCE_NOT_ZERO,
        `Cannot close account with balance ${asset.balance} ${asset.currency}. Transfer funds out first.`,
        400
      );
    }

    await this.db
      .update(this.schema.assets)
      .set({
        status: 'closed',
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where(and(eq(this.schema.assets.id, id), eq(this.schema.assets.workspace_id, workspaceId)));

    return { success: true };
  }
```

**Step 7: Run all tests**

Run: `bun test`
Expected: PASS

**Step 8: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 9: Commit**

```bash
git add src/services/asset.service.ts
git commit -m "refactor(assets): migrate query filters from deleted_at to status-based"
```

---

## Task 14: Create Close Account API Endpoint

**Files:**

- Create: `src/pages/api/assets/[id]/close.ts`

**Step 1: Create the endpoint**

```typescript
import type { APIRoute } from 'astro';
import { assetService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { AssetServiceError } from '@/services/service-errors';
import { getCacheManager, CacheTags } from '@/lib/cache';

/**
 * POST /api/assets/:id/close
 * Close an asset account (requires zero balance)
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Asset ID is required', 400);
    }

    const asset = await assetService.close(id, auth.workspaceId, auth.userId);

    // Invalidate cache
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([
        CacheTags.workspace(auth.workspaceId),
        CacheTags.ASSETS,
        CacheTags.LAYOUT,
      ]);
    } catch (cacheError) {
      logError(
        `Failed to invalidate cache after asset close [workspaceId=${auth.workspaceId}, assetId=${id}]`,
        cacheError
      );
    }

    return successResponse({ asset, message: 'Account closed successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof AssetServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error closing asset', error);
    return errorResponse('Failed to close asset', 500);
  }
};
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/pages/api/assets/[id]/close.ts
git commit -m "feat(api): add POST /api/assets/:id/close endpoint"
```

---

## Task 15: Create Reopen Account API Endpoint

**Files:**

- Create: `src/pages/api/assets/[id]/reopen.ts`

**Step 1: Create the endpoint**

```typescript
import type { APIRoute } from 'astro';
import { assetService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { AssetServiceError, ServiceErrorCode } from '@/services/service-errors';
import { getCacheManager, CacheTags } from '@/lib/cache';

/**
 * POST /api/assets/:id/reopen
 * Reopen a closed asset account (admin only)
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Asset ID is required', 400);
    }

    // Admin-only permission check
    if (auth.role !== 'admin') {
      return errorResponse(
        'Only workspace admins can reopen accounts',
        403,
        ServiceErrorCode.INSUFFICIENT_PERMISSIONS
      );
    }

    const asset = await assetService.reopen(id, auth.workspaceId);

    // Invalidate cache
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([
        CacheTags.workspace(auth.workspaceId),
        CacheTags.ASSETS,
        CacheTags.LAYOUT,
      ]);
    } catch (cacheError) {
      logError(
        `Failed to invalidate cache after asset reopen [workspaceId=${auth.workspaceId}, assetId=${id}]`,
        cacheError
      );
    }

    return successResponse({ asset, message: 'Account reopened successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof AssetServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error reopening asset', error);
    return errorResponse('Failed to reopen asset', 500);
  }
};
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/pages/api/assets/[id]/reopen.ts
git commit -m "feat(api): add POST /api/assets/:id/reopen endpoint (admin only)"
```

---

## Task 16: Create Closed Assets API Endpoint

**Files:**

- Create: `src/pages/api/assets/closed.ts`

**Step 1: Create the endpoint**

```typescript
import type { APIRoute } from 'astro';
import { assetService } from '@/services';
import {
  successResponse,
  errorResponse,
  getAuthenticatedUser,
  getQueryParams,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import type { AssetType, Currency } from '@/lib/types/asset';

/**
 * GET /api/assets/closed
 * Get all closed assets for a workspace
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const params = getQueryParams(new URL(context.request.url));

    const filters: { type?: AssetType; currency?: Currency } = {};
    if (params.type) filters.type = params.type as AssetType;
    if (params.currency) filters.currency = params.currency as Currency;

    const assets = await assetService.findAllClosed(auth.workspaceId, filters);

    return successResponse(assets);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching closed assets', error);
    return errorResponse('Failed to fetch closed assets', 500);
  }
};
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/pages/api/assets/closed.ts
git commit -m "feat(api): add GET /api/assets/closed endpoint"
```

---

## Task 17: Update DELETE Endpoint for Backwards Compatibility

**Files:**

- Modify: `src/pages/api/assets/[id].ts:150-188`

**Step 1: Update DELETE handler**

The `delete()` method in the service now enforces zero-balance and sets `status: 'closed'`. Update the API handler to pass through the structured error:

```typescript
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Asset ID is required', 400);
    }

    await assetService.delete(id, auth.workspaceId);

    // Invalidate layout cache since assets changed (best-effort)
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([
        CacheTags.workspace(auth.workspaceId),
        CacheTags.ASSETS,
        CacheTags.LAYOUT,
      ]);
    } catch (cacheError) {
      logError(
        `Failed to invalidate cache after asset delete [workspaceId=${auth.workspaceId}, assetId=${id}]`,
        cacheError
      );
    }

    return successResponse({ message: 'Asset closed successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof AssetServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error deleting asset', error);
    return errorResponse('Failed to delete asset', 500);
  }
};
```

Also add the import for `AssetServiceError` at the top:

```typescript
import { AssetServiceError } from '@/services/service-errors';
```

**Step 2: Update PUT handler for currency lock errors**

In the PUT handler's catch block, add `AssetServiceError` handling:

```typescript
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof AssetServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error updating asset', error);
    return errorResponse('Failed to update asset', 500);
  }
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/pages/api/assets/[id].ts
git commit -m "feat(api): update DELETE endpoint to use close semantics with structured errors"
```

---

## Task 18: Add TransactionService Closed Account Validation

**Files:**

- Modify: `src/services/transaction.service.ts:71-116`

**Step 1: Add closed account checks in create()**

After the existing asset existence check (line 100-101), add status check:

```typescript
// Verify source asset is active
const asset = await this.assetService.findById(validated.asset_id, validated.workspace_id);
if (!asset) {
  throw new TransactionServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
}
if (asset.status === 'closed') {
  throw new TransactionServiceError(
    ServiceErrorCode.ACCOUNT_CLOSED,
    'Cannot create transaction — source account is closed',
    400
  );
}

// For transfers, verify destination asset exists and is active
if (validated.type === 'transfer' && validated.to_asset_id) {
  const toAsset = await this.assetService.findById(validated.to_asset_id, validated.workspace_id);
  if (!toAsset) {
    throw new TransactionServiceError(
      ServiceErrorCode.ASSET_NOT_FOUND,
      'Destination asset not found',
      404
    );
  }
  if (toAsset.status === 'closed') {
    throw new TransactionServiceError(
      ServiceErrorCode.ACCOUNT_CLOSED,
      'Cannot create transfer — destination account is closed',
      400
    );
  }
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Run all tests**

Run: `bun test`
Expected: PASS

**Step 4: Commit**

```bash
git add src/services/transaction.service.ts
git commit -m "feat(transactions): block operations on closed asset accounts"
```

---

## Task 19: Update AssetDeleteConfirmModal → AssetCloseModal

**Files:**

- Modify: `src/components/organisms/AssetDeleteConfirmModal.astro`

**Step 1: Update the modal content**

Replace "Delete Asset" terminology with "Close Account" throughout. Update the confirmation text to reflect closure semantics:

- Title: "Delete Asset" → "Close Account"
- Description: "Are you sure you want to delete this asset?" → "Close this account?"
- Confirm label: "Delete Asset" → "Close Account"
- Confirm loading: "Deleting..." → "Closing..."
- Confirm variant: keep `"error"` (closing is still a significant action)
- Update the warning text: "This action cannot be undone..." → "Once closed: hidden from active accounts, transaction history preserved, can be reopened later by admin."

**Step 2: Update the client-side script**

Change the API call from `DELETE /api/assets/${id}` to `POST /api/assets/${id}/close`.

Update the event names:

- `open-asset-delete` → `open-asset-close`
- `asset-deleted` → `asset-closed`

Update toast messages:

- "Asset deleted successfully" → "Account closed successfully"
- "Failed to delete asset" → "Failed to close account"

**Step 3: Add balance check UI**

Before the confirm button click handler, add a check: if the asset's balance is not zero, show an error message in the modal instead of making the API call. The API will enforce this too, but showing it client-side is better UX.

Update `populateModal()` to also store the balance, and in the confirm handler:

```typescript
if (currentAssetBalance !== 0) {
  showConfirmError(
    errorElement,
    `Cannot close account with balance of ${formatCurrency(currentAssetBalance, currentAssetCurrency)}. Transfer funds out first.`
  );
  return;
}
```

**Step 4: Update test and story files**

Update `AssetDeleteConfirmModal.test.ts` and `AssetDeleteConfirmModal.stories.ts` to reflect new terminology.

**Step 5: Run typecheck and lint**

Run: `bun run typecheck && bun run lint`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/organisms/AssetDeleteConfirmModal.astro
git add src/components/organisms/AssetDeleteConfirmModal.test.ts
git add src/components/organisms/AssetDeleteConfirmModal.stories.ts
git commit -m "feat(ui): convert delete asset modal to close account modal"
```

---

## Task 20: Update Assets Page to Use Close Account

**Files:**

- Modify: `src/pages/assets/index.astro`
- Modify: `src/components/molecules/AssetItemRow.astro` (or wherever the delete button lives)

**Step 1: Replace "Delete" button with "Close Account"**

Find all references to "delete" in the assets page UI and replace with "Close Account" terminology. The button should dispatch `open-asset-close` custom event instead of `open-asset-delete`.

**Step 2: Add "View Closed Accounts" link**

Add a navigation link at the bottom or top of the assets list:

```astro
---
const closedCount = (await assetService.findAllClosed(workspaceId)).length;
---

{
  closedCount > 0 && (
    <a href="/assets/closed" class="link link-accent text-sm flex items-center gap-1">
      View Closed Accounts
      <span class="badge badge-sm badge-ghost">{closedCount}</span>
    </a>
  )
}
```

**Step 3: Update event handler references**

Update any `open-asset-delete` references to `open-asset-close` in the page's client scripts or organism components.

**Step 4: Run build and typecheck**

Run: `bun run build && bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/assets/index.astro src/components/molecules/AssetItemRow.astro
git commit -m "feat(ui): replace delete with close account on assets page"
```

---

## Task 21: Create Closed Assets Page

**Files:**

- Create: `src/pages/assets/closed.astro`

**Step 1: Create the page**

Follow the pattern of `/assets/index.astro`. The page should:

- Fetch closed assets via `assetService.findAllClosed()`
- Display each in a card/row with greyed-out styling (`opacity-60`)
- Show metadata: name, type, balance (should be 0), currency, closed date, closed by
- "Reopen Account" button visible only when `user.role === 'admin'`
- Link back to `/assets` ("← Back to Active Accounts")
- Empty state: "No closed accounts" with a message and link to active accounts

Use DaisyUI classes, Lucide icons, semantic HTML. Mobile-first responsive design.

**Step 2: Create reopen confirmation modal**

Create `src/components/organisms/AssetReopenModal.astro` using the same `ConfirmationModal` pattern as the close modal:

- Title: "Reopen Account?"
- Description: "This will restore the account to your active accounts list."
- Show closure metadata: closed date, closed by user
- Confirm label: "Reopen Account"
- API call: `POST /api/assets/${id}/reopen`
- Success toast: "Account reopened successfully"
- On success: reload page

**Step 3: Run build and typecheck**

Run: `bun run build && bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/pages/assets/closed.astro src/components/organisms/AssetReopenModal.astro
git commit -m "feat(ui): add closed assets page with admin reopen functionality"
```

---

## Task 22: Update Asset Dropdowns to Exclude Closed Accounts

**Files:**

- Search for all asset dropdown/select components in the codebase

**Step 1: Identify all asset selectors**

Search: `grep -r "assets.*select\|asset.*dropdown\|asset.*option" src/components/ src/pages/`

Common locations:

- Transaction form (expense modal, income modal, transfer modal)
- Asset transfer modal
- Any reporting filters

**Step 2: Verify they use findAll()**

Since `findAll()` now defaults to `status = 'active'`, any component using `findAll()` will automatically exclude closed accounts. Verify this is the case.

**Step 3: Update any direct queries**

If any component queries assets directly instead of through the service, update it to filter by `status = 'active'`.

**Step 4: Run build**

Run: `bun run build`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "fix(ui): verify asset dropdowns exclude closed accounts"
```

---

## Task 23: Update Seed Data

**Files:**

- Modify: `src/db/seed.ts`

**Step 1: Add status field to seeded assets**

In the `seedAssets()` function, add `status: 'active'` to all asset insert values. This is technically not needed since the column defaults to `'active'`, but being explicit is clearer.

**Step 2: Add a closed account to seed data (optional, for testing)**

Add one closed account for testing the closed accounts page:

```typescript
// Closed account for testing
{
  id: nanoid(),
  workspace_id: workspaceId,
  created_by_user_id: userId,
  name: 'Old Savings (Closed)',
  type: 'bank_account',
  category_id: assetCategoryMap.get('Bank Account'),
  balance: '0',
  initial_balance: '0',
  currency: 'IDR',
  status: 'closed',
  closed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  closed_by_user_id: userId,
  is_cash_account: false,
  created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
}
```

**Step 3: Reset and reseed**

Run: `bun run db:reset`
Expected: Database recreated with new seed data

**Step 4: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat(seed): add status field and closed account to seed data"
```

---

## Task 24: Update OpenAPI Documentation

**Files:**

- Modify: `openapi/paths/assets.yml`
- Modify: `openapi/schemas/` (add/update response schemas)
- Modify: `openapi.yml` (add new path refs)

**Step 1: Add close endpoint**

Add to `openapi/paths/assets.yml`:

```yaml
/api/assets/{id}/close:
  post:
    summary: Close an asset account
    description: Closes an asset account. Requires zero balance.
    tags: [Assets]
    parameters:
      - $ref: '../parameters/common.yml#/components/parameters/id'
    responses:
      '200':
        description: Account closed successfully
      '400':
        description: Balance not zero or already closed
      '401':
        description: Unauthorized
      '404':
        description: Asset not found
```

**Step 2: Add reopen endpoint**

```yaml
/api/assets/{id}/reopen:
  post:
    summary: Reopen a closed asset account
    description: Reopens a previously closed account. Admin only.
    tags: [Assets]
    parameters:
      - $ref: '../parameters/common.yml#/components/parameters/id'
    responses:
      '200':
        description: Account reopened successfully
      '400':
        description: Account is not closed
      '401':
        description: Unauthorized
      '403':
        description: Insufficient permissions
      '404':
        description: Asset not found
```

**Step 3: Add closed endpoint**

```yaml
/api/assets/closed:
  get:
    summary: List closed assets
    tags: [Assets]
    parameters:
      - name: currency
        in: query
        schema:
          type: string
          enum: [IDR, USD]
      - name: type
        in: query
        schema:
          type: string
    responses:
      '200':
        description: List of closed assets
```

**Step 4: Update asset schema**

Add `status`, `closed_at`, `closed_by_user_id` fields to the asset response schema.

**Step 5: Update main openapi.yml**

Add `$ref` entries for the new paths.

**Step 6: Commit**

```bash
git add openapi/
git commit -m "docs(openapi): add close, reopen, and closed assets endpoints"
```

---

## Task 25: Run Full Quality Gates

**Step 1: Run all quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun test
bun run build
```

Expected: All PASS

**Step 2: Fix any issues found**

Address lint, typecheck, or test failures.

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: fix quality gate issues from asset lifecycle implementation"
```

---

## Summary

| Task  | Component          | Type          |
| ----- | ------------------ | ------------- |
| 1     | Error codes        | Service       |
| 2     | Type definitions   | Types         |
| 3     | Database schemas   | Schema        |
| 4     | Test mocks         | Tests         |
| 5-6   | close()            | Service (TDD) |
| 7-8   | reopen()           | Service (TDD) |
| 9-10  | Currency lock      | Service (TDD) |
| 11-12 | Closed guards      | Service (TDD) |
| 13    | Query migration    | Service       |
| 14-16 | New API endpoints  | API           |
| 17    | Backwards compat   | API           |
| 18    | Transaction guard  | Service       |
| 19-21 | UI changes         | UI            |
| 22    | Dropdown filtering | UI            |
| 23    | Seed data          | Seeder        |
| 24    | OpenAPI docs       | Docs          |
| 25    | Quality gates      | QA            |
