# Custom Asset Categories Feature Plan

**Version:** 1.0.0
**Created:** 2026-01-30
**Status:** Draft
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
│   └── api/
│       └── asset-categories/
│           ├── index.ts                 # NEW - GET/POST list & create
│           └── [id].ts                  # NEW - GET/PUT/DELETE single
├── components/
│   ├── molecules/
│   │   └── AssetForm.astro              # MODIFY - Dynamic categories
│   └── organisms/
│       ├── AssetFormModal.astro         # MODIFY - Enable custom category
│       └── AssetCategoryModal.astro     # NEW - Create/edit category modal
├── lib/
│   └── types/
│       └── asset.ts                     # MODIFY - Add AssetCategory interface
└── pages/
    └── settings/
        └── asset-categories.astro       # NEW - Category management page
```

**Total: 7 new files, 4 modified files**

---

## 4. Database Schema

### New Table: `asset_categories`

```sql
CREATE TABLE asset_categories (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- Internal identifier (e.g., 'real_estate')
  display_label TEXT NOT NULL,           -- User-facing label (e.g., 'Real Estate')
  icon TEXT DEFAULT 'wallet' NOT NULL,   -- Lucide icon name
  color TEXT DEFAULT 'bg-neutral' NOT NULL,
  is_liability INTEGER DEFAULT 0 NOT NULL,  -- 0 = asset, 1 = liability
  is_system INTEGER DEFAULT 0 NOT NULL,     -- 1 = predefined, 0 = user-created
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
  updated_at INTEGER DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);

CREATE UNIQUE INDEX asset_categories_user_name_unique ON asset_categories(user_id, name);
CREATE INDEX asset_categories_user_id_idx ON asset_categories(user_id);
```

### Modified Table: `assets`

```sql
-- Change from enum to foreign key
ALTER TABLE assets ADD COLUMN category_id TEXT REFERENCES asset_categories(id);
-- Keep `type` column for backward compatibility during migration
```

---

## 5. Security Considerations

| Concern                        | Mitigation                                                            | Status  |
| ------------------------------ | --------------------------------------------------------------------- | ------- |
| **Authorization**              | All category CRUD operations verify `user_id` matches session user    | Pending |
| **Input validation**           | Validate name (alphanumeric, max 50 chars), label (max 100 chars)     | Pending |
| **SQL injection**              | Use parameterized queries via Drizzle ORM                             | Pending |
| **XSS**                        | Sanitize display_label before rendering                               | Pending |
| **Duplicate names**            | Unique constraint on (user_id, name)                                  | Pending |
| **System category protection** | Prevent deletion/modification of `is_system=1` categories             | Pending |
| **Orphan assets**              | Prevent deletion of category if assets exist (or reassign to 'other') | Pending |
| **Rate limiting**              | Limit category creation (max 50 custom categories per user)           | Pending |

---

## 6. Key Architectural Decisions

| Decision                              | Rationale                                                    |
| ------------------------------------- | ------------------------------------------------------------ |
| **Separate `asset_categories` table** | Matches existing `categories` table pattern for transactions |
| **Keep `type` column temporarily**    | Backward compatibility during migration                      |
| **System vs custom categories**       | Predefined categories are `is_system=1`, can't be deleted    |
| **Per-user categories**               | Each user has their own category set (no sharing)            |
| **Icon from Lucide set**              | Consistent with rest of application                          |
| **Foreign key reference**             | Assets reference category by ID, not name string             |

---

## 7. API Endpoints

### `GET /api/asset-categories`

Returns all categories for the authenticated user (system + custom).

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "cat_abc123",
      "name": "bank_account",
      "displayLabel": "Bank Account",
      "icon": "building-2",
      "color": "bg-primary",
      "isLiability": false,
      "isSystem": true,
      "sortOrder": 1
    },
    {
      "id": "cat_xyz789",
      "name": "real_estate",
      "displayLabel": "Real Estate",
      "icon": "home",
      "color": "bg-accent",
      "isLiability": false,
      "isSystem": false,
      "sortOrder": 100
    }
  ]
}
```

### `POST /api/asset-categories`

Create a new custom category.

**Request:**

```json
{
  "name": "real_estate",
  "displayLabel": "Real Estate",
  "icon": "home",
  "color": "bg-accent",
  "isLiability": false
}
```

**Validation:**

- `name`: required, alphanumeric + underscore, 1-50 chars, unique per user
- `displayLabel`: required, 1-100 chars
- `icon`: optional, must be valid Lucide icon name
- `color`: optional, must be valid DaisyUI color class
- `isLiability`: optional boolean, default false

### `PUT /api/asset-categories/[id]`

Update a custom category (system categories are read-only).

### `DELETE /api/asset-categories/[id]`

Delete a custom category (only if no assets use it, or reassign to 'other').

---

## 8. Implementation Tasks (Ordered)

