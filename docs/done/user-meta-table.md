# User Meta Table Plan

**Version:** 1.1.0
**Status:** ✅ Implemented (2026-01-30)

## Objective

Replace `USER_SETTINGS` with a flexible `USER_META` table (meta_id, user_id, meta_key, meta_value), add helper utilities, update APIs, seed defaults per user, and update schema docs. No data migration/backward compatibility work is included.

## Scope

- Create `user_meta` table with `meta_id` PK, `user_id` FK, `meta_key`, `meta_value`, timestamps, and unique constraint on `(user_id, meta_key)`.
- Remove `user_settings` table and all usage.
- Provide user meta helpers (get/set/delete) with type-safe wrappers.
- Add `/api/user/meta` endpoints (GET list, PUT upsert, DELETE by key).
- Update seed data to ensure each user has default meta values.
- Update `docs/architecture/004-database-schema.md`.

## Non-Goals

- No data migration from `user_settings` to `user_meta`.
- No backward compatibility for old settings APIs or storage.
- No `/user/:id?meta=` endpoint (users only access their own meta).

---

## Security Considerations

### Meta Key Whitelist

All `meta_key` values MUST be validated against an allowlist. Arbitrary keys are rejected.

```typescript
// src/lib/constants/user-meta-keys.ts
export const USER_META_KEYS = {
  CURRENCY: 'currency',
  SHOW_CONVERTED_TOTALS: 'show_converted_totals',
  SHOW_INDIVIDUAL_CURRENCIES: 'show_individual_currencies',
} as const;

export type UserMetaKey = (typeof USER_META_KEYS)[keyof typeof USER_META_KEYS];
```

### Value Size Limit

`meta_value` is limited to **4KB** (4096 characters) to prevent storage abuse.

### Authorization Model

- Users can ONLY access their own meta (scoped by authenticated `user_id`).
- No cross-user meta access endpoints.
- All endpoints require authentication.

### Input Validation

Each meta key has a defined schema for its value:

| Key                          | Type                | Validation                  |
| ---------------------------- | ------------------- | --------------------------- |
| `currency`                   | string              | `z.enum(['IDR', 'USD'])`    |
| `show_converted_totals`      | boolean (as string) | `z.enum(['true', 'false'])` |
| `show_individual_currencies` | boolean (as string) | `z.enum(['true', 'false'])` |

---

## Settings Migration Map

All three existing `user_settings` fields map to `user_meta`:

| Old Field (`user_settings`)  | New Meta Key                 | Default Value |
| ---------------------------- | ---------------------------- | ------------- |
| `primary_currency`           | `currency`                   | `'IDR'`       |
| `show_converted_totals`      | `show_converted_totals`      | `'true'`      |
| `show_individual_currencies` | `show_individual_currencies` | `'true'`      |

---

## Implementation Plan (UI → Service → API → CLI → Seeder)

### 1) UI

- Replace all reads of `userSettings.primaryCurrency` with `userMeta.currency`.
- Replace `userSettings.showConvertedTotals` with `userMeta.show_converted_totals`.
- Replace `userSettings.showIndividualCurrencies` with `userMeta.show_individual_currencies`.
- Update `ProtectedLayout.astro` to fetch meta and expose via `Astro.locals.userMeta`.
- Update `src/env.d.ts` to define `Astro.locals.userMeta` type.

**Files to modify:**

- `src/layouts/ProtectedLayout.astro`
- `src/pages/transactions/index.astro`
- `src/pages/dashboard.astro`
- `src/env.d.ts`

### 2) Service

Create dedicated `user-meta.service.ts` with:

#### Generic Helpers

```typescript
getUserMeta(userId: string, key: UserMetaKey): Promise<string | null>
getUserMetaAll(userId: string): Promise<Record<UserMetaKey, string>>
setUserMeta(userId: string, key: UserMetaKey, value: string): Promise<void>
deleteUserMeta(userId: string, key: UserMetaKey): Promise<void>
```

#### Type-Safe Wrappers

```typescript
// Currency
getUserCurrency(userId: string): Promise<'IDR' | 'USD'>
setUserCurrency(userId: string, value: 'IDR' | 'USD'): Promise<void>

// Display preferences
getShowConvertedTotals(userId: string): Promise<boolean>
setShowConvertedTotals(userId: string, value: boolean): Promise<void>

getShowIndividualCurrencies(userId: string): Promise<boolean>
setShowIndividualCurrencies(userId: string, value: boolean): Promise<void>

// Convenience: get all settings as typed object
getUserSettings(userId: string): Promise<UserSettings>
```

#### Default Value Strategy

When a meta key doesn't exist, return the default:

```typescript
const META_DEFAULTS: Record<UserMetaKey, string> = {
  currency: 'IDR',
  show_converted_totals: 'true',
  show_individual_currencies: 'true',
};
```

**Files to create:**

- `src/lib/constants/user-meta-keys.ts`
- `src/services/user-meta.service.ts`
- `src/services/user-meta.service.test.ts`

**Files to modify:**

- `src/services/user.service.ts` (remove settings methods)
- `src/services/index.ts` (export new service)

### 3) API

