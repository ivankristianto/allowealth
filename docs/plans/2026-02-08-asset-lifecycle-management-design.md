# Asset Lifecycle Management Design

**Date:** 2026-02-08
**Status:** Approved
**Approach:** Banking-strict with account closure and reopening

---

## Problem Statement

Current asset deletion and modification create data integrity issues:

1. **Deletion breaks history** - Deleting an asset orphans transaction records and asset history entries that reference it
2. **Currency changes corrupt data** - Changing asset currency (IDR → USD) invalidates historical balances and makes financial reports meaningless
3. **No audit trail** - Soft delete with `deleted_at` provides minimal context about who closed the account and why
4. **Unclear UX** - Users don't understand what happens to their transaction history when they "delete" an account

**Requirements:**

- ✅ Data integrity - No orphaned transactions or broken references
- ✅ Audit trail - Complete historical records for financial reporting
- ✅ Clear UX - Users understand account closure vs deletion

---

## Industry Standards Research

### Banking & Finance Apps

**Examples:** Real banks, Mint, Personal Capital, YNAB

**Approach:**

- No deletion, only "Close Account"
- Zero balance requirement before closing
- Closed accounts archived but visible in historical reports
- Immutable transaction history

### Accounting Software

**Examples:** QuickBooks, Xero, FreshBooks

**Approach:**

- "Make Inactive" instead of delete
- Accounts with transactions cannot be deleted
- Currency locked once transactions exist (GAAP/IFRS compliance)
- Inactive accounts appear in date-range reports

### Common Pattern

| Concern                   | Industry Standard                                      |
| ------------------------- | ------------------------------------------------------ |
| **Deletion with history** | ❌ Never delete. Use "Closed/Inactive/Archived" status |
| **Balance requirement**   | ✅ Required to be 0, or warn if not                    |
| **Currency changes**      | 🔒 Locked once any transaction/history exists          |
| **Historical display**    | ✅ Show original account name + archived indicator     |
| **Reports**               | ✅ Include archived accounts in date-range reports     |

**Critical Rule:** Once an account has ANY transaction or balance history, the currency MUST be immutable to maintain accounting integrity.

---

## Chosen Approach: Banking-Strict

**Core principles:**

1. **Require balance = 0** before closing account
2. **"Close Account"** terminology (not delete)
3. **Immutable currency** once history exists
4. **Never truly delete** from database
5. **Allow reopening** by workspace owner/admin
6. **Dedicated screen** for viewing closed accounts

---

## Database Schema Changes

### Status Model

Add explicit status field instead of relying on `deleted_at`:

```typescript
// Asset status enum
export const assetStatus = ['active', 'closed'] as const;
export type AssetStatus = (typeof assetStatus)[number];
```

### Schema Additions

**Add to `assets` table:**

```typescript
status: text('status', { enum: ['active', 'closed'] })
  .notNull()
  .default('active'),
closed_at: integer('closed_at', { mode: 'timestamp' }),
closed_by_user_id: text('closed_by_user_id').references(() => users.id),
```

**Field purposes:**

- `status` - Explicit state (clearer than null checking)
- `closed_at` - Audit timestamp
- `closed_by_user_id` - Audit trail for who closed it

### Migration Strategy

**Dual dialect migration required:**

```sql
-- SQLite Migration
ALTER TABLE assets ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE assets ADD COLUMN closed_at INTEGER;
ALTER TABLE assets ADD COLUMN closed_by_user_id TEXT REFERENCES users(id);

-- Backfill from deleted_at
UPDATE assets
SET status = 'closed',
    closed_at = deleted_at
WHERE deleted_at IS NOT NULL;

-- Keep deleted_at for backwards compatibility (deprecate in future release)
```

**PostgreSQL migration** - Same logic, use `TIMESTAMP` instead of `INTEGER` for dates.

**Migration commands:**

```bash
bun run db:generate          # SQLite
bun run db:generate:prod     # PostgreSQL
bun run db:migrate           # Apply locally
bun run db:migrate:prod      # Apply to production
```

---

## Business Logic Changes

### AssetService Methods

#### 1. Close Account

