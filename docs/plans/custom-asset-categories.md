# Custom Asset Categories Feature Plan

**Version:** 1.1.0
**Created:** 2026-01-30
**Updated:** 2026-01-30
**Status:** In Progress
**Priority:** P3

## Overview

Enable users to create custom asset categories beyond the current hardcoded 10 types (cash, bank_account, e_wallet, mutual_fund, bond, crypto, stock, other, credit_card, loan). This allows users to organize assets according to their personal financial structure.

---

## 1. Current State Analysis

### Existing Asset Types (Hardcoded)

| Type           | Label        | Category  |
| -------------- | ------------ | --------- |
| `cash`         | Cash         | Asset     |
| `bank_account` | Bank Account | Asset     |
| `e_wallet`     | E-Wallet     | Asset     |
| `mutual_fund`  | Mutual Fund  | Asset     |
| `bond`         | Bond         | Asset     |
| `crypto`       | Crypto       | Asset     |
| `stock`        | Stock        | Asset     |
| `other`        | Other        | Asset     |
| `credit_card`  | Credit Card  | Liability |
| `loan`         | Loan         | Liability |

### Current Implementation Files

- `src/lib/types/asset.ts` - `AssetType` union type
- `src/db/schema/*/assets.ts` - Database schema with enum constraint
- `src/pages/api/assets/index.ts` - API validation with `z.enum()`
- `src/components/molecules/AssetForm.astro` - Hardcoded dropdown options
- `src/components/organisms/AssetFormModal.astro` - Hidden "Create New Category" button

---

## 2. Dependencies

**Existing (no new packages required):**

- `drizzle-orm` - Database ORM
- `zod` - Validation
- `nanoid` - ID generation
- `@lucide/astro` - Icons

**No new dependencies needed** - follows existing patterns from transaction categories system.

---

## Execution Plan (Agent)

**Order:** UI → Service → API → CLI → Seeder (per constitution)

1. **UI scaffolding (in progress):** Add `/assets/categories` page, category modal, and wire header + asset form to category selection using mock data.
2. **Data model:** Add `asset_categories` schema + migrations, update types.
3. **Service layer:** Implement `AssetCategoryService` with validation + tests.
4. **API layer:** CRUD endpoints + OpenAPI updates.
5. **CLI + Seeder:** Seed defaults and add script.
6. **Asset integration:** Migrate assets to `category_id`, update filters/grouping, deprecate type usage.

---

## 3. File Structure

```
src/
├── db/
│   └── schema/
│       ├── postgresql/
│       │   └── asset-categories.ts      # NEW - PostgreSQL schema
│       └── sqlite/
│           └── asset-categories.ts      # NEW - SQLite schema
├── services/
│   └── asset-category.service.ts        # NEW - Service layer
├── pages/
│   ├── api/
│   │   └── asset-categories/
│   │       ├── index.ts                 # NEW - GET/POST list & create
│   │       └── [id].ts                  # NEW - GET/PUT/DELETE single
│   └── assets/
│       └── categories/
│           └── index.astro              # NEW - Category management page
├── components/
│   ├── molecules/
│   │   └── AssetForm.astro              # MODIFY - Dynamic categories
│   └── organisms/
│       ├── AssetPageHeader.astro        # MODIFY - Add "Manage Categories" button
│       ├── AssetFormModal.astro         # MODIFY - Enable custom category
│       └── AssetCategoryModal.astro     # NEW - Create/edit category modal
├── lib/
│   └── types/
│       └── asset.ts                     # MODIFY - Add AssetCategory interface
└── scripts/
    └── seed-asset-categories.ts         # NEW - Seeder for default categories
```

**Total: 8 new files, 5 modified files**

---

## 4. Database Schema

### New Table: `asset_categories`

```sql
CREATE TABLE asset_categories (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                       -- User-facing category name (e.g., 'Real Estate')
  description TEXT,                         -- Optional description
  is_liability INTEGER DEFAULT 0 NOT NULL,  -- 0 = asset, 1 = liability
  is_system INTEGER DEFAULT 0 NOT NULL,     -- 1 = predefined, 0 = user-created
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  updated_at INTEGER DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);

CREATE UNIQUE INDEX asset_categories_user_name_unique ON asset_categories(user_id, name);
CREATE INDEX asset_categories_user_id_idx ON asset_categories(user_id);
```