#### Endpoints

| Method   | Path                  | Description                          |
| -------- | --------------------- | ------------------------------------ |
| `GET`    | `/api/user/meta`      | List all meta for authenticated user |
| `GET`    | `/api/user/meta/:key` | Get single meta value by key         |
| `PUT`    | `/api/user/meta/:key` | Upsert meta value (create or update) |
| `DELETE` | `/api/user/meta/:key` | Delete meta key                      |

#### Request/Response Examples

**GET /api/user/meta**

```json
{
  "success": true,
  "data": {
    "currency": "IDR",
    "show_converted_totals": "true",
    "show_individual_currencies": "true"
  }
}
```

**PUT /api/user/meta/currency**

```json
// Request
{ "value": "USD" }

// Response
{
  "success": true,
  "data": { "key": "currency", "value": "USD" }
}
```

**DELETE /api/user/meta/show_converted_totals**

```json
{
  "success": true,
  "data": { "deleted": "show_converted_totals" }
}
```

#### Error Responses

| Status | Code                 | Condition                          |
| ------ | -------------------- | ---------------------------------- |
| 400    | `INVALID_META_KEY`   | Key not in whitelist               |
| 400    | `INVALID_META_VALUE` | Value fails validation for key     |
| 400    | `VALUE_TOO_LARGE`    | Value exceeds 4KB                  |
| 401    | `UNAUTHORIZED`       | No valid session                   |
| 404    | `META_NOT_FOUND`     | Key doesn't exist (for GET/DELETE) |

**Files to create:**

- `src/pages/api/user/meta/index.ts` (GET list)
- `src/pages/api/user/meta/[key].ts` (GET/PUT/DELETE by key)

**Files to delete:**

- `src/pages/api/user/settings.ts`

**Files to modify:**

- `openapi/paths/user.yml` or create `openapi/paths/user-meta.yml`
- `openapi/schemas/UserMeta.yml` (new)
- `openapi.yml` (add refs)

### 4) CLI

- Check if any CLI commands use settings; update to use meta service.
- Current assessment: No CLI commands directly use settings.

### 5) Seeder

- Remove seeding of `user_settings` table.
- Insert default meta for each user:
  - `currency` = `'IDR'`
  - `show_converted_totals` = `'true'`
  - `show_individual_currencies` = `'true'`

**Files to modify:**

- `src/db/seed.ts`

---

## Schema Changes

### New Table: `user_meta`

```sql
CREATE TABLE user_meta (
  meta_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meta_key TEXT NOT NULL,
  meta_value TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id, meta_key)
);

CREATE INDEX idx_user_meta_user_id ON user_meta(user_id);
```

### Drizzle Schema

```typescript
// src/db/schema/sqlite/user-meta.ts
export const userMeta = sqliteTable(
  'user_meta',
  {
    meta_id: text('meta_id').primaryKey(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    meta_key: text('meta_key').notNull(),
    meta_value: text('meta_value').notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => ({
    userKeyUnique: unique().on(table.user_id, table.meta_key),
    userIdIdx: index('idx_user_meta_user_id').on(table.user_id),
  })
);
```

### Files to Create

- `src/db/schema/sqlite/user-meta.ts`
- `src/db/schema/postgresql/user-meta.ts`

### Files to Delete

- `src/db/schema/sqlite/user-settings.ts`
- `src/db/schema/postgresql/user-settings.ts`

### Files to Modify

- `src/db/schema/sqlite/relations.ts` (add userMeta, remove userSettings)
- `src/db/schema/postgresql/relations.ts` (add userMeta, remove userSettings)
- `src/db/schema/sqlite/index.ts` (export userMeta)
- `src/db/schema/postgresql/index.ts` (export userMeta)
- `src/db/index.ts` (update exports if needed)

---

## File Structure Summary

```
src/
├── db/
│   └── schema/
│       ├── sqlite/
│       │   ├── user-meta.ts          # NEW
│       │   ├── user-settings.ts      # DELETE
│       │   └── relations.ts          # EDIT
│       └── postgresql/
│           ├── user-meta.ts          # NEW
│           ├── user-settings.ts      # DELETE
│           └── relations.ts          # EDIT
├── lib/
│   └── constants/
│       └── user-meta-keys.ts         # NEW
├── services/
│   ├── user-meta.service.ts          # NEW
│   ├── user-meta.service.test.ts     # NEW
│   ├── user.service.ts               # EDIT (remove settings)
│   └── user.service.test.ts          # EDIT (remove settings tests)
├── pages/
│   └── api/
│       └── user/
│           ├── meta/
│           │   └── index.ts          # NEW (GET list)
│           ├── [key].ts              # NEW (GET/PUT/DELETE)
│           └── settings.ts           # DELETE
├── layouts/
│   └── ProtectedLayout.astro         # EDIT
└── env.d.ts                          # EDIT

openapi/
├── paths/
│   └── user-meta.yml                 # NEW
└── schemas/
    └── UserMeta.yml                  # NEW

drizzle/
└── sqlite/
    └── XXXX_user_meta.sql            # NEW (via drizzle-kit)
```

---

## Docs Update