```typescript
async close(id: string, workspaceId: string, closedByUserId: string) {
  const asset = await this.findById(id, workspaceId);

  if (!asset) {
    throw new AssetServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
  }

  if (asset.status === 'closed') {
    throw new AssetServiceError(ServiceErrorCode.ALREADY_CLOSED, 'Account already closed', 400);
  }

  // CRITICAL: Balance must be exactly 0
  if (decimalCompare(asset.balance, '0') !== 0) {
    throw new AssetServiceError(
      ServiceErrorCode.BALANCE_NOT_ZERO,
      `Cannot close account with balance ${asset.balance} ${asset.currency}. Transfer funds out first.`,
      400
    );
  }

  await this.db.update(this.schema.assets).set({
    status: 'closed',
    closed_at: new Date(),
    closed_by_user_id: closedByUserId,
    updated_at: new Date(),
  }).where(eq(this.schema.assets.id, id));

  return this.findById(id, workspaceId);
}
```

#### 2. Reopen Account (Admin Only)

```typescript
async reopen(id: string, workspaceId: string, reopenedByUserId: string) {
  const asset = await this.findById(id, workspaceId);

  if (!asset) {
    throw new AssetServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
  }

  if (asset.status !== 'closed') {
    throw new AssetServiceError(ServiceErrorCode.NOT_CLOSED, 'Account is not closed', 400);
  }

  // Permission check: Only workspace owner or admin
  await this.verifyAdminPermission(reopenedByUserId, workspaceId);

  await this.db.update(this.schema.assets).set({
    status: 'active',
    closed_at: null,
    closed_by_user_id: null,
    updated_at: new Date(),
  }).where(eq(this.schema.assets.id, id));

  return this.findById(id, workspaceId);
}
```

#### 3. Currency Lock Validation

Add to `AssetService.update()`:

```typescript
// Block currency changes if any history exists
if (input.currency !== undefined && input.currency !== currentAsset.currency) {
  const historyCount = await this.db
    .select({ count: sql<number>`count(*)` })
    .from(this.schema.assetHistory)
    .where(eq(this.schema.assetHistory.asset_id, id));

  if (historyCount[0].count > 0) {
    throw new AssetServiceError(
      ServiceErrorCode.CURRENCY_LOCKED,
      'Cannot change currency - account has transaction history',
      400
    );
  }
}
```

#### 4. Block Operations on Closed Accounts

**Update these methods:**

```typescript
// AssetService.updateBalance()
if (asset.status === 'closed') {
  throw new AssetServiceError(
    ServiceErrorCode.ACCOUNT_CLOSED,
    'Cannot update balance - account is closed',
    400
  );
}

// AssetService.transfer()
if (fromAsset.status === 'closed' || toAsset.status === 'closed') {
  throw new AssetServiceError(
    ServiceErrorCode.ACCOUNT_CLOSED,
    'Cannot transfer - one or both accounts are closed',
    400
  );
}
```

### TransactionService Validation

Add validation to `create()` method:

```typescript
// Validate source asset is active
const sourceAsset = await assetService.findById(input.asset_id, input.workspace_id);
if (sourceAsset?.status === 'closed') {
  throw new TransactionServiceError(
    ServiceErrorCode.ACCOUNT_CLOSED,
    'Cannot create transaction - source account is closed',
    400
  );
}

// For transfers, validate destination is also active
if (input.type === 'transfer' && input.to_asset_id) {
  const destAsset = await assetService.findById(input.to_asset_id, input.workspace_id);
  if (destAsset?.status === 'closed') {
    throw new TransactionServiceError(
      ServiceErrorCode.ACCOUNT_CLOSED,
      'Cannot create transfer - destination account is closed',
      400
    );
  }
}
```

### Query Filtering Changes

**Update all asset queries to filter by status:**

```typescript
// BEFORE
where: sql`${this.schema.assets.deleted_at} IS NULL`;

// AFTER
where: eq(this.schema.assets.status, 'active');
```

**Affected methods:**

- `AssetService.findAll()` - Add optional `includeInactive?: boolean` parameter
- `AssetService.getTotalByCurrency()` - Filter active only
- `AssetService.getTotalByType()` - Filter active only
- Dashboard aggregations - Filter active only
- Asset dropdowns in transaction forms - Filter active only