**Note:** No `icon` or `color` fields - categories are simple name-based labels.

### Modified Table: `assets`

```sql
-- Change from enum to foreign key
ALTER TABLE assets ADD COLUMN category_id TEXT REFERENCES asset_categories(id);
-- Keep `type` column for backward compatibility during migration
```

---

## 5. Navigation

### Route: `/assets/categories`

The asset categories management page lives under the assets section, not settings.

### From `/assets` page

Add a secondary button in `AssetPageHeader.astro`:

```astro
<!-- Manage Categories Button -->
<a
  href="/assets/categories"
  class="btn btn-ghost btn-sm gap-2 rounded-xl"
  aria-label="Manage asset categories"
>
  <Settings size={16} />
  Categories
</a>
```

### From `/assets/categories` page

Add a back button at the top:

```astro
<!-- Back to Assets -->
<a href="/assets" class="btn btn-ghost btn-sm gap-2 rounded-xl mb-4">
  <ArrowLeft size={16} />
  Back to Assets
</a>
```

---

## 6. Security Considerations

| Concern                        | Mitigation                                                                | Status    |
| ------------------------------ | ------------------------------------------------------------------------- | --------- |
| **Authorization**              | All category CRUD operations verify `user_id` matches session user        | Completed |
| **Input validation**           | Validate name (max 100 chars), description (max 500 chars)                | Completed |
| **SQL injection**              | Use parameterized queries via Drizzle ORM                                 | Completed |
| **XSS**                        | Astro escapes content by default; avoid `set:html` for user-provided text | Completed |
| **Duplicate names**            | Unique constraint on (user_id, name)                                      | Completed |
| **System category protection** | Prevent deletion/modification of `is_system=1` categories                 | Completed |
| **Orphan assets**              | Block deletion if category has assets (show reassignment message)         | Completed |
| **Rate limiting**              | Limit category creation (max 50 custom categories per user)               | Completed |

---

## 7. Key Architectural Decisions