| #   | Task                                                | Dependencies | Complexity | Status  |
| --- | --------------------------------------------------- | ------------ | ---------- | ------- |
| 1   | Create database schema for `asset_categories`       | None         | Low        | Pending |
| 2   | Create migration to add schema                      | Task 1       | Low        | Pending |
| 3   | Create `AssetCategoryService`                       | Task 1       | Medium     | Pending |
| 4   | Create seed script for default categories           | Task 1, 3    | Low        | Pending |
| 5   | Create `GET /api/asset-categories` endpoint         | Task 3       | Low        | Pending |
| 6   | Create `POST /api/asset-categories` endpoint        | Task 3       | Medium     | Pending |
| 7   | Create `PUT /api/asset-categories/[id]` endpoint    | Task 3       | Medium     | Pending |
| 8   | Create `DELETE /api/asset-categories/[id]` endpoint | Task 3       | Medium     | Pending |
| 9   | Update `AssetType` types to support custom          | Task 1       | Low        | Pending |
| 10  | Modify `AssetForm.astro` to fetch categories        | Task 5       | Medium     | Pending |
| 11  | Enable "Create New Category" in `AssetFormModal`    | Task 6       | Medium     | Pending |
| 12  | Create `AssetCategoryModal.astro`                   | Task 6       | Medium     | Pending |
| 13  | Create `/settings/asset-categories` management page | Task 5-8, 12 | High       | Pending |
| 14  | Create migration for existing assets                | Task 1-4     | Medium     | Pending |
| 15  | Update OpenAPI documentation                        | Task 5-8     | Low        | Pending |
| 16  | Write unit tests for service                        | Task 3       | Medium     | Pending |
| 17  | Write API integration tests                         | Task 5-8     | Medium     | Pending |

---

## 9. User Stories

### Category Management

| ID    | Story                              | Given                                | When                      | Then                                           |
| ----- | ---------------------------------- | ------------------------------------ | ------------------------- | ---------------------------------------------- |
| US-01 | View asset categories              | I am on /settings/asset-categories   | Page loads                | I see list of all categories (system + custom) |
| US-02 | Create custom category             | I click "Add Category"               | I fill form and submit    | New category appears in list                   |
| US-03 | Edit custom category               | I click edit on custom category      | I modify and save         | Changes are reflected                          |
| US-04 | Delete custom category             | I click delete on custom category    | I confirm deletion        | Category is removed                            |
| US-05 | Cannot delete system category      | I view a system category             | Delete button is disabled | I see "System category" indicator              |
| US-06 | Cannot delete category with assets | I try to delete category with assets | I click delete            | I see error "Category has X assets"            |

### Asset Form Integration

| ID    | Story                  | Given                         | When                        | Then                                          |
| ----- | ---------------------- | ----------------------------- | --------------------------- | --------------------------------------------- |
| US-07 | Select custom category | I am adding new asset         | I open category dropdown    | I see custom categories alongside system ones |
| US-08 | Create category inline | I click "Create New Category" | I fill mini-form            | Category is created and selected              |
| US-09 | Filter by category     | I am on /assets               | I filter by custom category | Only assets with that category shown          |

### Migration

| ID    | Story                    | Given                       | When      | Then                                 |
| ----- | ------------------------ | --------------------------- | --------- | ------------------------------------ |
| US-10 | Existing assets migrated | I had assets before feature | I upgrade | Assets retain their category mapping |

---

## 10. Migration Strategy

### Phase 1: Add New System (Non-breaking)

1. Create `asset_categories` table
2. Seed default categories for all existing users
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

## 11. Quality Gates (Pre-merge)

- [ ] `bun run lint:fix` passes
- [ ] `bun run stylelint:fix` passes
- [ ] `bun run format:fix` passes
- [ ] `bun run typecheck` passes
- [ ] Unit tests for `AssetCategoryService` pass
- [ ] API integration tests pass
- [ ] All user stories manually verified
- [ ] OpenAPI documentation updated
- [ ] Migration tested on copy of production data

---

## 12. Out of Scope

The following are explicitly NOT included in this plan:

- Shared/family categories (each user has independent categories)
- Category icons beyond Lucide set
- Category nesting/hierarchy
- Import/export of category configurations
- Category-based budgeting for assets

---

## 13. Open Questions

1. **Default sort order:** Should custom categories appear after system categories, or alphabetically mixed?
2. **Category reassignment:** When deleting a category with assets, should we force reassignment or block deletion?
3. **Icon picker:** Should we show all Lucide icons or a curated subset?

---

## 14. Reference

**Existing Pattern:** Transaction categories system

- `src/db/schema/*/categories.ts` - Similar schema structure
- `src/services/category.service.ts` - Similar service pattern
- `src/pages/categories/index.astro` - Similar management UI

**Design System:** Follow `design-system/START.md` guidelines