**Historical reports exception:**

```typescript
async getSnapshotForMonth(workspaceId: string, year: number, month: number) {
  // IMPORTANT: Include ALL assets (active + closed) for historical accuracy
  const allAssets = await this.findAll(workspaceId, { includeInactive: true });

  // Filter by existence at snapshot date, not by current status
  const assetsExistingAtTime = allAssets.filter(
    (asset) => new Date(asset.created_at) <= endOfMonth
  );
  // ...
}
```

---

## API Changes

### New Endpoints

```typescript
// Close an account
POST /api/assets/:id/close
Request: { user_id: string }
Response: { asset: AssetRow, message: "Account closed successfully" }
Errors:
  400 BALANCE_NOT_ZERO - Balance must be 0
  400 ALREADY_CLOSED - Account already closed
  404 ASSET_NOT_FOUND - Asset doesn't exist
  403 INSUFFICIENT_PERMISSIONS - Not authorized

// Reopen a closed account (admin only)
POST /api/assets/:id/reopen
Request: { user_id: string }
Response: { asset: AssetRow, message: "Account reopened successfully" }
Errors:
  400 NOT_CLOSED - Account is not closed
  404 ASSET_NOT_FOUND - Asset doesn't exist
  403 INSUFFICIENT_PERMISSIONS - Not admin

// Get closed accounts
GET /api/assets/closed
Query: ?currency=USD&type=bank_account
Response: { assets: AssetRow[] }
```

### Modified Endpoints

```typescript
// Asset list - exclude closed by default
GET /api/assets
Query: ?include_inactive=true (optional, admin only)
Response: { assets: AssetRow[] }

// Update asset - add currency lock validation
PUT /api/assets/:id
Request: { currency?: Currency, ... }
Response: { asset: AssetRow }
Errors: 400 CURRENCY_LOCKED - Cannot change currency with history

// Delete endpoint - backwards compatible
DELETE /api/assets/:id
// Internally calls close() method
// Returns same 400 BALANCE_NOT_ZERO error if balance != 0
```

### New Error Codes

Add to `ServiceErrorCode` enum:

```typescript
export enum ServiceErrorCode {
  // ... existing codes
  BALANCE_NOT_ZERO = 'BALANCE_NOT_ZERO',
  ACCOUNT_CLOSED = 'ACCOUNT_CLOSED',
  ALREADY_CLOSED = 'ALREADY_CLOSED',
  NOT_CLOSED = 'NOT_CLOSED',
  CURRENCY_LOCKED = 'CURRENCY_LOCKED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
}
```

### OpenAPI Documentation Updates

**Files to update:**

- `openapi/paths/assets.yml` - Add `/assets/{id}/close` and `/assets/{id}/reopen` endpoints
- `openapi/schemas/AssetResponse.yml` - Add `status`, `closed_at`, `closed_by_user_id` fields
- `openapi/schemas/ErrorResponse.yml` - Document new error codes

---

## UI Changes

### Page Structure

#### 1. Active Assets Page (`/assets`)

- Display only `status = 'active'` accounts
- Replace "Delete" button with "Close Account"
- Add navigation link: "View Closed Accounts →" (show count badge)

#### 2. Closed Assets Page (`/assets/closed`)

- Display only `status = 'closed'` accounts
- Show metadata: name, balance (should be 0), closed date, closed by user
- Apply greyed-out styling to indicate inactive state
- "Reopen Account" button (visible only to workspace owner/admin)
- Empty state: "No closed accounts"

#### 3. Transaction Forms & Dropdowns

- Asset selection dropdowns exclude closed accounts
- Historical transaction views show closed accounts as "Account Name (Closed)"

### Modals & Dialogs

#### Close Account Modal

**Scenario 1: Balance ≠ 0**

```
⚠️ Cannot Close Account

This account has a balance of $1,234.56 USD.

You must transfer all funds out before closing.

Current Balance: $1,234.56 USD

[Transfer Funds] [Cancel]
```

**Scenario 2: Balance = 0**

```
Close Account?

Account: Savings Account
Current Balance: $0.00 USD ✓

Once closed:
• Hidden from active accounts
• Transaction history preserved
• Can be reopened later by admin

[Close Account] [Cancel]
```