| Decision                              | Rationale                                                     |
| ------------------------------------- | ------------------------------------------------------------- |
| **Separate `asset_categories` table** | Matches existing `categories` table pattern for transactions  |
| **Keep `type` column temporarily**    | Backward compatibility during migration                       |
| **System vs custom categories**       | Predefined categories are `is_system=1`, can't be deleted     |
| **Per-user categories**               | Each user has their own category set (no sharing)             |
| **No icon/color fields**              | Keep it simple - categories are just names with optional desc |
| **Foreign key reference**             | Assets reference category by ID, not name string              |
| **Route under /assets/**              | Categories are asset-specific, not general settings           |
| **Block deletion with assets**        | Prevent orphan assets - user must reassign before deleting    |

---

## 8. API Endpoints

### `GET /api/asset-categories`

Returns all categories for the authenticated user (system + custom).

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "cat_abc123",
      "name": "Bank Account",
      "description": "Checking and savings accounts",
      "isLiability": false,
      "isSystem": true,
      "sortOrder": 1,
      "assetCount": 3
    },
    {
      "id": "cat_xyz789",
      "name": "Real Estate",
      "description": "Property investments",
      "isLiability": false,
      "isSystem": false,
      "sortOrder": 100,
      "assetCount": 1
    }
  ]
}
```

### `POST /api/asset-categories`

Create a new custom category.

**Request:**

```json
{
  "name": "Real Estate",
  "description": "Property investments",
  "isLiability": false
}
```

**Validation:**

- `name`: required, 1-100 chars, unique per user
- `description`: optional, max 500 chars
- `isLiability`: required boolean (user must choose asset or liability)

### `PUT /api/asset-categories/[id]`

Update a custom category (system categories are read-only).

### `DELETE /api/asset-categories/[id]`

Delete a custom category.

**Behavior:** Returns error if category has assets:

```json
{
  "success": false,
  "error": "Cannot delete category with 3 assets. Reassign assets first."
}
```

---

## 9. Implementation Tasks (Ordered)

| #   | Task                                                | Dependencies | Complexity | Status    |
| --- | --------------------------------------------------- | ------------ | ---------- | --------- |
| 1   | Create database schema for `asset_categories`       | None         | Low        | Completed |
| 2   | Create migration to add schema                      | Task 1       | Low        | Completed |
| 3   | Create `AssetCategoryService`                       | Task 1       | Medium     | Completed |
| 4   | Create seeder script for default categories         | Task 1, 3    | Low        | Completed |
| 5   | Create `GET /api/asset-categories` endpoint         | Task 3       | Low        | Completed |
| 6   | Create `POST /api/asset-categories` endpoint        | Task 3       | Medium     | Completed |
| 7   | Create `PUT /api/asset-categories/[id]` endpoint    | Task 3       | Medium     | Completed |
| 8   | Create `DELETE /api/asset-categories/[id]` endpoint | Task 3       | Medium     | Completed |
| 9   | Update `AssetType` types to support custom          | Task 1       | Low        | Completed |
| 10  | Modify `AssetPageHeader.astro` - add Categories btn | Task 5       | Low        | Completed |
| 11  | Modify `AssetForm.astro` to fetch categories        | Task 5       | Medium     | Completed |
| 12  | Enable "Create New Category" in `AssetFormModal`    | Task 6       | Medium     | Completed |
| 13  | Create `AssetCategoryModal.astro`                   | Task 6       | Medium     | Completed |
| 14  | Create `/assets/categories` management page         | Task 5-8, 13 | High       | Completed |
| 15  | Create migration for existing assets                | Task 1-4     | Medium     | Completed |
| 16  | Update OpenAPI documentation                        | Task 5-8     | Low        | Completed |
| 17  | Write unit tests for service                        | Task 3       | Medium     | Completed |
| 18  | Write API integration tests                         | Task 5-8     | Medium     | Pending   |

---

## Progress Log

- **2026-01-30:** UI scaffolding completed for tasks 10–14 (using mock categories pending API wiring).
- **2026-01-30:** Added asset_categories schema (sqlite + postgres) and SQLite migration.
- **2026-01-30:** Implemented AssetCategoryService + validation and unit tests.
- **2026-01-30:** Added asset category API endpoints and OpenAPI documentation.
- **2026-01-30:** Integrated asset category seeding into main database seeder.
- **2026-01-30:** Wired default asset category seeding into user registration.
- **2026-01-30:** Added asset category_id column, backfill logic, and updated assets UI/service to use categories.
- **2026-01-30:** Updated assets API + OpenAPI schemas to accept categoryId while preserving legacy type support.
- **2026-01-30:** Removed standalone asset category seeder script and kept all seeding in `src/db/seed.ts`.
- **2026-01-30:** Backfilled legacy type handling on asset create/update and added Postgres unique index for asset category names.
- **2026-01-30:** Resolved typecheck warnings in asset category client scripts and auth onboarding.
- **2026-01-30:** Moved theme toggle and notification dropdown scripts to `.client.ts` modules for typed handlers.

---

## 10. User Stories

### Category Management

| ID    | Story                              | Given                         | When                      | Then                                           |
| ----- | ---------------------------------- | ----------------------------- | ------------------------- | ---------------------------------------------- |
| US-01 | View asset categories              | I am on /assets/categories    | Page loads                | I see list of all categories (system + custom) |
| US-02 | Navigate to categories             | I am on /assets               | I click "Categories" btn  | I navigate to /assets/categories               |
| US-03 | Navigate back to assets            | I am on /assets/categories    | I click back button       | I navigate to /assets                          |
| US-04 | Create custom category             | I click "Add Category"        | I fill form and submit    | New category appears in list                   |
| US-05 | Edit custom category               | I click edit on custom cat    | I modify and save         | Changes are reflected                          |
| US-06 | Delete custom category             | I click delete on custom cat  | I confirm deletion        | Category is removed                            |
| US-07 | Cannot delete system category      | I view a system category      | Delete button is disabled | I see "System category" indicator              |
| US-08 | Cannot delete category with assets | I try to delete cat w/ assets | I click delete            | I see error "Reassign X assets first"          |

### Asset Form Integration

| ID    | Story                  | Given                         | When                        | Then                                          |
| ----- | ---------------------- | ----------------------------- | --------------------------- | --------------------------------------------- |
| US-09 | Select custom category | I am adding new asset         | I open category dropdown    | I see custom categories alongside system ones |
| US-10 | Create category inline | I click "Create New Category" | I fill mini-form            | Category is created and selected              |
| US-11 | Filter by category     | I am on /assets               | I filter by custom category | Only assets with that category shown          |

### Migration

| ID    | Story                    | Given                       | When      | Then                                 |
| ----- | ------------------------ | --------------------------- | --------- | ------------------------------------ |
| US-12 | Existing assets migrated | I had assets before feature | I upgrade | Assets retain their category mapping |

---

## 11. Seeder Plan

### Purpose

Seed default asset categories for all users (existing and new).

### Default Categories to Seed

| Name         | Description                         | is_liability | sort_order |
| ------------ | ----------------------------------- | ------------ | ---------- |
| Cash         | Physical cash holdings              | false        | 1          |
| Bank Account | Checking and savings accounts       | false        | 2          |
| E-Wallet     | Digital wallets (GoPay, OVO, etc.)  | false        | 3          |
| Mutual Fund  | Investment fund holdings            | false        | 4          |
| Bond         | Government and corporate bonds      | false        | 5          |
| Crypto       | Cryptocurrency holdings             | false        | 6          |
| Stock        | Stock market investments            | false        | 7          |
| Other        | Miscellaneous assets                | false        | 8          |
| Credit Card  | Credit card balances (what you owe) | true         | 9          |
| Loan         | Personal loans and mortgages        | true         | 10         |

### Seeder Implementation

**File:** `src/db/seed.ts` (integrated into main seeder)

```typescript
// Pseudo-code structure
async function seedAssetCategories(userId) {
  for (const defaultCategory of DEFAULT_CATEGORIES) {
    await createAssetCategory({
      userId,
      ...defaultCategory,
      isSystem: true,
    });
  }
}
```

### When to Run

1. **Migration:** Run `bun run db:seed` after deploying schema changes
2. **New user signup:** Create default categories in user creation flow
3. **Manual:** Re-run `bun run db:seed` to fix missing categories

---

## 12. Migration Strategy

### Phase 1: Add New System (Non-breaking)

1. Create `asset_categories` table
2. Run seeder to create default categories for all existing users
3. Add `category_id` column to `assets` (nullable initially)
4. Populate `category_id` based on existing `type` values
5. Deploy and verify

### Phase 2: Switch to New System

1. Make `category_id` required
2. Update all forms to use category dropdown
3. Mark `type` column as deprecated

### Phase 3: Cleanup (Future)

1. Remove `type` column from `assets` table
2. Remove `AssetType` union type
3. Update all references

---

## 13. Quality Gates (Pre-merge)

- [ ] `bun run lint:fix` passes
- [ ] `bun run stylelint:fix` passes
- [ ] `bun run format:fix` passes
- [ ] `bun run typecheck` passes
- [ ] Unit tests for `AssetCategoryService` pass
- [ ] API integration tests pass
- [ ] All user stories manually verified
- [ ] OpenAPI documentation updated
- [ ] Migration tested on copy of production data
- [ ] Seeder tested with existing users

---

## 14. Out of Scope

The following are explicitly NOT included in this plan:

- Shared/family categories (each user has independent categories)
- Category icons or colors (simple name-based labels only)
- Category nesting/hierarchy
- Import/export of category configurations
- Category-based budgeting for assets

---

## 15. Open Questions

1. **Default sort order:** Should custom categories appear after system categories, or alphabetically mixed?
   - **Resolved:** System categories first (by sort_order), then custom categories alphabetically

2. ~~**Category reassignment:** When deleting a category with assets, should we force reassignment or block deletion?~~
   - **Resolved:** Block deletion - user must reassign assets first

3. ~~**Icon picker:** Should we show all Lucide icons or a curated subset?~~
   - **Resolved:** No icons for asset categories - keep it simple

---

## 16. Reference

**Existing Pattern:** Transaction categories system

- `src/db/schema/*/categories.ts` - Similar schema structure
- `src/services/category.service.ts` - Similar service pattern
- `src/pages/budget/categories/index.astro` - Similar management UI

**Navigation Pattern:** Budget section

- `/budget` has link to `/budget/categories`
- `/budget/categories` has back link to `/budget`

**Design System:** Follow `design-system/START.md` guidelines