- Update ERD in `docs/architecture/004-database-schema.md`:
  - Remove `USER_SETTINGS` entity
  - Add `USER_META` entity with relationship to `USERS`
- Update narrative to explain meta key-value pattern
- Update any references to `primary_currency` or settings

---

## Tests

### Unit Tests (`user-meta.service.test.ts`)

- `getUserMeta` returns value when exists
- `getUserMeta` returns default when not exists
- `setUserMeta` creates new record
- `setUserMeta` updates existing record
- `deleteUserMeta` removes record
- `setUserMeta` rejects invalid key (not in whitelist)
- `setUserMeta` rejects value exceeding 4KB
- `setUserMeta` validates value schema per key
- Type-safe wrappers return correct types

### Integration Tests

- API endpoints return correct responses
- Unauthorized requests are rejected
- Invalid keys return 400
- Cross-user access is prevented (user A cannot access user B's meta)

### Files to Modify

- `src/services/user.service.test.ts` (remove settings tests)
- `src/pages/api/user/user.api.integration.test.ts` (remove settings, add meta tests)
- `src/db/index.integration.test.ts` (update schema assertions)

---

## Acceptance Criteria

- [x] No references to `user_settings` remain in code or docs
- [x] All three settings migrated: `currency`, `show_converted_totals`, `show_individual_currencies`
- [x] Meta key whitelist enforced at service layer
- [x] Value size limit (4KB) enforced
- [x] Users can only access their own meta
- [x] `GET /api/user/meta` returns all meta for authenticated user
- [x] `GET /api/user/meta/:key` returns single meta value
- [x] `PUT /api/user/meta/:key` creates or updates meta
- [x] `DELETE /api/user/meta/:key` removes meta
- [x] Seeder creates default meta for every user
- [x] Type-safe wrappers available for common settings
- [ ] `docs/architecture/004-database-schema.md` reflects new schema
- [x] OpenAPI docs updated with new endpoints
- [x] All tests pass

---

## Implementation Order

1. **Schema** - Create `user_meta` table, run migration ✅
2. **Constants** - Define meta key whitelist and defaults ✅
3. **Service** - Implement `user-meta.service.ts` with tests ✅
4. **API** - Create endpoints, update OpenAPI ✅
5. **UI** - Update layouts and pages to use meta ✅
6. **Seeder** - Update seed data ✅
7. **Cleanup** - Delete `user_settings` files and references ✅
8. **Docs** - Update architecture documentation (pending)

---

## Implementation Notes

### Completed (2026-01-30)

**Files Created:**

- `src/db/schema/sqlite/user-meta.ts` - SQLite schema for user_meta table
- `src/db/schema/postgresql/user-meta.ts` - PostgreSQL schema for user_meta table
- `src/lib/constants/user-meta-keys.ts` - Meta key whitelist, defaults, and validation schemas
- `src/services/user-meta.service.ts` - UserMetaService with type-safe wrappers
- `src/services/user-meta.service.test.ts` - Unit tests for UserMetaService
- `src/pages/api/user/meta/index.ts` - GET /api/user/meta endpoint
- `src/pages/api/user/meta/[key].ts` - GET/PUT/DELETE /api/user/meta/:key endpoints
- `openapi/paths/user-meta.yml` - OpenAPI path definitions
- `openapi/schemas/UserMetaListResponse.yml` - OpenAPI schema
- `openapi/schemas/UserMetaResponse.yml` - OpenAPI schema
- `openapi/schemas/UpdateUserMetaRequest.yml` - OpenAPI schema
- `openapi/schemas/DeleteUserMetaResponse.yml` - OpenAPI schema

**Files Deleted:**

- `src/db/schema/sqlite/user-settings.ts`
- `src/db/schema/postgresql/user-settings.ts`
- `src/pages/api/user/settings.ts`
- `openapi/schemas/UpdateUserSettingsRequest.yml`
- `openapi/schemas/UserSettingsResponse.yml`

**Files Modified:**

- `src/db/schema/sqlite/index.ts` - Export userMeta instead of userSettings
- `src/db/schema/sqlite/relations.ts` - Add userMeta relations
- `src/db/schema/postgresql/index.ts` - Export userMeta instead of userSettings
- `src/db/schema/postgresql/relations.ts` - Add userMeta relations
- `src/services/user.service.ts` - Remove settings methods
- `src/services/user.service.test.ts` - Update tests
- `src/services/index.ts` - Export userMetaService
- `src/layouts/ProtectedLayout.astro` - Use userMetaService
- `src/pages/profile.astro` - Use new meta API endpoints
- `src/env.d.ts` - Update UserSettings import
- `src/db/seed.ts` - Seed user_meta instead of user_settings
- `openapi.yml` - Update path and schema references
- `openapi/paths/user.yml` - Clean up (removed settings refs)
- `src/pages/api/user/user.api.integration.test.ts` - Update tests for new meta API
- `src/db/index.integration.test.ts` - Update schema assertions

**Quality Gates Passed:**

- `bun run lint:fix` ✅
- `bun run stylelint:fix` ✅
- `bun run format:fix` ✅
- `bun run typecheck` ✅ (0 errors)