#### Reopen Account Modal

```
Reopen "Savings Account"?

This will restore the account to your active accounts list.
You can start adding transactions again.

Closed on: Feb 1, 2026 by John Doe

[Reopen Account] [Cancel]
```

#### Currency Lock Error Modal

```
❌ Cannot Change Currency

This account has transaction history in USD.
Changing currency would invalidate historical data.

To switch currency:
1. Transfer all funds out (balance = $0)
2. Close this account
3. Create a new account in IDR
4. Transfer funds to the new account

[Got it]
```

### Toast Notifications

```typescript
// After successful close
addToast('Account closed successfully', 'success');

// After successful reopen
addToast('Account reopened successfully', 'success');

// Permission denied (non-admin trying to reopen)
addToast('Only workspace admins can reopen accounts', 'error');
```

### Navigation Structure

**Option A: Tab Navigation**

```
/assets
  ├─ [Active Accounts Tab]    (default)
  └─ [Closed Accounts Tab]
```

**Option B: Separate Route** (Recommended)

```
/assets                  → Active accounts
/assets/closed          → Closed accounts (link in sidebar or bottom of /assets)
```

---

## Testing Strategy

### Unit Tests (`asset.service.test.ts`)

```typescript
describe('AssetService.close()', () => {
  it('should close account with zero balance', async () => {
    // Given: Asset with balance = 0
    // When: close() called
    // Then: status = 'closed', closed_at set, closed_by_user_id set
  });

  it('should throw BALANCE_NOT_ZERO when balance > 0', async () => {
    // Given: Asset with balance = 100
    // When: close() called
    // Then: Throws AssetServiceError with BALANCE_NOT_ZERO
  });

  it('should throw ALREADY_CLOSED when closing closed account', async () => {
    // Given: Asset with status = 'closed'
    // When: close() called again
    // Then: Throws ALREADY_CLOSED
  });
});

describe('AssetService.reopen()', () => {
  it('should reopen closed account for admin', async () => {
    // Given: Closed account, admin user
    // When: reopen() called
    // Then: status = 'active', closed_at = null
  });

  it('should throw INSUFFICIENT_PERMISSIONS for non-admin', async () => {
    // Given: Closed account, non-admin user
    // When: reopen() called
    // Then: Throws INSUFFICIENT_PERMISSIONS
  });

  it('should throw NOT_CLOSED when reopening active account', async () => {
    // Given: Active account
    // When: reopen() called
    // Then: Throws NOT_CLOSED
  });
});

describe('AssetService.update() - currency lock', () => {
  it('should throw CURRENCY_LOCKED when history exists', async () => {
    // Given: Asset with transaction history
    // When: update({ currency: 'USD' }) called
    // Then: Throws CURRENCY_LOCKED
  });

  it('should allow currency change when no history', async () => {
    // Given: Asset with no history
    // When: update({ currency: 'USD' }) called
    // Then: Currency updated successfully
  });
});

describe('AssetService - closed account operations', () => {
  it('should throw ACCOUNT_CLOSED when updating balance', async () => {
    // Given: Closed account
    // When: updateBalance() called
    // Then: Throws ACCOUNT_CLOSED
  });

  it('should throw ACCOUNT_CLOSED when transferring from closed account', async () => {
    // Given: Closed source account
    // When: transfer() called
    // Then: Throws ACCOUNT_CLOSED
  });
});
```

### Integration Tests

```typescript
describe('Transaction + Asset Integration', () => {
  it('should prevent creating transaction on closed account', async () => {
    // Given: Closed account
    // When: POST /api/transactions with closed asset_id
    // Then: 400 ACCOUNT_CLOSED
  });

  it('should prevent transfer to closed account', async () => {
    // Given: Closed destination account
    // When: POST /api/transactions (type: transfer) with closed to_asset_id
    // Then: 400 ACCOUNT_CLOSED
  });

  it('should include closed accounts in historical reports', async () => {
    // Given: Closed account that existed in Jan 2026
    // When: GET /api/reports/monthly?year=2026&month=1
    // Then: Closed account included in snapshot
  });

  it('should exclude closed accounts from active queries', async () => {
    // Given: 5 active + 3 closed accounts
    // When: GET /api/assets
    // Then: Returns 5 accounts only
  });
});
```

### E2E Tests (Playwright)

```typescript
test('close account flow', async ({ page }) => {
  // 1. Navigate to /assets
  // 2. Click "Close Account" on account with $100 balance
  // 3. See error modal "Balance must be 0"
  // 4. Click "Transfer Funds"
  // 5. Transfer $100 to another account
  // 6. Click "Close Account" again
  // 7. Confirm closure in modal
  // 8. See success toast
  // 9. Account disappears from active list
});

test('reopen account flow (admin)', async ({ page }) => {
  // 1. Navigate to /assets/closed
  // 2. See closed account in list
  // 3. Click "Reopen Account"
  // 4. Confirm in modal
  // 5. See success toast
  // 6. Account moves to active list
});

test('currency lock flow', async ({ page }) => {
  // 1. Create account in USD
  // 2. Add a transaction
  // 3. Navigate to Edit Asset
  // 4. Try to change currency to IDR
  // 5. See error modal "Cannot change currency"
  // 6. See instructions to close account and create new one
});
```

---

## Rollout Strategy

### Phase 1: Database Migration (Non-breaking)

```bash
# 1. Deploy schema changes (additive only)
bun run db:migrate          # SQLite (local/dev)
bun run db:migrate:prod     # PostgreSQL (Supabase)

# 2. Verify backfill
SELECT COUNT(*) FROM assets WHERE deleted_at IS NOT NULL AND status != 'closed';
# Expected: 0

# 3. Verify no orphaned records
SELECT COUNT(*) FROM assets WHERE status = 'closed' AND closed_at IS NULL;
# Expected: 0
```

### Phase 2: Code Deployment

**Deploy in order:**

1. Service layer (new methods: `close()`, `reopen()`, currency validation)
2. API endpoints (`/close`, `/reopen`, update DELETE)
3. UI components (modals, pages, buttons)

**Rollback plan:** If issues arise, `deleted_at` column still exists for backwards compatibility. Can revert to old delete logic.

### Phase 3: Monitoring

**Metrics to track:**

- Close account API errors (balance not zero)
- Currency lock errors (users hitting the validation)
- Reopen account usage (how often admins reopen)

**User feedback:**

- Monitor support tickets about account closure confusion
- Track feature adoption via analytics

### Phase 4: Deprecation (Future Release)

After 1-2 stable releases:

1. Remove `deleted_at` column (no longer needed)
2. Remove backwards compatibility code in DELETE endpoint
3. Update documentation to remove references to "delete"

---

## Success Criteria

### Data Integrity

- ✅ No orphaned transactions after account closure
- ✅ Asset history preserved for closed accounts
- ✅ Currency cannot be changed once history exists
- ✅ Zero balance enforced before closure

### Audit Trail

- ✅ `closed_at` timestamp recorded
- ✅ `closed_by_user_id` tracks who closed account
- ✅ Historical reports include closed accounts
- ✅ Transaction history shows "(Closed)" indicator

### User Experience

- ✅ Clear error messages when balance ≠ 0
- ✅ Helpful guidance for currency change workaround
- ✅ Admin-only reopen functionality
- ✅ Dedicated closed accounts page
- ✅ Backwards compatible DELETE endpoint

---

## Open Questions & Future Considerations

### Answered in Design Session

- ✅ Allow reopening? **Yes, admin only**
- ✅ DELETE endpoint? **Keep for backwards compatibility, call close() internally**
- ✅ Closed accounts screen? **Yes, at /assets/closed**

### Future Enhancements

- **Automatic archival:** Auto-close accounts with 0 balance and no activity for 90 days?
- **Bulk operations:** Allow admins to close multiple accounts at once?
- **Close reason field:** Add optional `close_reason` text field for audit purposes?
- **Email notification:** Notify workspace members when account is closed?

---

## References

- Industry standards: Banking apps (YNAB, Mint), Accounting software (QuickBooks, Xero)
- Database migration docs: `docs/architecture/007-database-migrations.md`
- Service error handling: `src/services/service-errors.ts`
- Design system: `design-system/START.md`
